// Anchor DB time to a monotonic browser clock; wall-clock skew cannot extend a room.
export function clockSample(serverNow, sentAt, receivedAt) {
  const serverMs = Date.parse(serverNow);
  if (!Number.isFinite(serverMs) || receivedAt < sentAt) throw new Error('Invalid server clock');
  return { serverMs: serverMs + (receivedAt - sentAt) / 2, receivedAt };
}
export function remainingMs(endAt, sample, now) {
  if (!sample || !endAt) return null;
  return Math.max(0, Date.parse(endAt) - sample.serverMs - Math.max(0, now - sample.receivedAt));
}
export function validateSnapshot(data, roomId, hubId) {
  if (data?.room?._id !== roomId || data.room.hubId !== hubId || !data.ownSolution) throw new Error('Room scope mismatch');
  return data;
}
