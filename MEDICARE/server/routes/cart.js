const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  mergeCart
} = require('../controllers/cartController');
const { authenticate } = require('../middlewares/auth');
const { validateCartItem } = require('../middlewares/validation');

// All cart routes require authentication
router.use(authenticate);

router.get('/', getCart);
router.get('/count', getCartCount);
router.post('/add', validateCartItem, addToCart);
router.put('/update', validateCartItem, updateCartItem);
router.delete('/remove', removeFromCart);
router.delete('/clear', clearCart);
router.post('/merge', mergeCart);

module.exports = router;
