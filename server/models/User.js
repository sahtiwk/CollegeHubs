const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Identity
    googleId: { type: String, unique: true, sparse: true, select: false },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
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
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ auraPoints: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('User', userSchema);
