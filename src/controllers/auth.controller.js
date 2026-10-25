const { createHash, randomBytes, randomInt } = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const sendResponse = require('../utils/apiResponse');
const { sendTokenResponse } = require('../utils/generateToken');
const sendPasswordResetEmail = require('../utils/sendOtpEmail');
const sendOtpEmail = require('../utils/sendOtpEmail');

const generateOtp = () => String(randomInt(100000, 1000000));

// @desc    Register a new user (mobile + email + password)
// @route   POST /api/v1/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { mobile, email, password } = req.body;

  if (!mobile || !email || !password) {
    throw new ApiError(400, 'Mobile, email and password are all required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.trim();

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }],
  });
  if (existing) {
    throw new ApiError(409, 'An account with this email or mobile number already exists');
  }

  const user = await User.create({
    mobile: normalizedMobile,
    email: normalizedEmail,
    password,
  });

  sendTokenResponse(res, 201, user, 'Account created successfully');
});

// @desc    Log in with email or mobile + password
// @route   POST /api/v1/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    throw new ApiError(400, 'Identifier (email or mobile) and password are required');
  }

  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalized }, { mobile: identifier.trim() }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email/mobile number or password');
  }

  sendTokenResponse(res, 200, user, 'Logged in successfully');
});

// @desc    Send a password reset link to an account email
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (typeof email !== 'string' || !email.trim()) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (user) {
    const resetToken = randomBytes(32).toString('hex');
    user.passwordResetToken = createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(user.email, resetToken);
  }

  sendResponse(
    res,
    200,
    null,
    'If an account exists for that email, a password reset link has been sent'
  );
});

// @desc    Reset password using a valid reset token
// @route   POST /api/v1/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
    throw new ApiError(400, 'Reset token and new password are required');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  const hashedToken = createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+password +passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Password reset token is invalid or has expired');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendResponse(res, 200, null, 'Password has been reset successfully');
});

// @desc    Log out (clears auth cookie)
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 1000), httpOnly: true });
  sendResponse(res, 200, null, 'Logged out successfully');
});

// @desc    Get the currently authenticated user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  sendResponse(res, 200, { user: req.user.toSafeObject() });
});

const sendOtpController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (typeof email !== "string" || !email.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });

  // Use a generic response so callers cannot discover registered accounts.
  const responseMessage =
    "If an account exists for that email, an OTP will be sent.";

  if (!user) {
    return res.status(200).json({
      success: true,
      message: responseMessage,
    });
  }

  const otp = generateOtp();

  user.otp = createHash("sha256").update(otp).digest("hex");
  user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

  await user.save();

  try {
    await sendOtpEmail(normalizedEmail, otp);
  } catch (error) {
    // Do not leave an unusable OTP stored if delivery fails.
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    throw error;
  }

  return res.status(200).json({
    success: true,
    message: responseMessage,
  });
});

const verifyOtpController = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp)
  ) {
    throw new ApiError(400, "Valid email and six-digit OTP are required");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const hashedOtp = createHash("sha256")
    .update(otp)
    .digest("hex");

  const user = await User.findOne({
    email: normalizedEmail,
    otp: hashedOtp,
    otpExpiry: { $gt: new Date() },
  }).select("+otp +otpExpiry");

  if (!user) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully",
  });
});


const resetPasswordController = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp) ||
    typeof newPassword !== "string" ||
    !newPassword
  ) {
    throw new ApiError(
      400,
      "Email, valid OTP and new password are required"
    );
  }

  if (newPassword.length < 8) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters long"
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const hashedOtp = createHash("sha256")
    .update(otp)
    .digest("hex");

  const user = await User.findOne({
    email: normalizedEmail,
    otp: hashedOtp,
    otpExpiry: { $gt: new Date() },
  }).select("+password +otp +otpExpiry");

  if (!user) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Let your existing Mongoose password hook hash this password.
  user.password = newPassword;

  // Invalidate the OTP immediately after successful reset.
  user.otp = undefined;
  user.otpExpiry = undefined;

  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});


module.exports = { register, login, forgotPassword, resetPassword, logout, getMe, sendOtpController, verifyOtpController, resetPasswordController };
