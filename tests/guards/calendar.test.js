const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
process.env.JWT_SECRET='calendar-fixture-secret';process.env.ALLOWED_ORIGINS='http://localhost:5173';process.env.ENABLE_MODULES='';process.env.CORE_SESSION_ENABLED='false';
const {validateEntry}=require('../../services/core/config/calendarPolicy');
const sample={key:'calendar-example',hubSlug:'calendar-home',channelSlugs:['dsa'],title:'Sample session',startsAt:'2026-10-12T10:00:00Z',endsAt:'2026-10-12T11:00:00Z',provenance:'seeded_fixture'};
test('TP6.1: reviewed imports require bounded source evidence, version and timezone',()=>{
  assert.equal(validateEntry(sample).timezone,'Asia/Kolkata');
  for(const change of [{provenance:'official_reviewed'},{timezone:'Wrong/Zone'},{version:0},{sourceUrl:'javascript:alert(1)'},{title:'Title\r\nBEGIN:VEVENT'},{startsAt:'2026-10-12T10:00:00'},{channelSlugs:['dsa','dsa']}])assert.throws(()=>validateEntry({...sample,...change}));
});
test('TP6.1: ICS parser round-trip, stable UID, UTC dates and UTF-8 folding',async()=>{
  const ICAL=(await import('ical.js')).default;
  const {serialize}=require('../../services/core/services/calendarExport');
  const item={_id:'a'.repeat(24),title:'తెలుగు 😀 '.repeat(20)+',semicolon;slash\\newline\nBEGIN:VEVENT',startsAt:'2026-10-12T15:30:00+05:30',endsAt:'2026-10-12T16:30:00+05:30',seededAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-02T00:00:00Z',version:2,timezone:'Asia/Kolkata',sourceRef:'Circular, 2; section 3',sourceUrl:'https://example.test/source',provenance:'seeded_fixture'};
  const data={channelTitle:'DSA',items:[item]},body=serialize(data);assert.equal(body,serialize(data));
  for(const line of body.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
  const parsed=new ICAL.Component(ICAL.parse(body)),events=parsed.getAllSubcomponents('vevent');assert.equal(events.length,1);
  const event=new ICAL.Event(events[0]);assert.equal(event.summary,'[Sample] '+item.title);assert.equal(event.uid,item._id+'@calendar.collegehubs');assert.equal(event.startDate.toJSDate().toISOString(),'2026-10-12T10:00:00.000Z');assert.equal(event.endDate.toJSDate().toISOString(),'2026-10-12T11:00:00.000Z');assert.equal(event.sequence,1);
  assert.equal(new ICAL.Event(new ICAL.Component(ICAL.parse(serialize({...data,items:[{...item,title:'Changed',version:3}]}))).getFirstSubcomponent('vevent')).uid,event.uid);
});
test('TP11.2: all-day export preserves source dates and exclusive end across timezones',async()=>{
  const ICAL=(await import('ical.js')).default;
  const {serialize}=require('../../services/core/services/calendarExport');
  for(const [timezone,startsAt,endsAt,start,end] of [
    ['Asia/Kolkata','2026-10-22T00:00:00+05:30','2026-10-29T00:00:00+05:30','2026-10-22','2026-10-29'],
    ['America/New_York','2026-11-01T00:00:00-04:00','2026-11-02T00:00:00-05:00','2026-11-01','2026-11-02'],
  ]) {
    const item={...validateEntry({...sample,timezone,startsAt,endsAt,allDay:true}),_id:'all-day-fixture',seededAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'};
    const event=new ICAL.Event(new ICAL.Component(ICAL.parse(serialize({channelTitle:'DSA',items:[item]}))).getFirstSubcomponent('vevent'));
    assert.equal(event.startDate.isDate,true); assert.equal(event.startDate.toString(),start); assert.equal(event.endDate.toString(),end);
  }
  assert.throws(()=>validateEntry({...sample,allDay:'true'}),/flag/);
  assert.throws(()=>validateEntry({...sample,allDay:true}),/midnight/);
  assert.equal(validateEntry(sample).importHash,validateEntry({...sample,allDay:false}).importHash);
  const midnight={...sample,startsAt:'2026-10-22T00:00:00+05:30',endsAt:'2026-10-29T00:00:00+05:30'};
  assert.notEqual(validateEntry(midnight).importHash,validateEntry({...midnight,allDay:true}).importHash);
});
test('TP6.1: gateway permits calendar MIME only for the exact successful GET export',async()=>{
  const {proxyApi}=await import('../../apps/web/functions/api/[[path]].ts'),path='/api/hubs/'+'a'.repeat(24)+'/calendar/export.ics';
  const call=(p=path,method='GET',status=200,type='text/calendar; charset=utf-8')=>proxyApi(new Request('https://app.example'+p,{method}),{CORE_API_ORIGIN:'https://core.example'},async()=>new Response('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',{status,headers:{'content-type':type,'content-disposition':'inline; filename=unsafe.html'}}));
  const response=await call();assert.equal(response.status,200);assert.equal(response.headers.get('content-disposition'),'attachment; filename="collegehubs-calendar.ics"');assert.equal(response.headers.get('cache-control'),'no-store');
  for(const args of [[path,'POST'],[path,'GET',403],['/api/contests'],[path+'/extra'],[path,'GET',200,'text/html']])assert.equal((await call(...args)).status,502);
  assert.equal((await call(path,'GET',403,'application/json')).status,403);
});
test('TP6.1: scoped imports, paging and ICS route', {skip:!process.env.GUARD_MONGO_URI},async t=>{
  const mongoose=require('mongoose');mongoose.set('autoCreate',false).set('autoIndex',false);
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.GUARD_MONGO_URI).hostname));
  await mongoose.connect(process.env.GUARD_MONGO_URI,{dbName:'collegehubs_demo_calendar_'+randomUUID().replaceAll('-','')});
    const names=['College','Hub','User','Channel','CalendarEvent','GoogleCalendarConnection'],m=Object.fromEntries(names.map(n=>[n,require('../../services/core/models/'+n)]));let server;
  try{
    for(const model of Object.values(m)){await model.createCollection();await model.createIndexes();}
    const college=await m.College.create({name:'Calendar home',slug:'calendar-home',status:'active',timezone:'Asia/Kolkata',domains:[{normalizedDomain:'calendar.example.test',verifiedAt:new Date(),evidenceRef:'synthetic test'}]});
    const hub=await m.Hub.create({name:college.name,slug:college.slug,collegeId:college.id,themeTokens:require('../../services/core/config/collegeRegistry').config.defaultTheme,themeVersion:1,timezone:college.timezone});
    const channel=await m.Channel.create({hubId:hub.id,slug:'dsa',title:'DSA',defaultSetVersion:1});
    const other=new mongoose.Types.ObjectId(),foreign=await m.Channel.create({hubId:other,slug:'dsa',title:'Foreign',defaultSetVersion:1});
    const user=await m.User.create({username:'calendar',email:'calendar@calendar.example.test',password:randomUUID(),hubId:hub.id,membershipStatus:'active',membershipVerified:true,verificationMethod:'email',emailVerificationMethod:'email',emailVerifiedAt:new Date(),membershipVersion:1});
    const schedule=require('../../services/core/services/scheduleService'),context={hubId:hub.id},query={channelId:channel.id,from:'2026-10-01',to:'2026-11-01'};
    const reviewed={...sample,key:'reviewed-example',title:'Synthetic reviewed fixture',provenance:'official_reviewed',sourceUrl:'https://example.test/circular',sourceRef:'Synthetic operator evidence 01 (test only)',version:1,timezone:'Asia/Kolkata',reviewedAt:'2026-10-01T00:00:00Z'};
    await t.test('dry-run, repeat, versioned edits, no relabeling or moved samples',async()=>{
      await schedule.seedCalendar([sample,reviewed],{dryRun:true});assert.equal(await m.CalendarEvent.countDocuments(),0);
      await schedule.seedCalendar([sample,reviewed]);const before=(await m.CalendarEvent.find({}).sort({_id:1}).lean());
      await schedule.seedCalendar([sample,reviewed]);assert.deepEqual(await m.CalendarEvent.find({}).sort({_id:1}).lean(),before);
      await assert.rejects(schedule.seedCalendar([{...reviewed,key:sample.key,version:2}]),/relabel/);
      await assert.rejects(schedule.seedCalendar([{...sample,version:2,startsAt:'2026-11-01T00:00:00Z',endsAt:'2026-11-01T01:00:00Z'}]),/Sample dates/);
      await assert.rejects(schedule.seedCalendar([{...reviewed,title:'Changed'}]),/higher source version/);
      await schedule.seedCalendar([{...reviewed,title:'Changed',version:2}]);
      assert.equal((await m.CalendarEvent.findOne({seedKey:reviewed.key})).id,String(before.find(r=>r.seedKey===reviewed.key)._id));
      await assert.rejects(schedule.seedCalendar([{...sample,key:'rollback'},{...sample,key:'bad-channel',channelSlugs:['missing']}]));assert.equal(await m.CalendarEvent.countDocuments(),2);
    });
    await t.test('stable bounded pages, channel/range-bound cursors, retained past dates',async()=>{
      const first=await schedule.calendar(context,{...query,limit:'1'});assert.equal(first.items.length,1);assert.ok(first.nextCursor);assert.equal(first.items[0].past,true);
      const second=await schedule.calendar(context,{...query,limit:'1',cursor:first.nextCursor});assert.equal(second.items.length,1);assert.notEqual(String(second.items[0]._id),String(first.items[0]._id));assert.equal(second.nextCursor,null);
      for(const change of [{from:'2026-10-02'},{channelId:foreign.id},{cursor:first.nextCursor+'x'},{limit:'51'},{from:'2026-02-30'},{to:'2028-01-01'},{userId:user.id}])await assert.rejects(schedule.calendar(context,{...query,cursor:first.nextCursor,...change}),{status:400});
      await assert.rejects(schedule.calendar(context,{...query,channelId:foreign.id}),{status:404});
      assert.equal((await schedule.calendar(context,{...query,from:'2026-11-01',to:'2026-12-01'})).items.length,0);
    });
    await t.test('Google connection binds nonce and membership; worker updates, cancels and disconnects',async()=>{
      const sync=require('../../services/core/services/googleCalendarSync'),oauth=require('../../services/core/services/googleCalendarOAuth');
      const saved={fetch:global.fetch,capability:oauth.capability,exchange:oauth.exchange,refresh:oauth.refresh,key:process.env.GOOGLE_CALENDAR_TOKEN_KEY};
      const records=new Map();let writes=0;
      const ctx={userId:user.id,hubId:hub.id,membershipVersion:1};
      try {
        process.env.GOOGLE_CALENDAR_TOKEN_KEY='b'.repeat(64);
        oauth.capability=()=>({available:true,clientId:'test-only'});
        oauth.exchange=async()=>({accessToken:'test-access',refreshToken:'test-refresh'});
        oauth.refresh=async token=>{assert.equal(token,'test-refresh');return 'test-access';};
        global.fetch=async(url,options)=>{
          assert.ok(url.startsWith('https://www.googleapis.com/calendar/v3/'));
          if(options.method!=='GET')writes++;
          if(url.endsWith('/calendars'))return new Response(JSON.stringify({id:'test@group.calendar.google.com'}));
          const id=url.split('/').at(-1);
          if(options.method==='GET')return new Response(JSON.stringify(records.get(id)||{}),{status:records.has(id)?200:404});
          const body=JSON.parse(options.body);records.set(body.id,{...body,etag:'test-etag'});return new Response(JSON.stringify(body));
        };
        await assert.rejects(sync.start(ctx,foreign.id),{status:404});
        const {nonce}=await sync.start(ctx,channel.id);
        await assert.rejects(sync.connect({...ctx,userId:String(new mongoose.Types.ObjectId())},{nonce,code:'test-code'},'http://localhost:5173'),{status:409});
        assert.equal((await sync.connect(ctx,{nonce,code:'test-code'},'http://localhost:5173')).state,'connected');
        await assert.rejects(sync.connect(ctx,{nonce,code:'test-code'},'http://localhost:5173'),{status:409});
        const stored=await m.GoogleCalendarConnection.findOne({userId:user.id}).select('+tokenCipher').lean();
        assert.ok(!stored.tokenCipher.includes('test-refresh'));assert.equal(JSON.stringify(await sync.status(ctx)).includes(stored.tokenCipher),false);
        await sync.tick();assert.equal(records.size,1); // Reviewed event only; sample never leaves Core.
        const eventId=[...records.keys()][0],initialWrites=writes;
        await m.GoogleCalendarConnection.updateOne({userId:user.id},{$set:{nextAttemptAt:new Date(0)}});await sync.tick();assert.equal(writes,initialWrites);
        await schedule.seedCalendar([{...reviewed,title:'Cancelled official fixture',version:3,status:'cancelled'}]);
        await m.GoogleCalendarConnection.updateOne({userId:user.id},{$set:{nextAttemptAt:new Date(0)}});await sync.tick();
        assert.equal(records.get(eventId).status,'cancelled');assert.equal(records.size,1);
        // A removed membership must stop provider access and erase its refresh token.
        await m.GoogleCalendarConnection.updateOne({userId:user.id},{$set:{nextAttemptAt:new Date(0),membershipVersion:0}});
        const beforeLoss=writes;await sync.tick();assert.equal(writes,beforeLoss);
        const lost=await m.GoogleCalendarConnection.findOne({userId:user.id}).select('+tokenCipher').lean();
        assert.equal(lost.state,'reconnect');assert.equal(lost.tokenCipher,undefined);
        await sync.disconnect(ctx);const after=writes;await sync.tick();assert.equal(writes,after);
        assert.equal((await m.GoogleCalendarConnection.findOne({userId:user.id}).select('+tokenCipher').lean()).tokenCipher,undefined);
      } finally {global.fetch=saved.fetch;oauth.capability=saved.capability;oauth.exchange=saved.exchange;oauth.refresh=saved.refresh;if(saved.key===undefined)delete process.env.GOOGLE_CALENDAR_TOKEN_KEY;else process.env.GOOGLE_CALENDAR_TOKEN_KEY=saved.key;}
    });
    await t.test('HTTP export requires membership and exact own-Hub channel; stable whole-range file',async()=>{
      server=require('../../services/core/app').createApp({connection:mongoose.connection}).listen(0);await new Promise(r=>server.once('listening',r));
      const token=require('../../services/core/config/auth').generateToken(user),base='http://127.0.0.1:'+server.address().port;
      const path='/api/hubs/'+hub.id+'/calendar/export.ics?'+new URLSearchParams(query),headers={Authorization:'Bearer '+token};
      assert.equal((await fetch(base+'/api/me/calendar-sync',{headers})).status,200);
      assert.equal((await fetch(base+'/api/me/calendar-sync/start',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({channelId:channel.id})})).status,403);
      assert.equal((await fetch(base+path)).status,401);
      const a=await fetch(base+path,{headers}),b=await fetch(base+path,{headers});assert.equal(a.status,200);assert.match(a.headers.get('content-type'),/^text\/calendar/);const body=await a.text();assert.equal(body,await b.text());
      const ICAL=(await import('ical.js')).default;assert.equal(new ICAL.Component(ICAL.parse(body)).getAllSubcomponents('vevent').length,2);
      assert.equal((await fetch(base+path.replace(hub.id,String(other)),{headers})).status,403);
      assert.equal((await fetch(base+path.replace(channel.id,foreign.id),{headers})).status,404);
      assert.equal((await fetch(base+path+'&limit=1',{headers})).status,400);
      await m.Channel.updateOne({_id:channel.id},{$set:{archivedAt:new Date()}});assert.equal((await fetch(base+path,{headers})).status,404);
    });
  }finally{if(server)await new Promise(r=>server.close(r));await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
