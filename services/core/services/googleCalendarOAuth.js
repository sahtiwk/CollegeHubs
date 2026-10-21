const { SCOPE } = require('./googleCalendarAdapter');
const error = code => Object.assign(new Error('Reconnect Google Calendar to continue'), { code, status: 503 });
function capability() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  return { available: process.env.GOOGLE_CALENDAR_SYNC_ENABLED === 'true' && !!clientId && !!process.env.GOOGLE_CALENDAR_CLIENT_SECRET && /^[a-f\d]{64}$/i.test(process.env.GOOGLE_CALENDAR_TOKEN_KEY || ''), clientId: clientId || null };
}
async function tokenRequest(fields) {
  let response;
  try {
    response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID, client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET, ...fields }) });
    if (!response.ok) { const status=response.status; await response.body?.cancel(); throw error(status===400||status===401 ? 'GOOGLE_CALENDAR_RECONNECT' : 'GOOGLE_CALENDAR_NETWORK'); }
    const result = await response.json();
    if (typeof result.access_token !== 'string' || !result.access_token) throw error('GOOGLE_CALENDAR_RECONNECT');
    return result;
  } catch (err) { throw error(err.code === 'GOOGLE_CALENDAR_RECONNECT' ? err.code : 'GOOGLE_CALENDAR_NETWORK'); }
}
async function exchange(code, origin) {
  const result = await tokenRequest({ code, redirect_uri: origin, grant_type: 'authorization_code' });
  if (!(result.scope || '').split(' ').includes(SCOPE) || !result.refresh_token) throw error('GOOGLE_CALENDAR_CONSENT_REQUIRED');
  return { accessToken: result.access_token, refreshToken: result.refresh_token };
}
async function refresh(refreshToken) { return (await tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' })).access_token; }
module.exports = { capability, exchange, refresh };
