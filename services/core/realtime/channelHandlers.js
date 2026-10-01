const messages = require('../services/messageService');
const room = (hubId, channelId) => `hub:${hubId}:channel:${channelId}`;
function channelHandlers(socket, publish) {
  let busy = 0;
  for (const event of ['channel:join', 'channel:sync', 'message:send']) socket.on(event, async (input, ack) => {
    if (typeof ack !== 'function') return;
    if (busy) return ack({ error: { code: 'BUSY', message: 'Wait for the pending operation', retryable: true } });
    busy++;
    try {
      messages.fields(input, event === 'message:send' ? ['channelId', 'clientMessageId', 'type', 'text'] : ['channelId', 'afterSeq', 'beforeSeq', 'limit']);
      const { channelId, ...body } = input;
      const context = await messages.authorize(socket.data.claims);
      await messages.channelFor(context, channelId);
      if (event === 'channel:join') {
        // One active channel per client; caller-provided room names are never accepted.
        for (const old of socket.rooms) if (old.startsWith('hub:')) await socket.leave(old);
        await socket.join(room(context.hubId, channelId));
      }
      if (event === 'message:send') {
        const result = await messages.send(socket.data.claims, channelId, body);
        ack(result); if (!result.duplicate) void publish(result.message);
      } else ack(await messages.history(socket.data.claims, channelId, body));
    } catch (error) {
      ack(messages.errorDto(error));
      if ([401, 403].includes(error.status)) socket.disconnect(true);
    } finally { busy--; }
  });
}
module.exports = { channelHandlers, room };
