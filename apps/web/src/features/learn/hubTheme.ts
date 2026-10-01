const tokenNames = ['accent','secondary','background','surface','surfaceRaised','text','textMuted','border','success','warning','error'] as const;
type Theme = { hubId: string; themeVersion: number; name: string; tokens: Readonly<Record<string, string>> };
export function sanitizeTheme(input: unknown, hubId: string, version: number): Readonly<Theme> {
  const theme = input as Theme;
  if (!/^[a-f0-9]{24}$/.test(hubId) || !Number.isSafeInteger(version) || version < 1 ||
    theme?.hubId !== hubId || theme.themeVersion !== version || typeof theme.name !== 'string' || !theme.name.length || theme.name.length > 200 ||
    !theme.tokens || tokenNames.some(key => typeof theme.tokens[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(theme.tokens[key]))) throw new Error('Invalid Hub theme binding');
  return Object.freeze({ hubId, themeVersion: version, name: theme.name,
    tokens: Object.freeze(Object.fromEntries(tokenNames.map(key => [key, theme.tokens[key]]))) });
}
export function createThemeCache() {
  const entries = new Map<string, Readonly<Theme>>();
  return { read(input: unknown, hubId: string, version: number): Readonly<Theme> {
    // Validate even on a cache hit; never mask a corrupted/foreign session theme.
    const theme = sanitizeTheme(input, hubId, version), key = hubId + ':' + version;
    const cached = entries.get(key);
    if (cached && JSON.stringify(cached) === JSON.stringify(theme)) return cached;
    if (entries.size >= 100) entries.delete(entries.keys().next().value!);
    entries.set(key, theme); return theme;
  } };
}
// Cache holds only sanitized public branding; no subject/session data.
export const hubThemeCache = createThemeCache();
