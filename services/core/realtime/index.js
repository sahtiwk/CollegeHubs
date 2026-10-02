const study = require('../services/studyService');
const { studyHandlers, roomName } = require('./studyHandlers');
const { Server } = require('socket.io');
const messages = require('../services/messageService');
const { channelHandlers, room } = require('./channelHandlers');
function attachRealtime(server, app) {
  const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
  const io = new Server(server, { maxHttpBufferSize: 65536, cors: { origin: origins }, allowRequest: (req, done) => done(null, origins.includes(req.headers.origin)) });
  const core = io.of('/core');
  core.use(async (socket, next) => {
    try { socket.data.claims = await messages.authenticateSocket(socket.handshake.auth?.token); next(); }
    catch (error) { const denial = new Error('Sign-in or membership unavailable'); denial.data = messages.errorDto(error); next(denial); }
  });
  async function publish(message, event = 'message:created') {
    // Revalidate recipients as well as senders, so a revoked idle member receives no new data.
    const recipients = await core.in(room(message.hubId, message.channelId)).fetchSockets();
    await Promise.allSettled(recipients.map(async socket => {
      try {
        const context = await messages.authorize(socket.data.claims);
        await messages.channelFor(context, message.channelId);
        socket.emit(event, message);
      } catch { socket.disconnect(true); }
    }));
  }
  const publishSafely = (message, event) => publish(message, event).catch(() => {}); // Persisted history repairs lost broadcasts.
  app.locals.publishMessage = publishSafely;
  async function publishStudy({ hubId, roomId }) {
    const recipients = await core.in(roomName(hubId, roomId)).fetchSockets();
    await Promise.allSettled(recipients.map(async socket => {
      try {
        const result = await study.snapshot(socket.data.claims, roomId);
        // Tailored per recipient: never broadcast somebody else's draft.
        socket.emit(result.room.status === 'review' ? 'study:closed' : 'study:state', result);
      } catch { await socket.leave(roomName(hubId, roomId)); }
    }));
  }
  const publishStudySafely = event => publishStudy(event).catch(() => {});
  app.locals.publishStudy = publishStudySafely;
  core.on('connection', socket => {
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.claims.exp * 1000 - Date.now()));
    socket.once('disconnect', () => clearTimeout(expiry));
    channelHandlers(socket, publishSafely);
    studyHandlers(socket, publishStudySafely);
  });
  return io;
}
module.exports = { attachRealtime };
