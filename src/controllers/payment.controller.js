const asyncHandler = require('express-async-handler');
const crypto = require('crypto');

const Payment = require('../models/Payment');
const Business = require('../models/Business');
const User = require('../models/User');

const ApiError = require('../utils/ApiError');
const sendResponse = require('../utils/apiResponse');

const { Cashfree } = require('cashfree-pg');
const {
  REFERRAL_COMMISSION,
  STANDARD_PLAN_PRICE,
  CASHFREE_CLIENT_ID,
  CASHFREE_CLIENT_SECRET,
  CASHFREE_ENV,
} = require('../config/constants');


const generateTransactionId = () =>
  `ZYP-${crypto.randomInt(10000000, 99999999)}`;

const normalizePaymentMethod = (method) => {
  const supportedMethods = [
    'upi', 'card', 'netbanking', 'wallet', 'bank_transfer', 'other',
  ];
  return supportedMethods.includes(method) ? method : 'other';
};

// --------------------------------------------------
// Cashfree configuration
// --------------------------------------------------

const cashfree = new Cashfree(
  CASHFREE_ENV === 'PRODUCTION'
    ? Cashfree.PRODUCTION
    : Cashfree.SANDBOX,
  CASHFREE_CLIENT_ID,
  CASHFREE_CLIENT_SECRET
);

// --------------------------------------------------
// Referral commission
// --------------------------------------------------

const awardReferralCommission = async (
  referralCode,
  referredUserId
) => {
  if (!referralCode) return;

  const escapedCode = referralCode
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  await User.findOneAndUpdate(
    {
      referralCode: {
        $regex: `^${escapedCode}$`,
        $options: 'i',
      },

      _id: {
        $ne: referredUserId,
      },

      referredUserIds: {
        $ne: referredUserId,
      },
    },
    {
      $inc: {
        referralEarnings: REFERRAL_COMMISSION,
        referralCount: 1,
      },

      $addToSet: {
        referredUserIds: referredUserId,
      },
    }
  );
};

// --------------------------------------------------
// Get owned business
// --------------------------------------------------

const getOwnedBusiness = async (
  businessId,
  userId
) => {
  const business = await Business.findById(businessId);

  if (!business) {
    throw new ApiError(
      404,
      'Business not found'
    );
  }

  if (
    String(business.owner) !==
    String(userId)
  ) {
    throw new ApiError(
      403,
      'You do not own this business listing'
    );
  }

  if (business.status === 'active') {
    throw new ApiError(
      400,
      'This business listing is already active'
    );
  }

  return business;
};

// --------------------------------------------------
// CREATE CASHFREE ORDER
// --------------------------------------------------

const createOrder = asyncHandler(
  async (req, res) => {

    const { businessId } = req.body;

    if (!businessId) {
      throw new ApiError(
        400,
        'Business ID is required'
      );
    }

    const business =
      await getOwnedBusiness(
        businessId,
        req.user._id
      );

    const orderId =
      `zyphoriz_${businessId}_${Date.now()}`;

    const request = {
      order_id: orderId,

      order_amount:
        Number(STANDARD_PLAN_PRICE),

      order_currency: 'INR',

      customer_details: {
        customer_id:
          String(req.user._id),

        customer_name:
          req.user.name ||
          business.name ||
          'Zyphoriz Customer',

        customer_email:
          req.user.email,

        customer_phone:
          req.user.mobileNumber ||
          req.user.phone ||
          '9999999999',
      },

     order_meta: {
  return_url:
    `${process.env.FRONTEND_URL}/payment/callback?order_id=${encodeURIComponent(orderId)}`,
  notify_url:
    `${process.env.API_URL}/api/v1/payments/webhook`,
},

      order_note:
        `Zyphoriz business activation - ${business.name}`,

      order_tags: {
        businessId:
          String(business._id),

        userId:
          String(req.user._id),
      },
    };

   let response;

try {
  response = await cashfree.PGCreateOrder(request);
} catch (error) {
  console.error('Cashfree order creation failed:', {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
  });

  throw new ApiError(
    error.response?.status || 500,
    error.response?.data?.message ||
      'Unable to create Cashfree order'
  );
}

    const cashfreeOrder =
      response.data;

    sendResponse(
      res,
      201,
      {
        orderId:
          cashfreeOrder.order_id,

        cfOrderId:
          cashfreeOrder.cf_order_id,

        paymentSessionId:
          cashfreeOrder.payment_session_id,

        amount:
          STANDARD_PLAN_PRICE,

        currency: 'INR',

        environment:
          CASHFREE_ENV,
      },
      'Cashfree order created'
    );
  }
);

// --------------------------------------------------
// VERIFY / COMPLETE CASHFREE PAYMENT
// --------------------------------------------------

