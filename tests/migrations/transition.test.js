const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const digest = value => createHash('sha256').update(value).digest('hex');
const evidence = path.resolve('.local/tp02');
fs.mkdirSync(evidence, { recursive: true });

test('migration catalogs are immutable ordered baseline declarations', async () => {
  const { loadMigrations } = require('../../services/core/migrations/runner');
  const { loadMigrations: loadSql } = await import('../../services/learn/src/db/migrations/runner.ts');
  for (const migrations of [loadMigrations(), await loadSql()]) {
    assert.ok(migrations.length >= 1);
    assert.equal(migrations[0].id, '0001_baseline');
    assert.match(migrations[0].checksum, /^[a-f0-9]{64}$/);
  }
});

test('retained stores: dry-run, concurrency, failure/resume, repeat and disk restore', { timeout: 180000 }, async t => {
  const adminUrl = new URL(process.env.MIGRATION_TEST_DATABASE_URL || '');
  assert.ok(['localhost','127.0.0.1'].includes(adminUrl.hostname), 'Explicit local PostgreSQL required; never skip this guard');
  assert.equal(adminUrl.pathname, '/postgres', 'Use local admin database only to create random disposable targets');
  const suffix = randomUUID().replaceAll('-','');
  const names = ['collegehubs_demo_learn_tp02_'+suffix, 'collegehubs_demo_learn_restore_'+suffix];
  const admin = new Pool({ connectionString: adminUrl.toString() });
  const pools = [], urls = [];
  let repl, client;
  const report = { checks: [], snapshots: {} };
  try {
    for (const name of names) {
      await admin.query(`CREATE DATABASE "${name}"`);
      const url = new URL(adminUrl); url.pathname = '/'+name; urls.push(url);
      pools.push(new Pool({ connectionString: url.toString() }));
    }
    const [pool, restored] = pools;
    const { schemaDDL } = await import('../../services/learn/src/db/schema.ts');
    await pool.query(schemaDDL);
    const { learnerService } = await import('../../services/learn/src/services/learnerService.ts');
    const owner = { hubId:'a'.repeat(24), userId:'b'.repeat(24) };
    const learning = learnerService(pool);
    await learning.initialize(owner,'dsa');
    const graph = await learning.graph(owner), node = graph.nodes.find(n => n.status === 'unlocked');
    const attempt = randomUUID();
    await pool.query(`INSERT INTO quiz_attempt(hub_id,user_id,id,request_id,node_id,domain,version,mode,status,questions,result,finalized_at)
      VALUES($1,$2,$3,$4,$5,'dsa','demo-v1','checkpoint','finalized','[{},{},{},{},{}]','{"passed":true,"correctCount":5,"itemCount":5,"ratio":1}',now())`,[owner.hubId,owner.userId,attempt,randomUUID(),node.id]);
    await pool.query('INSERT INTO node_completion VALUES($1,$2,$3,$4,$5,now())',[owner.hubId,owner.userId,node.id,'demo-v1',attempt]);
    for (const status of ['pending','settled']) await pool.query(`INSERT INTO learn_event(hub_id,user_id,attempt_id,event_id,payload,status,receipt) VALUES($1,$2,$3,$4,$5,$6,$7)`,[owner.hubId,owner.userId,attempt,'fixture:'+status,{type:'learn.quiz_completed',attemptId:attempt},status,status==='settled'?{awardedAura:10,eventId:'fixture:settled'}:null]);
    async function sqlSnapshot(p) {
      const tables = (await p.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migration' ORDER BY tablename")).rows;
      const result = {};
      for (const {tablename} of tables) {
        const rows = (await p.query(`SELECT row_to_json(t)::text AS row FROM "${tablename}" t`)).rows.map(r=>r.row).sort();
        result[tablename] = { count: rows.length, hash: digest(rows.join('\n')) };
      }
      return result;
    }
    const beforeSql = await sqlSnapshot(pool);
    const { attemptService } = await import('../../services/learn/src/services/attemptService.ts');
    const savedAttempt = await attemptService(pool).get(owner,attempt);
    const sqlRunner = await import('../../services/learn/src/db/migrations/runner.ts');
    const baselineSql = await sqlRunner.loadMigrations();
    await t.test('SQL dry-run does not create ledger; concurrent adoption preserves all data', async () => {
      assert.deepEqual((await sqlRunner.migrate(pool)).pending,baselineSql.map(m => m.id));
      assert.equal((await pool.query("SELECT to_regclass('public.schema_migration') AS name")).rows[0].name,null);
      await Promise.all([sqlRunner.migrate(pool,{dryRun:false}),sqlRunner.migrate(pool,{dryRun:false})]);
      const after=await sqlSnapshot(pool);for(const [table,snapshot]of Object.entries(beforeSql))if(table!=='learn_schema')assert.deepEqual(after[table],snapshot);assert.equal((await pool.query('SELECT version FROM learn_schema')).rows[0].version,5);
      const ledger = (await pool.query('SELECT * FROM schema_migration')).rows;
      await sqlRunner.migrate(pool,{dryRun:false});
      assert.deepEqual((await pool.query('SELECT * FROM schema_migration')).rows,ledger);
      assert.deepEqual(await learning.graph(owner),graph);
      assert.deepEqual(await attemptService(pool).get(owner,attempt),savedAttempt);
      await assert.rejects(sqlRunner.migrate(pool,{migrations:[{...baselineSql[0],checksum:'0'.repeat(64)}]}),/checksum/);
    });
    await t.test('SQL failed transaction rolls back DDL/data and ledger; same migration retries', async () => {
      // Advisory lock held by another session deterministically fails the second
      // statement after transactional DDL; the unchanged SQL succeeds on retry.
      const blocker = await pool.connect();
      await blocker.query('SELECT pg_advisory_lock(31003)');
      const sql = "CREATE TABLE tp02_probe(id integer PRIMARY KEY); INSERT INTO tp02_probe VALUES(1); DO $$ BEGIN IF NOT pg_try_advisory_xact_lock(31003) THEN RAISE EXCEPTION 'injected interruption'; END IF; END $$";
      const migrations = [...baselineSql,{id:'0006_probe',checksum:digest(sql),sql}];
      try { await assert.rejects(sqlRunner.migrate(pool,{dryRun:false,migrations}),/injected interruption/); }
      finally { await blocker.query('SELECT pg_advisory_unlock(31003)'); blocker.release(); }
      assert.equal((await pool.query("SELECT to_regclass('public.tp02_probe') AS name")).rows[0].name,null);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM schema_migration')).rows[0].n,baselineSql.length);
      await sqlRunner.migrate(pool,{dryRun:false,migrations});
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM tp02_probe')).rows[0].n,1);
      // Probe is test-only and never enters the shipped migration catalog.
      await pool.query("DROP TABLE tp02_probe; DELETE FROM schema_migration WHERE id='0006_probe'");
    });
    await t.test('SQL pg_dump/pg_restore preserves identities, pending receipts and immutable triggers', async () => {
      const dump = path.join(evidence,'learn.dump');
      const pgEnv = {...process.env, PGHOST:adminUrl.hostname, PGPORT:adminUrl.port, PGUSER:decodeURIComponent(adminUrl.username), PGPASSWORD:decodeURIComponent(adminUrl.password)};
      execFileSync('pg_dump',['--format=custom','--file',dump,'--dbname',names[0]],{env:pgEnv,stdio:'pipe'});
      execFileSync('pg_restore',['--exit-on-error','--no-owner','--dbname',names[1],dump],{env:pgEnv,stdio:'pipe'});
      const after=await sqlSnapshot(pool);assert.deepEqual(await sqlSnapshot(restored),after);
      assert.deepEqual(await learnerService(restored).graph(owner),graph);
      assert.deepEqual(await attemptService(restored).get(owner,attempt),savedAttempt);
      for(const p of [pool,restored]) {
        await assert.rejects(p.query('UPDATE quiz_attempt SET answers=answers'),/Immutable attempt/);
        await assert.rejects(p.query('DELETE FROM node_completion'),/Immutable completion/);
        await assert.rejects(p.query("UPDATE learn_event SET receipt='{}' WHERE status='settled'"),/Immutable event/);
      }
      await sqlRunner.migrate(restored,{dryRun:false});
      const inventories=[];
      for(const [i,url] of urls.entries()) {
        const output=path.join(evidence,`learn-inventory-${suffix}-${i}.json`);
        execFileSync(process.execPath,['scripts/migration-inventory.cjs','--service=learn','--database='+names[i],'--output='+output],{env:{...process.env,DATABASE_URL:url.toString()},stdio:'pipe'});
        const {database,...data}=JSON.parse(fs.readFileSync(output));inventories.push(data);
      }
      assert.deepEqual(inventories[0],inventories[1]);
      report.snapshots.learn = beforeSql;
    });

    await t.test('TP5.2 migrated Learn persists expired attention without changing frozen payload', async () => {
      const payload={eventId:'fixture:expired',occurredAt:new Date(Date.now()-31*86400000).toISOString()};
      await pool.query('INSERT INTO learn_event(hub_id,user_id,attempt_id,event_id,payload) VALUES($1,$2,$3,$4,$5)',[owner.hubId,owner.userId,attempt,payload.eventId,payload]);
      const {coreEvents}=await import('../../services/learn/src/services/coreEvents.ts');
      let calls=0;const delivery=coreEvents(pool,{core:'http://localhost'},async()=>{calls++;throw Error();});
      await Promise.all([delivery.deliver(payload.eventId),delivery.deliver(payload.eventId)]);
      const saved=(await pool.query('SELECT * FROM learn_event WHERE event_id=$1',[payload.eventId])).rows[0];
      assert.equal(saved.status,'attention');assert.equal(saved.last_error_code,'EVENT_REPLAY_EXPIRED');assert.deepEqual(saved.payload,payload);assert.equal(calls,0);
      await delivery.deliver(payload.eventId);assert.equal((await pool.query('SELECT tries FROM learn_event WHERE event_id=$1',[payload.eventId])).rows[0].tries,1);
      await assert.rejects(pool.query("UPDATE learn_event SET payload='{}' WHERE event_id=$1",[payload.eventId]),/Immutable event/);
    });

    repl = await MongoMemoryReplSet.create({binary:{version:'7.0.14'},replSet:{count:1}});
    client = new mongoose.mongo.MongoClient(repl.getUri()); await client.connect();
    const dbName = 'collegehubs_demo_tp02_'+suffix, db = client.db(dbName);
    process.env.JWT_SECRET='tp02-disposable-signing-secret'; process.env.ALLOWED_ORIGINS='http://localhost:5173'; process.env.ENABLE_MODULES='';
    mongoose.set('autoCreate',false).set('autoIndex',false);
    await mongoose.connect(repl.getUri(dbName));
    const modelNames = ['College','Hub','Channel','User','Problem','StudyRoom','StudySolution','PeerReview','NativeFact','AuraRuleSet','AuraEvent','AuraBalance','DailyActivity'];
    const models = Object.fromEntries(modelNames.map(n=>[n,require('../../services/core/models/'+n)]));
    for(const model of Object.values(models)){await model.createCollection();await model.createIndexes();}
    const college = await models.College.create({name:'Migration fixture',slug:'migration-fixture',status:'active',timezone:'Asia/Kolkata',domains:[{normalizedDomain:'migration.example.test',verifiedAt:new Date(),evidenceRef:'synthetic'}]});
    const hub = await require('../../services/core/services/hubProvisioning').ensureHubForCollege(college.id);
    const channel = await models.Channel.findOne({hubId:hub.id});
    const users = await models.User.create([0,1].map(i=>({username:'migration-'+i,email:i+'@migration.example.test',googleSubject:'synthetic-'+i,hubId:hub.id,membershipStatus:'active',membershipVerified:true,verificationMethod:'email',emailVerificationMethod:'email',emailVerifiedAt:new Date(),membershipVersion:1})));
    const auth = require('../../services/core/config/auth');
    const claims = users.map(u=>auth.verifyToken(auth.generateToken(u)));
    const study = require('../../services/core/services/studyService');
    const problem = (await study.problems(claims[0])).items[0];
    const {room} = await study.create(claims[0],{channelId:channel.id,problemId:problem._id,durationMinutes:5,clientRoomId:randomUUID()});
    await study.join(claims[1],room._id,{}); await study.start(claims[0],room._id,{});
    await study.save(claims[0],room._id,{expectedRevision:0,revision:1,source:'const preserved = 42;',language:'javascript'});
    const at = new Date();
    await models.AuraEvent.create({eventId:'tp02:receipt',awardedAura:10,hubId:hub._id,userId:users[0]._id,payloadHash:digest('fixture'),canonical:true,businessKey:'tp02:receipt',source:'core',type:'code.shared',sourceId:room._id,originalEventId:'tp02:receipt',value:1,metadata:{fixture:true},occurredAt:at,receivedAt:at,ruleVersion:'native-v1',policyReason:'awarded',dayKey:'2026-10-18',timezonePolicyVersion:1});
    await models.AuraBalance.create({hubId:hub._id,userId:users[0]._id,engagement:10,total:10,asOf:at});
    await models.StudySolution.updateOne({roomId:room._id,userId:users[0]._id},{$set:{awardStatus:'pending',awardEventId:'tp02:pending'}});
    const aura = require('../../services/core/services/auraReadService');
    const auraOwner = {hubId:hub.id,userId:users[0].id};
    const beforeAura = await aura.summary(auraOwner);
    const { BSON } = mongoose.mongo;
    async function mongoSnapshot(database) {
      const result = {};
      for(const {name} of (await database.listCollections().toArray()).filter(c=>c.name!=='migrationcheckpoints').sort((a,b)=>a.name.localeCompare(b.name))) {
        const rows=(await database.collection(name).find().toArray()).map(d=>BSON.EJSON.stringify(d,{relaxed:false})).sort();
        result[name]={count:rows.length,hash:digest(rows.join('\n'))};
      }
      return result;
    }
    const beforeMongo = await mongoSnapshot(db);
    let migratedMongo;
    const coreRunner = require('../../services/core/migrations/runner');
    const baselineCore = coreRunner.loadMigrations();
    await t.test('operator CLIs reject mismatched database confirmations before connecting', () => {
      for(const [script,env] of [
        ['services/core/scripts/migrate.js',{MONGO_URI:repl.getUri(dbName)}],
        ['services/learn/scripts/migrate.ts',{DATABASE_URL:urls[0].toString()}],
      ]) {
        const {spawnSync}=require('node:child_process');
        const result=spawnSync(process.execPath,[script,'--database=wrong_target','--apply'],{env:{...process.env,...env},encoding:'utf8'});
        assert.equal(result.status,1); assert.match(result.stderr,/refused or failed/);
        assert.ok(!result.stderr.includes(env.MONGO_URI||env.DATABASE_URL));
      }
    });
    await t.test('Core dry-run/concurrent baseline/repeat preserves data and old Study reads', async () => {
      await coreRunner.migrate(client,dbName);
      assert.equal((await db.listCollections({name:'migrationcheckpoints'}).toArray()).length,0);
      await Promise.all([coreRunner.migrate(client,dbName,{dryRun:false}),coreRunner.migrate(client,dbName,{dryRun:false})]);
      const ledger = await db.collection('migrationcheckpoints').find().sort({_id:1}).toArray();
      await coreRunner.migrate(client,dbName,{dryRun:false});
      assert.deepEqual(await db.collection('migrationcheckpoints').find().sort({_id:1}).toArray(),ledger);
      migratedMongo = await mongoSnapshot(db);
      const { achievementawards, ...retained } = migratedMongo;
      assert.deepEqual(retained,beforeMongo);
      assert.ok(achievementawards, 'additive badge collection is prepared');
      assert.equal((await study.snapshot(claims[0],room._id)).room._id,room._id);
      assert.deepEqual(await aura.summary(auraOwner),beforeAura);
      await assert.rejects(coreRunner.migrate(client,dbName,{migrations:[{...baselineCore[0],checksum:'0'.repeat(64)}]}),/checksum/);
    });
    await t.test('Core interrupted batch rolls back and concurrent resume processes each item once', async () => {
      await db.collection('tp02_probe').insertMany([1,2,3].map(_id=>({_id,count:0})));
      let fail = true;
      const up = async ({db,session,cursor,batchSize}) => {
        const rows=await db.collection('tp02_probe').find({_id:{$gt:cursor??0}},{session}).sort({_id:1}).limit(batchSize).toArray();
        for(const row of rows) await db.collection('tp02_probe').updateOne({_id:row._id},{$inc:{count:1}},{session});
        if(cursor===1 && fail) throw Error('injected interruption');
        return {cursor:rows.at(-1)?._id??cursor,done:rows.length<batchSize};
      };
      const migrations=[...baselineCore,{id:'0006_probe',checksum:digest(up.toString()),up}];
      assert.equal((await coreRunner.migrate(client,dbName,{dryRun:false,migrations,batchSize:1,maxBatches:1})).complete,false);
      await assert.rejects(coreRunner.migrate(client,dbName,{dryRun:false,migrations,batchSize:1}),/injected interruption/);
      assert.equal((await db.collection('migrationcheckpoints').findOne({_id:'0006_probe'})).cursor,1);
      assert.equal((await db.collection('tp02_probe').findOne({_id:2})).count,0);
      fail=false;
      await Promise.all([0,1].map(()=>coreRunner.migrate(client,dbName,{dryRun:false,migrations,batchSize:1})));
      assert.deepEqual((await db.collection('tp02_probe').find().sort({_id:1}).toArray()).map(r=>r.count),[1,1,1]);
      await db.collection('tp02_probe').drop(); await db.collection('migrationcheckpoints').deleteOne({_id:'0006_probe'});
    });
    await t.test('Core BSON disk backup/restore retains IDs, indexes, receipts and acknowledged drafts', async () => {
      const archive = path.join(evidence,'mongo'); fs.mkdirSync(archive,{recursive:true});
      const catalog = await db.listCollections().toArray();
      const restoredDb = client.db('collegehubs_demo_restore_'+suffix);
      for(const collection of catalog) {
        const rows=await db.collection(collection.name).find().toArray();
        const file=path.join(archive,collection.name+'.bson');
        fs.writeFileSync(file,Buffer.concat(rows.map(row=>BSON.serialize(row))));
        const indexes=await db.collection(collection.name).indexes();
        fs.writeFileSync(path.join(archive,collection.name+'.metadata.json'),BSON.EJSON.stringify({options:collection.options,indexes},{relaxed:false}));
        const meta=BSON.EJSON.parse(fs.readFileSync(path.join(archive,collection.name+'.metadata.json'),'utf8'));
        await restoredDb.createCollection(collection.name,meta.options);
        const bytes=fs.readFileSync(file), docs=[];
        for(let offset=0;offset<bytes.length;){const size=bytes.readInt32LE(offset);docs.push(BSON.deserialize(bytes.subarray(offset,offset+size)));offset+=size;}
        if(docs.length) await restoredDb.collection(collection.name).insertMany(docs);
        for(const {v,ns,...index} of meta.indexes.filter(i=>i.name!=='_id_')) await restoredDb.collection(collection.name).createIndexes([index]);
        assert.deepEqual(await restoredDb.collection(collection.name).indexes(),indexes);
      }
      assert.deepEqual(await mongoSnapshot(restoredDb),migratedMongo);
      await mongoose.disconnect(); await mongoose.connect(repl.getUri(restoredDb.databaseName));
      assert.equal((await study.snapshot(claims[0],room._id)).room._id,room._id);
      assert.deepEqual(await aura.summary(auraOwner),beforeAura);
      await coreRunner.migrate(client,restoredDb.databaseName,{dryRun:false});
      assert.deepEqual(await mongoSnapshot(restoredDb),migratedMongo);
      const inventories=[];
      for(const [i,database] of [db,restoredDb].entries()) {
        const output=path.join(evidence,`core-inventory-${suffix}-${i}.json`);
        execFileSync(process.execPath,['scripts/migration-inventory.cjs','--service=core','--database='+database.databaseName,'--output='+output],{env:{...process.env,MONGO_URI:repl.getUri(database.databaseName)},stdio:'pipe'});
        const {database:target,...data}=JSON.parse(fs.readFileSync(output));inventories.push(data);
      }
      assert.deepEqual(inventories[0],inventories[1]);
      report.snapshots.core=beforeMongo;
      report.invariants={coreReceiptTotal:beforeAura.total,corePending:beforeAura.pending,studyRoomId:room._id,draftHash:digest('const preserved = 42;'),learnAttemptId:attempt,learnPending:1,learnSettled:1,learnCompletions:1};
    });
    report.checks=['SQL/Mongo dry-run read-only','concurrent serialized apply','checksum rejection','repeat no changes','failed transaction/batch rollback','bounded cursor resume','disk restore equality','old learner/Study reads','SQL immutable triggers','Mongo indexes'];
    fs.writeFileSync(path.join(evidence,'restore-summary.json'),JSON.stringify(report,null,2));
  } finally {
    await mongoose.disconnect(); if(client)await client.close(); if(repl)await repl.stop();
    for(const pool of pools)await pool.end();
    for(const name of names)await admin.query(`DROP DATABASE IF EXISTS "${name}"`).catch(()=>{});
    await admin.end();
  }
});
