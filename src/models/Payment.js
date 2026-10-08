const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },

    transactionId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: 'INR',
    },

    method: {
      type: String,
      enum: [
        'upi',
        'card',
        'netbanking',
        'wallet',
        'bank_transfer',
        'other',
      ],
      required: true,
    },

    plan: {
      type: String,
      default: 'standard',
    },

    status: {
      type: String,
      enum: [
        'pending',
        'success',
        'failed',
      ],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model('Payment', paymentSchema);