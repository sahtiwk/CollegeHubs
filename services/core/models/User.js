const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Identity
    googleSubject: { type: String, maxlength: 255, select: false },
    emailVerifiedAt: { type: Date, default: null, select: false },
    hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    membershipStatus: { type: String, enum: ['unassigned', 'active', 'disabled'], default: 'unassigned' },
    membershipVerified: { type: Boolean, default: false },
    verificationMethod: { type: String, enum: ['none', 'domain-claim', 'google'], default: 'none' },
    membershipVersion: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required() { return !this.googleSubject; }, select: false },
    fullName: { type: String, trim: true },
    bio: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    college: { type: String, default: '' },
    onboardingComplete: { type: Boolean, default: false },

    // Social Handles
    githubHandle: { type: String, default: '' },
    leetcodeHandle: { type: String, default: '' },
    codeforcesHandle: { type: String, default: '' },

    // Aura Engine (Stats)
    auraPoints: { type: Number, default: 0 },
    rankTitle: { type: String, default: 'Novice' },
    stats: {
      leetcode: {
        easy: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        hard: { type: Number, default: 0 },
        ranking: { type: Number, default: 0 },
      },
      codeforces: {
        rating: { type: Number, default: 0 },
        maxRating: { type: Number, default: 0 },
        rank: { type: String, default: '' },
      },
      github: {
        totalCommits: { type: Number, default: 0 },
        stars: { type: Number, default: 0 },
        followers: { type: Number, default: 0 },
      },
    },

    // Gamification
    currentStreak: { type: Number, default: 0 },
    lastActiveDate: { type: Date },
    achievements: [
      {
        title: { type: String, required: true },
        dateEarned: { type: Date, default: Date.now },
        icon: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

// Index for faster lookups
userSchema.index({ googleSubject: 1 }, { unique: true, partialFilterExpression: { googleSubject: { $type: 'string' } } });
userSchema.index({ hubId: 1, membershipStatus: 1, _id: 1 });
userSchema.index({ hubId: 1, membershipStatus: 1, auraPoints: -1, _id: 1 });
userSchema.index({ auraPoints: -1 });

userSchema.pre('validate', function(next) {
  if (this.membershipStatus === 'active' && !this.hubId) this.invalidate('hubId', 'Active membership requires a Hub');
  if (this.membershipStatus === 'unassigned' && this.hubId) this.invalidate('hubId', 'Unassigned identity cannot have a Hub');
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('User', userSchema);
