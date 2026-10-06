const asyncHandler = require('express-async-handler');
const sendResponse = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const ReferralRedemption = require('../models/ReferralRedemption');

const MINIMUM_REFERRAL_REDEMPTION = 1000;

const getPendingRedemption = (userId) =>
  ReferralRedemption.findOne({ user: userId, status: 'pending' })
    .select('amount status createdAt')
    .lean();

const getCommittedRedemptionAmount = async (userId) => {
  const [result] = await ReferralRedemption.aggregate([
    { $match: { user: userId, status: { $ne: 'rejected' } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result?.total || 0;
};

// @desc    Get the logged-in user's referral stats (code, earnings, count)
// @route   GET /api/v1/users/referrals
// @access  Private
const getReferralStats = asyncHandler(async (req, res) => {
  const { referralCode, referralEarnings, referralCount } = req.user;
  const [pendingRedemption, committedAmount] = await Promise.all([
    getPendingRedemption(req.user._id),
    getCommittedRedemptionAmount(req.user._id),
  ]);
  const availableEarnings = Math.max(
    0,
    (Number(referralEarnings) || 0) - committedAmount,
  );

  sendResponse(res, 200, {
    referralCode,
    referralEarnings: availableEarnings,
    referralCount,
    pendingRedemption: pendingRedemption
      ? {
          amount: pendingRedemption.amount,
          status: pendingRedemption.status,
          createdAt: pendingRedemption.createdAt,
        }
      : null,
  });
});

// @desc    Submit a referral commission redemption request
// @route   POST /api/v1/users/referrals/redeem
// @access  Private
const createReferralRedemption = asyncHandler(async (req, res) => {
  const pendingRedemption = await getPendingRedemption(req.user._id);
  if (pendingRedemption) {
    throw new ApiError(409, 'You already have a referral redemption request pending.');
  }

  const committedAmount = await getCommittedRedemptionAmount(req.user._id);
  const amount = Math.max(
    0,
    (Number(req.user.referralEarnings) || 0) - committedAmount,
  );
  if (amount < MINIMUM_REFERRAL_REDEMPTION) {
    throw new ApiError(400, 'The minimum referral commission for redemption is ₹1,000.');
  }

  const { payoutMethod, payoutDetails } = req.body || {};
  if (!['bank', 'upi'].includes(payoutMethod) || !payoutDetails) {
    throw new ApiError(400, 'Choose a valid payout method and provide the payout details.');
  }

  const accountHolderName = String(payoutDetails.accountHolderName || '').trim();
  if (accountHolderName.length < 2 || accountHolderName.length > 120) {
    throw new ApiError(400, 'Enter a valid account holder name.');
  }

  let savedPayoutDetails;
  if (payoutMethod === 'bank') {
    const accountNumber = String(payoutDetails.accountNumber || '').trim();
    const ifscCode = String(payoutDetails.ifscCode || '').trim().toUpperCase();
    const branch = String(payoutDetails.branch || '').trim();

    if (!/^\d{8,32}$/.test(accountNumber)) {
      throw new ApiError(400, 'Enter a valid bank account number.');
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      throw new ApiError(400, 'Enter a valid IFSC code.');
    }
    if (branch.length < 2 || branch.length > 120) {
      throw new ApiError(400, 'Enter a valid bank branch.');
    }

    savedPayoutDetails = { accountHolderName, accountNumber, ifscCode, branch };
  } else {
    const upiId = String(payoutDetails.upiId || '').trim();
    if (!/^[\w.-]{2,100}@[a-zA-Z][\w.-]{1,30}$/.test(upiId)) {
      throw new ApiError(400, 'Enter a valid UPI ID.');
    }
    savedPayoutDetails = { accountHolderName, upiId };
  }

  const redemption = await ReferralRedemption.create({
    user: req.user._id,
    amount,
    payoutMethod,
    payoutDetails: savedPayoutDetails,
  });

  sendResponse(
    res,
    201,
    {
      redemption: {
        id: redemption._id,
        amount: redemption.amount,
        status: redemption.status,
        createdAt: redemption.createdAt,
      },
      referralEarnings: 0,
      pendingRedemption: {
        amount: redemption.amount,
        status: redemption.status,
        createdAt: redemption.createdAt,
      },
    },
    'Referral redemption request submitted.',
  );
});

module.exports = { getReferralStats, createReferralRedemption };
