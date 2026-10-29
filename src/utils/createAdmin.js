require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const createAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const mobile = process.env.ADMIN_MOBILE?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const resetPassword = process.argv.includes('--reset-password');

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid email address in backend/.env');
  }
  if (resetPassword && (!password || password.length < 12)) {
    throw new Error('Set ADMIN_PASSWORD to a password with at least 12 characters to reset the administrator password');
  }

  await connectDB();

  const emailMatch = await User.findOne({ email });
  if (emailMatch) {
    const wasAdmin = emailMatch.role === 'admin';
    if (!wasAdmin) emailMatch.role = 'admin';
    if (resetPassword) emailMatch.password = password;

    if (!wasAdmin || resetPassword) {
      await emailMatch.save();
      const actions = [
        !wasAdmin && 'promoted to administrator',
        resetPassword && 'password reset',
      ].filter(Boolean);
      console.log(`Existing account ${email} ${actions.join(' and ')}`);
    } else {
      console.log(`Administrator account already exists for ${email}`);
    }
    return;
  }

  if (!mobile) {
    throw new Error('No account matches ADMIN_EMAIL. Set ADMIN_MOBILE to create a new admin account');
  }
  if (!password || password.length < 12) {
    throw new Error('No account matches ADMIN_EMAIL. Set ADMIN_PASSWORD to a password with at least 12 characters to create a new admin account');
  }

  const mobileMatch = await User.findOne({ mobile });
  if (mobileMatch) {
    throw new Error('ADMIN_MOBILE already belongs to another account. Use that account’s email in ADMIN_EMAIL or choose an unused mobile');
  }

  await User.create({ email, mobile, password, role: 'admin' });
  console.log(`Created administrator account ${email}`);
};

createAdmin()
  .catch((error) => {
    console.error(`Admin setup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
