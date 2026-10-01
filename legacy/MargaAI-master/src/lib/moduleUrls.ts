// For raw fetch, native anchors and location only. Next Link/router adds basePath itself.
export function moduleUrl(path: string): string {
  if (typeof path !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(path) || path.startsWith('//')) throw new Error('Invalid Learn path');
  if (path === '/' || path === '/learn' || path === '/learn/') return '/learn';
  if (path.startsWith('/learn/learn/')) throw new Error('Repeated Learn prefix');
  return path.startsWith('/learn/') ? path : '/learn' + path;
}
