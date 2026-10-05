const asyncHandler = require('express-async-handler');
const Business = require('../models/Business');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const sendResponse = require('../utils/apiResponse');
const toSlug = require('../utils/slugify');
const { DEFAULT_OPENING_HOURS, STANDARD_PLAN_PRICE } = require('../config/constants');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Converts openingHours -> the display-friendly "hours" rows the frontend renders
const deriveHours = (openingHours = []) =>
  openingHours
    .filter((row) => row.open)
    .map((row) => ({ day: row.day, time: `${row.from} - ${row.to}` }));

const parseAdditionalPhones = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return [];
  }

  let phones = value;

  if (typeof phones === 'string') {
    try {
      phones = JSON.parse(phones);
    } catch {
      throw new ApiError(
        400,
        'Additional phone numbers must be a valid list'
      );
    }
  }

  if (!Array.isArray(phones)) {
    throw new ApiError(
      400,
      'Additional phone numbers must be an array'
    );
  }

  const cleanedPhones = phones
    .map((phone) => String(phone ?? '').trim())
    .filter(Boolean);

  if (cleanedPhones.length > 2) {
    throw new ApiError(
      400,
      'Only two additional contact numbers are allowed'
    );
  }

  return cleanedPhones;
};

const parseDescriptionSections = (value, fallbackDescription = '') => {
  if (value === undefined) {
    return [
      { title: 'About', description: fallbackDescription },
      { title: '', description: '' },
      { title: '', description: '' },
    ];
  }

  let sections = value;
  if (typeof sections === 'string') {
    try {
      sections = JSON.parse(sections);
    } catch {
      throw new ApiError(400, 'Description sections must be valid JSON');
    }
  }
  if (!Array.isArray(sections) || sections.length !== 3) {
    throw new ApiError(400, 'Exactly three description sections are required');
  }

  return sections.map((section, index) => ({
    title: String(section?.title || (index === 0 ? 'About' : '')).trim(),
    description: String(section?.description || '').trim(),
  }));
};

// @desc    Create a new business listing (starts as pending_payment)
// @route   POST /api/v1/businesses
// @access  Private
const createBusiness = asyncHandler(async (req, res) => {
  const {
    slug: requestedSlug, name, category, categoryId, phone, whatsapp, email, website,
    address, city, location, description,
    instagram, facebook, telegram, youtube, video,
    openingHours, referralCode, template,
  } = req.body;

  if (!name || !phone) {
    throw new ApiError(400, 'Business name and phone number are required');
  }

  const normalizedReferralCode = referralCode?.trim();
  if (normalizedReferralCode) {
    const referrer = await User.findOne({
      referralCode: { $regex: `^${escapeRegex(normalizedReferralCode)}$`, $options: 'i' },
    });
    if (!referrer || String(referrer._id) === String(req.user._id)) {
      throw new ApiError(400, 'Please enter a valid referral code from another user');
    }
  }

  const slug = toSlug(requestedSlug);
  if (!slug) throw new ApiError(400, 'Please provide a valid business URL');
  const slugTaken = await Business.findOne({ slug });
  if (slugTaken) throw new ApiError(409, 'This business URL is already in use');

  const parsedHours = openingHours ? JSON.parse(
    typeof openingHours === 'string' ? openingHours : JSON.stringify(openingHours)
  ) : DEFAULT_OPENING_HOURS;
  const parsedDescriptionSections = parseDescriptionSections(
    req.body.descriptionSections,
    description || ''
  );

  const bannerFile = req.files?.banner?.[0];
  if (!bannerFile && !req.body.image) {
    throw new ApiError(400, 'A banner image is required');
  }
  const galleryFiles = req.files?.gallery || [];
  if (galleryFiles.length > 6) {
    throw new ApiError(400, 'A maximum of six gallery photos is allowed');
  }

  const business = await Business.create({
    owner: req.user._id,
    ownerReferralCode: req.user.referralCode,
    referralCodeUsed: normalizedReferralCode || '',
    name,
    slug,
    category: category || '',
    categoryId: categoryId || '',
    phone,
    whatsapp,
    email,
    website,
    address,
    city,
    location: location || [address, city].filter(Boolean).join(', '),
    description: parsedDescriptionSections[0].description,
    descriptionSections: parsedDescriptionSections,
    instagram,
    facebook,
    telegram,
    youtube,
    video,
    openingHours: parsedHours,
    hours: deriveHours(parsedHours),
    additionalPhones: parseAdditionalPhones(req.body.additionalPhones),
    image: bannerFile ? bannerFile.url : (req.body.image || ''),
    coverImage: bannerFile ? bannerFile.url : (req.body.image || ''),
    gallery: galleryFiles.length ? galleryFiles.map((f) => f.url) : (req.body.gallery || []),
    selectedPlan: 'standard',
    planPrice: `₹${STANDARD_PLAN_PRICE}/yr`,
    template: template || 'classic',
    status: 'pending_payment',
  });

  sendResponse(res, 201, { business }, 'Business created. Complete payment to activate the listing.');
});

