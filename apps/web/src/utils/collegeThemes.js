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
  const safe = sanitizeTokens(tokens);
  // College identity is allowed; arbitrary palettes cannot recolor reading surfaces.
  return { '--hub-accent': safe.accent, '--hub-secondary': safe.secondary,
    '--hub-on-accent': contrastRatio(safe.accent, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#000000' };
}
export function contrastRatio(first, second) {
  const luminance = color => {
    const channels = color.slice(1).match(/../g).map(c => parseInt(c, 16) / 255)
      .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
