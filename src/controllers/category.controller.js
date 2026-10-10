const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const sendResponse = require('../utils/apiResponse');

// @desc    List all categories
// @route   GET /api/v1/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const pageNum = Math.max(Number(req.query.page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(req.query.limit) || 8, 1), 200);
  const [categories, total] = await Promise.all([
    Category.find()
      .sort({ popular: -1, name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Category.countDocuments(),
  ]);
  sendResponse(res, 200, {
    categories,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

module.exports = { getCategories };
