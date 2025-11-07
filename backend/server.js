// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { generateInvoicePDF } = require('./generate-invoice-pdf');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { processMessageWithAI } = require('./chatbot-service');
const compression = require('compression');
const morgan = require('morgan');

// Import new utilities and middleware
const config = require('./config/environment');
const { helmetConfig, generalLimiter, authLimiter, otpLimiter, searchLimiter } = require('./middleware/security');
const { errorHandler, notFoundHandler, asyncHandler, AppError } = require('./utils/errorHandler');
const ApiResponse = require('./utils/response');
const { createDatabaseIndexes } = require('./config/database-indexes');

const app = express();
const PORT = config.port;

// ==================== SECURITY & LOGGING MIDDLEWARE ====================
// Helmet for security headers
app.use(helmetConfig);

// HTTP request logger
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Compression middleware
app.use(compression());

// CORS with specific origins
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      console.log('   Allowed origins:', config.allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// General rate limiter for all requests
app.use(generalLimiter);

const IMAGE_SEARCH_LIMITS = {
  MAX_FILES: 5,
  MAX_FILE_SIZE: 6 * 1024 * 1024 // 6MB
};

const imageSearchUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMAGE_SEARCH_LIMITS.MAX_FILE_SIZE,
    files: IMAGE_SEARCH_LIMITS.MAX_FILES
  },
  fileFilter: (req, file, cb) => {
    if (!file?.mimetype?.startsWith('image/')) {
      cb(new Error('INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  }
});

// Configure multer for chat file uploads (supports images and documents, max 5MB)
const chatFileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'public', 'uploads', 'chat-files');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `chat-${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type không được hỗ trợ. Chỉ chấp nhận: hình ảnh, PDF, Word, Excel'));
    }
  }
});

// MongoDB Connection (now using config)
const MONGODB_URI = config.mongoUri;
const DB_NAME = config.dbName;

// JWT Secret Key (now using config)
const JWT_SECRET = config.jwtSecret;

// Email Configuration (now using config)
const EMAIL_CONFIG = {
  service: config.email.service,
  auth: {
    user: config.email.user,
    pass: config.email.password
  }
};

// OTP Storage with TTL (improved with expiration)
class OTPStore {
  constructor() {
    this.store = new Map();
  }
  
  set(email, otp, ttl = 10 * 60 * 1000) { // 10 minutes default
    const expiresAt = Date.now() + ttl;
    this.store.set(email, { otp, expiresAt });
  }
  
  get(email) {
    const data = this.store.get(email);
    if (!data) return null;
    if (Date.now() > data.expiresAt) {
      this.store.delete(email);
      return null;
    }
    return data.otp;
  }
  
  delete(email) {
    this.store.delete(email);
  }
  
  cleanup() {
    const now = Date.now();
    for (const [email, data] of this.store.entries()) {
      if (now > data.expiresAt) {
        this.store.delete(email);
      }
    }
  }
}

const otpStore = new OTPStore();

// Cleanup expired OTPs every 5 minutes
setInterval(() => otpStore.cleanup(), 5 * 60 * 1000);

// Email Transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

let db;

MongoClient.connect(MONGODB_URI)
  .then(async client => {
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${DB_NAME}`);
    db = client.db(DB_NAME);
    
    // Create all database indexes for optimal performance
    try {
      await createDatabaseIndexes(db);
    } catch (indexError) {
      console.warn('⚠️ Warning creating indexes:', indexError.message);
    }
    
    // Count documents
    Promise.all([
      db.collection('products').countDocuments(),
      db.collection('categories').countDocuments(),
      db.collection('users').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('vouchers').countDocuments()
    ]).then(([productCount, categoryCount, userCount, orderCount, voucherCount]) => {
      console.log(`📦 Products: ${productCount}`);
      console.log(`📁 Categories: ${categoryCount}`);
      console.log(`👥 Users: ${userCount}`);
      console.log(`🛍️  Orders: ${orderCount}`);
      console.log(`🎫 Vouchers: ${voucherCount}\n`);
    });
  })
  .catch(error => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// ==================== MIDDLEWARE ====================

// Middleware xác thực JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Không tìm thấy token xác thực!' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token không hợp lệ hoặc đã hết hạn!' 
      });
    }
    
    req.user = user;
    next();
  });
}

// Middleware xác thực quyền admin/staff
async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Thiếu token xác thực admin'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(403).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    if (!ObjectId.isValid(decoded.userId)) {
      return res.status(403).json({
        success: false,
        message: 'ID người dùng không hợp lệ'
      });
    }

    const adminUser = await db.collection('users').findOne({
      _id: new ObjectId(decoded.userId)
    });

    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const roles = Array.isArray(adminUser.roles) ? adminUser.roles : [];
    const allowedRoles = new Set(['admin', 'manager', 'staff', 'editor', 'moderator']);
    const hasAccess = roles.some(role => allowedRoles.has(String(role).toLowerCase()));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập khu vực quản trị'
      });
    }

    req.authUser = {
      _id: adminUser._id.toString(),
      email: adminUser.mail,
      phone: adminUser.phone,
      name: adminUser.profile?.name || adminUser.phone || adminUser.mail,
      roles
    };

    next();
  } catch (error) {
    console.error('❌ Admin authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Không thể xác thực admin',
      error: error.message
    });
  }
}

const ADMIN_COLLECTIONS = {
  products: {
    collection: 'products',
    label: 'Sản phẩm',
    description: 'Quản lý danh mục sản phẩm, tồn kho và thông tin bán hàng',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['name', 'slug', 'brand', 'sku', 'shortDescription'],
    filterableFields: ['brand', 'is_bestseller', 'is_flashsale', 'is_active'],
    objectIdFields: ['categoryId', 'category_id'],
    defaultSort: { createdAt: -1 }
  },
  categories: {
    collection: 'categories',
    label: 'Danh mục',
    description: 'Quản lý cấu trúc danh mục sản phẩm',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['name', 'slug', 'full_path', 'fullPath', 'parentId'],
    filterableFields: ['parentId', 'is_active', 'level'],
    objectIdFields: ['parentId', 'parent_id'],
    defaultSort: { level: 1, display_order: 1 }
  },
  blogs: {
    collection: 'blogs',
    label: 'Bài viết',
    description: 'Quản lý bài viết và trạng thái phê duyệt',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['title', 'slug', 'cleanSlug', 'author.fullName', 'tags.title'],
    filterableFields: ['status', 'isApproved', 'isVisible', 'category.slug'],
    defaultSort: { publishedAt: -1 },
    idType: 'objectIdOrStringOrSlug'
  },
  orders: {
    collection: 'orders',
    label: 'Đơn hàng',
    description: 'Giám sát đơn hàng và cập nhật trạng thái',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    searchableFields: ['orderNumber', 'customerInfo.name', 'customerInfo.phone', 'shippingAddress.phone'],
    filterableFields: ['status', 'paymentStatus', 'paymentMethod'],
    defaultSort: { createdAt: -1 },
    idType: 'orderNumberOrObjectId'
  },
  users: {
    collection: 'users',
    label: 'Người dùng',
    description: 'Quản lý tài khoản, quyền hạn và trạng thái',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    searchableFields: ['mail', 'phone', 'profile.name', 'profile.fullName'],
    filterableFields: ['status', 'roles'],
    defaultSort: { createdAt: -1 }
  },
  comments: {
    collection: 'comments',
    label: 'Bình luận sản phẩm',
    description: 'Kiểm duyệt bình luận và phản hồi',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['content', 'userName', 'productSlug'],
    filterableFields: ['productId'],
    objectIdFields: ['productId', 'userId']
  },
  ratings: {
    collection: 'ratings',
    label: 'Đánh giá sản phẩm',
    description: 'Theo dõi đánh giá & xử lý phản hồi khách hàng',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['content', 'userName', 'productSlug'],
    filterableFields: ['rating'],
    objectIdFields: ['productId', 'userId']
  },
  reviews: {
    collection: 'reviews',
    label: 'Nhận xét',
    description: 'Quản lý nhận xét về sản phẩm/dịch vụ',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['content', 'userName', 'productSlug'],
    filterableFields: ['rating'],
    objectIdFields: ['productId', 'userId']
  },
  promotions: {
    collection: 'promotions',
    label: 'Mã khuyến mãi',
    description: 'Quản lý mã giảm giá, chiến dịch khuyến mãi và coupon',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['code', 'title', 'name', 'description'],
    filterableFields: ['status', 'type'],
    defaultSort: { createdAt: -1 }
  },
  faq: {
    collection: 'faq',
    label: 'FAQ',
    description: 'Quản lý câu hỏi thường gặp',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['question', 'answer', 'category'],
    filterableFields: ['category', 'isActive'],
    defaultSort: { updatedAt: -1 }
  },
  benh: {
    collection: 'benh',
    label: 'Bệnh lý',
    description: 'Cập nhật thông tin bệnh lý và kiến thức sức khỏe',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['title', 'slug', 'summary'],
    filterableFields: ['category', 'isVisible'],
    defaultSort: { updatedAt: -1 },
    idType: 'objectIdOrString'
  },
  provinces: {
    collection: 'provinces',
    label: 'Tỉnh/Thành',
    description: 'Dữ liệu địa lý: tỉnh/thành phố',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['name', 'slug', 'code'],
    filterableFields: ['code'],
    defaultSort: { name: 1 }
  },
  districts: {
    collection: 'districts',
    label: 'Quận/Huyện',
    description: 'Dữ liệu quận huyện',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['name', 'slug', 'code'],
    filterableFields: ['province_code', 'code'],
    defaultSort: { name: 1 }
  },
  wards: {
    collection: 'wards',
    label: 'Phường/Xã',
    description: 'Dữ liệu phường xã',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['name', 'slug', 'code'],
    filterableFields: ['district_code', 'code'],
    defaultSort: { name: 1 }
  },
  tree: {
    collection: 'tree',
    label: 'Sơ đồ danh mục',
    description: 'Cây danh mục sản phẩm',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['name', 'slug'],
    defaultSort: { name: 1 }
  },
  pharmacist_chats: {
    collection: 'pharmacist_chats',
    label: 'Tư vấn Dược Sĩ',
    description: 'Quản lý cuộc trò chuyện tư vấn với dược sĩ',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    searchableFields: ['phone', 'userName', 'userId'],
    filterableFields: ['status'],
    defaultSort: { updatedAt: -1 }
  },
  tuvanthuoc: {
    collection: 'tuvanthuoc',
    label: 'Tư vấn thuốc',
    description: 'Tất cả các yêu cầu tư vấn của khách hàng',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    searchableFields: ['fullName', 'phoneNumber', 'notes', 'medicineNames'],
    filterableFields: ['status'],
    defaultSort: { createdAt: -1 }
  },
  banners: {
    collection: 'banners',
    label: 'Banner & Theme',
    description: 'Quản lý banner và theme cho trang client',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    searchableFields: ['name', 'title', 'type', 'position'],
    filterableFields: ['type', 'position', 'status', 'isActive'],
    defaultSort: { order: 1, createdAt: -1 }
  }
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchQuery(config, term) {
  if (!term || !config?.searchableFields?.length) {
    return null;
  }

  const safeTerm = escapeRegex(term.trim());
  if (!safeTerm) {
    return null;
  }

  const regex = new RegExp(safeTerm, 'i');

  return {
    $or: config.searchableFields.map((field) => ({ [field]: regex }))
  };
}

const IMAGE_SEARCH_STOPWORDS = new Set([
  'cong', 'ty', 'congty', 'company', 'pharma', 'pharmaceutical', 'san', 'pham', 'sanpham',
  'thuoc', 'thuong', 'hieu', 'hang', 'hangsx', 'sx', 'made', 'product', 'brand', 'viet',
  'nam', 'vietnam', 'tp', 'tpchuc', 'vien', 'hop', 'chai', 'goi', 'tui', 'tube', 'mg',
  'ml', 'mcg', 'gr', 'gram', 'kg', 'g', 'liều', 'lieu', 'hdsd', 'huong', 'dan', 'bao',
  'quan', 'luu', 'y', 'dung', 'dich', 'solution', 'cream', 'gel', 'tablet', 'capsule',
  'ointment', 'sirup', 'siro', 'drops', 'spray', 'bottle', 'box', 'pack', 'usage',
  'ingredients', 'ingredient', 'lot', 'exp', 'date', 'gmp', 'iso', 'qc', 'batch', 'code',
  'barcode', 'expiry', 'hạn', 'han', 'su', 'dung', 'new', 'best', 'seller', 'hot', 'sale',
  'official', 'distributor', 'imported', 'with', 'for', 'and', 'the', 'from', 'of', 'to'
]);

function stripDiacritics(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function simplifyText(value = '') {
  return stripDiacritics(String(value || ''))
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractKeywordsFromText(text = '') {
  const normalized = simplifyText(text);
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(' ');
  const filtered = tokens.filter(token => {
    if (!token || token.length < 2) {
      return false;
    }

    if (IMAGE_SEARCH_STOPWORDS.has(token)) {
      return false;
    }

    if (/^\d+$/.test(token) && token.length > 5) {
      return false;
    }

    return true;
  });

  const resultSet = new Set(filtered);

  // Build bigrams for better accuracy (e.g. "omega 3")
  for (let i = 0; i < filtered.length - 1; i += 1) {
    const current = filtered[i];
    const next = filtered[i + 1];

    if (!current || !next) {
      continue;
    }

    if (IMAGE_SEARCH_STOPWORDS.has(current) || IMAGE_SEARCH_STOPWORDS.has(next)) {
      continue;
    }

    const bigram = `${current} ${next}`.trim();
    if (bigram.length > 2 && /[a-z0-9]/.test(bigram)) {
      resultSet.add(bigram);
    }
  }

  return Array.from(resultSet).filter(Boolean);
}

function extractKeywordsFromFilename(filename = '') {
  if (!filename) {
    return [];
  }

  const withoutExt = filename.replace(/\.[a-zA-Z0-9]+$/, ' ');
  return extractKeywordsFromText(withoutExt);
}

function formatKeywordForDisplay(keyword = '') {
  return keyword
    .split(' ')
    .filter(Boolean)
    .map(part => {
      if (!part) {
        return part;
      }
      if (part.length <= 2 && /^\d+$/.test(part) === false) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function buildProductSearchText(product = {}) {
  const parts = [
    product.name,
    product.brand,
    product.slug,
    product.shortDescription,
    product.description,
    Array.isArray(product.tags) ? product.tags.join(' ') : ''
  ]
    .filter(Boolean)
    .map(value => simplifyText(String(value)));

  return parts.filter(Boolean).join(' ');
}

/**
 * Normalize product gallery from string to array
 */
function normalizeProductGallery(gallery) {
  if (!gallery) {
    return [];
  }
  
  // If already an array, return as is (but validate items)
  if (Array.isArray(gallery)) {
    return gallery.filter(img => 
      img && 
      typeof img === 'string' && 
      img.trim() !== '' && 
      img !== 'null' && 
      img !== 'undefined'
    );
  }
  
  // If string, try to parse it
  if (typeof gallery === 'string') {
    try {
      const trimmed = gallery.trim();
      // Try to parse as JSON array
      const parsed = JSON.parse(trimmed.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        return parsed.filter(img => 
          img && 
          typeof img === 'string' && 
          img.trim() !== '' && 
          img !== 'null' && 
          img !== 'undefined'
        );
      }
    } catch (e) {
      // If parsing fails, treat as single image URL
      if (gallery.trim() !== '' && gallery !== 'null' && gallery !== 'undefined') {
        return [gallery.trim()];
      }
    }
  }
  
  return [];
}

/**
 * Normalize product image field
 */
function normalizeProductImage(image) {
  if (!image) {
    return null;
  }
  
  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    return trimmed;
  }
  
  // If it's an array, take first item
  if (Array.isArray(image) && image.length > 0) {
    return normalizeProductImage(image[0]);
  }
  
  // If it's an object with url property
  if (image && typeof image === 'object' && image.url) {
    return normalizeProductImage(image.url);
  }
  
  return null;
}

/**
 * Normalize a product document for API response
 */
function normalizeProduct(product) {
  if (!product) {
    return null;
  }
  
  // Normalize gallery
  if (product.gallery !== undefined) {
    product.gallery = normalizeProductGallery(product.gallery);
  }
  
  // Normalize image
  if (product.image !== undefined) {
    product.image = normalizeProductImage(product.image);
  }
  
  // Ensure _id is string
  if (product._id) {
    product._id = product._id.toString();
  }
  
  return product;
}

/**
 * Normalize disease primary_image field
 * Always returns object {url: string, alternativeText: string|null} or null
 */
function normalizeDiseasePrimaryImage(primaryImage) {
  if (!primaryImage) {
    return null;
  }
  
  let url = null;
  let alternativeText = null;
  
  // If it's already a string URL, convert to object
  if (typeof primaryImage === 'string') {
    const trimmed = primaryImage.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    url = trimmed;
  }
  // If it's an object with url property
  else if (primaryImage && typeof primaryImage === 'object' && primaryImage.url) {
    const urlValue = primaryImage.url;
    if (typeof urlValue === 'string') {
      const trimmed = urlValue.trim();
      if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
        return null;
      }
      url = trimmed;
      alternativeText = primaryImage.alternativeText || null;
    } else {
      return null;
    }
  } else {
    return null;
  }
  
  // Always return object format for consistency
  return {
    url: url,
    alternativeText: alternativeText
  };
}

/**
 * Normalize disease slider_images array
 */
function normalizeDiseaseSliderImages(sliderImages) {
  if (!sliderImages) {
    return [];
  }
  
  if (!Array.isArray(sliderImages)) {
    return [];
  }
  
  return sliderImages
    .filter(img => img && (typeof img === 'string' || (typeof img === 'object' && img.url)))
    .map(img => {
      if (typeof img === 'string') {
        const trimmed = img.trim();
        if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
          return null;
        }
        return { url: trimmed, alternativeText: null };
      }
      
      if (typeof img === 'object' && img.url) {
        const url = typeof img.url === 'string' ? img.url.trim() : '';
        if (url === '' || url === 'null' || url === 'undefined') {
          return null;
        }
        return {
          url: url,
          alternativeText: img.alternativeText || null
        };
      }
      
      return null;
    })
    .filter(img => img !== null);
}

/**
 * Normalize a disease document for API response
 */
function normalizeDisease(disease) {
  if (!disease) {
    return null;
  }
  
  // Normalize primary_image
  if (disease.primary_image !== undefined) {
    disease.primary_image = normalizeDiseasePrimaryImage(disease.primary_image);
  }
  
  // Normalize slider_images
  if (disease.slider_images !== undefined) {
    disease.slider_images = normalizeDiseaseSliderImages(disease.slider_images);
  }
  
  // Ensure _id is string if exists
  if (disease._id) {
    disease._id = disease._id.toString();
  }
  
  return disease;
}

function mapProductForResponse(product) {
  const normalized = normalizeProduct({ ...product });
  const coverImage = normalized.image || (Array.isArray(normalized.images) ? normalized.images[0] : null);
  return {
    id: normalized._id?.toString?.() ?? String(normalized._id ?? ''),
    name: normalized.name,
    slug: normalized.slug,
    brand: normalized.brand ?? null,
    price: normalized.price ?? null,
    original_price: normalized.original_price ?? null,
    unit: normalized.unit ?? null,
    country: normalized.country ?? null,
    image: normalizeProductImage(coverImage),
    shortDescription: normalized.shortDescription ?? null
  };
}

function parseFilterValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(parseFilterValue);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return trimmed;
    }

    if (trimmed.toLowerCase() === 'true') {
      return true;
    }
    if (trimmed.toLowerCase() === 'false') {
      return false;
    }

    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && trimmed === `${asNumber}`) {
      return asNumber;
    }
  }

  return value;
}

function buildFilterQuery(config, filterParam) {
  if (!filterParam) {
    return {};
  }

  let rawFilters = filterParam;

  if (typeof filterParam === 'string') {
    try {
      rawFilters = JSON.parse(filterParam);
    } catch (error) {
      console.warn('⚠️ Không thể parse filters JSON:', filterParam, error);
      return {};
    }
  }

  if (typeof rawFilters !== 'object' || Array.isArray(rawFilters)) {
    return {};
  }

  const allowedFields = new Set(config?.filterableFields || []);
  const query = {};

  Object.entries(rawFilters).forEach(([key, value]) => {
    if (allowedFields.size > 0 && !allowedFields.has(key)) {
      return;
    }

    const parsed = parseFilterValue(value);

    if (Array.isArray(parsed)) {
      query[key] = { $in: parsed };
    } else {
      query[key] = parsed;
    }
  });

  return query;
}

function normalizeForOutput(document) {
  if (document === null || document === undefined) {
    return document;
  }

  return JSON.parse(JSON.stringify(document, (key, value) => {
    if (value instanceof ObjectId) {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }));
}

function convertObjectIdFields(payload, config) {
  if (!payload || !config?.objectIdFields?.length) {
    return payload;
  }

  config.objectIdFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      const value = payload[field];

      if (!value) {
        return;
      }

      if (typeof value === 'string' && ObjectId.isValid(value)) {
        payload[field] = new ObjectId(value);
      } else if (Array.isArray(value)) {
        payload[field] = value.map((item) => {
          if (typeof item === 'string' && ObjectId.isValid(item)) {
            return new ObjectId(item);
          }
          return item;
        });
      }
    }
  });

  return payload;
}

function prepareWritePayload(source, config, { isUpdate = false } = {}) {
  if (!source || typeof source !== 'object') {
    return source;
  }

  const payload = JSON.parse(JSON.stringify(source));

  // Remove _id to avoid immutable field error
  if (Object.prototype.hasOwnProperty.call(payload, '_id')) {
    delete payload._id;
  }

  convertObjectIdFields(payload, config);

  if (!isUpdate) {
    if (!payload.createdAt) {
      payload.createdAt = new Date();
    }
    payload.updatedAt = payload.updatedAt ? new Date(payload.updatedAt) : new Date();
  } else {
    payload.updatedAt = new Date();
    if (payload.createdAt) {
      payload.createdAt = new Date(payload.createdAt);
    }
  }

  return payload;
}

