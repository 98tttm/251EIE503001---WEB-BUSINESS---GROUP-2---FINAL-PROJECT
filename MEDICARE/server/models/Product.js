const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: [true, 'Product name is required'], trim: true },
  brand: { type: String, trim: true },
  country: { type: String, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: [true, 'Price is required'], min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  unit: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  gallery: [String],
  categoryId: { type: String, ref: 'Category', required: true },
  prescriptionRequired: { type: Boolean, default: false },
  ingredients: String,
  warnings: String,
  usage: String,
  activeIngredientIds: [String],
  herbIds: [String],
  createDate: { type: Date, default: Date.now },
  expiredDate: Date,
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  tags: [String],
  specifications: {
    weight: String,
    dimensions: String,
    origin: String,
    manufacturer: String,
    barcode: String
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  seo: {
    title: String,
    description: String,
    keywords: [String]
  }
}, { timestamps: true });

// Indexes
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ categoryId: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });

// Virtual fields
productSchema.virtual('finalPrice').get(function() {
  return this.price - this.discount;
});

productSchema.virtual('discountPercentage').get(function() {
  if (this.price === 0) return 0;
  return Math.round((this.discount / this.price) * 100);
});

productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock < 10) return 'low_stock';
  return 'in_stock';
});

// Static method for searching and filtering
productSchema.statics.searchProducts = function(query, options = {}) {
  const {
    category,
    minPrice,
    maxPrice,
    inStock,
    prescriptionRequired,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20
  } = options;

  let searchQuery = { isActive: true };

  if (query) searchQuery.$text = { $search: query };
  if (category) searchQuery.categoryId = category;
  if (minPrice || maxPrice) {
    searchQuery.price = {};
    if (minPrice) searchQuery.price.$gte = minPrice;
    if (maxPrice) searchQuery.price.$lte = maxPrice;
  }
  if (inStock !== undefined) {
    searchQuery.stock = inStock ? { $gt: 0 } : 0;
  }
  if (prescriptionRequired !== undefined) {
    searchQuery.prescriptionRequired = prescriptionRequired;
  }

  const sortOptions = {};
  if (sortBy === 'price') sortOptions.price = sortOrder === 'asc' ? 1 : -1;
  else if (sortBy === 'rating') sortOptions['ratings.average'] = sortOrder === 'asc' ? 1 : -1;
  else if (sortBy === 'name') sortOptions.name = sortOrder === 'asc' ? 1 : -1;
  else sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const skip = (page - 1) * limit;

  return this.find(searchQuery)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate('categoryId', 'name slug')
    .lean();
};

module.exports = mongoose.model('Product', productSchema);
