const asyncHandler = require('express-async-handler');
const Business = require('../models/Business');
const User = require('../models/User');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const sendResponse = require('../utils/apiResponse');
const { sendTokenResponse } = require('../utils/generateToken');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const adminLogin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body || {};

  if (
    typeof identifier !== 'string' ||
    !identifier.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    throw new ApiError(400, 'Identifier (email or mobile) and password are required');
  }

  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalized }, { mobile: identifier.trim() }],
  }).select('+password');

  if (!user || user.role !== 'admin' || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email/mobile number or password');
  }

  sendTokenResponse(res, 200, user, 'Admin logged in successfully');
});

const getPagination = (query) => {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  const skip = (page - 1) * limit;

  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    !Number.isSafeInteger(skip) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    throw new ApiError(400, 'Page must be positive and limit must be between 1 and 100');
  }

  return { page, limit, skip };
};

const getAdminUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ email: expression }, { mobile: expression }, { role: expression }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('email mobile role createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    users,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

const getAdminOverview = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const trendStart = new Date(today);
  trendStart.setUTCDate(trendStart.getUTCDate() - 6);

  const previousWeekStart = new Date(trendStart);
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);

  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const [businessCount, userCount, revenueResult, statusCounts, trendCounts, recentBusinesses] =
    await Promise.all([
      Business.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: '$currency', total: { $sum: '$amount' } } },
      ]),
      Business.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Business.aggregate([
        { $match: { createdAt: { $gte: previousWeekStart, $lt: tomorrow } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Business.find()
        .select('name category city status createdAt owner')
        .populate('owner', 'email mobile')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

  const trendByDate = new Map(trendCounts.map((entry) => [entry._id, entry.count]));
  const businessTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(trendStart);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: trendByDate.get(key) || 0 };
  });

  const businessesThisWeek = businessTrend.reduce((total, day) => total + day.count, 0);
  const businessesPreviousWeek = trendCounts.reduce(
    (total, day) => (day._id < trendStart.toISOString().slice(0, 10) ? total + day.count : total),
    0
  );
  const businessStatuses = { active: 0, pending_payment: 0, expired: 0 };
  statusCounts.forEach(({ _id, count }) => {
    if (Object.hasOwn(businessStatuses, _id)) businessStatuses[_id] = count;
  });

  sendResponse(res, 200, {
    stats: {
      businesses: businessCount,
      users: userCount,
      revenue: revenueResult.map(({ _id, total }) => ({ currency: _id || 'INR', total })),
      pendingBusinesses: businessStatuses.pending_payment,
    },
    businessTrend,
    businessesThisWeek,
    businessesPreviousWeek,
    businessStatuses,
    recentBusinesses,
  });
});

const getAdminBusinesses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { name: expression },
      { category: expression },
      { city: expression },
      { email: expression },
      { phone: expression },
      { slug: expression },
    ];
  }

  if (status) {
    if (!['pending_payment', 'active', 'expired'].includes(status)) {
      throw new ApiError(400, 'Invalid business status filter');
    }
    filter.status = status;
  }

  const [businesses, total] = await Promise.all([
    Business.find(filter)
      .populate('owner', 'email mobile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Business.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    businesses,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

const updateAdminBusiness = asyncHandler(async (req, res) => {
  const updates = {};
  const allowedFields = ['status', 'verified'];
  const fields = Object.keys(req.body || {});

  if (!fields.length || fields.some((field) => !allowedFields.includes(field))) {
    throw new ApiError(400, 'Only status and verified can be updated');
  }

  if (Object.hasOwn(req.body, 'status')) {
    if (!['pending_payment', 'active', 'expired'].includes(req.body.status)) {
      throw new ApiError(400, 'Invalid business status');
    }
    updates.status = req.body.status;
  }

  if (Object.hasOwn(req.body, 'verified')) {
    if (typeof req.body.verified !== 'boolean') {
      throw new ApiError(400, 'Verified must be a boolean');
    }
    updates.verified = req.body.verified;
  }

  const business = await Business.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('owner', 'email mobile');

  if (!business) throw new ApiError(404, 'Business not found');
  sendResponse(res, 200, { business }, 'Business updated successfully');
});

module.exports = {
  adminLogin,
  getAdminOverview,
  getAdminBusinesses,
  getAdminUsers,
  updateAdminBusiness,
};
