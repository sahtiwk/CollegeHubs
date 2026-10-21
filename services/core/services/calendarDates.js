// Calendar dates are expressed in the source timezone, not the viewer's timezone.
function localParts(value, timezone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
}
function calendarDate(value, timezone) {
  const p = localParts(value, timezone);
  return `${p.year}-${p.month}-${p.day}`;
}
function isLocalMidnight(value, timezone) {
  const p = localParts(value, timezone);
  return p.hour === '00' && p.minute === '00' && p.second === '00' && new Date(value).getUTCMilliseconds() === 0;
}
module.exports = { calendarDate, isLocalMidnight };
