// Persisted pages, never a broadcast's highest sequence, advance the recovery cursor.
export function mergeHistory(previous, page, hubId, channelId, cursor) {
  if (page.hubId !== hubId || page.channelId !== channelId || !Array.isArray(page.items)) throw new Error('History binding mismatch');
  const byId = new Map(previous.map(row => [row._id, row]));
  const bySeq = new Map(previous.map(row => [row.seq, row._id]));
  let next = cursor;
  for (const row of page.items) {
    if (row.hubId !== hubId || row.channelId !== channelId || !Number.isSafeInteger(row.seq) || row.seq < 1 || (bySeq.has(row.seq) && bySeq.get(row.seq) !== row._id) || (byId.has(row._id) && byId.get(row._id).seq !== row.seq)) throw new Error('Invalid history message');
    if (next !== null && row.seq > next + 1) throw new Error('History gap; retry recovery');
    next = Math.max(next ?? row.seq, row.seq);
    byId.set(row._id, row); bySeq.set(row.seq, row._id);
  }
  return { items: [...byId.values()].sort((a, b) => a.seq - b.seq).slice(-500), cursor: next ?? 0 };
}