// @desc    List / search businesses with filters
// @route   GET /api/v1/businesses?q=&category=&city=&verified=true&topRated=true&page=&limit=
// @access  Public
const getBusinesses = asyncHandler(async (req, res) => {
  const {
    q, category, city, verified, topRated,
    page = 1, limit = 12,
  } = req.query;

  const filter = { status: 'active' };

  if (q) {
    filter.$text = { $search: q };
  }
  if (category) filter.categoryId = category;
  if (city) filter.city = new RegExp(city, 'i');
  if (verified === 'true') filter.verified = true;
  if (topRated === 'true') filter.rating = { $gte: 4.8 };

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 50);

  const [businesses, total] = await Promise.all([
    Business.find(filter)
      .sort(q ? { score: { $meta: 'textScore' } } : { trending: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Business.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    businesses,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

// @desc    Get a single business by its public slug
// @route   GET /api/v1/businesses/slug/:slug
// @access  Public
const getBusinessBySlug = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug });
  if (!business) throw new ApiError(404, 'Business not found');
  sendResponse(res, 200, { business });
});

const checkBusinessSlug = asyncHandler(async (req, res) => {
  const slug = toSlug(req.query.slug);
  if (!slug) throw new ApiError(400, 'Please provide a valid business URL');

  const existingBusiness = await Business.exists({ slug });
  sendResponse(res, 200, { slug, available: !existingBusiness });
});

// @desc    Get all businesses owned by the logged in user (dashboard)
// @route   GET /api/v1/businesses/mine
// @access  Private
const getMyBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ owner: req.user._id }).sort({ createdAt: -1 });
  sendResponse(res, 200, { businesses });
});

const findOwnedBusiness = async (id, ownerId) => {
  const business = await Business.findById(id);
  if (!business) throw new ApiError(404, 'Business not found');
  if (String(business.owner) !== String(ownerId)) {
    throw new ApiError(403, 'You do not own this business listing');
  }
  return business;
};

// @desc    Update a business owned by the logged in user
// @route   PUT /api/v1/businesses/:id
// @access  Private
const updateBusiness = asyncHandler(async (req, res) => {
  const business = await findOwnedBusiness(req.params.id, req.user._id);

  if (req.body.slug !== undefined) {
    const slug = toSlug(req.body.slug);
    if (!slug) throw new ApiError(400, 'Please provide a valid business URL');
    const slugTaken = await Business.findOne({ slug, _id: { $ne: business._id } });
    if (slugTaken) throw new ApiError(409, 'This business URL is already in use');
    business.slug = slug;
  }

  const updatable = [
    'name', 'category', 'categoryId', 'phone', 'whatsapp', 'email', 'website',
    'address', 'city', 'location',
    'instagram', 'facebook', 'telegram', 'youtube', 'video', 'template',
  ];
  updatable.forEach((field) => {
    if (req.body[field] !== undefined) business[field] = req.body[field];
  });

  if (req.body.descriptionSections !== undefined) {
    business.descriptionSections = parseDescriptionSections(
      req.body.descriptionSections,
      req.body.description || business.description || ''
    );
    business.description = business.descriptionSections[0].description;
  } else if (req.body.description !== undefined) {
    business.description = req.body.description;
    business.descriptionSections = parseDescriptionSections(
      undefined,
      req.body.description
    );
  }

  if (req.body.additionalPhones !== undefined) {
    business.additionalPhones = parseAdditionalPhones(req.body.additionalPhones);
  }

  if (req.body.openingHours) {
    const parsed = typeof req.body.openingHours === 'string'
      ? JSON.parse(req.body.openingHours)
      : req.body.openingHours;
    business.openingHours = parsed;
    business.hours = deriveHours(parsed);
  }

  const bannerFile = req.files?.banner?.[0];
  if (bannerFile) {
    business.image = bannerFile.url;
    business.coverImage = business.image;
  }

  if (req.body.gallery !== undefined) {
    const parsedGallery = typeof req.body.gallery === 'string'
      ? JSON.parse(req.body.gallery)
      : req.body.gallery;
    if (!Array.isArray(parsedGallery)) {
      throw new ApiError(400, 'Gallery photos must be provided as a list');
    }
    business.gallery = parsedGallery;
  }
  if (req.body.removeGalleryImage) {
    business.gallery = business.gallery.filter((url) => url !== req.body.removeGalleryImage);
  }
  const galleryFiles = req.files?.gallery || [];
  if (business.gallery.length + galleryFiles.length > 6) {
    throw new ApiError(400, 'A maximum of six gallery photos is allowed');
  }
  if (galleryFiles.length) {
    business.gallery = [...business.gallery, ...galleryFiles.map((f) => f.url)];
  }

  await business.save();
  sendResponse(res, 200, { business }, 'Business updated successfully');
});

// @desc    Delete a business owned by the logged in user
// @route   DELETE /api/v1/businesses/:id
// @access  Private
const deleteBusiness = asyncHandler(async (req, res) => {
  const business = await findOwnedBusiness(req.params.id, req.user._id);
  await business.deleteOne();
  sendResponse(res, 200, null, 'Business deleted successfully');
});

module.exports = {
  createBusiness,
  getBusinesses,
  getBusinessBySlug,
  checkBusinessSlug,
  getMyBusinesses,
  updateBusiness,
  deleteBusiness,
};
