require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('node:fs');
const mongoose = require('mongoose');
mongoose.set('autoCreate', false).set('autoIndex', false);
(async () => {
  const args=process.argv.slice(2), file=args.find(a=>a.startsWith('--file='))?.slice(7), database=args.find(a=>a.startsWith('--database='))?.slice(11);
  const dryRun=args.includes('--dry-run');
  if(args.some(a=>!['--dry-run','--apply','--confirm-sample-dates'].includes(a)&&!a.startsWith('--file=')&&!a.startsWith('--database='))||args.includes('--apply')===dryRun)throw Error('Use --database=NAME with exactly one of --dry-run or --apply; optional --file=PATH');
  if(!database||!/^[a-zA-Z0-9_-]+$/.test(database)||['admin','local','config'].includes(database)||new URL(process.env.MONGO_URI).pathname!=='/'+database)throw Error('Explicit database must match MONGO_URI');
  if(!file&&!args.includes('--confirm-sample-dates'))throw Error('Default sample import requires --confirm-sample-dates');
  if(file&&fs.statSync(file).size>262144)throw Error('Calendar import must be at most 256 KiB');
  const entries=file?JSON.parse(fs.readFileSync(file,'utf8')):require('../config/calendar.seed.json');
  try {
    await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});
    if(!dryRun){const model=require('../models/CalendarEvent');await model.createCollection();await model.createIndexes();}
    console.log(await require('../services/scheduleService').seedCalendar(entries,{dryRun}));
  } finally { await mongoose.disconnect(); }
})().catch(error=>{console.error('Calendar import refused: '+error.message);process.exitCode=1;});
