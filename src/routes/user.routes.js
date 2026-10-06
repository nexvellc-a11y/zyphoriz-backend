const express = require('express');
const {
  getReferralStats,
  createReferralRedemption,
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/referrals', protect, getReferralStats);
router.post('/referrals/redeem', protect, createReferralRedemption);

module.exports = router;
