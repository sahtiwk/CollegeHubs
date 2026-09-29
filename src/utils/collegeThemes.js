// Generic brand fallback only. College identity always comes from /me.
export const defaultTokens = Object.freeze({
  accent: '#310A31', secondary: '#FFD3B6', background: '#F4ECD6', surface: '#F4ECD6',
  surfaceRaised: '#DFF7FF', text: '#310A31', textMuted: '#645064', border: '#B9A7B0',
  success: '#256F46', warning: '#875A14', error: '#A12A3A',
});
export function sanitizeTokens(tokens) {
  return Object.fromEntries(Object.entries(defaultTokens).map(([key, fallback]) =>
    [key, typeof tokens?.[key] === 'string' && /^#[0-9a-f]{6}$/i.test(tokens[key]) ? tokens[key] : fallback]));
}
export function themeStyle(tokens) {
  return Object.fromEntries(Object.entries(sanitizeTokens(tokens)).map(([key, value]) =>
    ['--' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()), value]));
}
