const asyncHandler = require('express-async-handler');
const crypto = require('crypto');

const Payment = require('../models/Payment');
const Business = require('../models/Business');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const sendResponse = require('../utils/apiResponse');

const {
  REFERRAL_COMMISSION,
  STANDARD_PLAN_PRICE,
  GST_RATE_PERCENT,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
} = require('../config/constants');

const generateTransactionId = () =>
  `ZYP-${crypto.randomInt(10000000, 99999999)}`;

const normalizePaymentMethod = (method) => {
  const supportedMethods = [
    'upi', 'card', 'netbanking', 'wallet', 'bank_transfer', 'other',
  ];
  return supportedMethods.includes(method) ? method : 'other';
};

const getPriceBreakdown = () => {
  const baseAmount = Number(STANDARD_PLAN_PRICE);
  const gstRate = Number(GST_RATE_PERCENT);
  const gstAmount = Number((baseAmount * gstRate / 100).toFixed(2));
  const totalAmount = Number((baseAmount + gstAmount).toFixed(2));

  return {
    amount: totalAmount,
    baseAmount,
    gstRate,
    gstAmount,
    totalAmount,
    currency: 'INR',
  };
};

const razorpayRequest = async (path, options = {}) => {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, 'Razorpay credentials are not configured');
  }

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
      ).toString('base64')}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Razorpay API request failed:', {
      status: response.status,
      error: data.error?.description || data.error?.reason,
    });
    throw new ApiError(
      response.status >= 400 && response.status < 500 ? response.status : 502,
      data.error?.description || 'Razorpay request failed'
    );
  }

  return data;
};

const awardReferralCommission = async (referralCode, referredUserId) => {
  if (!referralCode) return;

  const escapedCode = referralCode
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  await User.findOneAndUpdate(
    {
      referralCode: { $regex: `^${escapedCode}$`, $options: 'i' },
      _id: { $ne: referredUserId },
      referredUserIds: { $ne: referredUserId },
    },
    {
      $inc: {
        referralEarnings: REFERRAL_COMMISSION,
        referralCount: 1,
      },
      $addToSet: { referredUserIds: referredUserId },
    }
  );
};

const getOwnedBusiness = async (businessId, userId) => {
  const business = await Business.findById(businessId);

  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  if (String(business.owner) !== String(userId)) {
    throw new ApiError(403, 'You do not own this business listing');
  }

  if (business.status === 'active') {
    throw new ApiError(400, 'This business listing is already active');
  }

  return business;
};

const getPaymentPrice = asyncHandler(async (_req, res) => {
  sendResponse(res, 200, getPriceBreakdown(), 'Payment price retrieved');
});

const createOrder = asyncHandler(async (req, res) => {
  const { businessId } = req.body;
  if (!businessId) {
    throw new ApiError(400, 'Business ID is required');
  }

  const business = await getOwnedBusiness(businessId, req.user._id);
  const price = getPriceBreakdown();
  const order = await razorpayRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: Math.round(price.totalAmount * 100),
      currency: price.currency,
      receipt: `zyphoriz_${business._id}_${Date.now()}`.slice(0, 40),
      notes: {
        businessId: String(business._id),
        userId: String(req.user._id),
      },
    }),
  });

  sendResponse(
    res,
    201,
    {
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      keyId: RAZORPAY_KEY_ID,
      ...price,
    },
    'Razorpay order created'
  );
});

const checkout = asyncHandler(async (req, res) => {
  const {
    businessId,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body;

  if (!businessId || !orderId || !paymentId || !signature) {
    throw new ApiError(400, 'Business and Razorpay payment details are required');
  }

  const business = await Business.findById(businessId);
  if (!business) {
    throw new ApiError(404, 'Business not found');
  }
  if (String(business.owner) !== String(req.user._id)) {
    throw new ApiError(403, 'You do not own this business listing');
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, 'Razorpay credentials are not configured');
  }

  const existingPayment = await Payment.findOne({ razorpayOrderId: orderId });
  if (existingPayment) {
    if (String(existingPayment.user) !== String(req.user._id)) {
      throw new ApiError(403, 'Payment does not belong to this user');
    }
    return sendResponse(
      res,
      200,
      { payment: existingPayment, business },
      'Payment already processed'
    );
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (!/^[a-f\d]{64}$/i.test(signature)) {
    throw new ApiError(400, 'Invalid Razorpay payment signature');
  }
  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new ApiError(400, 'Invalid Razorpay payment signature');
  }

  const [order, paymentDetails] = await Promise.all([
    razorpayRequest(`/orders/${encodeURIComponent(orderId)}`),
    razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`),
  ]);
  const expectedAmount = Math.round(getPriceBreakdown().totalAmount * 100);

  if (
    order.amount !== expectedAmount ||
    order.currency !== 'INR' ||
    String(order.notes?.businessId) !== String(business._id) ||
    String(order.notes?.userId) !== String(req.user._id)
  ) {
    throw new ApiError(400, 'Razorpay order details do not match this purchase');
  }
  if (
    paymentDetails.order_id !== orderId ||
    paymentDetails.status !== 'captured' ||
    paymentDetails.amount !== expectedAmount ||
    paymentDetails.currency !== 'INR'
  ) {
    throw new ApiError(400, 'Razorpay payment has not been captured');
  }

  const payment = await Payment.create({
    user: req.user._id,
    business: business._id,
    transactionId: generateTransactionId(),
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    amount: getPriceBreakdown().totalAmount,
    method: normalizePaymentMethod(paymentDetails.method),
    plan: business.selectedPlan,
    status: 'success',
  });

  business.status = 'active';
  business.verified = true;
  business.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await business.save();

  await awardReferralCommission(business.referralCodeUsed, req.user._id);

  sendResponse(
    res,
    200,
    { payment, business },
    'Payment successful, your business is now live'
  );
});

const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .populate('business', 'name slug')
    .sort({ createdAt: -1 });

  sendResponse(res, 200, { payments });
});

module.exports = {
  getPaymentPrice,
  createOrder,
  checkout,
  getMyPayments,
};
