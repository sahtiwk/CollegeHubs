const study = require('../services/studyService');
const roomName = (hubId, roomId) => `hub:${hubId}:study:${roomId}`;
function studyHandlers(socket, publish) {
  let busy = false;
  const operations = { 'study:join': ['join', []], 'study:start': ['start', []], 'study:cancel': ['cancel', []], 'study:draft:save': ['save', ['expectedRevision', 'revision', 'source', 'language']], 'study:submit': ['submit', ['draftRevision']], 'study:sync': ['snapshot', []] };
  for (const [event, [method, allowed]] of Object.entries(operations)) socket.on(event, async (input, ack) => {
    if (typeof ack !== 'function') return;
    if (busy) return ack({ error: { code: 'BUSY', message: 'Wait for the pending study operation', retryable: true } });
    busy = true;
    try {
      study.fields(input, ['roomId', ...allowed]);
      const { roomId, ...body } = input;
      const result = await study[method](socket.data.claims, roomId, body);
      if (['study:join', 'study:sync'].includes(event)) {
        for (const name of socket.rooms) if (name.includes(':study:')) await socket.leave(name);
        await socket.join(roomName(result.room.hubId, roomId));
      }
      ack(result); // Every mutation has committed before the private acknowledgment.
      if (!['study:sync', 'study:draft:save'].includes(event)) void publish({ roomId, hubId: result.room.hubId });
    } catch (error) {
      ack(study.errorDto(error));
      if ([401, 403].includes(error.status) && !['STUDY_HOST_REQUIRED'].includes(error.code)) socket.disconnect(true);
    } finally { busy = false; }
  });
  socket.on('time:sync', async (input, ack) => {
    if (typeof ack !== 'function') return;
    try { study.fields(input, []); ack(await study.time(socket.data.claims)); }
    catch (error) { ack(study.errorDto(error)); }
  });
}
module.exports = { studyHandlers, roomName };
