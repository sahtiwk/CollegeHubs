function badInput(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function bodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badInput('A JSON object is required');
  return body;
}

function text(value, name, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw badInput(`${name} must be ${required ? 'a nonempty' : 'a'} string of at most ${max} characters`);
  }
  return value.trim();
}

function emailAddress(value) {
  const email = text(value, 'Email', 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badInput('A valid email is required');
  return email;
}

function passwordValue(value, registering = false) {
  if (typeof value !== 'string' || !value.length || Buffer.byteLength(value, 'utf8') > 72 ||
      (registering && value.length < 8)) {
    throw badInput(registering ? 'Password must be at least 8 characters and at most 72 UTF-8 bytes' : 'Invalid password');
  }
  return value;
}

function profileFields(body, onboarding = false) {
  bodyObject(body);
  const fields = { fullName: ['fullName', 100], bio: ['bio', 1000],
    leetcodeHandle: ['leetcodeHandle', 100], codeforcesHandle: ['codeforcesHandle', 100], githubHandle: ['githubHandle', 100] };
  if (onboarding) Object.assign(fields, { college: ['college', 200],
    leetcodeUsername: ['leetcodeHandle', 100], githubUsername: ['githubHandle', 100] });
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    if (!Object.hasOwn(fields, key)) throw badInput(`Field ${key} cannot be updated`);
    const [target, max] = fields[key];
    result[target] = text(value, key, max);
  }
  if (onboarding) result.onboardingComplete = true;
  return result;
}

function respondError(res, err, fallback) {
  if (err.status === 400 || err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: err.status === 400 ? err.message : 'Invalid input' });
  }
  if (err.code === 11000) return res.status(409).json({ error: 'Email or username already in use' });
  return res.status(500).json({ error: fallback });
}

module.exports = { bodyObject, text, emailAddress, passwordValue, profileFields, respondError, badInput };
