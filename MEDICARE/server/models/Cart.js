const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: String,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  sessionId: String, // For guest users
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes
cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for total items count
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for total price
cartSchema.virtual('totalPrice').get(function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Method to add item to cart
cartSchema.methods.addItem = function(productId, quantity = 1, price) {
  const existingItem = this.items.find(item => item.product.toString() === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = price; // Update price in case it changed
  } else {
    this.items.push({
      product: productId,
      quantity,
      price
    });
  }
  
  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => item.product.toString() !== productId);
  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(productId, quantity) {
  const item = this.items.find(item => item.product.toString() === productId);
  
  if (item) {
    if (quantity <= 0) {
      return this.removeItem(productId);
    } else {
      item.quantity = quantity;
    }
  }
  
  return this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

// Static method to get or create cart
cartSchema.statics.getOrCreateCart = async function(userId, sessionId = null) {
  let cart = await this.findOne({ user: userId });
  
  if (!cart && sessionId) {
    cart = await this.findOne({ sessionId });
    if (cart) {
      cart.user = userId;
      cart.sessionId = undefined;
    }
  }
  
  if (!cart) {
    cart = new this({
      user: userId,
      sessionId: sessionId
    });
    await cart.save();
  }
  
  return cart;
};

module.exports = mongoose.model('Cart', cartSchema);
