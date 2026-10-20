const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireHubAccess, accessError } = require('../services/hubAccess');
const schedule = require('../services/scheduleService');
const route = fn => async (req, res) => { try { res.json(await fn(req)); } catch (error) { res.status(error.status || 503).json({ error: { code: error.status ? error.code : 'SCHEDULE_UNAVAILABLE', message: error.status ? error.message : 'Schedules unavailable; retry shortly' } }); } };
router.get('/contests', authenticate, route(async req => {
  await requireHubAccess(req.auth);
  if (Object.keys(req.query).length) throw accessError(400, 'INVALID_QUERY', 'Contests accepts no selectors');
  return schedule.contests();
}));
router.get('/hubs/:hubId/calendar', authenticate, route(async req => schedule.calendar(await requireHubAccess(req.auth, req.params.hubId), req.query)));
router.get('/hubs/:hubId/calendar/export.ics', authenticate, async (req,res) => {
  try {
    const context=await requireHubAccess(req.auth,req.params.hubId);
    const body=await require('../services/calendarExport').exportCalendar(context,req.query);
    res.set({'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="collegehubs-calendar.ics"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(body);
  } catch(error) { res.status(error.status||503).json({error:{code:error.code||'CALENDAR_EXPORT_UNAVAILABLE',message:error.status?error.message:'Calendar export unavailable; retry shortly'}}); }
});
module.exports = router;
