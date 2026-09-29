// Explicit allowlist: new model fields stay private unless deliberately exposed.
const publicFields = [
  '_id', 'username', 'fullName', 'bio', 'profilePicture', 'college',
  'githubHandle', 'leetcodeHandle', 'codeforcesHandle', 'auraPoints',
  'rankTitle', 'stats', 'currentStreak', 'achievements', 'createdAt',
];

function userDto(user, own = false) {
  const source = user.toObject ? user.toObject() : user;
  const fields = own ? [...publicFields, 'email', 'onboardingComplete', 'lastActiveDate', 'updatedAt'] : publicFields;
  return Object.fromEntries(fields.filter(key => source[key] !== undefined).map(key => [key, source[key]]));
}

module.exports = { userDto };
