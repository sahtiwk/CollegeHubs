const { config, safeTheme } = require('../config/collegeRegistry');
function safeLogo(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (config.assetOrigins || []).includes(url.origin) ? url.href : null;
  } catch { return null; }
}
function hubPresentation(hub) {
  let tokens;
  try { tokens = safeTheme(hub.themeTokens); } catch { tokens = safeTheme(config.defaultTheme); }
  return { hubId: String(hub._id), name: String(hub.name || 'College Hub').slice(0, 200),
    slug: hub.slug, timezone: hub.timezone, themeVersion: hub.themeVersion,
    tokens, logoUrl: safeLogo(hub.logoUrl) };
}
module.exports = { hubPresentation, safeLogo };
