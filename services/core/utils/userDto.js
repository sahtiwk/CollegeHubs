// Explicit allowlist: new model fields stay private unless deliberately exposed.
const publicFields = [
  '_id', 'username', 'fullName', 'bio', 'profilePicture', 'college',
  'githubHandle', 'leetcodeHandle', 'codeforcesHandle', 'auraPoints',
  'rankTitle', 'stats', 'currentStreak', 'achievements', 'createdAt',
];

async function userDto(user, own = false) {
  const source = user.toObject ? user.toObject() : user;
  const balance = source.hubId ? await require('../models/AuraBalance').findOne({ hubId: source.hubId, userId: source._id }).lean() : null;
  const days = source.hubId ? await require('../services/streakService').read(String(source._id)) : { currentStreak: 0 };
  // Legacy stored scores/titles/badges are never treated as canonical rewards.
  const canonical = { ...source, auraPoints: balance?.total || 0, currentStreak: days.currentStreak, rankTitle: null, achievements: [] };
  const fields = own ? [...publicFields, 'email', 'onboardingComplete', 'lastActiveDate', 'updatedAt', 'hubId', 'membershipStatus', 'membershipVerified', 'verificationMethod', 'membershipVersion'] : publicFields;
  return Object.fromEntries(fields.filter(key => canonical[key] !== undefined).map(key => [key, canonical[key]]));
}

module.exports = { userDto };
