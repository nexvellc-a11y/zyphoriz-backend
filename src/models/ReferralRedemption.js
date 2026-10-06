const mongoose = require('mongoose');

const payoutDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, required: true, trim: true, maxlength: 120 },
    accountNumber: { type: String, trim: true, maxlength: 32 },
    ifscCode: { type: String, trim: true, uppercase: true, maxlength: 11 },
    branch: { type: String, trim: true, maxlength: 120 },
    upiId: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const referralRedemptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true, min: 1000 },
    payoutMethod: {
      type: String,
      enum: ['bank', 'upi'],
      required: true,
    },
    payoutDetails: {
      type: payoutDetailsSchema,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'rejected'],
      default: 'pending',
      required: true,
    },
  },
  { timestamps: true },
);

referralRedemptionSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

module.exports = mongoose.model('ReferralRedemption', referralRedemptionSchema);
