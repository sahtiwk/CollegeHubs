/**
 * models/Plan.model.js
 *
 * Mongoose Schema for Subscription Plans.
 * Defines price models, duration intervals, credit points, coupon codes, and feature lists.
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  discountPercent: {
    type: Number,
    required: true,
    min: [1, 'Discount must be at least 1%'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: [1, 'Duration must be at least 1 day'],
      default: 30,
    },
    credits: {
      type: Number,
      required: [true, 'Credit count is required'],
      min: [0, 'Credits cannot be negative'],
      default: 10,
    },
    features: {
      type: [String],
      default: [],
    },
    coupons: [couponSchema],
    directDiscount: {
      type: Number,
      default: 0, // Flat amount subtracted from normal price
      min: [0, 'Discount cannot be negative'],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
