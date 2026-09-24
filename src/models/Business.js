const mongoose = require('mongoose');
const { DEFAULT_OPENING_HOURS, STANDARD_PLAN_PRICE } = require('../config/constants');

const openingHourSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    open: { type: Boolean, default: true },
    from: { type: String, default: '09:00' },
    to: { type: String, default: '18:00' },
  },
  { _id: false }
);

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerReferralCode: {
      type: String, // snapshot of the owner's referral code at creation time
    },
    referralCodeUsed: {
      type: String, // a friend's code entered at listing time, if any
      default: '',
    },

    name: { type: String, required: [true, 'Business name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    category: { type: String, required: true }, // human readable name, e.g. "Electronics"
    categoryId: { type: String, required: true }, // e.g. "electronics"

    phone: { type: String, required: [true, 'Phone number is required'] },
    whatsapp: { type: String, default: '' },
    email: { type: String, required: [true, 'Email is required'] },
    website: { type: String, default: '' },

    address: { type: String, required: [true, 'Address is required'] },
    city: { type: String, required: [true, 'City is required'] },
    location: { type: String, default: '' }, // combined address string or maps link

    description: { type: String, required: [true, 'Description is required'] },

    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    youtube: { type: String, default: '' },
    video: { type: String, default: '' },

    openingHours: { type: [openingHourSchema], default: DEFAULT_OPENING_HOURS },
    // Human readable "Monday - Saturday: 9AM - 8PM" style rows, derived from openingHours
    hours: [
      {
        day: String,
        time: String,
        _id: false,
      },
    ],

    image: { type: String, default: '' }, // banner url
    coverImage: { type: String, default: '' },
    gallery: { type: [String], default: [] },

    selectedPlan: { type: String, default: 'standard' },
    planPrice: { type: String, default: `₹${STANDARD_PLAN_PRICE}/yr` },
    template: { type: String, default: 'classic', lowercase: true, trim: true },
    planExpiresAt: { type: Date },

    status: {
      type: String,
      enum: ['pending_payment', 'active', 'expired'],
      default: 'pending_payment',
    },
    verified: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },

    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    distance: { type: String, default: '' },
  },
  { timestamps: true }
);

businessSchema.index({ name: 'text', description: 'text', category: 'text', city: 'text' });

module.exports = mongoose.model('Business', businessSchema);
