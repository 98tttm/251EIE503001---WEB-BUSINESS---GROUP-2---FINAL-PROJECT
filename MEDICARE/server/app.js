// =========================
// 📁 MEDICARE MAIN APP FILE
// =========================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// ===== CONFIG =====
const config = require('./config/env');
const connectDB = require('./config/database');

// ===== MIDDLEWARES =====
const { errorHandler, notFound } = require('./middlewares/errorHandler');

// ===== ROUTES =====
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const categoryRoutes = require('./routes/categories');

// ===== CONNECT TO DATABASE =====
connectDB();

// ===== INITIALIZE EXPRESS =====
const app = express();

// ------------------------------
// 🔒 Security Middlewares
// ------------------------------
app.use(helmet()); // Secure HTTP headers

// ------------------------------
// 🌐 CORS Configuration
// ------------------------------
app.use(cors({
  origin: '*'
}));

// ------------------------------
// 🚦 Rate Limiting
// ------------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// ------------------------------
// 🧠 Body Parsing
// ------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ------------------------------
// ⚙️ Compression for speed
// ------------------------------
app.use(compression());

// ------------------------------
// 📝 Logging (Development only)
// ------------------------------
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ------------------------------
// 🩺 Health Check Endpoint
// ------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🩺 MediCare API is healthy and running',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// ------------------------------
// 🏠 Root Route (Optional Welcome)
// ------------------------------
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to 🏥 MediCare API Server',
    version: '1.0.0',
    docs: {
      health: '/health',
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      categories: '/api/categories'
    }
  });
});

// ------------------------------
// 🧩 API ROUTES
// ------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);

// ------------------------------
// ❌ 404 - Route Not Found
// ------------------------------
app.use(notFound);

// ------------------------------
// 🚨 Global Error Handler
// ------------------------------
app.use(errorHandler);

// ------------------------------
// 🚀 START SERVER
// ------------------------------
const PORT = config.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n=========================================');
  console.log(`🚀 MediCare API Server running on port ${PORT}`);
  console.log(`🧠 Environment: ${config.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${config.FRONTEND_URL}`);
  console.log('=========================================\n');
});

// ------------------------------
// 🧯 Handle Unhandled Promise Rejections
// ------------------------------
process.on('unhandledRejection', (err) => {
  console.error(`💥 Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// ------------------------------
// 💣 Handle Uncaught Exceptions
// ------------------------------
process.on('uncaughtException', (err) => {
  console.error(`💥 Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
