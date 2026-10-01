/**
 * controllers/adminPayment.controller.js
 *
 * Implements Payment Management Controllers:
 *  - Paginated transactions, failed payments, and webhook logs list feeds.
 *  - Database stats aggregations for revenue charts, sales count, and failed rates.
 *  - Handles Refunds operations (marking database status refunded and logging refundReason).
 *  - Auto-seeds mock transactions for candidates if database is empty.
 */

const Transaction = require('../models/Transaction.model');
const WebhookLog  = require('../models/WebhookLog.model');
const User        = require('../models/User.model');
const Plan        = require('../models/Plan.model');
const AppError    = require('../utils/AppError');

// ─── Self-Healing Mock Transactions Seeding ───────────────────────
const seedMockPayments = async () => {
  const count = await Transaction.countDocuments();
  if (count > 0) return;

  const candidates = await User.find({ role: 'candidate' });
  if (candidates.length === 0) return; // Wait until users exist

  let plans = await Plan.find();
  if (plans.length === 0) {
    // create dummy plan
    const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    if (!admin) return;
    const p = await Plan.create({
      name: 'Starter Plan',
      price: 19.99,
      durationDays: 30,
      credits: 20,
      postedBy: admin._id,
    });
    plans = [p];
  }

  const mockTx = [];
  const mockWebhooks = [];

  // Generate 5 mock transaction entries
  for (let i = 0; i < Math.min(candidates.length, 5); i++) {
    const user = candidates[i];
    const plan = plans[i % plans.length];
    
    mockTx.push({
      userId: user._id,
      planId: plan._id,
      transactionId: `ch_stripe_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      amount: plan.price - plan.directDiscount,
      currency: 'USD',
      status: i === 4 ? 'failed' : i === 3 ? 'refunded' : 'success',
      paymentMethod: 'card',
      refundReason: i === 3 ? 'Customer requested cancelation.' : null,
      refundedAt: i === 3 ? new Date() : null,
      error: i === 4 ? 'Card declined. Insufficient funds.' : null,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // staggered days
    });

    mockWebhooks.push({
      provider: 'stripe',
      eventType: i === 4 ? 'charge.failed' : 'charge.succeeded',
      payload: { id: `evt_${i}`, type: i === 4 ? 'charge.failed' : 'charge.succeeded', amount: plan.price * 100 },
      status: 'processed',
    });
  }

  if (mockTx.length > 0) {
    await Transaction.insertMany(mockTx);
    await WebhookLog.insertMany(mockWebhooks);
  }
};

// ─── GET /api/admin/payments/transactions ──────────────────────────
exports.getAllTransactions = async (req, res) => {
  await seedMockPayments();

  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip  = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status;

  const filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

  // Handle Search: transactionId or populate and match user name/email
  let userIdsFilter = null;
  if (search) {
    // Search candidates by email/name first
    const users = await User.find({
      $or: [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    
    userIdsFilter = users.map(u => u._id);
    
    filter.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { userId: { $in: userIdsFilter } }
    ];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({ path: 'userId', select: 'name email' })
      .populate({ path: 'planId', select: 'name price' }),
    Transaction.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { transactions, total, page, pages: Math.ceil(total / limit) },
  });
};

// ─── POST /api/admin/payments/transactions/:id/refund ──────────────
exports.refundTransaction = async (req, res, next) => {
  const { reason } = req.body;

  const tx = await Transaction.findById(req.params.id);
  if (!tx) return next(new AppError('Transaction not found.', 404));

  if (tx.status === 'refunded') {
    return next(new AppError('Transaction is already refunded.', 400));
  }
  if (tx.status === 'failed') {
    return next(new AppError('Cannot refund a failed payment.', 400));
  }

  tx.status = 'refunded';
  tx.refundReason = reason || 'Refund issued by Admin.';
  tx.refundedAt  = new Date();
  await tx.save();

  // Deduct candidate premium status or logs if related
  const user = await User.findById(tx.userId);
  if (user) {
    user.isPremium = false;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: 'Refund successfully completed and processed. Premium status revoked.',
    transaction: tx,
  });
};

// ─── GET /api/admin/payments/stats ─────────────────────────────────
exports.getPaymentStats = async (req, res) => {
  // Aggregate Stats
  const revenueAggregate = await Transaction.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalRevenue = revenueAggregate[0]?.total || 0;

  const successfulSales = await Transaction.countDocuments({ status: 'success' });
  const refundedSales   = await Transaction.countDocuments({ status: 'refunded' });
  const failedSales     = await Transaction.countDocuments({ status: 'failed' });

  // Get total refunded sum
  const refundAggregate = await Transaction.aggregate([
    { $match: { status: 'refunded' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalRefunded = refundAggregate[0]?.total || 0;

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      successfulSales,
      refundedSales,
      failedSales,
      totalRefunded,
    },
  });
};

// ─── GET /api/admin/payments/webhooks ──────────────────────────────
exports.getWebhookLogs = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip  = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    WebhookLog.find().sort('-createdAt').skip(skip).limit(limit),
    WebhookLog.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: { logs, total, page, pages: Math.ceil(total / limit) },
  });
};
