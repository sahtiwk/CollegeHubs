require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
(async () => {
  if (!process.argv.includes('--confirm-sample-dates')) throw new Error('Review config/calendar.seed.json, then pass --confirm-sample-dates. Dates are examples, not college announcements.');
  try { await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 }); await require('../models/CalendarEvent').init(); console.log(await require('../services/scheduleService').seedCalendar()); }
  finally { await mongoose.disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
