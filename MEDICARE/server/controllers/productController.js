const Product = require('../models/Product');
const Category = require('../models/Category');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * GET /api/products
 * Lấy danh sách tất cả sản phẩm (có phân trang, lọc, sắp xếp)
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    inStock,
    prescriptionRequired,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20
  } = req.query;

  const filter = { isActive: true };
  if (category) filter.categoryId = category;

  const product = await Product.find(filter)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  
  // Tạo query động
  const query = {};

  // Nếu có từ khóa tìm kiếm (q)
  if (q) {
    query.name = { $regex: q, $options: 'i' };
  }

  // Lọc theo category
  if (category) {
    query.categoryId = category;
  }

  // Lọc theo giá
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Lọc tồn kho
  if (inStock !== undefined) {
    query.stock = inStock === 'true' ? { $gt: 0 } : 0;
  }

  // Lọc kê đơn
  if (prescriptionRequired !== undefined) {
    query.prescriptionRequired = prescriptionRequired === 'true';
  }

  // Đảm bảo chỉ lấy sản phẩm đang hoạt động
  query.isActive = true;

  // Sắp xếp
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Phân trang
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Lấy dữ liệu từ MongoDB
  const products = await Product.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Product.countDocuments(query);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * GET /api/products/:id
 * Lấy chi tiết 1 sản phẩm
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('categoryId', 'name slug')
    .lean();

  if (!product || !product.isActive) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, data: { product } });
});

/**
 * GET /api/products/featured
 * Lấy danh sách sản phẩm nổi bật
 */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const products = await Product.find({
    isActive: true,
    isFeatured: true,
    stock: { $gt: 0 }
  })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  res.json({ success: true, data: { products } });
});

/**
 * GET /api/products/category/:categoryId
 * Lấy danh sách sản phẩm theo danh mục
 */
const getProductsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const categoryObj = await Category.findById(categoryId);
  if (!categoryObj) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const products = await Product.find({
    categoryId,
    isActive: true
  })
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Product.countDocuments({ categoryId, isActive: true });

  res.json({
    success: true,
    data: {
      category: categoryObj,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * GET /api/products/:id/related
 * Lấy sản phẩm liên quan
 */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 8 } = req.query;

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const relatedProducts = await Product.find({
    _id: { $ne: id },
    categoryId: product.categoryId,
    isActive: true,
    stock: { $gt: 0 }
  })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  res.json({ success: true, data: { products: relatedProducts } });
});

/**
 * GET /api/products/:id/reviews
 * Lấy danh sách review
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const product = await Product.findById(id).lean();
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const paginatedReviews = (product.reviews || []).slice(startIndex, startIndex + parseInt(limit));

  res.json({
    success: true,
    data: {
      reviews: paginatedReviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil((product.reviews?.length || 0) / parseInt(limit)),
        totalItems: product.reviews?.length || 0,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});
const addReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating = 5, comment = '' } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Nếu chưa có user/auth, tạm ghi anonymous
  product.reviews = product.reviews || [];
  product.reviews.push({
    user: null,           // sau này thay bằng req.user._id
    rating: Number(rating),
    comment: String(comment),
    createdAt: new Date()
  });

  // cập nhật rating trung bình đơn giản
  const sum = product.reviews.reduce((s, r) => s + (r.rating || 0), 0);
  product.ratings = product.ratings || {};
  product.ratings.average = Math.round((sum / product.reviews.length) * 10) / 10;
  product.ratings.count = product.reviews.length;

  await product.save();

  res.status(201).json({
    success: true,
    message: 'Review added',
    data: { productId: product._id, ratings: product.ratings }
  });
});

module.exports = {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getRelatedProducts,
  getProductReviews,
  addReview,
};
