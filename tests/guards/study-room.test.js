const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
process.env.JWT_SECRET = 'g4-disposable-study-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.ENABLE_MODULES = '';
mongoose.set('autoCreate', false).set('autoIndex', false);

test('G4: durable rooms, deadline fences, privacy and recovery', async t => {
  const study = require('../../services/core/services/studyService');
  const deadlines = require('../../services/core/services/studyDeadlineService');
  const { MongoMemoryReplSet } = require('mongodb-memory-server');
  const repl = process.env.GUARD_MONGO_URI ? null : await MongoMemoryReplSet.create({ binary: { version: '7.0.14' }, replSet: { count: 1 } });
  const uri = process.env.GUARD_MONGO_URI || repl.getUri();
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(uri).hostname));
  await mongoose.connect(uri, { dbName: 'collegehubs_demo_g4_' + randomUUID().replaceAll('-', '') });
  const names = ['College', 'Hub', 'Channel', 'User', 'Problem', 'StudyRoom', 'StudySolution'];
  const m = Object.fromEntries(names.map(name => [name, require('../../services/core/models/' + name)]));
  try {
    for (const model of Object.values(m)) { await model.createCollection(); await model.createIndexes(); }
    const college = await m.College.create({ name: 'Study fixture', slug: 'study-fixture', status: 'active', timezone: 'Asia/Kolkata', domains: [{ normalizedDomain: 'study.example.test', verifiedAt: new Date(), evidenceRef: 'synthetic' }] });
    const hub = await require('../../services/core/services/hubProvisioning').ensureHubForCollege(college.id);
    const channel = await m.Channel.findOne({ hubId: hub.id });
    const users = [];
    for (let i = 0; i < 10; i++) users.push(await m.User.create({ username: 'study-' + i, email: i + '@study.example.test', googleSubject: 'synthetic-' + i, hubId: hub.id, membershipStatus: 'active', membershipVersion: 1 }));
    const auth = require('../../services/core/config/auth');
    const claims = users.map(user => auth.verifyToken(auth.generateToken(user)));
    const problem = (await study.problems(claims[0])).items[0];
    const create = () => study.create(claims[0], { channelId: channel.id, problemId: problem._id, durationMinutes: 5, clientRoomId: randomUUID() });
    const active = async () => { const room = await create(); await study.join(claims[1], room.room._id, {}); return study.start(claims[0], room.room._id, {}); };
    await t.test('waiting-only joins, host start, immutable deadline and creation replay', async () => {
      const body = { channelId: channel.id, problemId: problem._id, durationMinutes: 5, clientRoomId: randomUUID() };
      const [one, two] = await Promise.all([study.create(claims[0], body), study.create(claims[0], body)]);
      assert.equal(one.room._id, two.room._id);
      await assert.rejects(study.create(claims[0], { ...body, durationMinutes: 6 }), { status: 409 });
      process.env.STUDY_ROOMS_ENABLED = 'false';
      try {
        assert.equal((await study.create(claims[0], body)).room._id, one.room._id);
        await assert.rejects(study.create(claims[0], { ...body, clientRoomId: randomUUID() }), { code: 'STUDY_CREATION_DISABLED' });
      } finally { delete process.env.STUDY_ROOMS_ENABLED; }
      const id = one.room._id;
      await assert.rejects(study.start(claims[0], id, {}), { status: 409 });
      await study.join(claims[1], id, {});
      await assert.rejects(study.start(claims[1], id, {}), { status: 403 });
      const starts = await Promise.all([study.start(claims[0], id, {}), study.start(claims[0], id, {})]);
      assert.equal(starts[0].room.endAt, starts[1].room.endAt);
      assert.equal(new Date(starts[0].room.endAt) - new Date(starts[0].room.startAt), 300000);
      await assert.rejects(study.join(claims[2], id, {}), { status: 409 });
      await assert.rejects(study.start(claims[0], id, { endAt: new Date() }), { status: 400 });
    });
    await t.test('revision CAS, private drafts, early freeze, atomic single close', async () => {
      const { room } = await active(), id = room._id;
      const input = { expectedRevision: 0, revision: 1, source: '<script>literal</script>\n  x', language: 'javascript' };
      const saved = await study.save(claims[1], id, input);
      assert.equal(saved.ownSolution.revision, 1);
      assert.equal((await study.save(claims[1], id, input)).ownSolution.source, input.source);
      await assert.rejects(study.save(claims[1], id, { ...input, source: 'changed' }), { status: 409 });
      const host = await study.snapshot(claims[0], id);
      assert.ok(!JSON.stringify(host).includes('literal'));
      await assert.rejects(study.submissions(claims[0], id), { status: 409 });
      await study.submit(claims[1], id, { draftRevision: 1 });
      await study.submit(claims[1], id, { draftRevision: 1 });
      await assert.rejects(study.save(claims[1], id, { ...input, expectedRevision: 1, revision: 2 }), { status: 409 });
      // Fixture-only deadline acceleration; no API can edit it.
      await m.StudyRoom.updateOne({ _id: id }, { $set: { endAt: new Date(0) } });
      await Promise.all([deadlines.scan(), deadlines.scan(), study.closeDue(id)]);
      const closed = await study.snapshot(claims[0], id);
      assert.equal(closed.room.status, 'review');
      assert.equal(closed.room.closeCount, 1);
      const solutions = await study.submissions(claims[0], id);
      assert.equal(solutions.items.length, 2);
      assert.equal(solutions.items.find(row => row.userId === users[1].id).source, input.source);
      assert.equal(solutions.items.find(row => row.userId === users[0].id).outcome, 'empty');
      await assert.rejects(study.save(claims[0], id, input), { status: 409 });
      assert.equal(await m.StudySolution.countDocuments({ roomId: id }), 2);
    });
    await t.test('concurrent joins enforce eight slots; foreign/missing-Hub and nonparticipant reads fail', async () => {
      const { room } = await create();
      const replies = await Promise.allSettled(claims.slice(1).map(c => study.join(c, room._id, {})));
      assert.equal(replies.filter(r => r.status === 'fulfilled').length, 7);
      assert.ok(replies.filter(r => r.status === 'rejected').every(r => r.reason.code === 'STUDY_FULL'));
      assert.equal((await m.StudyRoom.findById(room._id)).participantIds.length, 8);
      const foreignCollege = await m.College.create({ name: 'Other', slug: 'other-study', status: 'active', timezone: 'Asia/Kolkata', domains: [{ normalizedDomain: 'other-study.example.test', verifiedAt: new Date(), evidenceRef: 'synthetic' }] });
      const foreignHub = await require('../../services/core/services/hubProvisioning').ensureHubForCollege(foreignCollege.id);
      const foreignUser = await m.User.create({ username: 'foreign-study', email: 'foreign@other-study.example.test', googleSubject: 'foreign-study', hubId: foreignHub.id, membershipStatus: 'active', membershipVersion: 1 });
      const foreign = auth.verifyToken(auth.generateToken(foreignUser));
      for (const method of ['snapshot', 'join', 'start', 'submissions']) await assert.rejects(study[method](foreign, room._id, {}), { status: 404 });
      const own = await active();
      await assert.rejects(study.snapshot(claims[2], own.room._id), { status: 404 });
      await m.StudyRoom.collection.updateOne({ _id: new mongoose.Types.ObjectId(own.room._id) }, { $unset: { hubId: '' } });
      await assert.rejects(study.snapshot(claims[0], own.room._id), { status: 404 });
    });
    await t.test('two tabs cannot overwrite an acknowledged revision; validation and skewed Core clock', async () => {
      const { room } = await active(), id = room._id;
      const invalid = { expectedRevision: 0, revision: 1, source: 'x', language: 'python' };
      await assert.rejects(study.save(claims[0], id, { ...invalid, source: 'x'.repeat(32769) }), { status: 413 });
      await assert.rejects(study.save(claims[0], id, { ...invalid, language: 'bash' }), { status: 400 });
      await assert.rejects(study.save(claims[0], id, { ...invalid, revision: 3 }), { status: 400 });
      const now = Date.now;
      let saved;
      try {
        Date.now = () => now() + 120000;
        const results = await Promise.allSettled(['tab-a', 'tab-b'].map(source => study.save(claims[0], id, { ...invalid, source })));
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
        saved = results.find(r => r.status === 'fulfilled').value.ownSolution;
        assert.ok(Math.abs(new Date(saved.savedAt).getTime() - now()) < 5000, 'Saved time is DB time, not Core clock');
      } finally { Date.now = now; }
      assert.equal((await study.snapshot(claims[0], id)).ownSolution.source, saved.source);
      await assert.rejects(study.submit(claims[0], id, { draftRevision: 0 }), { status: 409 });
    });
    await t.test('save stalled across the deadline rolls back; competing close seals the earlier ack', async () => {
      const { room } = await active(), id = room._id;
      const first = { expectedRevision: 0, revision: 1, source: 'acknowledged-before-race', language: 'python' };
      await study.save(claims[1], id, first);
      await new Promise(resolve => setTimeout(resolve, 1050));
      await m.StudyRoom.updateOne({ _id: id }, [{ $set: { endAt: { $add: ['$$NOW', 1000] } } }]);
      const original = m.StudySolution.updateOne;
      let reached;
      const reachedWrite = new Promise(resolve => { reached = resolve; });
      m.StudySolution.updateOne = async function (...args) {
        const result = await original.apply(this, args);
        if (args[1]?.[0]?.$set?.source?.$literal === 'late-unacknowledged') { reached(); await new Promise(resolve => setTimeout(resolve, 1250)); }
        return result;
      };
      try {
        const saving = assert.rejects(study.save(claims[1], id, { ...first, expectedRevision: 1, revision: 2, source: 'late-unacknowledged' }), { code: 'STUDY_CLOSED' });
        await Promise.race([reachedWrite, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Draft did not reach the race boundary')), 5000); timer.unref(); })]);
        await new Promise(resolve => setTimeout(resolve, 1050));
        await Promise.all([saving, study.closeDue(id), study.closeDue(id)]);
      } finally { m.StudySolution.updateOne = original; }
      const sealed = await study.submissions(claims[0], id);
      assert.equal(sealed.room.closeCount, 1);
      assert.equal(sealed.items.find(row => row.userId === users[1].id).source, first.source);
      assert.equal((await study.save(claims[1], id, first)).ownSolution.revision, 1, 'Identical lost ack replay is safe after close');
    });
    await t.test('failed close rolls back the room marker and every solution before retry', async () => {
      const { room } = await active(), id = room._id;
      await m.StudyRoom.updateOne({ _id: id }, { $set: { endAt: new Date(0) } });
      const original = m.StudySolution.prototype.save;
      let writes = 0;
      m.StudySolution.prototype.save = async function (...args) {
        const result = await original.apply(this, args);
        if (++writes === 1) throw new Error('injected close interruption');
        return result;
      };
      try { await assert.rejects(study.closeDue(id), /injected close interruption/); }
      finally { m.StudySolution.prototype.save = original; }
      assert.equal((await m.StudyRoom.findById(id)).status, 'active');
      assert.equal(await m.StudySolution.countDocuments({ roomId: id, sealedAt: { $ne: null } }), 0);
      await study.closeDue(id);
      assert.equal((await study.snapshot(claims[0], id)).room.closeCount, 1);
    });
    await t.test('socket privacy, process-kill recovery, startup and one-second due scanner', async () => {
      const { spawn } = require('node:child_process');
      const { io } = require('socket.io-client');
      const { once } = require('node:events');
      const { resolve } = require('node:path');
      let child, hostSocket, peerSocket, outsider, foreignSocket;
      const launch = async () => {
        child = spawn(process.execPath, ['-e', "require('./services/core/index').start().then(s=>process.send({port:s.address().port})).catch(()=>process.exit(1))"], { cwd: resolve(__dirname, '../..'), env: { ...process.env, PORT: '0', MONGO_URI: mongoose.connection.client.s.url.replace(/\/[^/?]*(\?|$)/, '/' + mongoose.connection.name + '$1') }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
        const result = await Promise.race([once(child, 'message').then(([msg]) => msg), once(child, 'exit').then(() => { throw new Error('Core child failed before ready'); }), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Core start timed out')), 15000); timer.unref(); })]);
        return 'http://127.0.0.1:' + result.port;
      };
      const kill = async () => { if (child?.exitCode === null && !child.killed) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; } };
      const socket = async (base, user) => {
        const client = io(base + '/core', { transports: ['websocket'], reconnection: false, auth: { token: auth.generateToken(user) }, extraHeaders: { Origin: process.env.ALLOWED_ORIGINS } });
        await Promise.race([once(client, 'connect'), once(client, 'connect_error').then(([error]) => { throw error; })]);
        return client;
      };
      const ack = (client, event, input) => client.timeout(5000).emitWithAck(event, input);
      const { room } = await active(), id = room._id;
      try {
        let base = await launch();
        hostSocket = await socket(base, users[0]); peerSocket = await socket(base, users[1]); outsider = await socket(base, users[2]);
        foreignSocket = await socket(base, await m.User.findOne({ username: 'foreign-study' }));
        assert.equal((await ack(foreignSocket, 'study:join', { roomId: id })).error.code, 'STUDY_NOT_FOUND');
        foreignSocket.close();
        const hostStates = []; hostSocket.on('study:state', state => hostStates.push(state));
        assert.equal((await ack(outsider, 'study:sync', { roomId: id })).error.code, 'STUDY_NOT_FOUND');
        await ack(hostSocket, 'study:sync', { roomId: id });
        await ack(peerSocket, 'study:join', { roomId: id });
        const source = 'durable-peer-secret';
        const saved = await ack(peerSocket, 'study:draft:save', { roomId: id, expectedRevision: 0, revision: 1, source, language: 'python' });
        assert.equal(saved.ownSolution.source, source);
        await ack(peerSocket, 'study:submit', { roomId: id, draftRevision: 1 });
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.ok(hostStates.length > 0); assert.ok(!JSON.stringify(hostStates).includes(source));
        assert.ok((await ack(hostSocket, 'time:sync', {})).serverNow);
        await kill(); hostSocket.close(); peerSocket.close(); outsider.close();
        base = await launch();
        peerSocket = await socket(base, users[1]);
        const restored = await ack(peerSocket, 'study:sync', { roomId: id });
        assert.equal(restored.ownSolution.source, source); assert.ok(restored.ownSolution.submittedAt);
        await kill(); peerSocket.close();
        await m.StudyRoom.updateOne({ _id: id }, { $set: { endAt: new Date(0) } });
        base = await launch();
        const recovered = await m.StudyRoom.findById(id);
        assert.equal(recovered.status, 'review', 'Startup closes overdue rooms before listening'); assert.equal(recovered.closeCount, 1);
        peerSocket = await socket(base, users[1]);
        assert.equal((await ack(peerSocket, 'study:sync', { roomId: id })).ownSolution.source, source);
        const next = await active();
        await ack(peerSocket, 'study:sync', { roomId: next.room._id });
        const closedEvent = once(peerSocket, 'study:closed');
        await m.StudyRoom.updateOne({ _id: next.room._id }, { $set: { endAt: new Date(0) } });
        const [closed] = await Promise.race([closedEvent, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Due scan failed')), 4000); timer.unref(); })]);
        assert.equal(closed.room.status, 'review'); assert.equal(closed.room.closeCount, 1);
      } finally { hostSocket?.close(); peerSocket?.close(); outsider?.close(); foreignSocket?.close(); await kill(); }
    });
  } finally { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); await repl?.stop(); }
});
