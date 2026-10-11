// Pure bounded DTO validation shared by the two services; never accepts prompt text from the browser.
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function validateTopics(items, now = Date.now()) {
  if (!Array.isArray(items) || items.length > 5 || new Set(items.map(x=>x?.nodeId)).size !== items.length) throw Error('Invalid topics');
  return items.map(item => {
    if (!item || Object.keys(item).sort().join(',') !== 'asOf,label,nodeId,reason,version' || !uuid.test(item.nodeId) ||
        typeof item.label !== 'string' || !item.label.trim() || item.label.length>120 || /[\x00-\x1f\x7f<>]/.test(item.label) ||
        typeof item.version !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(item.version) || item.reason !== 'Last assessed ratio below 0.6' ||
        typeof item.asOf !== 'string' || !Number.isFinite(Date.parse(item.asOf)) || Date.parse(item.asOf)>now || now-Date.parse(item.asOf)>30*86400000) throw Error('Invalid topic');
    return { nodeId:item.nodeId,label:item.label,version:item.version,reason:item.reason,asOf:item.asOf };
  });
}
module.exports = { validateTopics };
