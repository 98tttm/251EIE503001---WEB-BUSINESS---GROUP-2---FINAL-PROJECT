const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { asyncHandler } = require('../middlewares/errorHandler');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.getOrCreateCart(req.user._id);
  
  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name image price discount stock unit isActive'
  });

  // Filter out inactive products
  cart.items = cart.items.filter(item => 
    item.product && item.product.isActive
  );

  await cart.save();

  res.json({
    success: true,
    data: { cart }
  });
});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Check if product exists and is active
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Product not found or not available'
    });
  }

  // Check stock availability
  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} items available in stock`
    });
  }

  // Get or create cart
  const cart = await Cart.getOrCreateCart(req.user._id);

  // Add item to cart
  await cart.addItem(productId, quantity, product.finalPrice);

  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name image price discount stock unit isActive'
  });

  res.json({
    success: true,
    message: 'Item added to cart successfully',
    data: { cart }
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (quantity < 0) {
    return res.status(400).json({
      success: false,
      message: 'Quantity cannot be negative'
    });
  }

  // Check if product exists and is active
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Product not found or not available'
    });
  }

  // Check stock availability
  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} items available in stock`
    });
  }

  // Get cart
  const cart = await Cart.getOrCreateCart(req.user._id);

  // Update item quantity
  await cart.updateItemQuantity(productId, quantity);

  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name image price discount stock unit isActive'
  });

  res.json({
    success: true,
    message: 'Cart updated successfully',
    data: { cart }
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  // Get cart
  const cart = await Cart.getOrCreateCart(req.user._id);

  // Remove item
  await cart.removeItem(productId);

  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name image price discount stock unit isActive'
  });

  res.json({
    success: true,
    message: 'Item removed from cart successfully',
    data: { cart }
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.getOrCreateCart(req.user._id);
  
  await cart.clearCart();

  res.json({
    success: true,
    message: 'Cart cleared successfully',
    data: { cart }
  });
});

// @desc    Get cart count
// @route   GET /api/cart/count
// @access  Private
const getCartCount = asyncHandler(async (req, res) => {
  const cart = await Cart.getOrCreateCart(req.user._id);
  
  res.json({
    success: true,
    data: { count: cart.totalItems }
  });
});

// @desc    Merge guest cart with user cart
// @route   POST /api/cart/merge
// @access  Private
const mergeCart = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID is required'
    });
  }

  // Get guest cart
  const guestCart = await Cart.findOne({ sessionId });
  
  if (!guestCart || guestCart.items.length === 0) {
    return res.json({
      success: true,
      message: 'No guest cart items to merge',
      data: { cart: await Cart.getOrCreateCart(req.user._id) }
    });
  }

  // Get user cart
  const userCart = await Cart.getOrCreateCart(req.user._id);

  // Merge items
  for (const guestItem of guestCart.items) {
    const existingItem = userCart.items.find(
      item => item.product.toString() === guestItem.product.toString()
    );

    if (existingItem) {
      // Update quantity
      existingItem.quantity += guestItem.quantity;
    } else {
      // Add new item
      userCart.items.push(guestItem);
    }
  }

  await userCart.save();

  // Remove guest cart
  await Cart.findByIdAndDelete(guestCart._id);

  // Populate product details
  await userCart.populate({
    path: 'items.product',
    select: 'name image price discount stock unit isActive'
  });

  res.json({
    success: true,
    message: 'Cart merged successfully',
    data: { cart: userCart }
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  mergeCart
};
