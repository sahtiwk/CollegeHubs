const { createHash } = require('node:crypto');
const { calendarDate } = require('./calendarDates');
const SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
const failure = (code, status = 503) => Object.assign(new Error('Google Calendar synchronization unavailable'), { code, status });
function eventBody(event) {
  if (event.provenance !== 'official_reviewed') throw failure('CALENDAR_SOURCE_UNREVIEWED', 400);
  const sourceId = String(event._id);
  if (!/^[a-f\d]{24}$/i.test(sourceId)) throw failure('CALENDAR_SOURCE_INVALID', 400);
  const boundary = value => event.allDay ? { date: calendarDate(value, event.timezone) } : { dateTime: new Date(value).toISOString(), timeZone: event.timezone };
  const body = {
    id: 'ch' + createHash('sha256').update(String(event.hubId) + ':' + sourceId).digest('hex'),
    summary: event.title,
    description: `${event.sourceRef}\n${event.sourceUrl}\nMaintained by CollegeHubs. Confirm exact arrangements with your college.`,
    start: boundary(event.startsAt), end: boundary(event.endsAt),
    status: event.status === 'cancelled' ? 'cancelled' : 'confirmed',
    transparency: 'transparent', reminders: { useDefault: false },
    extendedProperties: { private: { collegehubsSource: sourceId, collegehubsVersion: String(event.version) } },
  };
  body.extendedProperties.private.collegehubsHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return body;
}
function createAdapter(accessToken, { fetchImpl = fetch, beforeWrite = async () => {} } = {}) {
  async function request(path, method = 'GET', body, etag) {
    if (method !== 'GET') await beforeWrite();
    let response;
    try {
      response = await fetchImpl('https://www.googleapis.com/calendar/v3/' + path, {
        method, redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json', ...(etag ? { 'If-Match': etag } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw failure('GOOGLE_CALENDAR_NETWORK'); }
    if (!response.ok) {
      // Never expose Google's response, which can contain credentials or user data.
      await response.body?.cancel();
      throw failure(response.status === 401 ? 'GOOGLE_CALENDAR_RECONNECT' : response.status === 429 ? 'GOOGLE_CALENDAR_RATE_LIMIT' : 'GOOGLE_CALENDAR_REQUEST', response.status);
    }
    try { return await response.json(); } catch { throw failure('GOOGLE_CALENDAR_RESPONSE'); }
  }
  function calendarPath(calendarId) {
    // Only service-persisted secondary calendar identifiers may reach this adapter.
    if (typeof calendarId !== 'string' || !calendarId.endsWith('@group.calendar.google.com') || calendarId.length > 300) throw failure('GOOGLE_CALENDAR_TARGET', 400);
    return 'calendars/' + encodeURIComponent(calendarId);
  }
  return {
    createCalendar: () => request('calendars', 'POST', { summary: 'CollegeHubs academic calendar', description: 'Reviewed academic dates maintained by CollegeHubs. Changes may be delayed while the free service sleeps.', timeZone: 'Asia/Kolkata' }),
    async syncEvent(calendarId, event) {
      const body = eventBody(event), collection = calendarPath(calendarId) + '/events', path = collection + '/' + body.id;
      let remote;
      try { remote = await request(path); }
      catch (error) { if (error.status !== 404) throw error; }
      if (!remote) {
        if (body.status === 'cancelled') return 'unchanged';
        try { await request(collection, 'POST', body); return 'created'; }
        catch (error) {
          // A lost response or another worker may have inserted the stable ID already.
          if (error.status !== 409) throw error;
          remote = await request(path);
        }
      }
      if (remote.status === 'cancelled' && body.status === 'cancelled') return 'unchanged';
      const meta = remote.extendedProperties?.private;
      if (meta?.collegehubsSource !== String(event._id)) throw failure('GOOGLE_CALENDAR_OWNERSHIP', 409);
      if (Number(meta.collegehubsVersion) > event.version) throw failure('GOOGLE_CALENDAR_STALE_SOURCE', 409);
      if (meta.collegehubsHash === body.extendedProperties.private.collegehubsHash && remote.status === body.status) return 'unchanged';
      if (!remote.etag) throw failure('GOOGLE_CALENDAR_RESPONSE');
      await request(path, 'PUT', body, remote.etag);
      return body.status === 'cancelled' ? 'cancelled' : 'updated';
    },
  };
}
module.exports = { SCOPE, eventBody, createAdapter };
