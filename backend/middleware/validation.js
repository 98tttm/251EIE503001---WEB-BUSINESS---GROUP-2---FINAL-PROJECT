const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation rules
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Tên không được để trống')
    .isLength({ min: 2, max: 100 }).withMessage('Tên phải từ 2-100 ký tự'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Số điện thoại không được để trống')
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ'),
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ'),
  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống'),
  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ'),
  handleValidationErrors
];

// Order validation rules
const createOrderValidation = [
  body('userId')
    .optional()
    .isString().withMessage('User ID không hợp lệ'),
  body('items')
    .isArray({ min: 1 }).withMessage('Đơn hàng phải có ít nhất 1 sản phẩm')
    .custom((items) => {
      for (const item of items) {
        if (!item._id || !item.name || !item.quantity || item.quantity < 1) {
          throw new Error('Thông tin sản phẩm không hợp lệ');
        }
      }
      return true;
    }),
  body('customerInfo.name')
    .trim()
    .notEmpty().withMessage('Tên khách hàng không được để trống'),
  body('customerInfo.phone')
    .trim()
    .notEmpty().withMessage('Số điện thoại không được để trống')
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ'),
  body('shippingAddress')
    .notEmpty().withMessage('Địa chỉ giao hàng không được để trống'),
  body('paymentMethod')
    .isIn(['cod', 'bank_transfer', 'momo', 'vnpay']).withMessage('Phương thức thanh toán không hợp lệ'),
  handleValidationErrors
];

// Cart validation rules
const addToCartValidation = [
  param('userId')
    .notEmpty().withMessage('User ID không được để trống'),
  body('_id')
    .notEmpty().withMessage('Product ID không được để trống'),
  body('quantity')
    .isInt({ min: 1 }).withMessage('Số lượng phải lớn hơn 0'),
  handleValidationErrors
];

const updateCartItemValidation = [
  param('userId')
    .notEmpty().withMessage('User ID không được để trống'),
  param('itemId')
    .notEmpty().withMessage('Item ID không được để trống'),
  body('quantity')
    .isInt({ min: 0 }).withMessage('Số lượng không hợp lệ'),
  handleValidationErrors
];

// Product validation rules
const productIdValidation = [
  param('id')
    .notEmpty().withMessage('Product ID không được để trống'),
  handleValidationErrors
];

// Comment/Rating validation
const addCommentValidation = [
  param('id')
    .notEmpty().withMessage('Product ID không được để trống'),
  body('comment')
    .trim()
    .notEmpty().withMessage('Nội dung bình luận không được để trống')
    .isLength({ min: 10, max: 1000 }).withMessage('Bình luận phải từ 10-1000 ký tự'),
  body('userId')
    .notEmpty().withMessage('User ID không được để trống'),
  body('userName')
    .trim()
    .notEmpty().withMessage('Tên người dùng không được để trống'),
  handleValidationErrors
];

const addRatingValidation = [
  param('id')
    .notEmpty().withMessage('Product ID không được để trống'),
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Đánh giá phải từ 1-5 sao'),
  body('review')
    .trim()
    .notEmpty().withMessage('Nội dung đánh giá không được để trống')
    .isLength({ min: 10, max: 1000 }).withMessage('Đánh giá phải từ 10-1000 ký tự'),
  body('userId')
    .notEmpty().withMessage('User ID không được để trống'),
  body('userName')
    .trim()
    .notEmpty().withMessage('Tên người dùng không được để trống'),
  handleValidationErrors
];

// Search validation
const searchValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Từ khóa tìm kiếm phải từ 1-100 ký tự'),
  handleValidationErrors
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Số trang phải lớn hơn 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Giới hạn phải từ 1-100'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  createOrderValidation,
  addToCartValidation,
  updateCartItemValidation,
  productIdValidation,
  addCommentValidation,
  addRatingValidation,
  searchValidation,
  paginationValidation
};

