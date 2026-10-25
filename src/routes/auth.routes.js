const express = require('express');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  sendOtpController,
  verifyOtpController,
  resetPasswordController
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password-token', resetPassword);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/send-otp', sendOtpController);
router.post('/verify-otp', verifyOtpController);
router.post('/reset-password', resetPasswordController);
module.exports = router;
