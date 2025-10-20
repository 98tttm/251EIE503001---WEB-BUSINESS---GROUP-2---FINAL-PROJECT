const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: String,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: String,
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  total: {
    type: Number,
    required: true
  }
});

const shippingAddressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  ward: {
    type: String,
    required: true
  },
  fullAddress: {
    type: String,
    required: true
  },
  contactName: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',      // Chờ xử lý
      'confirmed',    // Đã xác nhận
      'processing',   // Đang xử lý
      'shipped',      // Đã gửi hàng
      'delivered',    // Đã giao hàng
      'cancelled',    // Đã hủy
      'returned'      // Đã trả hàng
    ],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'vnpay', 'momo', 'bank_transfer'],
    required: true
  },
  paymentId: String, // Payment gateway transaction ID
  subtotal: {
    type: Number,
    required: true
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  notes: String,
  prescriptionImages: [String], // For prescription drugs
  pharmacistNotes: String,
  trackingNumber: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancelReason: String,
  history: [{
    status: String,
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get count of orders today
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    const orderNum = String(count + 1).padStart(4, '0');
    this.orderNumber = `MC${year}${month}${day}${orderNum}`;
  }
  next();
});

// Add status to history when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.history.push({
      status: this.status,
      note: this.getStatusNote(this.status),
      updatedAt: new Date()
    });
  }
  next();
});

// Method to get status note
orderSchema.methods.getStatusNote = function(status) {
  const statusNotes = {
    pending: 'Đơn hàng đã được tạo và đang chờ xử lý',
    confirmed: 'Đơn hàng đã được xác nhận',
    processing: 'Đơn hàng đang được chuẩn bị',
    shipped: 'Đơn hàng đã được gửi đi',
    delivered: 'Đơn hàng đã được giao thành công',
    cancelled: 'Đơn hàng đã bị hủy',
    returned: 'Đơn hàng đã được trả lại'
  };
  return statusNotes[status] || '';
};

// Method to update status
orderSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = null) {
  this.status = newStatus;
  
  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  }
  
  this.history.push({
    status: newStatus,
    note: note || this.getStatusNote(newStatus),
    updatedBy,
    updatedAt: new Date()
  });
  
  return this.save();
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = async function(userId = null, dateRange = null) {
  const matchQuery = {};
  
  if (userId) {
    matchQuery.user = mongoose.Types.ObjectId(userId);
  }
  
  if (dateRange) {
    matchQuery.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$total' }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('Order', orderSchema);
