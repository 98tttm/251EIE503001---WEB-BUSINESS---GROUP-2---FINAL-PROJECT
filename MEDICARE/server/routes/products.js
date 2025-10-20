// server/routes/products.js
const express = require('express');
const router = express.Router();

// Import controller
const productController = require('../controllers/productController');

// Kiểm tra import
console.log('🔍 ProductController loaded keys:', Object.keys(productController));

// Gán destructuring đúng
const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getRelatedProducts,
  getProductReviews,
  // 👇 thêm dòng này nếu bạn có addReview
  addReview
} = productController;

// Route khai báo đúng
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id/related', getRelatedProducts);
router.get('/:id/reviews', getProductReviews);

// ❗ chỉ giữ dòng dưới nếu controller có addReview
if (typeof addReview === 'function') {
  router.post('/:id/reviews', addReview);
} else {
  console.warn('⚠️ addReview function is missing in productController.js');
}

router.get('/:id', getProduct);

module.exports = router;
