const { calendar } = require('./scheduleService');
const { calendarDate } = require('./calendarDates');
const escapeText = value => String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
// RFC 5545 lines are limited by UTF-8 octets, never split inside a code point.
function fold(line) {
  let output='',part='',bytes=0;
  for(const char of line){const size=Buffer.byteLength(char);if(bytes+size>75){output+=part+'\r\n';part=' ';bytes=1;}part+=char;bytes+=size;}
  return output+part;
}
function serialize(data) {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CollegeHubs//Academic Calendar//EN','CALSCALE:GREGORIAN',
    'X-WR-CALNAME:'+escapeText(data.channelTitle),'X-WR-TIMEZONE:Asia/Kolkata'];
  for(const event of data.items){
    const sample=event.provenance!=='official_reviewed';
    lines.push('BEGIN:VEVENT','UID:'+event._id+'@calendar.collegehubs',
      'DTSTAMP:'+utc(event.seededAt),'LAST-MODIFIED:'+utc(event.updatedAt),'SEQUENCE:'+(event.version-1),
      ...(event.allDay ? ['DTSTART;VALUE=DATE:'+calendarDate(event.startsAt,event.timezone).replaceAll('-',''), 'DTEND;VALUE=DATE:'+calendarDate(event.endsAt,event.timezone).replaceAll('-','')] : ['DTSTART:'+utc(event.startsAt),'DTEND:'+utc(event.endsAt)]),
      'SUMMARY:'+escapeText((sample?'[Sample] ':'')+event.title),
      'DESCRIPTION:'+escapeText((sample?'Sample only; not an official college announcement.':'Source reviewed by the calendar operator; confirm with the source.')+'\n'+event.sourceRef+'\nSource version: '+event.version+'\nSource timezone: '+event.timezone+(event.sourceUrl?'\n'+event.sourceUrl:'')),
      'STATUS:'+(event.status==='cancelled'?'CANCELLED':'CONFIRMED'),'TRANSP:TRANSPARENT','END:VEVENT');
  }
  lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
async function exportCalendar(context,query){return serialize(await calendar(context,query,{exporting:true}));}
module.exports={exportCalendar,serialize,fold,escapeText};
