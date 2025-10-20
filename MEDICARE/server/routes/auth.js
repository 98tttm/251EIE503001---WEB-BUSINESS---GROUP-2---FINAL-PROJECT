const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout
} = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate
} = require('../middlewares/validation');

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/me', getMe);
router.put('/profile', validateUserUpdate, updateProfile);
router.put('/change-password', changePassword);
router.post('/logout', logout);

module.exports = router;