function buildIdFilter(id, config) {
  if (!id) {
    throw new Error('Thiếu tham số id');
  }

  const idType = config?.idType;

  if (idType === 'string') {
    return { _id: id };
  }

  if (idType === 'objectIdOrString') {
    if (ObjectId.isValid(id)) {
      return { _id: new ObjectId(id) };
    }
    return { _id: id };
  }

  if (idType === 'objectIdOrStringOrSlug') {
    // For blogs, try _id first, then fallback to slug
    if (ObjectId.isValid(id)) {
      return { _id: new ObjectId(id) };
    }
    // Return a filter that will be used in $or query
    return { _id: id };
  }

  if (idType === 'orderNumberOrObjectId') {
    if (typeof id === 'string' && id.startsWith('MD')) {
      return { orderNumber: id };
    }
    if (ObjectId.isValid(id)) {
      return { _id: new ObjectId(id) };
    }
    return { orderNumber: id };
  }

  if (ObjectId.isValid(id)) {
    return { _id: new ObjectId(id) };
  }

  return { _id: id };
}

// ==================== ROOT API ENDPOINT ====================
// Must be defined BEFORE other /api/* routes

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MediCare Backend API',
    version: '1.0.0',
    availableEndpoints: {
      health: '/api/health - Server health check',
      test: '/api/test - Test endpoint with sample data',
      products: '/api/products - Get all products',
      auth: '/api/auth - Authentication endpoints',
      admin: '/api/admin - Admin endpoints (requires authentication)'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/collections', authenticateAdmin, (req, res) => {
  const collections = Object.entries(ADMIN_COLLECTIONS).map(([key, config]) => ({
    key,
    label: config.label,
    description: config.description,
    allowCreate: Boolean(config.allowCreate),
    allowUpdate: Boolean(config.allowUpdate),
    allowDelete: Boolean(config.allowDelete)
  }));

  res.json({
    success: true,
    data: collections
  });
});

app.get('/api/admin/summary', authenticateAdmin, async (req, res) => {
  try {
    const [products, categories, orders, users, blogs, comments, ratings, reviews, faq, diseases] = await Promise.all([
      db.collection('products').countDocuments(),
      db.collection('categories').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('users').countDocuments(),
      db.collection('blogs').countDocuments({}),
      db.collection('comments').countDocuments({}),
      db.collection('ratings').countDocuments({}),
      db.collection('reviews').countDocuments({}),
      db.collection('faq').countDocuments({}),
      db.collection('benh').countDocuments({})
    ]);

    const ordersByStatus = await db.collection('orders').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const recentOrders = await db.collection('orders').find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray();

    const recentUsers = await db.collection('users').find({})
      .project({ mail: 1, phone: 1, profile: 1, roles: 1, status: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray();

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const revenueLast30Days = await db.collection('orders').aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'completed'] },
          deliveredAt: { $exists: true, $gte: last30Days }
        }
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' } }
          },
          total: { $sum: { $ifNull: ['$pricing.total', 0] } },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.day': 1 } }
    ]).toArray();

    const topCategories = await db.collection('products').aggregate([
      {
        $group: {
          _id: '$categoryId',
          products: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$price', 0] } }
        }
      },
      { $sort: { products: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $addFields: {
          category: { $arrayElemAt: ['$category', 0] }
        }
      }
    ]).toArray();

    res.json({
      success: true,
      data: {
        totals: {
          products,
          categories,
          orders,
          users,
          blogs,
          comments,
          ratings,
          reviews,
          faq,
          diseases
        },
        ordersByStatus: normalizeForOutput(ordersByStatus),
        revenueLast30Days: normalizeForOutput(revenueLast30Days),
        recentOrders: normalizeForOutput(recentOrders),
        recentUsers: normalizeForOutput(recentUsers),
        topCategories: normalizeForOutput(topCategories)
      }
    });
  } catch (error) {
    console.error('❌ Error building admin summary:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy dữ liệu tổng quan',
      error: error.message
    });
  }
});

// ==================== NOTIFICATIONS API ====================

// Helper function to create notification
async function createNotification(data) {
  try {
    const notification = {
      ...data,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection('notifications').insertOne(notification);
    console.log('[Notifications] Created notification:', {
      id: result.insertedId.toString(),
      type: data.type,
      targetType: data.targetType,
      title: data.title
    });
    return result.insertedId;
  } catch (error) {
    console.error('[Notifications] Error creating notification:', error);
    return null;
  }
}

// Helper function to send order confirmation email
async function sendOrderConfirmationEmail(orderData) {
  try {
    const { email, customerName, orderNumber, items, pricing, address } = orderData;
    
    console.log('========================================');
    console.log('[Email] STARTING EMAIL SEND PROCESS');
    console.log('[Email] Order Number:', orderNumber);
    console.log('[Email] Email:', email);
    console.log('[Email] Customer Name:', customerName);
    console.log('========================================');
    
    if (!email) {
      console.error('[Email] ❌ NO EMAIL PROVIDED for order:', orderNumber);
      console.log('[Email] Order data received:', JSON.stringify(orderData, null, 2));
      return false;
    }

    // Generate items list HTML
    const itemsHTML = items.map(item => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${item.image || '/assets/images/default-product.png'}" 
                 alt="${item.name}" 
                 style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
            <div>
              <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${item.name}</div>
              <div style="font-size: 13px; color: #6b7280;">SL: ${item.quantity} ${item.unit || 'sản phẩm'}</div>
            </div>
          </div>
        </td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #111827;">
          ${(item.price * item.quantity).toLocaleString('vi-VN')}đ
        </td>
      </tr>
    `).join('');

    const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 40px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
            🎉 Đặt hàng thành công!
          </h1>
          <p style="margin: 12px 0 0 0; color: #e0f2fe; font-size: 16px;">
            Cảm ơn bạn đã tin tưởng MediCare
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <!-- Greeting -->
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">
            Xin chào <strong style="color: #0066cc;">${customerName || 'Quý khách'}</strong>,
          </p>
          
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            Đơn hàng của bạn đã được đặt thành công! Chúng tôi sẽ xử lý và giao hàng trong thời gian sớm nhất.
          </p>

          <!-- Order Info Box -->
          <div style="background-color: #f0f9ff; border-left: 4px solid #0066cc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Mã đơn hàng</div>
            <div style="font-size: 24px; font-weight: 700; color: #0066cc; letter-spacing: 1px;">
              ${orderNumber}
            </div>
          </div>

          <!-- Order Items -->
          <h2 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">
            Chi tiết đơn hàng
          </h2>
          
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            ${itemsHTML}
          </table>

          <!-- Pricing -->
          <div style="margin-top: 24px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6b7280;">Tạm tính:</span>
              <span style="font-weight: 600; color: #111827;">${(pricing.subtotal || 0).toLocaleString('vi-VN')}đ</span>
            </div>
            ${pricing.voucherDiscount ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #10b981;">Giảm giá (${pricing.voucherCode}):</span>
              <span style="font-weight: 600; color: #10b981;">-${pricing.voucherDiscount.toLocaleString('vi-VN')}đ</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6b7280;">Phí vận chuyển:</span>
              <span style="font-weight: 600; color: #111827;">${(pricing.shippingFee || 0).toLocaleString('vi-VN')}đ</span>
            </div>
            <div style="border-top: 2px solid #e5e7eb; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between;">
              <span style="font-size: 18px; font-weight: 700; color: #111827;">Tổng cộng:</span>
              <span style="font-size: 20px; font-weight: 700; color: #0066cc;">${pricing.total.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          <!-- Delivery Address -->
          <h2 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">
            Thông tin giao hàng
          </h2>
          
          <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px; line-height: 1.8;">
            <div style="margin-bottom: 8px;"><strong style="color: #374151;">Người nhận:</strong> ${address.name}</div>
            <div style="margin-bottom: 8px;"><strong style="color: #374151;">Số điện thoại:</strong> ${address.phone}</div>
            <div style="margin-bottom: 8px;"><strong style="color: #374151;">Địa chỉ:</strong> ${address.address}, ${address.ward}, ${address.district}, ${address.province}</div>
          </div>

          <!-- Next Steps -->
          <div style="margin-top: 32px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e40af;">
              📦 Tiếp theo sẽ làm gì?
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.8;">
              <li>Chúng tôi sẽ xác nhận đơn hàng trong vòng 24h</li>
              <li>Đơn hàng sẽ được đóng gói và giao cho đơn vị vận chuyển</li>
              <li>Bạn có thể theo dõi trạng thái đơn hàng trên website</li>
            </ul>
          </div>

          <!-- Support -->
          <div style="margin-top: 32px; text-align: center; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 8px 0;">Cần hỗ trợ? Liên hệ chúng tôi:</p>
            <p style="margin: 0;">
              📞 Hotline: <strong style="color: #0066cc;">1900 0908</strong><br>
              📧 Email: <strong style="color: #0066cc;">nhathuocmedicare@gmail.com</strong>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #1f2937; padding: 24px; text-align: center;">
          <div style="color: #9ca3af; font-size: 14px; margin-bottom: 12px;">
            <strong style="color: #ffffff; font-size: 16px;">MediCare</strong> - Nhà thuốc số 1 Việt Nam
          </div>
          <div style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            Đây là email tự động, vui lòng không trả lời email này.
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: `✅ Đặt hàng thành công - Đơn hàng ${orderNumber} | MediCare`,
      html: emailHTML
    };

    console.log('[Email] 📧 Sending email via SMTP...');
    const result = await transporter.sendMail(mailOptions);
    console.log('========================================');
    console.log('[Email] ✅ SUCCESS! Email sent to:', email);
    console.log('[Email] Message ID:', result.messageId);
    console.log('[Email] Response:', result.response);
    console.log('[Email] Order:', orderNumber);
    console.log('========================================');
    return true;
  } catch (error) {
    console.error('========================================');
    console.error('[Email] ❌ ERROR sending order confirmation');
    console.error('[Email] Error:', error.message);
    console.error('[Email] Stack:', error.stack);
    console.error('[Email] To:', email);
    console.error('[Email] Order:', orderNumber);
    console.error('========================================');
    return false;
  }
}

// Get notifications for admin
app.get('/api/admin/notifications', authenticateAdmin, async (req, res) => {
  try {
    console.log('[Notifications API] Fetching admin notifications');
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const query = { targetType: 'admin' };
    if (unreadOnly) {
      query.read = false;
    }
    
    const notifications = await db.collection('notifications')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    const unreadCount = await db.collection('notifications')
      .countDocuments({ targetType: 'admin', read: false });
    
    console.log('[Notifications API] Found', notifications.length, 'notifications,', unreadCount, 'unread');
    
    res.json({
      success: true,
      data: notifications.map(n => ({
        ...n,
        _id: n._id.toString()
      })),
      unreadCount
    });
  } catch (error) {
    console.error('[Notifications API] Error fetching admin notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get notifications for user
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const unreadOnly = req.query.unreadOnly === 'true';
    
    console.log('[Notifications API] Fetching user notifications for userId:', userId, 'unreadOnly:', unreadOnly);
    
    const query = { 
      targetType: 'user',
      targetId: userId
    };
    if (unreadOnly) {
      query.read = false;
    }
    
    const notifications = await db.collection('notifications')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    const unreadCount = await db.collection('notifications')
      .countDocuments({ targetType: 'user', targetId: userId, read: false });
    
    console.log('[Notifications API] Found', notifications.length, 'notifications,', unreadCount, 'unread for userId:', userId);
    
    res.json({
      success: true,
      data: notifications.map(n => ({
        ...n,
        _id: n._id.toString()
      })),
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('notifications').updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true, updatedAt: new Date() } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    
    const query = { targetType };
    if (targetId) {
      query.targetId = targetId;
    }
    
    await db.collection('notifications').updateMany(
      { ...query, read: false },
      { $set: { read: true, updatedAt: new Date() } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('notifications').deleteOne({ _id: new ObjectId(id) });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/:collection', authenticateAdmin, async (req, res) => {
  try {
    const collectionKey = req.params.collection;
    const config = ADMIN_COLLECTIONS[collectionKey];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy collection ${collectionKey}`
      });
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 200);
    const skip = (page - 1) * limit;
    const searchTerm = typeof req.query.search === 'string' ? req.query.search : '';
    const filters = buildFilterQuery(config, req.query.filters);

    const queryParts = [filters];
    const searchQuery = buildSearchQuery(config, searchTerm);
    if (searchQuery) {
      queryParts.push(searchQuery);
    }

    const finalQuery = queryParts.length > 1 ? { $and: queryParts } : queryParts[0];

    const sortField = typeof req.query.sortBy === 'string' && req.query.sortBy.trim() !== ''
      ? req.query.sortBy
      : Object.keys(config.defaultSort || { createdAt: -1 })[0];
    const sortDirection = typeof req.query.sortDir === 'string' && req.query.sortDir.toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    const cursor = db.collection(config.collection)
      .find(finalQuery || {})
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const [items, total] = await Promise.all([
      cursor.toArray(),
      db.collection(config.collection).countDocuments(finalQuery || {})
    ]);

    res.json({
      success: true,
      data: normalizeForOutput(items),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin collection:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải dữ liệu',
      error: error.message
    });
  }
});

app.get('/api/admin/:collection/:id', authenticateAdmin, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const config = ADMIN_COLLECTIONS[collection];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy collection ${collection}`
      });
    }

    // Decode ID from URL (in case it was encoded by frontend)
    const decodedId = decodeURIComponent(id);
    const idTrimmed = decodedId.trim();

    console.log(`[GET] Collection: ${collection}, Raw ID: ${id}, Decoded ID: ${idTrimmed}, Config:`, { collection: config.collection, idType: config.idType });

    // Try to find document with multiple fallback strategies
    let filter = buildIdFilter(idTrimmed, config);
    
    console.log(`[GET] Initial filter:`, filter);
    
    // First attempt: try with the filter from buildIdFilter
    let document = await db.collection(config.collection).findOne(filter);
    
    if (document) {
      console.log(`[GET] ✅ Found with initial filter`);
    }
    
    // Fallback 1: If not found and ObjectId is valid, try with ObjectId conversion
    if (!document && ObjectId.isValid(idTrimmed)) {
      try {
        const objectIdFilter = { _id: new ObjectId(idTrimmed) };
        console.log(`[GET] Trying ObjectId filter:`, objectIdFilter);
        document = await db.collection(config.collection).findOne(objectIdFilter);
        if (document) {
          console.log(`[GET] ✅ Found with ObjectId filter`);
        }
      } catch (e) {
        console.log(`[GET] ObjectId filter failed:`, e.message);
      }
    }
    
    // Fallback 2: Try with string ID directly
    if (!document) {
      try {
        const stringFilter = { _id: idTrimmed };
        console.log(`[GET] Trying string filter:`, stringFilter);
        document = await db.collection(config.collection).findOne(stringFilter);
        if (document) {
          console.log(`[GET] ✅ Found with string filter`);
        }
      } catch (e) {
        console.log(`[GET] String filter failed:`, e.message);
      }
    }

    // Fallback 3: For blogs collection, try finding by multiple fields
    if (!document && config.collection === 'blogs') {
      try {
        // Try by slug
        const slugFilter = { slug: idTrimmed };
        console.log(`[GET] Trying slug filter for blogs:`, slugFilter);
        document = await db.collection(config.collection).findOne(slugFilter);
        if (document) {
          console.log(`[GET] ✅ Found with slug filter`);
        }
      } catch (e) {
        console.log(`[GET] Slug filter failed:`, e.message);
      }

      // Try by articleId or id field
      if (!document) {
        try {
          const articleIdFilter = { $or: [{ articleId: idTrimmed }, { id: idTrimmed }] };
          console.log(`[GET] Trying articleId/id filter for blogs:`, articleIdFilter);
          document = await db.collection(config.collection).findOne(articleIdFilter);
          if (document) {
            console.log(`[GET] ✅ Found with articleId/id filter`);
          }
        } catch (e) {
          console.log(`[GET] articleId/id filter failed:`, e.message);
        }
      }
    }

    if (!document) {
      console.log(`[GET] ❌ Document not found after all attempts`);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài nguyên'
      });
    }

    console.log(`[GET] ✅ Returning document with _id:`, document._id);
    res.json({
      success: true,
      data: normalizeForOutput(document)
    });
  } catch (error) {
    console.error('❌ Error fetching admin document:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải dữ liệu',
      error: error.message
    });
  }
});

app.post('/api/admin/:collection', authenticateAdmin, async (req, res) => {
  try {
    const collectionKey = req.params.collection;
    const config = ADMIN_COLLECTIONS[collectionKey];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy collection ${collectionKey}`
      });
    }

    if (!config.allowCreate) {
      return res.status(405).json({
        success: false,
        message: 'Collection không cho phép tạo mới'
      });
    }

    console.log(`[POST /api/admin/${collectionKey}] Received payload:`, JSON.stringify(req.body, null, 2));

    const payload = prepareWritePayload(req.body, config, { isUpdate: false });
    console.log(`[POST /api/admin/${collectionKey}] Prepared payload:`, JSON.stringify(payload, null, 2));

    const result = await db.collection(config.collection).insertOne(payload);
    console.log(`[POST /api/admin/${collectionKey}] Insert result:`, result.insertedId);

    const created = await db.collection(config.collection).findOne({ _id: result.insertedId });
    console.log(`[POST /api/admin/${collectionKey}] Created document:`, created?._id);

    res.status(201).json({
      success: true,
      data: normalizeForOutput(created)
    });
  } catch (error) {
    console.error(`❌ Error creating admin document in ${req.params.collection}:`, error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo dữ liệu',
      error: error.message
    });
  }
});

app.put('/api/admin/:collection/:id', authenticateAdmin, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const config = ADMIN_COLLECTIONS[collection];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy collection ${collection}`
      });
    }

    if (!config.allowUpdate) {
      return res.status(405).json({
        success: false,
        message: 'Collection không hỗ trợ cập nhật'
      });
    }

    // Try to build filter and find document with multiple fallback strategies
    const idTrimmed = id.trim();
    let filter = buildIdFilter(idTrimmed, config);
    const payload = prepareWritePayload(req.body, config, { isUpdate: true });

    // First attempt: try with the filter from buildIdFilter
    let existingDoc = await db.collection(config.collection).findOne(filter);
    
    // Fallback 1: If not found and ObjectId is valid, try with ObjectId conversion
    if (!existingDoc && ObjectId.isValid(idTrimmed)) {
      try {
        const objectIdFilter = { _id: new ObjectId(idTrimmed) };
        existingDoc = await db.collection(config.collection).findOne(objectIdFilter);
        if (existingDoc) {
          filter = objectIdFilter;
        }
      } catch (e) {
        // Ignore and continue
      }
    }
    
    // Fallback 2: Try with string ID directly
    if (!existingDoc) {
      try {
        const stringFilter = { _id: idTrimmed };
        existingDoc = await db.collection(config.collection).findOne(stringFilter);
        if (existingDoc) {
          filter = stringFilter;
        }
      } catch (e) {
        // Ignore and continue
      }
    }

    // Fallback 3: For blogs collection, try finding by slug field
    if (!existingDoc && config.collection === 'blogs') {
      try {
        const slugFilter = { slug: idTrimmed };
        existingDoc = await db.collection(config.collection).findOne(slugFilter);
        if (existingDoc) {
          filter = slugFilter;
        }
      } catch (e) {
        // Ignore and continue
      }
    }

    // Additional fallback: for orders allow lookup by orderNumber even if idType didn't match
    if (!existingDoc && config.collection === 'orders') {
      try {
        const orderNumberFilter = { orderNumber: idTrimmed };
        existingDoc = await db.collection(config.collection).findOne(orderNumberFilter);
        if (existingDoc) {
          filter = orderNumberFilter;
        }
      } catch (e) {
        // Ignore and continue
      }
    }

    // If still not found, return 404
    if (!existingDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài nguyên để cập nhật'
      });
    }

    // Perform the update
    const result = await db.collection(config.collection).findOneAndUpdate(
      filter,
      { $set: payload },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài nguyên để cập nhật'
      });
    }

    res.json({
      success: true,
      data: normalizeForOutput(result.value)
    });
  } catch (error) {
    console.error('❌ Error updating admin document:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật dữ liệu',
      error: error.message
    });
  }
});

app.delete('/api/admin/:collection/:id', authenticateAdmin, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const config = ADMIN_COLLECTIONS[collection];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy collection ${collection}`
      });
    }

    if (!config.allowDelete) {
      return res.status(405).json({
        success: false,
        message: 'Collection không hỗ trợ xóa'
      });
    }

    const filter = buildIdFilter(id, config);
    const result = await db.collection(config.collection).deleteOne(filter);

    res.json({
      success: true,
      deletedCount: result.deletedCount || 0
    });
  } catch (error) {
    console.error('❌ Error deleting admin document:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa dữ liệu',
      error: error.message
    });
  }
});

// ==================== PRODUCTS ENDPOINTS ====================