const checkout = asyncHandler(
  async (req, res) => {

    const {
      businessId,
      orderId,
    } = req.body;

    if (!businessId || !orderId) {
      throw new ApiError(
        400,
        'Business ID and Cashfree order ID are required'
      );
    }

    const business = await Business.findById(businessId);

    if (!business) {
      throw new ApiError(404, 'Business not found');
    }

    if (String(business.owner) !== String(req.user._id)) {
      throw new ApiError(
        403,
        'You do not own this business listing'
      );
    }

    // Fetch order from Cashfree
    const orderResponse =
      await cashfree.PGFetchOrder(
        orderId
      );

    const order =
      orderResponse.data;

    // Check order amount
    if (
      Number(order.order_amount) !==
      Number(STANDARD_PLAN_PRICE)
    ) {
      throw new ApiError(
        400,
        'Cashfree order amount does not match'
      );
    }

    // Check customer
    if (
      String(
        order.customer_details?.customer_id
      ) !== String(req.user._id)
    ) {
      throw new ApiError(
        400,
        'Cashfree order does not belong to this user'
      );
    }

    // Cashfree order must be PAID
    if (order.order_status !== 'PAID') {

      throw new ApiError(
        400,
        `Payment not completed. Current status: ${order.order_status}`
      );
    }

    // Check whether payment already exists
    const existingPayment =
      await Payment.findOne({
        cashfreeOrderId: orderId,
      });

    if (existingPayment) {

      return sendResponse(
        res,
        200,
        {
          payment: existingPayment,
          business,
        },
        'Payment already processed'
      );
    }

    // Fetch transactions
    const paymentsResponse =
      await cashfree.PGOrderFetchPayments(
        orderId
      );

    const payments =
      paymentsResponse.data;

    const successfulPayment =
      payments.find(
        payment =>
          payment.payment_status === 'SUCCESS'
      );

    if (!successfulPayment) {
      throw new ApiError(
        400,
        'Successful Cashfree transaction not found'
      );
    }

    // ------------------------------------------------
    // Create payment record
    // ------------------------------------------------

    const payment =
      await Payment.create({

        user:
          req.user._id,

        business:
          business._id,

        transactionId:
          generateTransactionId(),

        cashfreeOrderId:
          orderId,

        cashfreePaymentId:
          successfulPayment.cf_payment_id,

        amount:
          STANDARD_PLAN_PRICE,

        method: normalizePaymentMethod(
          successfulPayment.payment_group
        ),

        plan:
          business.selectedPlan,

        status:
          'success',
      });

    // ------------------------------------------------
    // Activate business
    // ------------------------------------------------

    business.status = 'active';

    business.verified = true;

    business.planExpiresAt =
      new Date(
        Date.now() +
        365 *
        24 *
        60 *
        60 *
        1000
      );

    await business.save();

    // ------------------------------------------------
    // Referral commission
    // ------------------------------------------------

    await awardReferralCommission(
      business.referralCodeUsed,
      req.user._id
    );

    sendResponse(
      res,
      200,
      {
        payment,
        business,
      },
      'Payment successful, your business is now live'
    );
  }
);

const processPaidOrder = async (
  orderId,
  businessId,
  userId
) => {
  const business = await Business.findById(businessId);

  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  if (String(business.owner) !== String(userId)) {
    throw new ApiError(403, 'Payment owner does not match business owner');
  }

  const existingPayment = await Payment.findOne({
    cashfreeOrderId: orderId,
  });

  if (existingPayment) {
    return { payment: existingPayment, business };
  }

  const orderResponse = await cashfree.PGFetchOrder(orderId);
  const order = orderResponse.data;

  if (Number(order.order_amount) !== Number(STANDARD_PLAN_PRICE)) {
    throw new ApiError(400, 'Cashfree order amount does not match');
  }

  if (order.order_status !== 'PAID') {
    throw new ApiError(
      400,
      `Payment not completed. Current status: ${order.order_status}`
    );
  }

  const paymentsResponse = await cashfree.PGOrderFetchPayments(orderId);
  const successfulPayment = paymentsResponse.data.find(
    (payment) => payment.payment_status === 'SUCCESS'
  );

  if (!successfulPayment) {
    throw new ApiError(400, 'Successful Cashfree transaction not found');
  }

  const payment = await Payment.create({
    user: userId,
    business: business._id,
    transactionId: generateTransactionId(),
    cashfreeOrderId: orderId,
    cashfreePaymentId: successfulPayment.cf_payment_id,
    amount: STANDARD_PLAN_PRICE,
    method: normalizePaymentMethod(successfulPayment.payment_group),
    plan: business.selectedPlan,
    status: 'success',
  });

  business.status = 'active';
  business.verified = true;
  business.planExpiresAt = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  );
  await business.save();

  await awardReferralCommission(
    business.referralCodeUsed,
    userId
  );

  return { payment, business };
};

const webhook = asyncHandler(async (req, res) => {
  const timestamp = req.get('x-webhook-timestamp');
  const signature = req.get('x-webhook-signature');
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!timestamp || !signature) {
    throw new ApiError(400, 'Cashfree webhook signature is missing');
  }

  const expectedSignature = crypto
    .createHmac('sha256', CASHFREE_CLIENT_SECRET)
    .update(`${timestamp}${rawBody}`)
    .digest('base64');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new ApiError(401, 'Invalid Cashfree webhook signature');
  }

  const orderId = req.body?.data?.order?.order_id;
  const orderStatus = req.body?.data?.order?.order_status;
  const businessId = req.body?.data?.order?.order_tags?.businessId;
  const userId = req.body?.data?.order?.order_tags?.userId;

  if (orderStatus === 'PAID' && orderId && businessId && userId) {
    await processPaidOrder(orderId, businessId, userId);
  }

  res.status(200).json({ success: true });
});

// --------------------------------------------------
// PAYMENT HISTORY
// --------------------------------------------------

const getMyPayments = asyncHandler(
  async (req, res) => {

    const payments =
      await Payment.find({
        user: req.user._id,
      })
        .populate(
          'business',
          'name slug'
        )
        .sort({
          createdAt: -1,
        });

    sendResponse(
      res,
      200,
      {
        payments,
      }
    );
  }
);

module.exports = {
  createOrder,
  checkout,
  webhook,
  getMyPayments,
};