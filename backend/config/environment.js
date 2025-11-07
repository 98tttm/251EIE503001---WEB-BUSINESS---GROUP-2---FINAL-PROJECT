// Environment configuration with fallback to defaults
module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB
  // Support both MONGODB_URI and MONGO_URI (Railway uses MONGO_URI)
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017',
  dbName: process.env.DB_NAME || 'MediCare_database',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'medicare_secret_key_2025_CHANGE_IN_PRODUCTION',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'nhathuocmedicare@gmail.com',
    password: process.env.EMAIL_PASSWORD || 'tmbogjouhedjbtjo',
    from: process.env.EMAIL_FROM || 'MediCare <noreply@medicare.com>'
  },
  
  // CORS
  // ⚠️ QUAN TRỌNG: Cập nhật ALLOWED_ORIGINS trên Railway để cho phép client và admin truy cập
  // Ví dụ: https://medicare-seven-kappa.vercel.app,https://your-admin-url.vercel.app
  // Các origin phân cách bằng dấu phẩy, không có khoảng trắng
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:4200', 
        'http://localhost:4201', 
        'https://medicare-seven-kappa.vercel.app'
      ],
  
  // Rate Limiting - UNLIMITED
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000 // Effectively unlimited
  },
  
  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  uploadDir: process.env.UPLOAD_DIR || './public/uploads'
};

