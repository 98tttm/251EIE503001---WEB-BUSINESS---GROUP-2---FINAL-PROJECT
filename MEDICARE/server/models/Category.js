const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  parentId: {
    type: String,
    ref: 'Category',
    default: null
  },
  description: String,
  image: String,
  icon: String,
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Indexes for better performance
categorySchema.index({ slug: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ isActive: 1 });

// Virtual for children categories
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

// Virtual for parent category
categorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: '_id'
});

// Get category path (breadcrumb)
categorySchema.methods.getPath = async function() {
  const path = [];
  let current = this;
  
  while (current) {
    path.unshift({
      _id: current._id,
      name: current.name,
      slug: current.slug
    });
    
    if (current.parentId) {
      current = await this.constructor.findById(current.parentId);
    } else {
      current = null;
    }
  }
  
  return path;
};

// Get all descendants
categorySchema.methods.getDescendants = async function() {
  const descendants = [];
  
  const findChildren = async (parentId) => {
    const children = await this.constructor.find({ parentId, isActive: true });
    
    for (const child of children) {
      descendants.push(child);
      await findChildren(child._id);
    }
  };
  
  await findChildren(this._id);
  return descendants;
};

module.exports = mongoose.model('Category', categorySchema);
