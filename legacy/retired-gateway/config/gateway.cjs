function origin(value, label, local = false) {
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid ' + label + ' origin');
  return url.origin;
}
function deploymentConfig(core, learn) {
  core = origin(core, 'Core'); learn = origin(learn, 'Learn');
  if (core === learn) throw new Error('Core and Learn must be independent origins');
  return { rewrites: [
    { source: '/api/:path*', destination: core + '/api/:path*' },
    { source: '/learn', destination: learn + '/learn' },
    { source: '/learn/:path*', destination: learn + '/learn/:path*' },
    { source: '/(.*)', destination: '/' },
  ] };
}
function localProxy(env) {
  const core = origin(env.CORE_API_PROXY_ORIGIN || 'http://127.0.0.1:5000', 'Core', true);
  const learn = origin(env.LEARN_PROXY_ORIGIN || 'http://127.0.0.1:3000', 'Learn', true);
  const proxy = target => ({ target, changeOrigin: true, proxyTimeout: 10000, timeout: 10000 });
  // Boundary-aware matches: /learning and /apiculture remain Core routes.
  return { '^/api(?:/|$|\\?)': proxy(core), '^/learn(?:/|$|\\?)': proxy(learn) };
}
module.exports = { origin, deploymentConfig, localProxy };
