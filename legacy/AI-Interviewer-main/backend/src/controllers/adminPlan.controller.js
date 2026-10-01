/**
 * controllers/adminPlan.controller.js
 *
 * CRUD management for Subscription Plans.
 * Includes coupon code structures, direct discounts, features listing,
 * archive flags and aggregate customer premium counts.
 */

const Plan      = require('../models/Plan.model');
const User      = require('../models/User.model');
const AppError  = require('../utils/AppError');

// ─── POST /api/admin/plans ─────────────────────────────────────────
exports.createPlan = async (req, res, next) => {
  const { name, price, durationDays, credits, features, coupons, directDiscount, isPublished } = req.body;

  if (!name || price === undefined || durationDays === undefined || credits === undefined) {
    return next(new AppError('Plan name, price, duration, and credits are required.', 400));
  }

  const plan = await Plan.create({
    name: name.trim(),
    price: parseFloat(price) || 0,
    durationDays: parseInt(durationDays) || 30,
    credits: parseInt(credits) || 0,
    features: Array.isArray(features) ? features : [],
    coupons: Array.isArray(coupons) ? coupons : [],
    directDiscount: parseFloat(directDiscount) || 0,
    isPublished: isPublished !== undefined ? isPublished : true,
    postedBy: req.admin._id,
  });

  res.status(201).json({ success: true, plan });
};

// ─── GET /api/admin/plans ──────────────────────────────────────────
exports.getAllPlans = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  // Supports filtering out archived plans unless requested
  const filter = { isArchived: false };
  if (req.query.archived === 'true') {
    filter.isArchived = true;
  } else if (req.query.archived === 'all') {
    delete filter.isArchived;
  }

  const [plans, total] = await Promise.all([
    Plan.find(filter)
      .sort('-price')
      .skip(skip)
      .limit(limit)
      .populate({ path: 'postedBy', select: 'name email' }),
    Plan.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { plans, total, page, pages: Math.ceil(total / limit) },
  });
};

// ─── GET /api/admin/plans/stats ────────────────────────────────────
exports.getPlanStats = async (req, res) => {
  const totalPlans      = await Plan.countDocuments({ isArchived: false });
  const activePlans     = await Plan.countDocuments({ isPublished: true, isArchived: false });
  const premiumUsers    = await User.countDocuments({ isPremium: true, role: 'candidate' });

  // Get total credits in pool
  const creditsAggregate = await User.aggregate([
    { $group: { _id: null, total: { $sum: '$credits' } } },
  ]);
  const totalUserCredits = creditsAggregate[0]?.total || 0;

  res.status(200).json({
    success: true,
    data: {
      totalPlans,
      activePlans,
      premiumUsers,
      totalUserCredits,
    },
  });
};

// ─── GET /api/admin/plans/:id ──────────────────────────────────────
exports.getPlanById = async (req, res, next) => {
  const plan = await Plan.findById(req.params.id)
    .populate({ path: 'postedBy', select: 'name email' });
  if (!plan) return next(new AppError('Plan not found.', 404));
  res.status(200).json({ success: true, plan });
};

// ─── PATCH /api/admin/plans/:id ────────────────────────────────────
exports.updatePlan = async (req, res, next) => {
  const { name, price, durationDays, credits, features, coupons, directDiscount, isPublished, isArchived } = req.body;

  const plan = await Plan.findById(req.params.id);
  if (!plan) return next(new AppError('Plan not found.', 404));

  const allowedFields = {};
  if (name !== undefined)           allowedFields.name           = name.trim();
  if (price !== undefined)          allowedFields.price          = parseFloat(price) || 0;
  if (durationDays !== undefined)   allowedFields.durationDays   = parseInt(durationDays) || 30;
  if (credits !== undefined)        allowedFields.credits        = parseInt(credits) || 0;
  if (features !== undefined)       allowedFields.features       = Array.isArray(features) ? features : [];
  if (coupons !== undefined)        allowedFields.coupons        = Array.isArray(coupons) ? coupons : [];
  if (directDiscount !== undefined) allowedFields.directDiscount = parseFloat(directDiscount) || 0;
  if (isPublished !== undefined)    allowedFields.isPublished    = isPublished;
  if (isArchived !== undefined)     allowedFields.isArchived     = isArchived;

  const updated = await Plan.findByIdAndUpdate(req.params.id, allowedFields, {
    new: true, runValidators: true,
  });

  res.status(200).json({ success: true, plan: updated });
};

// ─── DELETE /api/admin/plans/:id ───────────────────────────────────
exports.deletePlan = async (req, res, next) => {
  // We perform an archive check to safeguard historical billing entries
  const plan = await Plan.findById(req.params.id);
  if (!plan) return next(new AppError('Plan not found.', 404));

  plan.isArchived  = true;
  plan.isPublished = false;
  await plan.save();

  res.status(200).json({ success: true, message: 'Plan archived successfully.' });
};
