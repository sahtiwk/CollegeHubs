// Only the fixed Learn API namespace; no credentials, selectors or redirects in URLs.
export function moduleUrl(path: string) {
  if (typeof path !== 'string' || !path.startsWith('/') || /[\\%?#]/.test(path) || path.includes('//') || path.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid module path');
  if (path === '/') return '/api/learn';
  if (path.startsWith('/api/learn/')) return path;
  if (path.startsWith('/api/') && !path.slice(5).includes('learn/')) return '/api/learn/' + path.slice(5);
  throw new Error('Invalid module path');
}