// Lấy sản phẩm theo category slug (support nested slugs with /)
app.get('/api/products/by-category-slug/*', async (req, res) => {
  try {
    // Extract slug from URL path (everything after /api/products/by-category-slug/)
    const slug = req.params[0];
    console.log('🔍 Finding category by slug:', slug);
    
    // Find category by slug
    const category = await db.collection('categories').findOne({ slug: slug });
    
    if (!category) {
      console.log('❌ Category not found:', slug);
      return res.json({
        success: true,
        data: [],
        total: 0
      });
    }
    
    console.log('✅ Found category:', category.name, 'ID:', category._id);
    
    // Get all descendant categories recursively
    const getAllDescendants = async (categoryId) => {
      const descendants = [categoryId];
      
      // Find children using parentId (camelCase) to match MongoDB schema
      const children = await db.collection('categories')
        .find({ parentId: categoryId })
        .toArray();
      
      console.log(`   📁 Category ${categoryId} has ${children.length} direct children`);
      
      // Recursively get descendants of each child
      for (const child of children) {
        const childDescendants = await getAllDescendants(child._id);
        descendants.push(...childDescendants);
      }
      
      return descendants;
    };
    
    const categoryIds = await getAllDescendants(category._id);
    console.log(`📂 Total category IDs (including ${category.name} + descendants): ${categoryIds.length}`);
    console.log('📋 Category IDs:', categoryIds);
    
    // Find all products in these categories with projection
    const products = await db.collection('products')
      .find({ categoryId: { $in: categoryIds } })
      .project({
        _id: 1,
        name: 1,
        price: 1,
        discount: 1,
        image: 1,
        gallery: 1,
        brand: 1,
        unit: 1,
        categoryId: 1,
        slug: 1,
        is_active: 1
      })
      .toArray();
    
    console.log(`✅ Found ${products.length} products for category ${slug}`);
    
    // Normalize all products (parse gallery, validate image)
    const normalizedProducts = products.map(normalizeProduct);
    
    res.json({
      success: true,
      data: normalizedProducts,
      total: normalizedProducts.length,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug
      }
    });
  } catch (error) {
    console.error('Error fetching products by category slug:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Lấy danh sách banners cho client
app.get('/api/banners', async (req, res) => {
  try {
    const { type, position, status } = req.query;
    let query = {};
    
    // Filter by type (hero, feature, etc.)
    if (type) {
      query.type = type;
    }
    
    // Filter by position (homepage, category, etc.)
    if (position) {
      query.position = position;
    }
    
    // Filter by status (active/inactive)
    if (status) {
      query.status = status;
    } else {
      // Default: only active banners
      query.$or = [
        { status: 'active' },
        { isActive: true }
      ];
    }
    
    const banners = await db.collection('banners')
      .find(query)
      .sort({ order: 1, createdAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      data: banners.map(banner => ({
        id: banner._id.toString(),
        name: banner.name || '',
        title: banner.title || '',
        image: banner.image || '',
        backgroundImage: banner.backgroundImage || '',
        slideImage: banner.slideImage || '',
        type: banner.type || 'hero',
        position: banner.position || 'homepage',
        link: banner.link || '',
        productId: banner.productId || '',
        order: banner.order || 0,
        status: banner.status || 'active',
        isActive: banner.isActive !== false,
        subtitle: banner.subtitle || '',
        badge1: banner.badge1 || null,
        badge2: banner.badge2 || null,
        buttonText: banner.buttonText || '',
        dateRange: banner.dateRange || '',
        createdAt: banner.createdAt || new Date(),
        updatedAt: banner.updatedAt || new Date()
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching banners:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Lấy danh sách sản phẩm
app.get('/api/products', async (req, res) => {
  try {
    const { limit, skip = 0, category, search } = req.query;
    let query = {};
    
    if (category) {
      query.categoryId = category; // Fixed: use categoryId (camelCase) to match MongoDB field
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('🔍 Products query:', JSON.stringify(query));
    
    let cursor = db.collection('products')
      .find(query)
      .project({
        _id: 1,
        name: 1,
        price: 1,
        discount: 1,
        image: 1,
        gallery: 1,
        brand: 1,
        unit: 1,
        categoryId: 1,
        slug: 1,
        is_active: 1
      })
      .skip(parseInt(skip));
    
    // Only apply limit if specified
    if (limit) {
      cursor = cursor.limit(parseInt(limit));
    }
    
    const products = await cursor.toArray();
    console.log(`✅ Found ${products.length} products for query`);
    
    // Normalize all products (parse gallery, validate image)
    const normalizedProducts = products.map(normalizeProduct);
      
    res.json({
      success: true,
      data: normalizedProducts,
      total: normalizedProducts.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Lấy sản phẩm theo brand
app.get('/api/products/by-brand/:brandName', async (req, res) => {
  try {
    const brandName = req.params.brandName;
    console.log('🔍 Finding products by brand:', brandName);
    
    // Map brand slugs to actual brand names with multiple variations
    const brandNameMap = {
      'jpanwell': ['Jpanwell', 'JpanWell', 'JPANWELL', 'jpanwell'],
      'ocavill': ['Ocavill', 'OCAVILL', 'ocavill', 'Pikolin'],
      'brauer': ['Brauer', 'BRAUER', 'brauer'],
      'vitamins-for-life': ['Vitamins For Life', 'Vitamins for Life', 'VITAMINS FOR LIFE', 'VitaminsForLife'],
      'vitabiotics': ['Vitabiotics', 'VITABIOTICS', 'vitabiotics', 'Pregnacare'],
      'datino': ['Datino', 'DATINO', 'datino'],
      'okamoto': ['OKAMOTO', 'Okamoto', 'okamoto'],
      'pearlie-white': ['PEARLIE WHITE', 'Pearlie White', 'PearlieWhite', 'pearlie white'],
      'kamicare': ['KamiCARE', 'Kamicare', 'KAMICARE', 'kamicare'],
      'laroche-posay': ['La Roche-Posay', 'La Roche Posay', 'Laroche posay', 'LA ROCHE POSAY', 'laroche-posay', 'la-roche-posay']
    };
    
    const brandVariations = brandNameMap[brandName.toLowerCase()] || [brandName];
    const primaryBrandName = brandVariations[0];
    
    console.log(`📍 Searching for brand variations:`, brandVariations);
    
    // Try multiple search patterns
    const searchPatterns = brandVariations.map(name => {
      // Escape special regex characters
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, 'i');
    });
    
    // Combine all patterns with $or
    const brandQuery = {
      $or: searchPatterns.map(pattern => ({ brand: pattern }))
    };
    
    console.log(`🔎 Brand query:`, JSON.stringify(brandQuery));
    
    // Also try to find a sample product to check brand field format
    const sampleProduct = await db.collection('products').findOne({ brand: { $exists: true, $ne: null, $ne: '' } });
    if (sampleProduct) {
      console.log(`📦 Sample product brand field:`, sampleProduct.brand);
    }
    
    // Get all unique brand names for debugging (only first time or if no products found)
    let allBrands = [];
    let matchingBrands = [];
    
    const products = await db.collection('products')
      .find(brandQuery)
      .project({
        _id: 1,
        name: 1,
        price: 1,
        discount: 1,
        image: 1,
        gallery: 1,
        brand: 1,
        unit: 1,
        categoryId: 1,
        slug: 1,
        is_active: 1
      })
      .toArray();
    
    // Normalize all products (parse gallery, validate image)
    const normalizedProducts = products.map(normalizeProduct);
    
    console.log(`✅ Found ${normalizedProducts.length} products for brand: ${primaryBrandName}`);
    
    // If no products found, try a more flexible search and show debug info
    if (products.length === 0) {
      console.log(`⚠️ No products found with exact match, trying flexible search...`);
      
      // Get all brands for debugging
      allBrands = await db.collection('products').distinct('brand', { 
        brand: { $exists: true, $ne: null, $ne: '' } 
      });
      console.log(`📋 All brands in database (${allBrands.length}):`, allBrands.slice(0, 30));
      
      // Check if any brand contains our search term
      matchingBrands = allBrands.filter(b => {
        const brandStr = String(b).toLowerCase();
        return brandVariations.some(v => brandStr.includes(v.toLowerCase()) || v.toLowerCase().includes(brandStr));
      });
      
      if (matchingBrands.length > 0) {
        console.log(`🎯 Found potentially matching brands:`, matchingBrands);
        // Try with matching brands
        const matchingPatterns = matchingBrands.map(b => new RegExp(String(b).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        const matchingQuery = {
          $or: matchingPatterns.map(pattern => ({ brand: pattern }))
        };
        const matchingProducts = await db.collection('products')
          .find(matchingQuery)
          .toArray();
        
        if (matchingProducts.length > 0) {
          // Normalize all products (parse gallery, validate image)
          const normalizedMatchingProducts = matchingProducts.map(normalizeProduct);
          console.log(`✅ Found ${normalizedMatchingProducts.length} products with matching brands`);
          return res.json({
            success: true,
            data: normalizedMatchingProducts,
            total: normalizedMatchingProducts.length
          });
        }
      }
      
      // Try a very flexible search (contains any word from brand name)
      const words = primaryBrandName.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 0) {
        const wordPatterns = words.map(word => 
          new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        );
        const flexibleQuery = {
          $or: wordPatterns.map(pattern => ({ brand: pattern }))
        };
        const flexibleProducts = await db.collection('products')
          .find(flexibleQuery)
          .toArray();
        
        console.log(`🔍 Flexible search (by words) found ${flexibleProducts.length} products`);
        
        if (flexibleProducts.length > 0) {
          // Normalize all products (parse gallery, validate image)
          const normalizedFlexibleProducts = flexibleProducts.map(normalizeProduct);
          return res.json({
            success: true,
            data: normalizedFlexibleProducts,
            total: normalizedFlexibleProducts.length
          });
        }
      }
      
      // If still no products, return empty array
      console.log(`❌ No products found for brand: ${primaryBrandName}`);
      return res.json({
        success: true,
        data: [],
        total: 0,
        debug: {
          searchedVariations: brandVariations,
          allBrandsCount: allBrands.length,
          matchingBrands: matchingBrands
        }
      });
    } else {
      res.json({
        success: true,
        data: normalizedProducts,
        total: normalizedProducts.length
      });
    }
  } catch (error) {
    console.error('❌ Error fetching products by brand:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint: Get all brand names in database
app.get('/api/products/brands/list', async (req, res) => {
  try {
    const brands = await db.collection('products').distinct('brand', { 
      brand: { $exists: true, $ne: null, $ne: '' } 
    });
    
    // Count products per brand
    const brandCounts = await db.collection('products').aggregate([
      { $match: { brand: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    res.json({
      success: true,
      total: brands.length,
      brands: brands.sort(),
      brandCounts: brandCounts
    });
  } catch (error) {
    console.error('Error fetching brands list:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Lấy sản phẩm hot (random 10 sản phẩm)
app.get('/api/products/hot', async (req, res) => {
  try {
    const products = await db.collection('products')
      .aggregate([
        { $sample: { size: 10 } },
        { $project: {
          _id: 1,
          name: 1,
          price: 1,
          discount: 1,
          image: 1,
          gallery: 1,
          brand: 1,
          unit: 1,
          categoryId: 1,
          slug: 1,
          is_active: 1
        }}
      ])
      .toArray();
    // Normalize all products (parse gallery, validate image)
    const normalizedProducts = products.map(normalizeProduct);
    res.json(normalizedProducts);
  } catch (error) {
    console.error('Error fetching hot products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lấy sản phẩm bán chạy (random 10 sản phẩm)
app.get('/api/products/bestseller', async (req, res) => {
  try {
    const products = await db.collection('products')
      .aggregate([
        { $sample: { size: 10 } },
        { $project: {
          _id: 1,
          name: 1,
          price: 1,
          discount: 1,
          image: 1,
          gallery: 1,
          brand: 1,
          unit: 1,
          categoryId: 1,
          slug: 1,
          is_active: 1
        }}
      ])
      .toArray();
    // Normalize all products (parse gallery, validate image)
    const normalizedProducts = products.map(normalizeProduct);
    res.json(normalizedProducts);
  } catch (error) {
    console.error('Error fetching bestseller products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lấy sản phẩm flash sale (random 10 sản phẩm có giá dưới 500k)
app.get('/api/products/flashsale', async (req, res) => {
  try {
    const products = await db.collection('products')
      .aggregate([
        { $match: { price: { $lt: 500000 } } },
        { $sample: { size: 10 } },
        { $project: {
          _id: 1,
          name: 1,
          price: 1,
          discount: 1,
          image: 1,
          gallery: 1,
          brand: 1,
          unit: 1,
          categoryId: 1,
          slug: 1,
          is_active: 1
        }}
      ])
      .toArray();
    // Normalize all products (parse gallery, validate image)
    const normalizedProducts = products.map(normalizeProduct);
    res.json(normalizedProducts);
  } catch (error) {
    console.error('Error fetching flashsale products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tìm kiếm sản phẩm bằng hình ảnh (OCR)
app.post('/api/search/image', (req, res, next) => {
  imageSearchUpload.array('images', IMAGE_SEARCH_LIMITS.MAX_FILES)(req, res, (err) => {
    if (err) {
      let message = 'Không thể tải hình ảnh lên. Vui lòng thử lại.';
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = `Dung lượng mỗi ảnh tối đa ${(IMAGE_SEARCH_LIMITS.MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)}MB.`;
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        message = `Bạn chỉ có thể tải tối đa ${IMAGE_SEARCH_LIMITS.MAX_FILES} ảnh mỗi lần.`;
      } else if (err.message === 'INVALID_FILE_TYPE') {
        message = 'Chỉ hỗ trợ các định dạng hình ảnh (JPG, PNG, WEBP, HEIC, ...).';
      }
      
      return res.status(400).json({
        success: false,
        message
      });
    }
    next();
  });
}, async (req, res) => {
  const startedAt = Date.now();

  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ đang khởi động, vui lòng thử lại sau vài giây.'
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một hình ảnh sản phẩm để tìm kiếm.'
      });
    }

    const ocrDetails = [];
    const aggregatedKeywords = new Set();

    for (const file of files) {
      const detail = {
        fileName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        durationMs: 0,
        ocrText: '',
        keywords: [],
        error: null
      };

      const start = Date.now();

      try {
        const filenameKeywords = extractKeywordsFromFilename(file.originalname);
        filenameKeywords.forEach(keyword => aggregatedKeywords.add(keyword));
        detail.keywords.push(...filenameKeywords);

        const { data } = await Tesseract.recognize(file.buffer, 'eng+vie', {
          logger: () => {}
        });

        const rawText = data?.text || '';
        detail.ocrText = rawText;
        const textKeywords = extractKeywordsFromText(rawText);
        detail.keywords.push(...textKeywords);
        textKeywords.forEach(keyword => aggregatedKeywords.add(keyword));
      } catch (ocrError) {
        console.warn('⚠️ OCR error:', ocrError.message);
        detail.error = ocrError.message;
      } finally {
        detail.durationMs = Math.round(Date.now() - start);
      }

      detail.keywords = Array.from(new Set(detail.keywords)).map(formatKeywordForDisplay);
      ocrDetails.push(detail);
    }

    const rawKeywords = Array.from(aggregatedKeywords)
      .filter(Boolean)
      .slice(0, 25);

    const displayKeywords = rawKeywords.map(formatKeywordForDisplay);

    if (!rawKeywords.length) {
      const processingMs = Math.round(Date.now() - startedAt);
      return res.status(200).json({
        success: true,
        keywords: [],
        rawKeywords: [],
        results: [],
        details: ocrDetails,
        processingMs,
        message: 'Không nhận diện được chữ trong ảnh. Vui lòng dùng ảnh rõ nét hơn, nhìn thẳng nhãn sản phẩm.'
      });
    }

    const regexConditions = [];
    rawKeywords.forEach(keyword => {
      const regex = new RegExp(escapeRegex(keyword), 'i');
      regexConditions.push({ name: regex });
      regexConditions.push({ brand: regex });
      regexConditions.push({ slug: regex });
      regexConditions.push({ shortDescription: regex });
      regexConditions.push({ description: regex });
    });

    const candidateProducts = await db.collection('products')
      .find({ $or: regexConditions })
      .limit(200)
      .project({
        name: 1,
        slug: 1,
        brand: 1,
        price: 1,
        original_price: 1,
        shortDescription: 1,
        description: 1,
        image: 1,
        images: 1,
        unit: 1,
        country: 1,
        tags: 1
      })
      .toArray();

    const resultsMap = new Map();

    for (const product of candidateProducts) {
      const searchText = buildProductSearchText(product);
      if (!searchText) {
        continue;
      }

      const matched = rawKeywords.filter(keyword => searchText.includes(keyword));
      if (!matched.length) {
        continue;
      }

      let score = 0;
      matched.forEach(keyword => {
        score += keyword.includes(' ') ? 3 : 1;
      });

      const productId = product._id?.toString?.() ?? String(product._id ?? '');

      if (!resultsMap.has(productId)) {
        resultsMap.set(productId, {
          data: mapProductForResponse(product),
          rawMatches: new Set(matched),
          score
        });
      } else {
        const entry = resultsMap.get(productId);
        matched.forEach(keyword => entry.rawMatches.add(keyword));
        entry.score = Math.max(entry.score, score);
      }
    }

    const processingMs = Math.round(Date.now() - startedAt);

    const results = Array.from(resultsMap.values())
      .map(entry => ({
        ...entry.data,
        matchedKeywords: Array.from(entry.rawMatches).map(formatKeywordForDisplay),
        score: entry.score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    res.json({
      success: true,
      keywords: displayKeywords,
      rawKeywords,
      results,
      details: ocrDetails,
      processingMs,
      total: results.length
    });
  } catch (error) {
    console.error('❌ Image search error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xử lý tìm kiếm bằng hình ảnh, vui lòng thử lại sau.',
      error: error.message
    });
  }
});

// Tìm kiếm sản phẩm theo từ khóa và bệnh lý
app.get('/api/products/search', searchLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json([]);
    }
    
    const searchTerm = String(q).trim();
    const searchPattern = new RegExp(escapeRegex(searchTerm), 'i');
    
    console.log('🔍 Searching products for:', searchTerm);
    
    // Search in multiple fields:
    // 1. Product name
    // 2. Brand
    // 3. Description
    // 4. Usage (contains disease/condition keywords)
    // 5. Ingredients (might contain disease-related terms)
    // 6. Category name (if available)
    
    const products = await db.collection('products')
      .find({ 
        $or: [
          { name: searchPattern },
          { brand: searchPattern },
          { description: searchPattern },
          { usage: searchPattern },
          { ingredients: searchPattern }
        ]
      })
      .limit(100) // Increase limit for search results
      .toArray();
    
    // Normalize all products (parse gallery, validate image)
    const normalizedProducts = products.map(normalizeProduct);
    
    console.log(`✅ Found ${normalizedProducts.length} products matching: ${searchTerm}`);
      
    res.json(normalizedProducts);
  } catch (error) {
    console.error('❌ Error searching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lấy chi tiết sản phẩm
app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('🔍 Finding product by ID:', productId);
    
    // Try to find by string _id first, then by ObjectId
    let product = await db.collection('products').findOne({ _id: productId });
    
    // If not found and ID looks like ObjectId, try with ObjectId
    if (!product && productId.match(/^[0-9a-fA-F]{24}$/)) {
      product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    }
      
    if (!product) {
      console.log('❌ Product not found:', productId);
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }
    
    // Normalize product data (parse gallery, validate image)
    const normalizedProduct = normalizeProduct(product);
    
    console.log('✅ Product found:', normalizedProduct.name);
    console.log('📸 Product image:', normalizedProduct.image);
    console.log('📸 Gallery images:', normalizedProduct.gallery?.length || 0);
    
    res.json({ 
      success: true,
      data: normalizedProduct 
    });
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Lấy sản phẩm liên quan
app.get('/api/products/:id/related', async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('🔍 Finding related products for:', productId);
    
    // Get current product first
    let currentProduct = await db.collection('products').findOne({ _id: productId });
    if (!currentProduct && productId.match(/^[0-9a-fA-F]{24}$/)) {
      currentProduct = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    }
    
    if (!currentProduct) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }
    
    // Build query for related products - only same category
    const relatedQuery = {
      _id: { $ne: currentProduct._id }, // Exclude current product
      isActive: true
    };
    
    // Only get products from same category
    if (currentProduct.categoryId) {
      relatedQuery.categoryId = currentProduct.categoryId;
      console.log('🏷️ Finding products in category:', currentProduct.categoryId);
    }
    
    // Fetch related products with projection
    const relatedProducts = await db.collection('products')
      .find(relatedQuery)
      .project({
        _id: 1,
        name: 1,
        price: 1,
        discount: 1,
        image: 1,
        gallery: 1,
        brand: 1,
        unit: 1,
        categoryId: 1,
        slug: 1,
        is_active: 1
      })
      .limit(8)
      .toArray();
    
    // Normalize all products (parse gallery, validate image)
    const normalizedRelatedProducts = relatedProducts.map(normalizeProduct);
    
    console.log('✅ Found', normalizedRelatedProducts.length, 'related products');
    
    res.json({ 
      success: true,
      data: normalizedRelatedProducts 
    });
  } catch (error) {
    console.error('❌ Error fetching related products:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ==================== REVIEWS ENDPOINTS ====================

// Lấy reviews summary của sản phẩm
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Đếm tổng số ratings
    const ratingsCount = await db.collection('ratings').countDocuments({ productId });
    
    // Đếm tổng số comments
    const commentsCount = await db.collection('comments').countDocuments({ productId });
    
    // Tính trung bình rating
    const ratings = await db.collection('ratings').find({ productId }).toArray();
    let averageRating = 0;
    let ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      averageRating = parseFloat((sum / ratings.length).toFixed(1));
      
      // Tính phân bố rating
      ratings.forEach(r => {
        ratingDistribution[r.rating]++;
      });
    }
    
    res.json({
      success: true,
      data: {
        productId,
        averageRating,
        totalReviews: ratingsCount,
        totalComments: commentsCount,
        ratingDistribution
      }
    });
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Lấy danh sách ratings của sản phẩm
app.get('/api/products/:id/ratings', async (req, res) => {
  try {
    const productId = req.params.id;
    const { filter = 'all' } = req.query; // all, 5, 4, 3, 2, 1
    
    let query = { productId };
    if (filter !== 'all') {
      query.rating = parseInt(filter);
    }
    
    const ratings = await db.collection('ratings')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    // Convert _id to string for all ratings
    const ratingsWithStringId = ratings.map(rating => ({
      ...rating,
      _id: rating._id.toString()
    }));
    
    res.json({
      success: true,
      data: ratingsWithStringId
    });
  } catch (error) {
    console.error('❌ Error fetching ratings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Lấy danh sách comments của sản phẩm
app.get('/api/products/:id/comments', async (req, res) => {
  try {
    const productId = req.params.id;
    const { sort = 'newest' } = req.query; // newest, oldest, helpful
    
    let sortQuery = { createdAt: -1 }; // Mới nhất
    if (sort === 'oldest') sortQuery = { createdAt: 1 };
    if (sort === 'helpful') sortQuery = { helpfulCount: -1 };
    
    const comments = await db.collection('comments')
      .find({ productId })
      .sort(sortQuery)
      .toArray();
    
    // Convert _id to string for all comments
    const commentsWithStringId = comments.map(comment => ({
      ...comment,
      _id: comment._id.toString()
    }));
    
    res.json({
      success: true,
      data: commentsWithStringId
    });
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Thêm rating mới
app.post('/api/products/:id/ratings', async (req, res) => {
  try {
    const productId = req.params.id;
    const { rating, userName, userId, userComment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating phải từ 1-5'
      });
    }
    
    // Check if user already rated this product
    if (userId) {
      const existingRating = await db.collection('ratings').findOne({
        productId,
        userId
      });
      
      if (existingRating) {
        return res.status(400).json({
          success: false,
          error: 'Bạn đã đánh giá sản phẩm này rồi'
        });
      }
    }
    
    const newRating = {
      productId,
      rating: parseInt(rating),
      userName: userName || 'Khách hàng',
      userId: userId || null,
      userComment: userComment || '',
      replies: [], // Array of replies
      createdAt: new Date()
    };
    
    const result = await db.collection('ratings').insertOne(newRating);
    console.log('✅ Rating added:', newRating);
    
    // Return rating with _id as string
    res.json({
      success: true,
      data: {
        ...newRating,
        _id: result.insertedId.toString()
      }
    });
  } catch (error) {
    console.error('❌ Error adding rating:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Thêm comment mới
app.post('/api/products/:id/comments', async (req, res) => {
  try {
    const productId = req.params.id;
    const { userName, userId, content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Nội dung bình luận không được trống'
      });
    }
    
    const newComment = {
      productId,
      userName: userName || 'Khách hàng',
      userId: userId || null,
      content: content.trim(),
      helpfulCount: 0,
      helpfulBy: [], // Array of userIds who marked this as helpful
      replies: [], // Array of replies
      createdAt: new Date()
    };
    
    const result = await db.collection('comments').insertOne(newComment);
    console.log('✅ Comment added:', newComment);
    
    // Return comment with _id as string
    res.json({
      success: true,
      data: {
        ...newComment,
        _id: result.insertedId.toString()
      }
    });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Đánh dấu comment là hữu ích
app.post('/api/comments/:commentId/helpful', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    const comment = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    const helpfulBy = comment.helpfulBy || [];
    const alreadyMarked = helpfulBy.includes(userId);
    
    let update;
    if (alreadyMarked) {
      // Remove from helpful
      update = {
        $pull: { helpfulBy: userId },
        $inc: { helpfulCount: -1 }
      };
    } else {
      // Add to helpful
      update = {
        $addToSet: { helpfulBy: userId },
        $inc: { helpfulCount: 1 }
      };
    }
    
    await db.collection('comments').updateOne(
      { _id: new ObjectId(commentId) },
      update
    );
    
    res.json({
      success: true,
      data: {
        isHelpful: !alreadyMarked,
        helpfulCount: comment.helpfulCount + (alreadyMarked ? -1 : 1)
      }
    });
  } catch (error) {
    console.error('❌ Error marking comment helpful:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Thêm reply cho rating
app.post('/api/ratings/:ratingId/replies', async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { userName, userId, content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Nội dung trả lời không được trống'
      });
    }
    
    const newReply = {
      _id: new ObjectId(),
      userName: userName || 'Khách hàng',
      userId: userId || null,
      content: content.trim(),
      createdAt: new Date()
    };
    
    // Add reply to rating's replies array
    await db.collection('ratings').updateOne(
      { _id: new ObjectId(ratingId) },
      { 
        $push: { replies: newReply }
      }
    );
    
    console.log('✅ Reply added to rating:', ratingId);
    
    res.json({
      success: true,
      data: {
        ...newReply,
        _id: newReply._id.toString()
      }
    });
  } catch (error) {
    console.error('❌ Error adding rating reply:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Thêm reply cho comment
app.post('/api/comments/:commentId/replies', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userName, userId, content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Nội dung trả lời không được trống'
      });
    }
    
    const newReply = {
      _id: new ObjectId(),
      userName: userName || 'Khách hàng',
      userId: userId || null,
      content: content.trim(),
      createdAt: new Date()
    };
    
    // Add reply to comment's replies array
    await db.collection('comments').updateOne(
      { _id: new ObjectId(commentId) },
      { 
        $push: { replies: newReply }
      }
    );
    
    console.log('✅ Reply added to comment:', commentId);
    
    res.json({
      success: true,
      data: {
        ...newReply,
        _id: newReply._id.toString()
      }
    });
  } catch (error) {
    console.error('❌ Error adding reply:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== CATEGORIES ENDPOINTS ====================

// Lấy danh sách danh mục
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.collection('categories')
      .find({})
      .sort({ level: 1, display_order: 1 })
      .toArray();
    
    // Normalize field names to match frontend expectations
    const normalizedCategories = categories.map(cat => ({
      ...cat,
      parent_id: cat.parentId || cat.parent_id || null,
      is_active: cat.is_active !== undefined ? cat.is_active : true,
      level: cat.level || (cat.parentId ? 2 : 1)
    }));
    
    res.json({
      success: true,
      data: normalizedCategories,
      total: normalizedCategories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Lấy chi tiết danh mục
app.get('/api/categories/:id', async (req, res) => {
  try {
    const category = await db.collection('categories')
      .findOne({ _id: req.params.id });
      
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== USERS ENDPOINTS ====================

// Lấy danh sách users (chỉ thông tin cơ bản)
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection('users')
      .find()
      .project({ phone: 1, 'profile.fullName': 1, status: 1 })
      .toArray();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CART ENDPOINTS ====================

// Lấy giỏ hàng theo userId
app.get('/api/carts/:userId', async (req, res) => {
  try {
    const cart = await db.collection('carts')
      .findOne({ user: req.params.userId });
      
    if (!cart) {
      return res.json({ 
        user: req.params.userId, 
        items: [], 
        totalAmount: 0 
      });
    }
    
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: error.message });
  }
});

// Thêm sản phẩm vào giỏ
app.post('/api/carts/:userId/items', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    const result = await db.collection('carts').updateOne(
      { user: req.params.userId },
      { 
        $push: { 
          items: { 
            product: productId, 
            quantity: parseInt(quantity)
          } 
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== FAQ ENDPOINTS ====================

// Lấy danh sách FAQ
app.get('/api/faq', async (req, res) => {
  try {
    const faqs = await db.collection('faq').find().toArray();
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROOT ENDPOINT ====================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MediCare Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      api: '/api',
      admin: '/api/admin',
      products: '/api/products',
      auth: '/api/auth'
    },
    documentation: 'See API documentation for more details',
    timestamp: new Date().toISOString()
  });
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', async (req, res) => {
  try {
    const stats = {
      status: 'OK',
      timestamp: new Date(),
      database: 'Connected',
      collections: {
        products: await db.collection('products').countDocuments(),
        categories: await db.collection('categories').countDocuments(),
        users: await db.collection('users').countDocuments(),
        carts: await db.collection('carts').countDocuments(),
        faq: await db.collection('faq').countDocuments(),
        benh: await db.collection('benh').countDocuments()
      }
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// ==================== TEST ENDPOINT ====================

// Test endpoint để xem dữ liệu mẫu
app.get('/api/test', async (req, res) => {
  try {
    const sampleProduct = await db.collection('products').findOne();
    const sampleCategory = await db.collection('categories').findOne();
    const sampleUser = await db.collection('users').findOne({}, { 
      projection: { phone: 1, 'profile.fullName': 1 }
    });
    
    res.json({
      message: 'API đang hoạt động!',
      sample: {
        product: sampleProduct,
        category: sampleCategory,
        user: sampleUser
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BLOGS (HEALTH CORNER) ENDPOINTS ====================

const BLOG_MATCH_CONDITION = {
  isApproved: { $ne: false }
};

const BLOG_PROJECTION = {
  slug: 1,
  title: 1,
  shortDescription: 1,
  headline: 1,
  publishedAt: 1,
  updatedAt: 1,
  createdAt: 1,
  primaryImage: 1,
  author: 1,
  category: 1,
  categories: 1,
  parentCategory: 1,
  breadcrumb: 1,
  tags: 1,
  hashtags: 1,
  approver: 1,
  detailSeo: 1,
  relatedArticles: 1,
  products: 1,
  url: 1,
  articleId: 1
};

// Lighter projection for list/overview pages
const BLOG_OVERVIEW_PROJECTION = {
  slug: 1,
  title: 1,
  shortDescription: 1,
  headline: 1,
  publishedAt: 1,
  primaryImage: 1,
  author: 1,
  category: 1,
  categories: 1,
  parentCategory: 1,
  url: 1
};

const normalizeBlogSlug = (slug) => {
  if (!slug) {
    return '';
  }
  return slug
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\//, '')
    .replace(/\.html$/i, '');
};

const normalizeCategorySlug = (slug) => {
  if (!slug) {
    return '';
  }
  return normalizeBlogSlug(String(slug)).toLowerCase();
};

const buildCategorySlugClauses = (slug) => {
  const normalized = normalizeCategorySlug(slug);
  if (!normalized) {
    return [];
  }

  const variants = new Set([normalized]);
  if (!normalized.startsWith('bai-viet/')) {
    variants.add(`bai-viet/${normalized}`);
  }

  return Array.from(variants).flatMap((variant) => {
    const regex = new RegExp(`^${escapeRegex(variant)}(?:/|$)`, 'i');
    return [
      { 'parentCategory.fullPathSlug': { $regex: regex } },
      { 'category.fullPathSlug': { $regex: regex } },
      { 'categories.fullPathSlug': { $regex: regex } }
    ];
  });
};

const BLOG_CATEGORY_ICON_MAP = {
  'bai-viet/phong-benh-song-khoe/y-hoc-co-truyen': 'https://cdn.nhathuoclongchau.com.vn/unsafe/96x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/blog/y_hoc_co_truyen.png',
  'bai-viet/phong-benh-song-khoe/kien-thuc-y-khoa': 'https://cdn.nhathuoclongchau.com.vn/unsafe/96x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/blog/kien_thuc_y_khoa.png',
  'bai-viet/phong-benh-song-khoe/suc-khoe-gia-dinh': 'https://cdn.nhathuoclongchau.com.vn/unsafe/96x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/blog/suc_khoe_gia_dinh.png',
  'bai-viet/phong-benh-song-khoe/tiem-chung': 'https://cdn.nhathuoclongchau.com.vn/unsafe/96x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/blog/tiem_chung.png',
  'bai-viet/phong-benh-song-khoe/tam-ly-tam-than': 'https://cdn.nhathuoclongchau.com.vn/unsafe/96x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/blog/tam_ly_tam_than.png'
};

const resolveBlogCategoryIcon = (slug) => {
  if (!slug) {
    return null;
  }
  return BLOG_CATEGORY_ICON_MAP[normalizeCategorySlug(slug)] || null;
};

const findCategoryMetadata = (article, slugVariants) => {
  if (!article) {
    return null;
  }

  const candidates = [
    ...(article.categories || []),
    article.category,
    article.parentCategory
  ].filter(Boolean);

  for (const variant of slugVariants) {
    const normalizedVariant = normalizeCategorySlug(variant);
    const matched = candidates.find((cat) => normalizeCategorySlug(cat?.fullPathSlug || cat?.slug || cat?.name) === normalizedVariant);
    if (matched) {
      return matched;
    }
  }

  return candidates[0] || null;
};

const buildCategoryBreadcrumb = (rawBreadcrumb, categoryName, categorySlug) => {
  const trail = Array.isArray(rawBreadcrumb)
    ? rawBreadcrumb
        .filter((item) => item && item.name)
        .map((item) => ({
          name: item.name,
          slug: normalizeCategorySlug(item.slug || item.fullPathSlug || item.name)
        }))
    : [];

  const base = [
    { name: 'Trang chủ', slug: '/' },
    { name: 'Góc sức khỏe', slug: 'blogs' }
  ];

  const categoryEntry = {
    name: categoryName,
    slug: normalizeCategorySlug(categorySlug)
  };

  const mergedTrail = [...base];

  trail.forEach((item) => {
    if (!mergedTrail.find((entry) => entry.slug === item.slug)) {
      mergedTrail.push(item);
    }
  });

  if (!mergedTrail.find((entry) => entry.slug === categoryEntry.slug)) {
    mergedTrail.push(categoryEntry);
  }

  return mergedTrail;
};

const derivePrimaryCategory = (article) => {
  if (!article) {
    return { name: null, slug: null };
  }

  const category =
    article.category ||
    article.categories?.find?.((cat) => cat?.isPrimary) ||
    article.parentCategory ||
    article.categories?.find?.((cat) => cat?.level === 1) ||
    null;

  return {
    name: category?.name ?? null,
    slug: category?.fullPathSlug ?? null
  };
};

const resolveArticleImage = (article) => {
  if (!article) {
    return null;
  }

  // Try multiple sources for primary image
  // 1. primaryImage as string (direct URL)
  if (article.primaryImage && typeof article.primaryImage === 'string' && article.primaryImage.trim() !== '' && article.primaryImage !== 'null') {
    return article.primaryImage;
  }
  
  // 2. primaryImage as object with url property
  if (article.primaryImage?.url && typeof article.primaryImage.url === 'string' && article.primaryImage.url.trim() !== '' && article.primaryImage.url !== 'null') {
    return article.primaryImage.url;
  }
  
  // 3. primary_image (snake_case) as string
  if (article.primary_image && typeof article.primary_image === 'string' && article.primary_image.trim() !== '' && article.primary_image !== 'null') {
    return article.primary_image;
  }
  
  // 4. primary_image as object with url property
  if (article.primary_image?.url && typeof article.primary_image.url === 'string' && article.primary_image.url.trim() !== '' && article.primary_image.url !== 'null') {
    return article.primary_image.url;
  }
  
  // 5. detailSeo openGraph image
  if (article.detailSeo?.openGraph?.image?.url && typeof article.detailSeo.openGraph.image.url === 'string' && article.detailSeo.openGraph.image.url.trim() !== '' && article.detailSeo.openGraph.image.url !== 'null') {
    return article.detailSeo.openGraph.image.url;
  }
  
  // 6. detailSeo metaSocial image
  if (article.detailSeo?.metaSocial?.[0]?.image?.url && typeof article.detailSeo.metaSocial[0].image.url === 'string' && article.detailSeo.metaSocial[0].image.url.trim() !== '' && article.detailSeo.metaSocial[0].image.url !== 'null') {
    return article.detailSeo.metaSocial[0].image.url;
  }

  return null;
};

const buildBlogSummary = (article) => {
  const publishedAt = article?.publishedAt || article?.updatedAt || article?.createdAt || null;
  const primaryCategory = derivePrimaryCategory(article);
  const rawSlug = article?.slug || article?._id || article?.articleId || '';
  const cleanSlug = normalizeBlogSlug(rawSlug);

  return {
    id: article?.articleId ?? cleanSlug ?? rawSlug,
    slug: rawSlug,
    cleanSlug,
    url: article?.url ?? null,
    title: article?.title ?? '',
    shortDescription: article?.shortDescription ?? '',
    headline: article?.headline ?? '',
    publishedAt,
    author: article?.author?.fullName ?? article?.author?.nickName ?? article?.author ?? null,
    category: primaryCategory.name,
    categorySlug: primaryCategory.slug,
    primaryImage: resolveArticleImage(article),
    tags: article?.tags ?? [],
    hashtags: article?.hashtags ?? [],
    breadcrumb: article?.breadcrumb ?? [],
    categoryTrail: (article?.categories ?? []).map((cat) => ({
      name: cat?.name ?? null,
      slug: cat?.fullPathSlug ?? null,
      level: cat?.level ?? null,
      isPrimary: cat?.isPrimary ?? false
    }))
  };
};

async function fetchTrendingTags(limit = 12) {
  const tags = await db.collection('blogs').aggregate([
    { $match: { ...BLOG_MATCH_CONDITION, tags: { $exists: true, $ne: [] } } },
    { $unwind: '$tags' },
    { $group: {
      _id: '$tags.slug',
      title: { $first: '$tags.title' },
      count: { $sum: 1 }
    }},
    { $sort: { count: -1, title: 1 } },
    { $limit: limit }
  ]).toArray();

  return tags.map(tag => ({
    slug: tag._id,
    title: tag.title,
    articleCount: tag.count
  }));
}

async function fetchExperts(limit = 8) {
  const experts = await db.collection('blogs').aggregate([
    { $match: { ...BLOG_MATCH_CONDITION, approver: { $exists: true, $ne: null } } },
    { $group: {
      _id: '$approver.id',
      fullName: { $first: '$approver.fullName' },
      position: { $first: '$approver.position' },
      degree: { $first: '$approver.degree' },
      avatar: { $first: '$approver.avatar.url' },
      slug: { $first: '$approver.slug' },
      totalArticles: { $sum: 1 }
    }},
    { $sort: { totalArticles: -1, fullName: 1 } },
    { $limit: limit }
  ]).toArray();

  return experts.map(expert => ({
    id: expert._id,
    fullName: expert.fullName,
    degree: expert.degree ?? null,
    position: expert.position ?? null,
    avatar: expert.avatar ?? null,
    slug: expert.slug ?? null,
    articleCount: expert.totalArticles
  }));
}

async function fetchCategoryOverview(options = {}) {
  const {
    categoryLimit = 6,
    articlesPerCategory = 5,
    subcategoryLimit = 6
  } = options;

  // Step 1: Get top categories
  const categoriesAgg = await db.collection('blogs').aggregate([
    { $match: BLOG_MATCH_CONDITION },
    { $addFields: {
        primaryCategory: {
          $cond: [
            { $ifNull: ['$parentCategory', false] },
            '$parentCategory',
            {
              $let: {
                vars: { levelOne: {
                  $filter: {
                    input: '$categories',
                    as: 'cat',
                    cond: { $eq: ['$$cat.level', 1] }
                  }
                }},
                in: { $arrayElemAt: ['$$levelOne', 0] }
              }
            }
          ]
        }
      }
    },
    { $match: { 'primaryCategory.name': { $exists: true, $ne: null } } },
    { $group: {
      _id: '$primaryCategory.fullPathSlug',
      name: { $first: '$primaryCategory.name' },
      count: { $sum: 1 }
    }},
    { $sort: { count: -1, name: 1 } },
    { $limit: categoryLimit }
  ]).toArray();

  if (categoriesAgg.length === 0) {
    return [];
  }

  // Step 2: Get all category slugs for batch queries
  const categorySlugs = categoriesAgg.map(cat => cat._id);
  const slugRegexes = categorySlugs.map(slug => new RegExp(`^${escapeRegex(slug)}`));

  // Step 3: Fetch articles per category separately to avoid memory issues
  // Instead of one large aggregation with $push, fetch each category separately
  const articlesMap = new Map();
  
  for (const categorySlug of categorySlugs) {
    try {
      const articles = await db.collection('blogs')
        .find({
          ...BLOG_MATCH_CONDITION,
          $or: [
            { 'parentCategory.fullPathSlug': categorySlug },
            { 'categories.fullPathSlug': categorySlug }
          ]
        })
        .project(BLOG_OVERVIEW_PROJECTION)
        .sort({ publishedAt: -1 })
        .limit(articlesPerCategory)
        .toArray();
      
      // Clean up invalid images in category articles
      const cleanedArticles = articles.map(buildBlogSummary).map(item => {
        if (!item.primaryImage || 
            typeof item.primaryImage !== 'string' ||
            item.primaryImage.trim() === '' || 
            item.primaryImage === 'null' || 
            item.primaryImage === 'undefined') {
          item.primaryImage = null;
        }
        return item;
      });
      articlesMap.set(categorySlug, cleanedArticles);
    } catch (error) {
      console.error(`Error fetching articles for category ${categorySlug}:`, error);
      articlesMap.set(categorySlug, []);
    }
  }

  // Step 4: Fetch subcategories per category separately to avoid memory issues
  const subcategoriesMap = new Map();
  for (const categorySlug of categorySlugs) {
    try {
      const subcategoryDocs = await db.collection('blogs')
        .find({
          ...BLOG_MATCH_CONDITION,
          $or: [
            { 'parentCategory.fullPathSlug': categorySlug },
            { 'categories.fullPathSlug': categorySlug }
          ]
        })
        .project({ categories: 1 })
        .toArray();
      
      // Extract subcategories (level >= 2) that match this category
      const subcatMap = new Map();
      subcategoryDocs.forEach(doc => {
        if (doc.categories && Array.isArray(doc.categories)) {
          doc.categories.forEach(cat => {
            if (cat.level >= 2 && cat.fullPathSlug && cat.fullPathSlug.startsWith(categorySlug)) {
              const slug = cat.fullPathSlug;
              if (!subcatMap.has(slug)) {
                subcatMap.set(slug, { name: cat.name, slug: slug, count: 0 });
              }
              subcatMap.get(slug).count++;
            }
          });
        }
      });
      
      const subcategories = Array.from(subcatMap.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, subcategoryLimit);
      
      subcategoriesMap.set(categorySlug, subcategories);
    } catch (error) {
      console.error(`Error fetching subcategories for category ${categorySlug}:`, error);
      subcategoriesMap.set(categorySlug, []);
    }
  }

  // Step 5: Combine results
  const categories = categoriesAgg.map(category => {
    const categorySlug = category._id;
    return {
      name: category.name,
      slug: categorySlug,
      articleCount: category.count,
      articles: articlesMap.get(categorySlug) || [],
      subcategories: subcategoriesMap.get(categorySlug) || []
    };
  });

  return categories;
}

async function fetchBlogOverview(options = {}) {
  const {
    heroLimit = 6,
    latestLimit = 12
  } = options;

  // Use lighter projection for overview pages
  const projection = BLOG_OVERVIEW_PROJECTION;

  const [heroArticlesRaw, latestArticlesRaw, categories, trendingTags, experts] = await Promise.all([
    db.collection('blogs')
      .find(BLOG_MATCH_CONDITION)
      .project(projection)
      .sort({ publishedAt: -1 })
      .limit(heroLimit)
      .toArray(),
    db.collection('blogs')
      .find(BLOG_MATCH_CONDITION)
      .project(projection)
      .sort({ publishedAt: -1 })
      .limit(latestLimit)
      .toArray(),
    fetchCategoryOverview(options),
    fetchTrendingTags(options.tagLimit || 12),
    fetchExperts(options.expertLimit || 8)
  ]);

  // Clean up invalid image URLs in blog summaries
  const cleanBlogSummary = (item) => {
    const summary = buildBlogSummary(item);
    // If primaryImage is invalid, set to null (frontend will use fallback)
    if (!summary.primaryImage || 
        typeof summary.primaryImage !== 'string' ||
        summary.primaryImage.trim() === '' || 
        summary.primaryImage === 'null' || 
        summary.primaryImage === 'undefined') {
      summary.primaryImage = null;
    }
    return summary;
  };

  return {
    heroArticles: heroArticlesRaw.map(cleanBlogSummary),
    latestArticles: latestArticlesRaw.map(cleanBlogSummary),
    categories,
    trendingTags,
    experts
  };
}

async function fetchBlogBySlug(slugParam) {
  if (!slugParam) {
    return null;
  }

  const normalized = normalizeBlogSlug(slugParam);
  const variations = Array.from(new Set([
    slugParam,
    normalized,
    `${normalized}.html`,
    `bai-viet/${normalized}`,
    `bai-viet/${normalized}.html`
  ])).filter(Boolean);

  const article = await db.collection('blogs').findOne({
    $or: [
      { slug: { $in: variations } },
      { _id: { $in: variations } },
      { url: { $regex: `${escapeRegex(normalized)}(\\.html)?$`, $options: 'i' } }
    ]
  }, { projection: { ...BLOG_PROJECTION, descriptionHtml: 1, shortDescription: 1, longFormEnable: 1, breadcrumb: 1 } });

  if (!article) {
    return null;
  }

  const summary = buildBlogSummary(article);
  
  // Clean up invalid primaryImage
  if (!summary.primaryImage || 
      typeof summary.primaryImage !== 'string' ||
      summary.primaryImage.trim() === '' || 
      summary.primaryImage === 'null' || 
      summary.primaryImage === 'undefined') {
    summary.primaryImage = null;
  }

  return {
    ...summary,
    descriptionHtml: article.descriptionHtml ?? '',
    shortDescription: article.shortDescription ?? '',
    detailSeo: article.detailSeo ?? null,
    tags: article.tags ?? [],
    hashtags: article.hashtags ?? [],
    approver: article.approver ?? null,
    products: article.products ?? [],
    relatedArticles: (article.relatedArticles ?? []).map((related) => ({
      id: related?.id ?? related?.slug ?? null,
      name: related?.name ?? '',
      slug: related?.slug ?? '',
      cleanSlug: normalizeBlogSlug(related?.slug ?? ''),
      createdAt: related?.createdAt ?? null,
      redirectUrl: related?.redirectUrl ?? null
    })),
    breadcrumb: article.breadcrumb ?? summary.breadcrumb ?? []
  };
}

// Overview endpoint
app.get('/api/blogs/overview', async (req, res) => {
  try {
    const data = await fetchBlogOverview({
      heroLimit: Number.parseInt(req.query.heroLimit, 10) || 6,
      latestLimit: Number.parseInt(req.query.latestLimit, 10) || 12,
      categoryLimit: Number.parseInt(req.query.categoryLimit, 10) || 6,
      articlesPerCategory: Number.parseInt(req.query.articlesPerCategory, 10) || 5,
      subcategoryLimit: Number.parseInt(req.query.subcategoryLimit, 10) || 6,
      tagLimit: Number.parseInt(req.query.tagLimit, 10) || 12,
      expertLimit: Number.parseInt(req.query.expertLimit, 10) || 8
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error fetching blog overview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/blogs/category/:slug', async (req, res) => {
  try {
    const rawSlugParam = req.params.slug || '';
    let decodedSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlugParam);
    } catch {
      decodedSlug = rawSlugParam;
    }

    const normalizedSlug = normalizeCategorySlug(decodedSlug);
    if (!normalizedSlug) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category slug'
      });
    }

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 48);
    const subcategoryLimit = Math.min(Math.max(Number.parseInt(req.query.subcategoryLimit, 10) || 8, 0), 60);

    const rawSubcategory = req.query.subcategory ? String(req.query.subcategory) : null;
    const normalizedSubcategory = rawSubcategory ? normalizeCategorySlug(rawSubcategory) : null;

    const slugVariants = new Set([normalizedSlug]);
    const withoutPrefix = normalizedSlug.replace(/^bai-viet\//, '');
    slugVariants.add(withoutPrefix);
    slugVariants.add(`bai-viet/${withoutPrefix}`);

    const descendantClauses = buildCategorySlugClauses(normalizedSlug);
    if (descendantClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Unable to resolve category slug'
      });
    }

    const collection = db.collection('blogs');

    const descendantMatch = {
      ...BLOG_MATCH_CONDITION,
      $or: descendantClauses
    };

    const sampleArticle = await collection.findOne(descendantMatch, {
      projection: {
        parentCategory: 1,
        category: 1,
        categories: 1,
        breadcrumb: 1
      }
    });

    if (!sampleArticle) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const matchedCategory = findCategoryMetadata(sampleArticle, Array.from(slugVariants));
    const canonicalSlug = matchedCategory?.fullPathSlug
      ? normalizeCategorySlug(matchedCategory.fullPathSlug)
      : normalizedSlug;

    const canonicalClauses = buildCategorySlugClauses(canonicalSlug);
    const canonicalMatch = {
      ...BLOG_MATCH_CONDITION,
      $or: canonicalClauses.length > 0 ? canonicalClauses : descendantClauses
    };

    const categoryLevel = matchedCategory?.level ?? sampleArticle.category?.level ?? sampleArticle.parentCategory?.level ?? 1;
    const numericCategoryLevel = Number.isFinite(Number(categoryLevel)) ? Number(categoryLevel) : null;

    const fallbackName = canonicalSlug
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.replace(/\b\w/g, (char) => char.toUpperCase()) || decodedSlug;

    const categoryName = matchedCategory?.name || fallbackName || 'Chuyên mục';

    const subcategoryMatchConditions = [
      { 'categories.fullPathSlug': { $regex: new RegExp(`^${escapeRegex(canonicalSlug)}(?:/|$)`, 'i') } },
      { 'categories.fullPathSlug': { $ne: canonicalSlug } }
    ];

    if (Number.isFinite(numericCategoryLevel)) {
      subcategoryMatchConditions.push({ 'categories.level': { $gte: (numericCategoryLevel ?? 1) + 1 } });
    }

    const subcategoriesRaw = subcategoryLimit > 0
      ? await collection.aggregate([
          { $match: canonicalMatch },
          { $unwind: '$categories' },
          { $match: { $and: subcategoryMatchConditions } },
          { $group: {
              _id: '$categories.fullPathSlug',
              name: { $first: '$categories.name' },
              level: { $first: '$categories.level' },
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1, name: 1 } },
          { $limit: subcategoryLimit }
        ]).toArray()
      : [];

    const subcategories = subcategoriesRaw.map((sub) => ({
      name: sub?.name || '',
      slug: normalizeCategorySlug(sub?._id || sub?.slug || ''),
      originalSlug: sub?._id || null,
      level: sub?.level ?? null,
      articleCount: sub?.count ?? 0,
      icon: resolveBlogCategoryIcon(sub?._id || '')
    }));

    const articleMatch = { ...canonicalMatch };

    if (normalizedSubcategory) {
      const subcategoryClauses = buildCategorySlugClauses(normalizedSubcategory);
      if (subcategoryClauses.length > 0) {
        articleMatch.$and = [...(articleMatch.$and || []), { $or: subcategoryClauses }];
      }
    }

    const total = await collection.countDocuments(articleMatch);

    const articlesRaw = await collection
      .find(articleMatch)
      .project(BLOG_PROJECTION)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .toArray();

    // Clean up invalid images in category articles
    const articles = articlesRaw.map(buildBlogSummary).map(item => {
      if (!item.primaryImage || 
          typeof item.primaryImage !== 'string' ||
          item.primaryImage.trim() === '' || 
          item.primaryImage === 'null' || 
          item.primaryImage === 'undefined') {
        item.primaryImage = null;
      }
      return item;
    });

    const selectedSubcategory = normalizedSubcategory
      ? subcategories.find((sub) => sub.slug === normalizeCategorySlug(normalizedSubcategory)) || null
      : null;

    const breadcrumb = buildCategoryBreadcrumb(sampleArticle?.breadcrumb, categoryName, canonicalSlug);

    res.json({
      success: true,
      data: {
        category: {
          name: categoryName,
          slug: canonicalSlug,
          articleCount: total,
          level: numericCategoryLevel ?? null
        },
        breadcrumb,
        subcategories,
        selectedSubcategory,
        selectedSubcategorySlug: normalizedSubcategory,
        selectedSubcategoryRaw: rawSubcategory,
        articles,
        limit,
        total,
        remaining: Math.max(total - articles.length, 0)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching blog category detail:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Blog detail endpoint
app.get('/api/blogs/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const article = await fetchBlogBySlug(slug);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('❌ Error fetching blog detail:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Backward compatibility with previous /api/articles endpoints
app.get('/api/articles', async (req, res) => {
  try {
    const data = await fetchBlogOverview({
      heroLimit: Number.parseInt(req.query.heroLimit, 10) || 6,
      latestLimit: Number.parseInt(req.query.latestLimit, 10) || 12,
      categoryLimit: Number.parseInt(req.query.categoryLimit, 10) || 6,
      articlesPerCategory: Number.parseInt(req.query.articlesPerCategory, 10) || 5,
      subcategoryLimit: Number.parseInt(req.query.subcategoryLimit, 10) || 6,
      tagLimit: Number.parseInt(req.query.tagLimit, 10) || 12,
      expertLimit: Number.parseInt(req.query.expertLimit, 10) || 8
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error fetching articles overview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/articles/:slug', async (req, res) => {
  try {
    const article = await fetchBlogBySlug(req.params.slug);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('❌ Error fetching article detail:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== DISEASES ENDPOINTS ====================

// Lấy danh sách nhóm bệnh chuyên khoa (must be before /:slugOrId route)
app.get('/api/diseases/specialized-groups', async (req, res) => {
  try {
    // Slugify helper
    function slugify(str) {
      const map = {
        'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
        'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
        'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
        'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
        'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
        'đ': 'd'
      };
      
      return str.toLowerCase()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, match => map[match] || match)
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    }

    // Icon mapping - fallback icons for categories (can be replaced with images)
    const iconMapping = {
      'Ung thư': { icon: '🎗️', image: null },
      'Tim mạch': { icon: '❤️', image: null },
      'Nội tiết - chuyển hóa': { icon: '⚖️', image: null },
      'Cơ - Xương - Khớp': { icon: '🦴', image: null },
      'Da - Tóc - Móng': { icon: '💅', image: null },
      'Máu': { icon: '🩸', image: null },
      'Hô hấp': { icon: '🫁', image: null },
      'Dị ứng': { icon: '🤧', image: null },
      'Mắt': { icon: '👁️', image: null },
      'Răng - Hàm - Mặt': { icon: '🦷', image: null },
      'Sức khỏe giới tính': { icon: '⚧️', image: null },
      'Sức khỏe sinh sản': { icon: '👶', image: null },
      'Tai - Mũi - Họng': { icon: '👂', image: null },
      'Tâm thần': { icon: '🧠', image: null },
      'Thận - Tiết niệu': { icon: '🫘', image: null },
      'Thần kinh - Tinh thần': { icon: '🧠', image: null },
      'Tiêu hóa': { icon: '🫀', image: null },
      'Truyền nhiễm': { icon: '🦠', image: null }
    };

    // Get all unique categories from diseases collection
    const diseases = await db.collection('benh')
      .find({ 'categories': { $exists: true, $ne: [] } })
      .project({ categories: 1 })
      .toArray();

    // Extract unique category names and their counts
    const categoryCounts = new Map();
    
    diseases.forEach(disease => {
      if (disease.categories && Array.isArray(disease.categories)) {
        disease.categories.forEach(cat => {
          if (cat && cat.name) {
            const categoryName = cat.name;
            categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);
          }
        });
      }
    });

    // Categories to exclude (normalized for case-insensitive comparison)
    const excludedCategories = [
      // Body parts
      'Đầu', 'đầu', 'ĐẦU',
      'Bụng', 'bụng', 'BỤNG',
      'Tứ Chi', 'Tứ chi', 'tứ chi', 'TỨ CHI',
      'Ngực', 'ngực', 'NGỰC',
      'Da', 'da', 'DA',
      'Sinh Dục', 'Sinh dục', 'sinh dục', 'SINH DỤC',
      'Cổ', 'cổ', 'CỔ',
      // Other unwanted categories
      'Bệnh trẻ em', 'Bệnh Trẻ Em', 'bệnh trẻ em',
      'Bệnh thường gặp', 'Bệnh Thường Gặp', 'bệnh thường gặp',
      'Bệnh nữ giới', 'Bệnh Nữ Giới', 'bệnh nữ giới',
      'Nhóm bệnh', 'Nhóm Bệnh', 'nhóm bệnh',
      'Xem theo bộ phận cơ thể', 'Xem Theo Bộ Phận Cơ Thể', 'xem theo bộ phận cơ thể',
      'Bệnh nam giới', 'Bệnh Nam Giới', 'bệnh nam giới',
      'Bệnh người già', 'Bệnh Người Già', 'bệnh người già',
      'Bệnh Theo Mùa', 'Bệnh theo mùa', 'bệnh theo mùa', 'Bệnh Theo Mùa'
    ];

    // Helper function to normalize category name for comparison
    const normalizeCategoryName = (name) => {
      if (!name) {
        return '';
      }
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim();
    };

    // Normalize excluded categories for faster lookup
    const excludedCategoriesNormalized = excludedCategories.map(name =>
      normalizeCategoryName(name)
    );

    // Build groups array with icon/image support
    const groups = [];
    for (const [categoryName, count] of categoryCounts.entries()) {
      // Skip excluded categories (case-insensitive comparison)
      const normalizedName = normalizeCategoryName(categoryName);
      if (excludedCategoriesNormalized.includes(normalizedName)) {
        continue;
      }
      
      const iconConfig = iconMapping[categoryName] || { icon: '🏥', image: null };
      
      groups.push({
        id: slugify(categoryName),
        name: categoryName,
        icon: iconConfig.icon,
        image: iconConfig.image, // null hoặc URL của hình ảnh nếu có
        count: count
      });
    }

    // Sort by count descending
    groups.sort((a, b) => b.count - a.count);

    console.log(`🏥 Serving ${groups.length} specialized groups from MongoDB`);

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('❌ Error fetching specialized groups:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Lấy danh sách bệnh theo nhóm chuyên khoa (for specialized groups section)
app.get('/api/diseases/by-specialized-group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50 } = req.query;

    // Slugify helper (same as in specialized-groups endpoint)
    function slugify(str) {
      const map = {
        'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
        'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
        'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
        'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
        'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
        'đ': 'd'
      };
      
      return str.toLowerCase()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, match => map[match] || match)
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    }

    // Get all unique categories to find category name from slug
    const diseases = await db.collection('benh')
      .find({ 'categories': { $exists: true, $ne: [] } })
      .project({ categories: 1 })
      .toArray();

    // Find category name by slug
    let categoryName = null;
    const categoryMap = new Map();
    
    diseases.forEach(disease => {
      if (disease.categories && Array.isArray(disease.categories)) {
        disease.categories.forEach(cat => {
          if (cat && cat.name) {
            const slug = slugify(cat.name);
            if (!categoryMap.has(slug)) {
              categoryMap.set(slug, cat.name);
            }
          }
        });
      }
    });

    categoryName = categoryMap.get(groupId);

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group ID'
      });
    }

    // Get diseases for this category
    const diseases_result = await db.collection('benh')
      .find({ 'categories.name': categoryName })
      .project({
        id: 1,
        name: 1,
        slug: 1,
        headline: 1,
        summary: 1,
        primary_image: 1,
        slider_images: 1,
        categories: 1
      })
      .limit(parseInt(limit))
      .toArray();

    // Normalize all diseases (parse images)
    const normalizedDiseases = diseases_result.map(normalizeDisease);

    console.log(`🏥 Serving ${normalizedDiseases.length} diseases for group: ${categoryName}`);

    res.json({
      success: true,
      data: normalizedDiseases
    });
  } catch (error) {
    console.error('❌ Error fetching diseases by group:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Lấy danh sách bệnh
app.get('/api/diseases', async (req, res) => {
  try {
    const { limit = 20, skip = 0, search, category } = req.query;
    
    let query = {};
    
    // Search by name or headline
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { headline: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by category if provided
    if (category) {
      // Try to find category name from slug by checking all diseases
      const sampleDiseases = await db.collection('benh')
        .find({ 'categories': { $exists: true, $ne: [] } })
        .project({ categories: 1 })
        .limit(1000)
        .toArray();

      let categoryName = null;
      const categoryMap = new Map();
      
      sampleDiseases.forEach(disease => {
        if (disease.categories && Array.isArray(disease.categories)) {
          disease.categories.forEach(cat => {
            if (cat && cat.name) {
              const slug = category.toLowerCase().replace(/\s+/g, '-');
              const catSlug = cat.name.toLowerCase()
                .replace(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, match => {
                  const map = { 'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e', 'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o', 'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u', 'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'đ': 'd' };
                  return map[match] || match;
                })
                .replace(/\s+/g, '-');
              if (catSlug === slug || cat.name.toLowerCase().includes(category.toLowerCase())) {
                categoryName = cat.name;
              }
            }
          });
        }
      });

      if (categoryName) {
        query['categories.name'] = categoryName;
      } else {
        // Fallback to slug search
        query['categories.fullPathSlug'] = { $regex: category, $options: 'i' };
      }
    }
    
    const diseases = await db.collection('benh')
      .find(query)
      .project({ 
        id: 1, 
        name: 1, 
        slug: 1, 
        headline: 1, 
        summary: 1,
        primary_image: 1,
        slider_images: 1,
        categories: 1,
        tags: 1
      })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();
    
    // Normalize all diseases (parse images)
    const normalizedDiseases = diseases.map(normalizeDisease);
    
    const total = await db.collection('benh').countDocuments(query);
    
    console.log(`🏥 Serving ${normalizedDiseases.length} diseases (total: ${total})`);
    
    res.json({
      success: true,
      data: {
        diseases: normalizedDiseases,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching diseases:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Lấy chi tiết bệnh theo slug hoặc ID
app.get('/api/diseases/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    
    let disease;
    
    // Try to find by numeric ID first
    if (!isNaN(slugOrId)) {
      disease = await db.collection('benh').findOne({ id: parseInt(slugOrId) });
    }
    
    // If not found, try by slug
    if (!disease) {
      disease = await db.collection('benh').findOne({ slug: slugOrId });
    }
    
    // If still not found, try by MongoDB _id
    if (!disease) {
      try {
        disease = await db.collection('benh').findOne({ _id: new ObjectId(slugOrId) });
      } catch (e) {
        // Invalid ObjectId, ignore
      }
    }
    
    if (!disease) {
      return res.status(404).json({
        success: false,
        error: 'Disease not found'
      });
    }
    
    // Normalize disease (parse images)
    const normalizedDisease = normalizeDisease(disease);
    
    console.log(`🏥 Serving disease: ${normalizedDisease.name}`);
    console.log(`📸 Primary image:`, normalizedDisease.primary_image);
    console.log(`📸 Slider images:`, normalizedDisease.slider_images?.length || 0);
    
    res.json({
      success: true,
      data: normalizedDisease
    });
  } catch (error) {
    console.error('❌ Error fetching disease:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== AUTHENTICATION ENDPOINTS ====================

// Đăng ký user mới
// Import validation middleware at top of auth routes
const { 
  registerValidation, 
  loginValidation, 
  forgotPasswordValidation 
} = require('./middleware/validation');

app.post('/api/auth/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const { email, password, phone, name } = req.body;

    // Validate input
    if (!email || !password || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ thông tin!' 
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await db.collection('users').findOne({ 
      $or: [{ mail: email }, { phone: phone }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email hoặc số điện thoại đã được đăng ký!' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = {
      mail: email,
      phone: phone,
      password: hashedPassword,
      status: 'active',
      profile: {
        name: name || 'User',
        avatar: null
      },
      roles: ['user'],
      addresses: [],
      createdAt: new Date(),
      __v: 0
    };

    const result = await db.collection('users').insertOne(newUser);

    // Tạo JWT token
    const token = jwt.sign(
      { userId: result.insertedId, email: email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      data: {
        userId: result.insertedId,
        email: email,
        phone: phone,
        name: name || 'User',
        token: token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server, vui lòng thử lại!' 
    });
  }
});

// Đăng nhập
app.post('/api/auth/login', authLimiter, loginValidation, async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { email: req.body.email, origin: req.headers.origin });
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập email và mật khẩu!' 
      });
    }

    // Tìm user theo email
    const user = await db.collection('users').findOne({ mail: email });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng!' 
      });
    }

    // Kiểm tra password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng!' 
      });
    }

    // Kiểm tra status
    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản đã bị khóa!' 
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.mail },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        userId: user._id,
        email: user.mail,
        phone: user.phone,
        name: user.profile?.name || user.phone,
        gender: user.profile?.gender || 'Nam',
        birthday: user.profile?.birthday || '',
        address: user.profile?.address || '',
        token: token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server, vui lòng thử lại!',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Lấy thông tin user hiện tại (cần token)
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập!' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Lấy thông tin user
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } } // Không trả về password
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại!' 
      });
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.mail,
        phone: user.phone,
        name: user.profile?.name || user.phone,
        gender: user.profile?.gender || 'Nam',
        birthday: user.profile?.birthday || '',
        address: user.profile?.address || '',
        status: user.status,
        roles: user.roles
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token không hợp lệ!' 
    });
  }
});

// Cập nhật thông tin profile
app.put('/api/auth/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập!' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    const { name, gender, birthday, address } = req.body;

    // Cập nhật profile
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $set: { 
          'profile.name': name,
          'profile.gender': gender,
          'profile.birthday': birthday,
          'profile.address': address,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại!' 
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công!',
      data: {
        name,
        gender,
        birthday,
        address
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server. Vui lòng thử lại!' 
    });
  }
});

// Quên mật khẩu - Gửi OTP qua email
app.post('/api/auth/forgot-password', otpLimiter, forgotPasswordValidation, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập email!' 
      });
    }

    // Kiểm tra email có tồn tại không
    const user = await db.collection('users').findOne({ mail: email });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại trong hệ thống!' 
      });
    }

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Lưu OTP vào store với thời gian hết hạn 5 phút
    otpStore.set(email, {
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 phút
    });

    // Gửi email
    const mailOptions = {
      from: {
        name: 'MediCare Security',
        address: EMAIL_CONFIG.auth.user
      },
      to: email,
      subject: 'MediCare Security - Mã OTP xác thực',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #0066cc 0%, #003b8e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">MediCare</h1>
            <p style="color: white; margin: 10px 0 0 0;">Nhà thuốc số 1 Việt Nam</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0066cc; margin-top: 0;">Khôi phục mật khẩu</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản <strong>${email}</strong>
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Mã OTP của bạn là:
            </p>
            
            <div style="background: #f0f8ff; border: 2px solid #0066cc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #0066cc; margin: 0; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              ⏰ Mã OTP có hiệu lực trong <strong>5 phút</strong>
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              ⚠️ Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              © 2025 MediCare. All rights reserved.<br>
              Hotline: 1900 0908
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // Tự động xóa OTP sau 5 phút
    setTimeout(() => {
      otpStore.delete(email);
    }, 5 * 60 * 1000);

    res.json({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn!'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi gửi email. Vui lòng thử lại!' 
    });
  }
});

// Chỉ verify OTP (không reset password)
app.post('/api/auth/verify-otp-only', otpLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log('🔍 Verify OTP Request:', { email, otp, otpType: typeof otp });

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập email và mã OTP!' 
      });
    }

    // Kiểm tra OTP
    const storedOTP = otpStore.get(email);
    console.log('📦 Stored OTP:', storedOTP ? { otp: storedOTP.otp, otpType: typeof storedOTP.otp, expiresAt: new Date(storedOTP.expiresAt) } : 'NOT FOUND');

    if (!storedOTP) {
      console.log('❌ OTP not found for email:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không tồn tại hoặc đã hết hạn!' 
      });
    }

    if (storedOTP.expiresAt < Date.now()) {
      console.log('⏰ OTP expired');
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP đã hết hạn!' 
      });
    }

    console.log('🔐 Comparing OTP:', { stored: storedOTP.otp, received: otp, match: storedOTP.otp === otp, strictMatch: storedOTP.otp === String(otp) });

    if (storedOTP.otp !== otp && storedOTP.otp !== String(otp)) {
      console.log('❌ OTP mismatch');
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không đúng!' 
      });
    }

    // OTP đúng - KHÔNG xóa OTP ở đây, chỉ xóa sau khi reset password thành công
    console.log('✅ OTP verified successfully');
    res.json({
      success: true,
      message: 'Xác thực OTP thành công!'
    });

  } catch (error) {
    console.error('❌ Verify OTP only error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server. Vui lòng thử lại!' 
    });
  }
});

// Xác thực OTP và reset mật khẩu
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ thông tin!' 
      });
    }

    // Kiểm tra OTP
    const storedOTP = otpStore.get(email);

    if (!storedOTP) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không tồn tại hoặc đã hết hạn!' 
      });
    }

    if (storedOTP.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP đã hết hạn!' 
      });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không đúng!' 
      });
    }

    // OTP đúng, cập nhật mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.collection('users').updateOne(
      { mail: email },
      { $set: { password: hashedPassword } }
    );

    // Xóa OTP sau khi đã sử dụng
    otpStore.delete(email);

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server. Vui lòng thử lại!' 
    });
  }
});

// ==================== ADDRESS APIs ====================

// Lấy danh sách tỉnh/thành phố
app.get('/api/provinces', async (req, res) => {
  try {
    const provinces = await db.collection('provinces').find().sort({ name: 1 }).toArray();
    res.json({
      success: true,
      data: provinces
    });
  } catch (error) {
    console.error('Get provinces error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách tỉnh/thành phố' 
    });
  }
});

// Lấy danh sách quận/huyện theo tỉnh
app.get('/api/districts/:provinceId', async (req, res) => {
  try {
    const { provinceId } = req.params;
    const districts = await db.collection('districts')
      .find({ provinceId: provinceId })
      .sort({ name: 1 })
      .toArray();
    
    res.json({
      success: true,
      data: districts
    });
  } catch (error) {
    console.error('Get districts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách quận/huyện' 
    });
  }
});

// Lấy danh sách phường/xã theo quận
app.get('/api/wards/:districtId', async (req, res) => {
  try {
    const { districtId } = req.params;
    const wards = await db.collection('wards')
      .find({ districtId: districtId })
      .sort({ name: 1 })
      .toArray();
    
    res.json({
      success: true,
      data: wards
    });
  } catch (error) {
    console.error('Get wards error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách phường/xã' 
    });
  }
});

// Lấy danh sách địa chỉ của user
app.get('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { addresses: 1 } }
    );
    
    res.json({
      success: true,
      data: user?.addresses || []
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách địa chỉ' 
    });
  }
});

// Thêm địa chỉ mới
app.post('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, province, district, ward, detailAddress, deliveryTime, isDefault } = req.body;
    
    if (!name || !phone || !province || !district || !ward || !detailAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin!' 
      });
    }
    
    const newAddress = {
      _id: new ObjectId().toString(),
      name,
      phone,
      province,
      district,
      ward,
      detailAddress,
      deliveryTime: deliveryTime || 'before',
      isDefault: isDefault || false,
      createdAt: new Date()
    };
    
    // Nếu set làm mặc định, bỏ mặc định của các địa chỉ khác
    if (isDefault) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { 'addresses.$[].isDefault': false } }
      );
    }
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $push: { addresses: newAddress } }
    );
    
    res.json({
      success: true,
      message: 'Thêm địa chỉ thành công!',
      data: newAddress
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi thêm địa chỉ' 
    });
  }
});

// Cập nhật địa chỉ
app.put('/api/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = req.params.id;
    const { name, phone, province, district, ward, detailAddress, deliveryTime, isDefault } = req.body;
    
    if (!name || !phone || !province || !district || !ward || !detailAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin!' 
      });
    }
    
    const updateData = {
      'addresses.$.name': name,
      'addresses.$.phone': phone,
      'addresses.$.province': province,
      'addresses.$.district': district,
      'addresses.$.ward': ward,
      'addresses.$.detailAddress': detailAddress,
      'addresses.$.deliveryTime': deliveryTime || 'before',
      'addresses.$.isDefault': isDefault || false,
      'addresses.$.updatedAt': new Date()
    };
    
    // Nếu set làm mặc định, bỏ mặc định của các địa chỉ khác
    if (isDefault) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { 'addresses.$[].isDefault': false } }
      );
    }
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId), 'addresses._id': addressId },
      { $set: updateData }
    );
    
    res.json({
      success: true,
      message: 'Cập nhật địa chỉ thành công!'
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật địa chỉ' 
    });
  }
});

// Xóa địa chỉ
app.delete('/api/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = req.params.id;
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { addresses: { _id: addressId } } }
    );
    
    res.json({
      success: true,
      message: 'Xóa địa chỉ thành công!'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xóa địa chỉ' 
    });
  }
});

// Đặt địa chỉ mặc định
app.put('/api/addresses/:id/default', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = req.params.id;
    
    // Bỏ mặc định tất cả địa chỉ
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { 'addresses.$[].isDefault': false } }
    );
    
    // Set địa chỉ này làm mặc định
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId), 'addresses._id': addressId },
      { $set: { 'addresses.$.isDefault': true } }
    );
    
    res.json({
      success: true,
      message: 'Đã đặt làm địa chỉ mặc định!'
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi đặt địa chỉ mặc định' 
    });
  }
});

