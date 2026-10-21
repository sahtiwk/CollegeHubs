const { createHash } = require('node:crypto');
const allowed = ['key','hubSlug','channelSlugs','title','startsAt','endsAt','allDay','status','provenance','sourceUrl','sourceRef','version','timezone','reviewedAt'];
function instant(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value.slice(0,10)).toISOString().slice(0,10) === value.slice(0,10);
}
function validateEntry(entry) {
  if (!entry || Array.isArray(entry) || Object.keys(entry).some(k=>!allowed.includes(k)) ||
    typeof entry.key !== 'string' || !/^[a-z0-9-]{1,80}$/.test(entry.key) ||
    typeof entry.hubSlug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(entry.hubSlug) ||
    typeof entry.title !== 'string' || !entry.title.trim() || entry.title.length > 200 || /[\x00-\x1f\x7f]/.test(entry.title) ||
    !Array.isArray(entry.channelSlugs) || !entry.channelSlugs.length || entry.channelSlugs.length>30 || entry.channelSlugs.some(s=>typeof s!=='string'||!/^[a-z0-9-]{1,80}$/.test(s)) || new Set(entry.channelSlugs).size!==entry.channelSlugs.length ||
    !instant(entry.startsAt) || !instant(entry.endsAt) || Date.parse(entry.endsAt)<=Date.parse(entry.startsAt) || Date.parse(entry.endsAt)-Date.parse(entry.startsAt)>366*86400000 ||
    !['seeded_fixture','official_reviewed'].includes(entry.provenance)) throw Error('Invalid calendar entry');
  const reviewed=entry.provenance==='official_reviewed';
  const timezone=entry.timezone ?? (reviewed ? null : 'Asia/Kolkata');
  if(typeof timezone!=='string'||timezone.length>80)throw Error('Calendar timezone required');
  try { new Intl.DateTimeFormat('en',{timeZone:timezone}); } catch { throw Error('Invalid calendar timezone'); }
  if (entry.allDay !== undefined && typeof entry.allDay !== 'boolean') throw Error('Invalid all-day flag');
  if (entry.status !== undefined && !['confirmed','cancelled'].includes(entry.status)) throw Error('Invalid event status');
  if (entry.allDay && ![entry.startsAt, entry.endsAt].every(value => require('../services/calendarDates').isLocalMidnight(value, timezone))) throw Error('All-day boundaries must be midnight in the source timezone');
  const version=entry.version ?? (reviewed ? null : 1);
  const sourceRef=entry.sourceRef ?? (reviewed ? null : 'Demonstration sample; not a college announcement');
  if(!Number.isSafeInteger(version)||version<1||version>1000000||typeof sourceRef!=='string'||!sourceRef.trim()||sourceRef.length>300||/[\x00-\x1f\x7f]/.test(sourceRef))throw Error('Calendar version/source reference required');
  let sourceUrl=entry.sourceUrl||null;
  if(sourceUrl!==null){try{const url=new URL(sourceUrl);if(typeof sourceUrl!=='string'||sourceUrl.length>2000||url.protocol!=='https:'||url.username||url.password||/[\s\x00-\x1f]/.test(sourceUrl))throw Error();}catch{throw Error('Invalid calendar source URL');}}
  if(reviewed&&(!sourceUrl||!instant(entry.reviewedAt)||Date.parse(entry.reviewedAt)>Date.now()))throw Error('Reviewed calendar needs source URL and past review timestamp');
  if(!reviewed&&entry.reviewedAt)throw Error('Samples cannot claim official review');
  const normalized={title:entry.title.trim(),startsAt:new Date(entry.startsAt),endsAt:new Date(entry.endsAt),provenance:entry.provenance,sourceRef,sourceUrl,version,timezone,reviewedAt:reviewed?new Date(entry.reviewedAt):null};
  // Keep existing timed-event hashes stable across this additive schema change.
  const facts = {...normalized, ...(entry.allDay ? {allDay:true} : {}), ...(entry.status === 'cancelled' ? {status:'cancelled'} : {})};
  return {...facts,allDay:!!entry.allDay,status:entry.status || 'confirmed',importHash:createHash('sha256').update(JSON.stringify({...facts,channels:[...entry.channelSlugs].sort()})).digest('hex')};
}
module.exports={validateEntry};
