const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('profile.firstName')
    .notEmpty()
    .trim()
    .withMessage('First name is required'),
  body('profile.lastName')
    .notEmpty()
    .trim()
    .withMessage('Last name is required'),
  body('profile.phone')
    .isMobilePhone('vi-VN')
    .withMessage('Please provide a valid Vietnamese phone number'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('profile.firstName')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('First name cannot be empty'),
  body('profile.lastName')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Last name cannot be empty'),
  body('profile.phone')
    .optional()
    .isMobilePhone('vi-VN')
    .withMessage('Please provide a valid Vietnamese phone number'),
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('profile.gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  handleValidationErrors
];

// Product validation rules
const validateProduct = [
  body('name')
    .notEmpty()
    .trim()
    .withMessage('Product name is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('unit')
    .notEmpty()
    .trim()
    .withMessage('Unit is required'),
  body('categoryId')
    .notEmpty()
    .withMessage('Category is required'),
  body('image')
    .isURL()
    .withMessage('Please provide a valid image URL'),
  handleValidationErrors
];

// Cart validation rules
const validateCartItem = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  handleValidationErrors
];

// Order validation rules
const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.product')
    .notEmpty()
    .withMessage('Product ID is required for each item'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1 for each item'),
  body('shippingAddress.street')
    .notEmpty()
    .trim()
    .withMessage('Street address is required'),
  body('shippingAddress.city')
    .notEmpty()
    .trim()
    .withMessage('City is required'),
  body('shippingAddress.district')
    .notEmpty()
    .trim()
    .withMessage('District is required'),
  body('shippingAddress.ward')
    .notEmpty()
    .trim()
    .withMessage('Ward is required'),
  body('shippingAddress.contactName')
    .notEmpty()
    .trim()
    .withMessage('Contact name is required'),
  body('shippingAddress.contactPhone')
    .isMobilePhone('vi-VN')
    .withMessage('Please provide a valid Vietnamese phone number'),
  body('paymentMethod')
    .isIn(['cod', 'vnpay', 'momo', 'bank_transfer'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
];

// Search and filter validation
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'rating', 'createdAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  handleValidationErrors
];

// ID parameter validation
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateProduct,
  validateCartItem,
  validateOrder,
  validateSearch,
  validateObjectId
};