// ==================== INVOICE & EMAIL ENDPOINTS ====================

// Helper function to format price
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Endpoint to send invoice
app.post('/api/orders/send-invoice', async (req, res) => {
  try {
    const orderData = req.body;
    
    if (!orderData.invoiceInfo || !orderData.invoiceInfo.email) {
      return res.json({ success: false, error: 'Email không được cung cấp' });
    }

    // Generate PDF
    const invoiceDir = path.join(__dirname, 'invoices');
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir);
    }

    const pdfFileName = `invoice_${Date.now()}.pdf`;
    const pdfPath = path.join(invoiceDir, pdfFileName);

    await generateInvoicePDF(orderData, pdfPath);

    // Send email with PDF attachment
    const mailOptions = {
      from: 'MediCare <nhathuocmedicare@gmail.com>',
      to: orderData.invoiceInfo.email,
      subject: 'Hóa đơn điện tử - MediCare',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Cảm ơn bạn đã mua hàng tại MediCare!</h2>
          <p>Xin chào <strong>${orderData.invoiceInfo.fullName}</strong>,</p>
          <p>Đơn hàng của bạn đã được xác nhận thành công.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Thông tin đơn hàng:</h3>
            <p><strong>Tổng tiền:</strong> ${formatPrice(orderData.total)}đ</p>
            <p><strong>Thời gian giao hàng dự kiến:</strong> ${orderData.expectedDelivery}</p>
            <p><strong>Địa chỉ giao hàng:</strong><br>
            ${orderData.address.name} - ${orderData.address.phone}<br>
            ${orderData.address.detailAddress}, ${orderData.address.ward}, ${orderData.address.district}, ${orderData.address.province}
            </p>
          </div>
          
          <p>Hóa đơn điện tử của bạn được đính kèm trong email này (file PDF).</p>
          
          <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua:</p>
          <ul>
            <li>Hotline: 1900 6035</li>
            <li>Email: support@medicare.vn</li>
          </ul>
          
          <p>Trân trọng,<br>
          <strong>Nhà thuốc MediCare</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: `HoaDon_${orderData.invoiceInfo.fullName.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
          path: pdfPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    // Delete PDF file after sending (optional)
    setTimeout(() => {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }, 60000); // Delete after 1 minute

    res.json({ success: true, message: 'Hóa đơn đã được gửi qua email' });

  } catch (error) {
    console.error('Error sending invoice:', error);
    res.json({ success: false, error: error.message });
  }
});

// ==================== CART ENDPOINTS ====================

// Get user's cart
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let cart = await db.collection('carts').findOne({ user: new ObjectId(userId) });
    
    if (!cart) {
      // Create empty cart if not exists
      cart = {
        user: new ObjectId(userId),
        items: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('carts').insertOne(cart);
    }
    
    res.json({ success: true, data: cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add item to cart
app.post('/api/cart/:userId/items', async (req, res) => {
  try {
    const { userId } = req.params;
    const item = req.body;
    
    console.log('📥 Add to cart request:', { userId, productId: item.productId });
    
    // Use productId as _id for the cart item
    const cartItem = {
      _id: item.productId,
      name: item.name,
      price: item.price,
      discount: item.discount,
      image: item.image,
      unit: item.unit,
      quantity: item.quantity || 1,
      addedAt: new Date()
    };
    
    let cart = await db.collection('carts').findOne({ user: new ObjectId(userId) });
    
    if (!cart) {
      console.log('📦 Creating new cart');
      // Create new cart with item
      cart = {
        user: new ObjectId(userId),
        items: [cartItem],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('carts').insertOne(cart);
      console.log('✅ New cart created with item:', cartItem._id);
    } else {
      console.log('📋 Existing cart found with', cart.items.length, 'items');
      console.log('📦 Current items:', cart.items.map(i => ({ id: i._id, name: i.name })));
      console.log('🔍 Looking for item:', cartItem._id);
      
      // Check if item already exists - COMPARE AS STRINGS!
      const existingItemIndex = cart.items.findIndex(i => String(i._id) === String(cartItem._id));
      
      if (existingItemIndex >= 0) {
        console.log('🔄 Item exists at index', existingItemIndex, '- updating quantity');
        // Update quantity
        cart.items[existingItemIndex].quantity += cartItem.quantity;
        cart.items[existingItemIndex].addedAt = new Date();
      } else {
        console.log('➕ New item, adding to cart');
        // Add new item
        cart.items.push(cartItem);
      }
      
      await db.collection('carts').updateOne(
        { user: new ObjectId(userId) },
        { 
          $set: { 
            items: cart.items,
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ Cart updated, total items:', cart.items.length);
    }
    
    res.json({ success: true, data: cart });
  } catch (error) {
    console.error('❌ Error adding to cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update cart item quantity
app.put('/api/cart/:userId/items/:itemId', async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const { quantity } = req.body;
    
    console.log('🔄 Update quantity - userId:', userId, 'itemId:', itemId, 'quantity:', quantity);
    
    const cart = await db.collection('carts').findOne({ user: new ObjectId(userId) });
    
    if (!cart) {
      console.log('❌ Cart not found');
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }
    
    // Find item - COMPARE AS STRINGS!
    const itemIndex = cart.items.findIndex(i => String(i._id) === String(itemId));
    
    if (itemIndex === -1) {
      console.log('❌ Item not found in cart');
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }
    
    console.log('📦 Updating item at index', itemIndex, 'from', cart.items[itemIndex].quantity, 'to', quantity);
    
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].addedAt = new Date();
    
    await db.collection('carts').updateOne(
      { user: new ObjectId(userId) },
      { 
        $set: { 
          items: cart.items,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('✅ Quantity updated successfully');
    
    res.json({ success: true, data: cart });
  } catch (error) {
    console.error('❌ Error updating cart item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove item from cart
app.delete('/api/cart/:userId/items/:itemId', async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    
    console.log('🗑️ Delete request - userId:', userId, 'itemId:', itemId);
    
    const cart = await db.collection('carts').findOne({ user: new ObjectId(userId) });
    
    if (!cart) {
      console.log('❌ Cart not found');
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }
    
    console.log('📋 Before delete:', cart.items.length, 'items');
    console.log('📦 Items:', cart.items.map(i => ({ id: i._id, name: i.name })));
    
    // Filter out the item - COMPARE AS STRINGS!
    cart.items = cart.items.filter(i => String(i._id) !== String(itemId));
    
    console.log('📋 After delete:', cart.items.length, 'items');
    
    await db.collection('carts').updateOne(
      { user: new ObjectId(userId) },
      { 
        $set: { 
          items: cart.items,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('✅ Item deleted successfully');
    
    res.json({ success: true, data: cart });
  } catch (error) {
    console.error('❌ Error removing cart item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear cart
app.delete('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await db.collection('carts').updateOne(
      { user: new ObjectId(userId) },
      { 
        $set: { 
          items: [],
          updatedAt: new Date()
        }
      }
    );
    
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ORDERS ENDPOINTS ====================

// Create new order
// Check user by phone number (for guest checkout linking)
app.get('/api/users/by-phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
    
    console.log('🔍 Looking for user with phone:', phone, '(normalized:', normalizedPhone, ')');
    
    // Try exact match first
    let user = await db.collection('users').findOne({ phone: phone });
    
    // If not found, try normalized match
    if (!user) {
      user = await db.collection('users').findOne({ phone: normalizedPhone });
    }
    
    // If still not found, try case-insensitive search in all phone variations
    if (!user) {
      // Get all users and check manually (for phone with different formats)
      const allUsers = await db.collection('users').find({}).toArray();
      user = allUsers.find(u => {
        const userPhone = String(u.phone || '').trim().replace(/[\s\-\(\)]/g, '');
        return userPhone === normalizedPhone;
      });
    }
    
    if (!user) {
      console.log('❌ No user found with phone:', phone);
      return res.json({ 
        success: false, 
        message: 'Không tìm thấy user với số điện thoại này' 
      });
    }
    
    console.log('✅ User found:', {
      userId: user._id.toString(),
      phone: user.phone,
      email: user.mail
    });
    
    res.json({ 
      success: true, 
      data: {
        userId: user._id.toString(),
        phone: user.phone,
        email: user.mail,
        name: user.profile?.name || user.phone
      }
    });
  } catch (error) {
    console.error('Error finding user by phone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    console.log('📦 [Create Order] Received orderData:', JSON.stringify({
      items: orderData.items?.length || 0,
      subtotal: orderData.subtotal,
      discount: orderData.discount,
      voucherCode: orderData.voucherCode,
      voucherDiscount: orderData.voucherDiscount,
      total: orderData.total
    }, null, 2));
    
    // Generate order number
    const orderNumber = `MD${Date.now()}`;
    
    // Generate default order name: "Đơn hàng" + date
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const defaultOrderName = `Đơn hàng ${day}/${month}/${year}`;
    
    // Check if guest order has phone number matching existing user
    let userId = orderData.userId || 'guest';
    let isGuest = orderData.isGuest || false;
    
    // If userId is already set from frontend check, use it
    if (orderData.userId && orderData.userId !== 'guest') {
      userId = orderData.userId;
      isGuest = false;
      console.log('✅ Using userId from frontend:', userId);
    } else {
      // If it's a guest order and has guestOrdererInfo with phone, check backend
      if ((isGuest || userId === 'guest') && orderData.guestOrdererInfo && orderData.guestOrdererInfo.phone) {
        const guestPhone = orderData.guestOrdererInfo.phone;
        console.log('🔍 Backend: Checking if guest phone matches existing user:', guestPhone);
        
        // Normalize phone number
        const normalizedPhone = guestPhone.trim().replace(/[\s\-\(\)]/g, '');
        
        // Try exact match first
        let existingUser = await db.collection('users').findOne({ phone: guestPhone });
        
        // If not found, try normalized match
        if (!existingUser) {
          existingUser = await db.collection('users').findOne({ phone: normalizedPhone });
        }
        
        // If still not found, try case-insensitive search
        if (!existingUser) {
          const allUsers = await db.collection('users').find({}).toArray();
          existingUser = allUsers.find(u => {
            const userPhone = String(u.phone || '').trim().replace(/[\s\-\(\)]/g, '');
            return userPhone === normalizedPhone;
          });
        }
        
        if (existingUser) {
          // Link order to existing user
          userId = existingUser._id.toString();
          isGuest = false;
          console.log('✅ Backend: Guest order linked to existing user:', userId);
        } else {
          console.log('ℹ️ Backend: Guest phone does not match any user, creating guest order');
        }
      }
    }
    
    console.log('📦 Final order userId:', userId, 'isGuest:', isGuest);
    
    const newOrder = {
      orderNumber,
      orderName: orderData.orderName || defaultOrderName,
      userId: userId,
      items: orderData.items,
      customerInfo: {
        name: orderData.address.name,
        phone: orderData.address.phone,
        email: orderData.invoiceInfo?.email || null
      },
      shippingAddress: orderData.address,
      paymentMethod: orderData.paymentMethod,
      requireInvoice: orderData.requireInvoice || false,
      invoiceInfo: orderData.invoiceInfo || null,
      expectedDelivery: orderData.expectedDelivery,
      note: orderData.note || '',
      pricing: {
        subtotal: orderData.subtotal || 0,
        discount: orderData.discount || 0,
        voucherCode: orderData.voucherCode || null,
        voucherDiscount: orderData.voucherDiscount || 0,
        shippingFee: orderData.shippingFee || 0,
        total: orderData.total || 0
      },
      status: 'pending', // pending, confirmed, processing, shipping, delivered, cancelled
      paymentStatus: orderData.paymentMethod === 'cod' ? 'unpaid' : 'pending', // unpaid, pending, paid, failed
      createdAt: new Date(),
      updatedAt: new Date(),
      statusHistory: [
        {
          status: 'pending',
          note: 'Đơn hàng đã được tạo',
          timestamp: new Date()
        }
      ]
    };
    
    console.log('📦 [Create Order] Pricing object:', JSON.stringify(newOrder.pricing, null, 2));
    
    const result = await db.collection('orders').insertOne(newOrder);
    
    // Add _id as string to the response
    const orderResponse = {
      ...newOrder,
      _id: result.insertedId.toString()
    };
    
    console.log('✅ Order created successfully:', {
      orderNumber: orderResponse.orderNumber,
      _id: orderResponse._id,
      voucherCode: orderResponse.pricing?.voucherCode,
      voucherDiscount: orderResponse.pricing?.voucherDiscount
    });
    
    // Create notification for admin - New order
    await createNotification({
      targetType: 'admin',
      type: 'new_order',
      title: 'Đơn hàng mới',
      message: `Đơn hàng ${orderNumber} từ ${orderData.address.name || 'Khách hàng'} - ${orderResponse.pricing.total.toLocaleString('vi-VN')} đ`,
      data: {
        orderId: orderResponse._id,
        orderNumber: orderNumber,
        customerName: orderData.address.name,
        total: orderResponse.pricing.total
      },
      link: `/collections/orders/${orderNumber}`
    });
    
    // Create notification for user - Order confirmed
    if (userId && userId !== 'guest') {
      await createNotification({
        targetType: 'user',
        targetId: userId,
        type: 'order_created',
        title: 'Đơn hàng đã được tạo',
        message: `Đơn hàng ${orderNumber} của bạn đã được tạo thành công. Tổng tiền: ${orderResponse.pricing.total.toLocaleString('vi-VN')} đ`,
        data: {
          orderId: orderResponse._id,
          orderNumber: orderNumber,
          total: orderResponse.pricing.total
        },
        link: `/order/${orderResponse._id}`
      });
    }

    // Send order confirmation email
    // PRIORITY: Get email from user profile first (for logged-in users)
    let customerEmail = null;
    let customerName = orderData.address.name || orderData.guestOrdererInfo?.name;
    
    console.log('[Email] ============== EMAIL DETECTION ==============');
    console.log('[Email] userId:', userId);
    console.log('[Email] address.email:', orderData.address.email);
    console.log('[Email] guestOrdererInfo.email:', orderData.guestOrdererInfo?.email);
    
    // STEP 1: If user is logged in, ALWAYS get email from user profile
    if (userId && userId !== 'guest') {
      try {
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        console.log('[Email] Found user in DB:', user ? 'YES' : 'NO');
        if (user) {
          console.log('[Email] User email from DB:', user.email);
          console.log('[Email] User mail array from DB:', user.mail);
          console.log('[Email] User name from DB:', user.name);
          console.log('[Email] User profile.name from DB:', user.profile?.name);
          console.log('[Email] User phone from DB:', user.phone);
        }
        
        // Check 'mail' (array) field FIRST - ưu tiên cao nhất
        if (user?.mail && Array.isArray(user.mail) && user.mail.length > 0) {
          customerEmail = user.mail[0]; // Get first email from mail array
          customerName = customerName || user.profile?.fullName || user.profile?.name || user.name || user.phone;
          console.log('[Email] ✅ Using email from USER.mail[0]:', customerEmail);
        } else if (user?.email) {
          customerEmail = user.email; // Fallback to email field
          customerName = customerName || user.profile?.fullName || user.profile?.name || user.name || user.phone;
          console.log('[Email] ✅ Using email from USER.email:', customerEmail);
        } else {
          console.log('[Email] ⚠️ User found but no email in profile');
        }
      } catch (error) {
        console.error('[Email] ❌ Error fetching user email:', error);
      }
    }
    
    // STEP 2: If no email from user profile, try address or guest info
    if (!customerEmail) {
      customerEmail = orderData.address.email || orderData.guestOrdererInfo?.email;
      if (customerEmail) {
        console.log('[Email] ✅ Using email from ORDER DATA:', customerEmail);
      }
    }
    
    console.log('[Email] ============== FINAL RESULT ==============');
    console.log('[Email] Final email to send:', customerEmail);
    console.log('[Email] Final customer name:', customerName);
    console.log('[Email] ===========================================');
    
    if (customerEmail) {
      console.log('[Email] 📧 Attempting to send confirmation email to:', customerEmail);
      const emailSent = await sendOrderConfirmationEmail({
        email: customerEmail,
        customerName: customerName,
        orderNumber: orderNumber,
        items: orderData.items,
        pricing: orderResponse.pricing,
        address: orderData.address
      });
      console.log('[Email] Email sent status:', emailSent);
    } else {
      console.error('[Email] ❌ NO EMAIL AVAILABLE - Cannot send confirmation');
      console.log('[Email] Please ensure:');
      console.log('[Email] 1. User has email in profile (for logged-in users)');
      console.log('[Email] 2. Or email is provided in order form (for guests)');
    }
    
    // Remove ordered items from cart (only items that were in the order)
    if (orderData.userId && orderData.userId !== 'guest') {
      const cart = await db.collection('carts').findOne({ user: new ObjectId(orderData.userId) });
      
      if (cart && cart.items && cart.items.length > 0) {
        // Get IDs of items that were ordered
        const orderedItemIds = orderData.items.map((item) => String(item._id));
        console.log('🗑️ Removing ordered items from cart:', orderedItemIds);
        
        // Filter out items that were in the order
        const remainingItems = cart.items.filter((item) => 
          !orderedItemIds.includes(String(item._id))
        );
        
        console.log(`📦 Cart before: ${cart.items.length} items, after: ${remainingItems.length} items`);
        
        await db.collection('carts').updateOne(
          { user: new ObjectId(orderData.userId) },
          { 
            $set: { 
              items: remainingItems,
              updatedAt: new Date()
            }
          }
        );
        
        console.log('✅ Cart updated - ordered items removed');
      }
    }
    
    res.json({ success: true, data: orderResponse });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's orders
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 20, skip = 0 } = req.query;
    
    const query = { userId };
    if (status) {
      query.status = status;
    }
    
    const orders = await db.collection('orders')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();
    
    const total = await db.collection('orders').countDocuments(query);
    
    res.json({ 
      success: true, 
      data: orders,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Return order (must be before /api/orders/:orderId to avoid route conflict)
app.put('/api/orders/:orderId/return', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    // Check if orderId is an orderNumber (starts with MD) or ObjectId
    const isOrderNumber = orderId && typeof orderId === 'string' && orderId.startsWith('MD');
    const isValidObjectId = ObjectId.isValid(orderId) && !isOrderNumber;
    
    let order;
    if (isOrderNumber) {
      // Only search by orderNumber
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    } else if (isValidObjectId) {
      // Try both _id and orderNumber
      order = await db.collection('orders').findOne({ 
        $or: [
          { _id: new ObjectId(orderId) },
          { orderNumber: orderId }
        ]
      });
    } else {
      // Try only orderNumber (might be orderNumber without MD prefix)
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Only allow return for delivered orders
    if (order.status !== 'delivered') {
      return res.status(400).json({ 
        success: false, 
        error: 'Chỉ có thể trả hàng đối với đơn hàng đã giao' 
      });
    }
    
    // Check if already returned
    if (order.status === 'returned' || order.status === 'return_requested') {
      return res.status(400).json({ 
        success: false, 
        error: 'Đơn hàng này đã được yêu cầu trả hàng' 
      });
    }
    
    const statusHistoryEntry = {
      status: 'return_requested',
      note: reason || 'Khách hàng yêu cầu trả hàng',
      timestamp: new Date()
    };
    
    await db.collection('orders').updateOne(
      { _id: order._id },
      { 
        $set: { 
          status: 'return_requested',
          returnRequestedAt: new Date(),
          returnReason: reason || 'Khách hàng yêu cầu trả hàng',
          updatedAt: new Date()
        },
        $push: {
          statusHistory: statusHistoryEntry
        }
      }
    );
    
    // Create notifications for return request
    const orderNumber = order.orderNumber || order._id.toString();
    const customerName = order.customerInfo?.name || order.shippingAddress?.name || 'Khách hàng';
    const returnReason = reason || 'Khách hàng yêu cầu trả hàng';
    
    // Notify admin - Return request
    await createNotification({
      targetType: 'admin',
      type: 'order_return_requested',
      title: 'Yêu cầu trả hàng',
      message: `Đơn hàng ${orderNumber} từ ${customerName} yêu cầu trả hàng: ${returnReason}`,
      data: {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        customerName: customerName,
        reason: returnReason,
        requestedBy: 'user'
      },
      link: `/collections/orders/${orderNumber}`
    });
    
    // Notify user - Return request confirmation
    if (order.userId && order.userId !== 'guest') {
      const targetUserId = typeof order.userId === 'string' ? order.userId : order.userId.toString();
      await createNotification({
        targetType: 'user',
        targetId: targetUserId,
        type: 'order_return_requested',
        title: 'Yêu cầu trả hàng đã được gửi',
        message: `Yêu cầu trả hàng cho đơn hàng ${orderNumber} đã được gửi thành công. Lý do: ${returnReason}`,
        data: {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          reason: returnReason
        },
        link: `/order/${order._id.toString()}`
      });
    }
    
    res.json({ success: true, message: 'Return request submitted' });
  } catch (error) {
    console.error('Error processing return request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order by ID
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Validate input
    if (!orderId || typeof orderId !== 'string') {
      console.error('❌ Invalid orderId parameter:', orderId);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid order ID',
        details: 'Order ID must be a valid string'
      });
    }
    
    console.log('🔍 Fetching order with ID:', orderId);
    
    // Check database connection
    if (!db) {
      console.error('❌ Database not connected');
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection error',
        details: 'Database is not available'
      });
    }
    
    // Try to find by orderNumber first (most common - format: MD123456789)
    let order = null;
    
    // Safe check for startsWith
    const isOrderNumber = orderId && typeof orderId === 'string' && orderId.startsWith('MD');
    const isValidObjectId = ObjectId.isValid(orderId) && !isOrderNumber; // Only valid if NOT an orderNumber
    
    console.log('📋 ID type check - starts with MD:', isOrderNumber);
    console.log('📋 ID type check - ObjectId valid (and not orderNumber):', isValidObjectId);
    
    // Priority 1: Search by orderNumber (if it starts with MD)
    if (isOrderNumber) {
      // Definitely an orderNumber - only search by orderNumber, never try ObjectId
      console.log('🔍 Searching by orderNumber:', orderId);
      try {
        order = await db.collection('orders').findOne({ orderNumber: orderId });
        if (order) {
          console.log('✅ Found by orderNumber');
        } else {
          console.log('❌ Not found by orderNumber');
        }
      } catch (queryError) {
        console.error('❌ Error querying by orderNumber:', queryError);
        throw queryError;
      }
    } else {
      // Could be _id or orderNumber without MD prefix
      // Try orderNumber first (non-MD format)
      console.log('🔍 Searching by orderNumber (no MD prefix):', orderId);
      try {
        order = await db.collection('orders').findOne({ orderNumber: orderId });
        if (order) {
          console.log('✅ Found by orderNumber (no MD prefix)');
        }
      } catch (queryError) {
        console.error('❌ Error querying by orderNumber (no prefix):', queryError);
      }
    }
    
    // Priority 2: If not found by orderNumber AND it's a valid ObjectId (not orderNumber), try by _id
    if (!order && isValidObjectId) {
      try {
        console.log('🔍 Searching by _id (ObjectId):', orderId);
        order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
        if (order) {
          console.log('✅ Found by _id');
        }
      } catch (idError) {
        console.error('❌ Error searching by _id:', idError);
        // Don't throw - just continue, order not found
      }
    }
    
    if (!order) {
      console.error('❌ Order not found with ID:', orderId);
      console.log('💡 Checking available orders in database...');
      try {
        // Debug: Get a few recent orders to help debug
        const recentOrders = await db.collection('orders').find({}).limit(5).toArray();
        console.log(`💡 Found ${recentOrders.length} recent orders in database`);
        recentOrders.forEach((o, index) => {
          console.log(`  ${index + 1}. OrderNumber: ${o.orderNumber}, _id: ${o._id}`);
        });
      } catch (debugError) {
        console.error('❌ Error fetching recent orders for debug:', debugError);
      }
      
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found',
        searchedId: orderId,
        suggestion: 'Please check the order number and try again'
      });
    }
    
    // Convert _id to string for JSON response
    try {
      if (order._id) {
        order._id = order._id.toString();
      }
      if (order.userId && order.userId instanceof ObjectId) {
        order.userId = order.userId.toString();
      }
    } catch (convertError) {
      console.error('❌ Error converting IDs:', convertError);
      // Continue anyway, might work without conversion
    }
    
    // Ensure orderName exists - if not, generate default from createdAt
    if (!order.orderName && order.createdAt) {
      const date = new Date(order.createdAt);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      order.orderName = `Đơn hàng ${day}/${month}/${year}`;
      
      // Update in database (async, don't wait)
      db.collection('orders').updateOne(
        { _id: order._id },
        { $set: { orderName: order.orderName } }
      ).catch(err => {
        console.error('Error updating orderName for legacy order:', err);
      });
    } else if (!order.orderName) {
      order.orderName = 'Đơn hàng';
    }
    
    console.log('✅ Order found:', {
      orderNumber: order.orderNumber,
      orderName: order.orderName,
      _id: order._id,
      status: order.status
    });
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
      details: 'Internal server error while fetching order',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update order status
app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    // Check if orderId is an orderNumber (starts with MD) or ObjectId
    const isOrderNumber = orderId && typeof orderId === 'string' && orderId.startsWith('MD');
    const isValidObjectId = ObjectId.isValid(orderId) && !isOrderNumber;
    
    let order;
    if (isOrderNumber) {
      // Only search by orderNumber
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    } else if (isValidObjectId) {
      // Try both _id and orderNumber
      order = await db.collection('orders').findOne({ 
        $or: [
          { _id: new ObjectId(orderId) },
          { orderNumber: orderId }
        ]
      });
    } else {
      // Try only orderNumber (might be orderNumber without MD prefix)
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Add to status history
    const statusHistoryEntry = {
      status,
      note: note || '',
      timestamp: new Date()
    };
    
    await db.collection('orders').updateOne(
      { _id: order._id },
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
          ...(status === 'cancelled' ? { cancelledAt: new Date() } : {})
        },
        $push: {
          statusHistory: statusHistoryEntry
        }
      }
    );
    
    // Create notifications based on status
    const orderNumber = order.orderNumber || order._id.toString();
    const customerName = order.customerInfo?.name || order.shippingAddress?.name || 'Khách hàng';
    const total = order.pricing?.total || 0;
    
    if (status === 'delivered') {
      // Notify user - Order delivered
      if (order.userId && order.userId !== 'guest') {
        const targetUserId = typeof order.userId === 'string' ? order.userId : order.userId.toString();
        console.log('[Notifications] Creating order_delivered notification for userId:', targetUserId);
        await createNotification({
          targetType: 'user',
          targetId: targetUserId,
          type: 'order_delivered',
          title: 'Đơn hàng đã được giao',
          message: `Đơn hàng ${orderNumber} của bạn đã được giao thành công!`,
          data: {
            orderId: order._id.toString(),
            orderNumber: orderNumber,
            total: total
          },
          link: `/order/${order._id.toString()}`
        });
      }
      
      // Notify admin - Order completed
      await createNotification({
        targetType: 'admin',
        type: 'order_delivered',
        title: 'Đơn hàng đã giao thành công',
        message: `Đơn hàng ${orderNumber} từ ${customerName} đã được giao thành công`,
        data: {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          customerName: customerName,
          total: total
        },
        link: `/collections/orders/${orderNumber}`
      });
    } else if (status === 'cancelled') {
      // Notify user - Order cancelled
      if (order.userId && order.userId !== 'guest') {
        const targetUserId = typeof order.userId === 'string' ? order.userId : order.userId.toString();
        console.log('[Notifications] Creating order_cancelled notification for userId:', targetUserId);
        await createNotification({
          targetType: 'user',
          targetId: targetUserId,
          type: 'order_cancelled',
          title: 'Đơn hàng đã bị hủy',
          message: `Đơn hàng ${orderNumber} của bạn đã bị hủy${note ? ': ' + note : ''}`,
          data: {
            orderId: order._id.toString(),
            orderNumber: orderNumber,
            reason: note || ''
          },
          link: `/order/${order._id.toString()}`
        });
      }
      
      // Notify admin - Order cancelled
      await createNotification({
        targetType: 'admin',
        type: 'order_cancelled',
        title: 'Đơn hàng đã bị hủy',
        message: `Đơn hàng ${orderNumber} từ ${customerName} đã bị hủy`,
        data: {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          customerName: customerName,
          reason: note || ''
        },
        link: `/collections/orders/${orderNumber}`
      });
    } else if (status === 'shipping') {
      // Notify user - Order shipping
      if (order.userId && order.userId !== 'guest') {
        const targetUserId = typeof order.userId === 'string' ? order.userId : order.userId.toString();
        console.log('[Notifications] Creating order_shipping notification for userId:', targetUserId);
        await createNotification({
          targetType: 'user',
          targetId: targetUserId,
          type: 'order_shipping',
          title: 'Đơn hàng đang được giao',
          message: `Đơn hàng ${orderNumber} của bạn đang được giao đến bạn`,
          data: {
            orderId: order._id.toString(),
            orderNumber: orderNumber
          },
          link: `/order/${order._id.toString()}`
        });
      }
    } else if (status === 'confirmed') {
      // Notify user - Order confirmed
      if (order.userId && order.userId !== 'guest') {
        const targetUserId = typeof order.userId === 'string' ? order.userId : order.userId.toString();
        console.log('[Notifications] Creating order_confirmed notification for userId:', targetUserId);
        await createNotification({
          targetType: 'user',
          targetId: targetUserId,
          type: 'order_confirmed',
          title: 'Đơn hàng đã được xác nhận',
          message: `Đơn hàng ${orderNumber} của bạn đã được xác nhận và đang được xử lý`,
          data: {
            orderId: order._id.toString(),
            orderNumber: orderNumber
          },
          link: `/order/${order._id.toString()}`
        });
      } else {
        console.log('[Notifications] Skipping notification - userId:', order.userId);
      }
    }
    
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update payment status
app.put('/api/orders/:orderId/payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;
    
    const validPaymentStatuses = ['unpaid', 'pending', 'paid', 'failed'];
    
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment status. Must be one of: ' + validPaymentStatuses.join(', ')
      });
    }
    
    // Check if orderId is an orderNumber (starts with MD) or ObjectId
    const isOrderNumber = orderId && typeof orderId === 'string' && orderId.startsWith('MD');
    const isValidObjectId = ObjectId.isValid(orderId) && !isOrderNumber;
    
    let order;
    if (isOrderNumber) {
      // Only search by orderNumber
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    } else if (isValidObjectId) {
      // Try both _id and orderNumber
      order = await db.collection('orders').findOne({ 
        $or: [
          { _id: new ObjectId(orderId) },
          { orderNumber: orderId }
        ]
      });
    } else {
      // Try only orderNumber (might be orderNumber without MD prefix)
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    await db.collection('orders').updateOne(
      { _id: order._id },
      { 
        $set: { 
          paymentStatus,
          updatedAt: new Date()
        }
      }
    );
    
    res.json({ success: true, message: 'Payment status updated' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update order name
app.put('/api/orders/:orderId/name', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderName } = req.body;
    
    if (!orderName || typeof orderName !== 'string' || orderName.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Order name is required' 
      });
    }
    
    // Check if orderId is an orderNumber (starts with MD) or ObjectId
    const isOrderNumber = orderId && typeof orderId === 'string' && orderId.startsWith('MD');
    const isValidObjectId = ObjectId.isValid(orderId) && !isOrderNumber;
    
    let order;
    if (isOrderNumber) {
      // Only search by orderNumber
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    } else if (isValidObjectId) {
      // Try both _id and orderNumber
      order = await db.collection('orders').findOne({ 
        $or: [
          { _id: new ObjectId(orderId) },
          { orderNumber: orderId }
        ]
      });
    } else {
      // Try only orderNumber (might be orderNumber without MD prefix)
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    await db.collection('orders').updateOne(
      { _id: order._id },
      { 
        $set: { 
          orderName: orderName.trim(),
          updatedAt: new Date()
        }
      }
    );
    
    res.json({ success: true, message: 'Order name updated', data: { orderName: orderName.trim() } });
  } catch (error) {
    console.error('Error updating order name:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel order
app.put('/api/orders/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    // Check if orderId is an orderNumber (starts with MD) or ObjectId
    const isOrderNumber = orderId && typeof orderId === 'string' && orderId.startsWith('MD');
    const isValidObjectId = ObjectId.isValid(orderId) && !isOrderNumber;
    
    let order;
    if (isOrderNumber) {
      // Only search by orderNumber
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    } else if (isValidObjectId) {
      // Try both _id and orderNumber
      order = await db.collection('orders').findOne({ 
        $or: [
          { _id: new ObjectId(orderId) },
          { orderNumber: orderId }
        ]
      });
    } else {
      // Try only orderNumber (might be orderNumber without MD prefix)
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    if (order.status === 'delivered') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot cancel delivered order' 
      });
    }
    
    const statusHistoryEntry = {
      status: 'cancelled',
      note: reason || 'Khách hàng hủy đơn',
      timestamp: new Date()
    };
    
    await db.collection('orders').updateOne(
      { _id: order._id },
      { 
        $set: { 
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          statusHistory: statusHistoryEntry
        }
      }
    );
    
    // Create notifications for cancelled order
    const orderNumber = order.orderNumber || order._id.toString();
    const customerName = order.customerInfo?.name || order.shippingAddress?.name || 'Khách hàng';
    const cancelReason = reason || 'Khách hàng hủy đơn';
    
    // Notify admin - Order cancelled by user
    await createNotification({
      targetType: 'admin',
      type: 'order_cancelled',
      title: 'Đơn hàng đã bị hủy',
      message: `Đơn hàng ${orderNumber} từ ${customerName} đã bị hủy: ${cancelReason}`,
      data: {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        customerName: customerName,
        reason: cancelReason,
        cancelledBy: 'user'
      },
      link: `/collections/orders/${orderNumber}`
    });
    
    // Notify user - Order cancelled confirmation
    if (order.userId && order.userId !== 'guest') {
      await createNotification({
        targetType: 'user',
        targetId: order.userId,
        type: 'order_cancelled',
        title: 'Đơn hàng đã được hủy',
        message: `Đơn hàng ${orderNumber} của bạn đã được hủy thành công. Lý do: ${cancelReason}`,
        data: {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          reason: cancelReason
        },
        link: `/order/${order._id.toString()}`
      });
    }
    
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve return request
app.put('/api/orders/:orderId/return/approve', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check if orderId is an orderNumber (starts with MD) or ObjectId
    const isOrderNumber = orderId && typeof orderId === 'string' && orderId.startsWith('MD');
    const isValidObjectId = ObjectId.isValid(orderId) && !isOrderNumber;
    
    let order;
    if (isOrderNumber) {
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    } else if (isValidObjectId) {
      order = await db.collection('orders').findOne({ 
        $or: [
          { _id: new ObjectId(orderId) },
          { orderNumber: orderId }
        ]
      });
    } else {
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    if (order.status !== 'return_requested') {
      return res.status(400).json({ 
        success: false, 
        error: 'Chỉ có thể chấp nhận yêu cầu trả hàng cho đơn hàng đang ở trạng thái return_requested' 
      });
    }
    
    const statusHistoryEntry = {
      status: 'returned',
      note: 'Yêu cầu trả hàng đã được chấp nhận',
      timestamp: new Date()
    };
    
    await db.collection('orders').updateOne(
      { _id: order._id },
      { 
        $set: { 
          status: 'returned',
          returnedAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          statusHistory: statusHistoryEntry
        }
      }
    );
    
    // Create notifications
    const orderNumber = order.orderNumber || order._id.toString();
    const customerName = order.customerInfo?.name || order.shippingAddress?.name || 'Khách hàng';
    
    // Notify user - Return approved
    if (order.userId && order.userId !== 'guest') {
      const targetUserId = typeof order.userId === 'string' ? order.userId : order.userId.toString();
      await createNotification({
        targetType: 'user',
        targetId: targetUserId,
        type: 'order_return_approved',
        title: 'Yêu cầu trả hàng đã được chấp nhận',
        message: `Yêu cầu trả hàng cho đơn hàng ${orderNumber} đã được chấp nhận. Vui lòng chuẩn bị hàng để trả lại.`,
        data: {
          orderId: order._id.toString(),
          orderNumber: orderNumber
        },
        link: `/order/${order._id.toString()}`
      });
    }
    
    // Notify admin - Return approved
    await createNotification({
      targetType: 'admin',
      type: 'order_return_approved',
      title: 'Yêu cầu trả hàng đã được chấp nhận',
      message: `Yêu cầu trả hàng cho đơn hàng ${orderNumber} từ ${customerName} đã được chấp nhận`,
      data: {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        customerName: customerName
      },
      link: `/collections/orders/${orderNumber}`
    });
    
    res.json({ success: true, message: 'Return request approved' });
  } catch (error) {
    console.error('Error approving return request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject return request
app.put('/api/orders/:orderId/return/reject', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    // Check if orderId is an orderNumber (starts with MD) or ObjectId
    const isOrderNumber = orderId && typeof orderId === 'string' && orderId.startsWith('MD');
    const isValidObjectId = ObjectId.isValid(orderId) && !isOrderNumber;
    
    let order;
    if (isOrderNumber) {
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    } else if (isValidObjectId) {
      order = await db.collection('orders').findOne({ 
        $or: [
          { _id: new ObjectId(orderId) },
          { orderNumber: orderId }
        ]
      });
    } else {
      order = await db.collection('orders').findOne({ orderNumber: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    if (order.status !== 'return_requested') {
      return res.status(400).json({ 
        success: false, 
        error: 'Chỉ có thể từ chối yêu cầu trả hàng cho đơn hàng đang ở trạng thái return_requested' 
      });
    }
    
    const rejectionReason = reason || 'Yêu cầu trả hàng bị từ chối';
    const statusHistoryEntry = {
      status: 'delivered',
      note: `Yêu cầu trả hàng bị từ chối: ${rejectionReason}`,
      timestamp: new Date()
    };
    
    await db.collection('orders').updateOne(
      { _id: order._id },
      { 
        $set: { 
          status: 'delivered',
          returnRejectedAt: new Date(),
          returnRejectionReason: rejectionReason,
          updatedAt: new Date()
        },
        $push: {
          statusHistory: statusHistoryEntry
        }
      }
    );
    
    // Create notifications
    const orderNumber = order.orderNumber || order._id.toString();
    const customerName = order.customerInfo?.name || order.shippingAddress?.name || 'Khách hàng';
    
    // Notify user - Return rejected
    if (order.userId && order.userId !== 'guest') {
      const targetUserId = typeof order.userId === 'string' ? order.userId : order.userId.toString();
      await createNotification({
        targetType: 'user',
        targetId: targetUserId,
        type: 'order_return_rejected',
        title: 'Yêu cầu trả hàng bị từ chối',
        message: `Yêu cầu trả hàng cho đơn hàng ${orderNumber} đã bị từ chối. Lý do: ${rejectionReason}`,
        data: {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          reason: rejectionReason
        },
        link: `/order/${order._id.toString()}`
      });
    }
    
    // Notify admin - Return rejected
    await createNotification({
      targetType: 'admin',
      type: 'order_return_rejected',
      title: 'Yêu cầu trả hàng đã bị từ chối',
      message: `Yêu cầu trả hàng cho đơn hàng ${orderNumber} từ ${customerName} đã bị từ chối. Lý do: ${rejectionReason}`,
      data: {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        customerName: customerName,
        reason: rejectionReason
      },
      link: `/collections/orders/${orderNumber}`
    });
    
    res.json({ success: true, message: 'Return request rejected' });
  } catch (error) {
    console.error('Error rejecting return request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PHARMACIST CHAT API ====================

// Initialize chat session (for non-logged-in users)
app.post('/api/pharmacist-chat/init', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Số điện thoại không hợp lệ'
      });
    }

    // Check if chat exists for this phone
    let chat = await db.collection('pharmacist_chats').findOne({
      phone: phone.trim(),
      status: { $in: ['pending', 'active'] }
    });

    if (!chat) {
      // Create new chat
      const newChat = {
        phone: phone.trim(),
        userId: null,
        userName: null,
        status: 'pending',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('pharmacist_chats').insertOne(newChat);
      chat = { ...newChat, _id: result.insertedId };
    }

    res.json({
      success: true,
      data: {
        chatId: chat._id.toString(),
        chat: chat
      }
    });
  } catch (error) {
    console.error('❌ Error initializing pharmacist chat:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get or create chat
app.get('/api/pharmacist-chat', async (req, res) => {
  try {
    const { userId, chatId, phone } = req.query;

    let chat = null;

    if (chatId) {
      chat = await db.collection('pharmacist_chats').findOne({ _id: new ObjectId(chatId) });
    } else if (userId) {
      chat = await db.collection('pharmacist_chats').findOne({
        userId: userId,
        status: { $in: ['pending', 'active'] }
      });
    } else if (phone) {
      chat = await db.collection('pharmacist_chats').findOne({
        phone: phone.trim(),
        status: { $in: ['pending', 'active'] }
      });
    }

    if (!chat) {
      return res.json({
        success: false,
        data: null
      });
    }

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('❌ Error getting pharmacist chat:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new chat
app.post('/api/pharmacist-chat', async (req, res) => {
  try {
    const { userId, phone, userName } = req.body;

    if (!phone && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Cần có userId hoặc phone'
      });
    }

    const newChat = {
      userId: userId || null,
      phone: phone || null,
      userName: userName || null,
      status: 'pending',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('pharmacist_chats').insertOne(newChat);

    res.json({
      success: true,
      data: { ...newChat, _id: result.insertedId }
    });
  } catch (error) {
    console.error('❌ Error creating pharmacist chat:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send message (with file support for users)
app.post('/api/pharmacist-chat/:chatId/message', chatFileUpload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, sender, type } = req.body;

    if (!sender || !['user', 'pharmacist', 'system'].includes(sender)) {
      return res.status(400).json({
        success: false,
        error: 'Sender is required and must be user, pharmacist, or system'
      });
    }

    // Validate: need either message or file
    if ((!message || !message.trim()) && !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Message hoặc file là bắt buộc'
      });
    }

    const chat = await db.collection('pharmacist_chats').findOne({ _id: new ObjectId(chatId) });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    const newMessage = {
      chatId: chatId,
      sender: sender,
      content: message ? message.trim() : '',
      timestamp: new Date(),
      read: false
    };

    // Add file info if uploaded
    if (req.file) {
      newMessage.type = 'file';
      newMessage.fileUrl = `/uploads/chat-files/${req.file.filename}`;
      newMessage.fileName = req.file.originalname;
      newMessage.fileSize = req.file.size;
      newMessage.fileType = req.file.mimetype;
      newMessage.content = newMessage.content || `Đã gửi file: ${req.file.originalname}`;
    } else if (type === 'emoji') {
      newMessage.type = 'emoji';
    } else {
      newMessage.type = 'text';
    }

    // Update chat with new message
    await db.collection('pharmacist_chats').updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { messages: newMessage },
        $set: {
          status: sender === 'pharmacist' ? 'active' : chat.status,
          updatedAt: new Date()
        }
      }
    );

    // Create notification if user sends message (notify admin)
    if (sender === 'user') {
      const customerName = chat.customerInfo?.name || chat.customerInfo?.phone || 'Khách hàng';
      const messagePreview = newMessage.content?.substring(0, 50) || (newMessage.type === 'file' ? 'Đã gửi file' : 'Đã gửi emoji');
      
      await createNotification({
        targetType: 'admin',
        type: 'pharmacist_chat_message',
        title: 'Tin nhắn mới từ khách hàng',
        message: `${customerName}: ${messagePreview}${newMessage.content && newMessage.content.length > 50 ? '...' : ''}`,
        data: {
          chatId: chatId,
          customerName: customerName,
          customerPhone: chat.customerInfo?.phone,
          messageId: new ObjectId().toString()
        },
        link: `/collections/pharmacist_chats/${chatId}`
      });
    }

    // Return message with _id
    const savedMessage = {
      ...newMessage,
      _id: new ObjectId()
    };

    res.json({
      success: true,
      data: savedMessage
    });
  } catch (error) {
    console.error('❌ Error sending pharmacist chat message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get messages for a chat
app.get('/api/pharmacist-chat/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await db.collection('pharmacist_chats').findOne({ _id: new ObjectId(chatId) });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    res.json({
      success: true,
      data: chat.messages || []
    });
  } catch (error) {
    console.error('❌ Error getting pharmacist chat messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin: Get all chats (for admin panel)
app.get('/api/admin/pharmacist-chats', authenticateAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { phone: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [chats, total] = await Promise.all([
      db.collection('pharmacist_chats')
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      db.collection('pharmacist_chats').countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error getting pharmacist chats for admin:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin: Send pharmacist response (with file support)
app.post('/api/admin/pharmacist-chat/:chatId/respond', authenticateAdmin, chatFileUpload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, type } = req.body; // type: 'text' | 'file' | 'emoji'
    const adminUser = req.authUser;

    // Validate: need either message or file
    if ((!message || !message.trim()) && !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Message hoặc file là bắt buộc'
      });
    }

    const chat = await db.collection('pharmacist_chats').findOne({ _id: new ObjectId(chatId) });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    const pharmacistMessage = {
      chatId: chatId,
      sender: 'pharmacist',
      content: message ? message.trim() : '',
      timestamp: new Date(),
      read: false,
      pharmacistId: adminUser._id,
      pharmacistName: adminUser.name || 'Dược sĩ'
    };

    // Add file info if uploaded
    if (req.file) {
      pharmacistMessage.type = 'file';
      pharmacistMessage.fileUrl = `/uploads/chat-files/${req.file.filename}`;
      pharmacistMessage.fileName = req.file.originalname;
      pharmacistMessage.fileSize = req.file.size;
      pharmacistMessage.fileType = req.file.mimetype;
      pharmacistMessage.content = pharmacistMessage.content || `Đã gửi file: ${req.file.originalname}`;
    } else if (type === 'emoji') {
      pharmacistMessage.type = 'emoji';
    } else {
      pharmacistMessage.type = 'text';
    }

    // Update chat with pharmacist message
    await db.collection('pharmacist_chats').updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { messages: pharmacistMessage },
        $set: {
          status: 'active',
          updatedAt: new Date()
        }
      }
    );

    // Create notification for user - Pharmacist replied
    if (chat.userId) {
      const messagePreview = pharmacistMessage.content?.substring(0, 50) || (pharmacistMessage.type === 'file' ? 'Đã gửi file' : 'Đã gửi emoji');
      
      await createNotification({
        targetType: 'user',
        targetId: chat.userId,
        type: 'pharmacist_reply',
        title: 'Dược sĩ đã phản hồi',
        message: `Dược sĩ: ${messagePreview}${pharmacistMessage.content && pharmacistMessage.content.length > 50 ? '...' : ''}`,
        data: {
          chatId: chatId,
          messageId: new ObjectId().toString(),
          pharmacistName: pharmacistMessage.pharmacistName || 'Dược sĩ'
        },
        link: '/pharmacist-chat'
      });
    }

    res.json({
      success: true,
      data: pharmacistMessage
    });
  } catch (error) {
    console.error('❌ Error sending pharmacist response:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin: Update chat status
app.patch('/api/admin/pharmacist-chat/:chatId', authenticateAdmin, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'active', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    await db.collection('pharmacist_chats').updateOne(
      { _id: new ObjectId(chatId) },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Chat status updated'
    });
  } catch (error) {
    console.error('❌ Error updating chat status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== START SERVER ====================

// ==================== CHATBOT API ====================
app.post('/api/chatbot/message', async (req, res) => {
  try {
    const { message, conversationHistory = [], productContext } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log('🤖 Chatbot request:', message.substring(0, 100));
    if (productContext) {
      console.log('📦 Product context:', productContext.name);
    }

    // Xử lý message với AI (pass productContext if available)
    const result = await processMessageWithAI(message.trim(), conversationHistory, productContext);

    res.json({
      success: true,
      data: {
        message: result.text,
        products: result.products || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error processing chatbot message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process message'
    });
  }
});

// Background job: Auto-complete orders after 2 days
async function autoCompleteOrders() {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    // Find processing orders that were confirmed more than 2 days ago
    const result = await db.collection('orders').updateMany(
      {
        status: { $in: ['processing', 'shipping'] },
        confirmedAt: { $lte: twoDaysAgo },
        deliveredAt: { $exists: false }
      },
      {
        $set: {
          status: 'delivered',
          deliveredAt: new Date(),
          paymentStatus: 'paid'
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Auto-completed ${result.modifiedCount} orders`);
    }
  } catch (error) {
    console.error('❌ Error auto-completing orders:', error);
  }
}

