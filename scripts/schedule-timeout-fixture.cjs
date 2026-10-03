// Test-only preload, never imported by application startup. No provider URL override.
const uri = new URL(process.env.MONGO_URI || '');
if (process.env.NODE_ENV !== 'test' || !['localhost', '127.0.0.1'].includes(uri.hostname) || !uri.pathname.startsWith('/collegehubs_demo_')) throw new Error('Timeout fixture requires disposable local Mongo');
const provider = require('../services/core/services/providerRefresh');
provider.refresh = provider.createProviderRefresh({ load: () => require('../services/core/integrations/codeforces').fetchContests({ fetcher: async () => new Promise(() => {}) }) }).refresh;
