const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { asyncHandler } = require('../middlewares/errorHandler');
const { validateObjectId } = require('../middlewares/validation');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const { parent = null, active = true } = req.query;

  let query = { isActive: active === 'true' };
  
  if (parent === 'null' || parent === null) {
    query.parentId = null;
  } else if (parent) {
    query.parentId = parent;
  }

  const categories = await Category.find(query)
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  res.json({
    success: true,
    data: { categories }
  });
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  res.json({
    success: true,
    data: { category }
  });
});

// @desc    Get category children
// @route   GET /api/categories/:id/children
// @access  Public
const getCategoryChildren = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { active = true } = req.query;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  const children = await Category.find({
    parentId: id,
    isActive: active === 'true'
  })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  res.json({
    success: true,
    data: { 
      category,
      children 
    }
  });
});

// @desc    Get category path (breadcrumb)
// @route   GET /api/categories/:id/path
// @access  Public
const getCategoryPath = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  const path = await category.getPath();

  res.json({
    success: true,
    data: { path }
  });
});

// @desc    Get category tree
// @route   GET /api/categories/tree
// @access  Public
const getCategoryTree = asyncHandler(async (req, res) => {
  const { active = true } = req.query;

  const buildTree = async (parentId = null) => {
    const categories = await Category.find({
      parentId,
      isActive: active === 'true'
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const tree = [];

    for (const category of categories) {
      const children = await buildTree(category._id);
      tree.push({
        ...category,
        children
      });
    }

    return tree;
  };

  const tree = await buildTree();

  res.json({
    success: true,
    data: { tree }
  });
});

// Routes
router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/:id', validateObjectId(), getCategory);
router.get('/:id/children', validateObjectId(), getCategoryChildren);
router.get('/:id/path', validateObjectId(), getCategoryPath);

module.exports = router;