// Run auto-complete job every hour
setInterval(autoCompleteOrders, 60 * 60 * 1000);
// Run once on startup
setTimeout(autoCompleteOrders, 5000);

// Get all blogs (no pagination, for client-side filtering)
app.get('/api/blogs/all', async (req, res) => {
  try {
    console.log('📚 Fetching all blogs from MongoDB...');
    
    const blogs = await db.collection('blogs')
      .find({ isApproved: { $ne: false } })
      .sort({ publishedAt: -1 })
      .toArray();

    console.log(`✅ Found ${blogs.length} approved blogs`);

    res.json({
      success: true,
      data: blogs
    });
  } catch (error) {
    console.error('❌ Error fetching all blogs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List blogs with pagination and filters
app.get('/api/blogs', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '12',
      category,
      tag,
      search,
      sort = 'publishedAt',
      order = 'desc'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 48);
    const skip = (pageNum - 1) * limitNum;

    const filterClauses = [];

    if (category) {
      const categoryValue = String(category).trim();
      const slugValue = categoryValue.toLowerCase();
      const namePattern = new RegExp(escapeRegex(categoryValue), 'i');

      filterClauses.push({
        $or: [
          { 'parentCategory.fullPathSlug': slugValue },
          { 'categories.fullPathSlug': slugValue },
          { 'category.fullPathSlug': slugValue },
          { 'parentCategory.name': namePattern },
          { 'categories.name': namePattern },
          { 'category.name': namePattern }
        ]
      });
    }

    if (tag) {
      const tagValue = String(tag).trim();
      const slugValue = normalizeBlogSlug(tagValue);
      const tagPattern = new RegExp(escapeRegex(tagValue), 'i');

      filterClauses.push({
        $or: [
          { 'tags.slug': slugValue },
          { 'tags.slug': tagValue },
          { 'tags.title': tagPattern },
          { hashtags: tagPattern }
        ]
      });
    }

    if (search) {
      const searchValue = String(search).trim();
      if (searchValue.length > 0) {
        const searchPattern = new RegExp(escapeRegex(searchValue), 'i');
        filterClauses.push({
          $or: [
            { title: searchPattern },
            { shortDescription: searchPattern },
            { headline: searchPattern }
          ]
        });
      }
    }

    const match = { ...BLOG_MATCH_CONDITION };
    if (filterClauses.length > 0) {
      match.$and = filterClauses;
    }

    const allowedSortFields = ['publishedAt', 'updatedAt', 'createdAt'];
    const sortField = allowedSortFields.includes(String(sort)) ? String(sort) : 'publishedAt';
    const sortDirection = String(order).toLowerCase() === 'asc' ? 1 : -1;
    const sortOption = { [sortField]: sortDirection };

    const collection = db.collection('blogs');

    const total = await collection.countDocuments(match);

    const rawItems = await collection
      .find(match)
      .project(BLOG_PROJECTION)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // Clean up invalid image URLs in blog summaries
    const cleanedItems = rawItems.map(buildBlogSummary).map(item => {
      // If primaryImage is invalid, set to null (frontend will use fallback)
      if (!item.primaryImage || 
          typeof item.primaryImage !== 'string' ||
          item.primaryImage.trim() === '' || 
          item.primaryImage === 'null' || 
          item.primaryImage === 'undefined') {
        item.primaryImage = null;
      }
      return item;
    });

    res.json({
      success: true,
      data: {
        items: cleanedItems,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(Math.ceil(total / limitNum), 1),
        hasNextPage: skip + rawItems.length < total,
        hasPreviousPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching blogs list:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Voucher validation endpoint
app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const { code, total } = req.body;

    if (!code || !total) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá và tổng tiền là bắt buộc'
      });
    }

    // Find voucher by code (case-insensitive)
    const voucher = await db.collection('promotions').findOne({
      code: { $regex: new RegExp(`^${code}$`, 'i') },
      isActive: true
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa'
      });
    }

    // Check if voucher has expired
    const now = new Date();
    if (voucher.expiresAt && new Date(voucher.expiresAt) < now) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá đã hết hạn'
      });
    }

    // Check if voucher has started
    if (voucher.startsAt && new Date(voucher.startsAt) > now) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá chưa có hiệu lực'
      });
    }

    // Check minimum order amount if specified
    if (voucher.minOrderAmount && total < voucher.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này`
      });
    }

    // Check usage limit if specified
    if (voucher.maxUsage && voucher.usedCount >= voucher.maxUsage) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá đã hết lượt sử dụng'
      });
    }

    // Return voucher data (without sensitive info)
    res.json({
      success: true,
      data: {
        code: voucher.code,
        discountPercent: voucher.discountPercent || voucher.discount || 0,
        title: voucher.title || voucher.name || '',
        description: voucher.description || ''
      }
    });
  } catch (error) {
    console.error('❌ Error validating voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xác thực mã giảm giá. Vui lòng thử lại.'
    });
  }
});

// Filters metadata for blogs page
app.get('/api/blogs/filters', async (req, res) => {
  try {
    const categoryLimit = Number.parseInt(req.query.categoryLimit, 10) || 12;
    const tagLimit = Number.parseInt(req.query.tagLimit, 10) || 20;

    const [categoryOverview, trendingTags] = await Promise.all([
      fetchCategoryOverview({ categoryLimit, articlesPerCategory: 0, subcategoryLimit: 0 }),
      fetchTrendingTags(tagLimit)
    ]);

    const categories = categoryOverview.map((category) => ({
      name: category.name,
      slug: category.slug,
      articleCount: category.articleCount
    }));

    res.json({
      success: true,
      data: {
        categories,
        tags: trendingTags
      }
    });
  } catch (error) {
    console.error('❌ Error fetching blog filters:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Configure multer for prescription image uploads
const prescriptionUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'public', 'uploads', 'prescriptions');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `prescription-${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Chỉ hỗ trợ file hình ảnh'));
      return;
    }
    cb(null, true);
  }
});

