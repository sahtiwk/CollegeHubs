/**
 * models/WebhookLog.model.js
 *
 * Log sheet to persist received webhooks from providers like Stripe/Razorpay.
 */

const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['stripe', 'razorpay'],
    },
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['processed', 'failed'],
      default: 'processed',
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
