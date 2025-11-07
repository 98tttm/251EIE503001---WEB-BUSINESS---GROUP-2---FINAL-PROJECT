const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// General rate limiter for all requests - DISABLED (unlimited)
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10000, // 10,000 requests per minute (effectively unlimited)
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints - RELAXED
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 login attempts per minute
  message: {
    success: false,
    message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for OTP/forgot password - RELAXED
const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 OTP requests per minute
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu OTP, vui lòng thử lại sau'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for search endpoints - RELAXED
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 searches per minute
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu tìm kiếm, vui lòng chậm lại'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

module.exports = {
  generalLimiter,
  authLimiter,
  otpLimiter,
  searchLimiter,
  helmetConfig
};