// Upload prescription image endpoint
app.post('/api/upload/image', prescriptionUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file được upload'
      });
    }

    const fileUrl = `/uploads/prescriptions/${req.file.filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Không thể upload hình ảnh'
    });
  }
});

// Create medicine request endpoint
app.post('/api/medicine-requests', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database chưa sẵn sàng. Vui lòng thử lại sau.'
      });
    }

    const {
      userId,
      fullName,
      phoneNumber,
      notes,
      prescriptionImages,
      medicineNames,
      status = 'pending'
    } = req.body;

    // Validation
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Họ và tên là bắt buộc'
      });
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại là bắt buộc'
      });
    }

    // Validate phone number format (Vietnamese)
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    const cleanPhone = phoneNumber.trim().replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ (phải là 10 số, bắt đầu bằng 0)'
      });
    }

    // Prepare data
    const requestData = {
      userId: userId || null,
      fullName: fullName.trim(),
      phoneNumber: cleanPhone,
      notes: notes?.trim() || '',
      prescriptionImages: Array.isArray(prescriptionImages) ? prescriptionImages : [],
      medicineNames: Array.isArray(medicineNames) ? medicineNames : [],
      status: status, // pending, contacted, completed, cancelled
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert into database
    const result = await db.collection('tuvanthuoc').insertOne(requestData);

    const created = await db.collection('tuvanthuoc').findOne({ _id: result.insertedId });

    console.log('✅ Medicine request created:', {
      _id: result.insertedId,
      fullName: created.fullName,
      phoneNumber: created.phoneNumber
    });

    res.status(201).json({
      success: true,
      message: 'Yêu cầu đã được gửi thành công',
      data: {
        _id: result.insertedId.toString(),
        ...requestData
      }
    });
  } catch (error) {
    console.error('❌ Error creating medicine request:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo yêu cầu. Vui lòng thử lại.',
      error: error.message
    });
  }
});

// ==================== 404 NOT FOUND HANDLER ====================
// Must be AFTER all route definitions
app.use(notFoundHandler);

// ==================== GLOBAL ERROR HANDLER ====================
// Must be the LAST middleware
app.use(errorHandler);

// ==================== START SERVER ====================
const server = app.listen(PORT, () => {
  console.log(`\n🚀 MEDICARE Backend Server`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log(`⏰ Auto-complete orders job running every hour`);
  console.log(`🔒 Security: Rate limiting DISABLED - unlimited requests`);
  console.log(`📊 Database: Indexes optimized for performance\n`);
});

// Set server timeout to unlimited (0 = no timeout)
server.timeout = 0;
server.keepAliveTimeout = 0;
server.headersTimeout = 0;
console.log('⏰ Server timeouts DISABLED - unlimited request time\n');

// ==================== PROCESS ERROR HANDLERS ====================
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});