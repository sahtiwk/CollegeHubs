const languages = Object.freeze(['plaintext', 'javascript', 'typescript', 'python', 'json', 'html', 'css', 'java', 'cpp', 'sql']);
const types = Object.freeze(['text', 'code', 'resource', 'question', 'answer']);
function invalid(message, status = 400) { throw Object.assign(new Error(message), { status, code: status === 413 ? 'MESSAGE_TOO_LARGE' : 'INVALID_MESSAGE' }); }
function bounded(value, limit, label, required = true) {
  if (typeof value !== 'string' || (required && !value.trim())) invalid(label + ' is required');
  if (new TextEncoder().encode(value).length > limit) invalid(label + ' is too long', 413);
  return value;
}
function resourceUrl(value) {
  bounded(value, 2048, 'HTTPS URL');
  if (/[\u0000-\u0020\u007f]/.test(value)) invalid('Use an HTTPS URL without spaces');
  let url;
  try { url = new URL(value); } catch { invalid('Use a valid HTTPS URL'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) invalid('Use an HTTPS URL without embedded credentials');
  return url.href;
}
function normalizeMessage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !types.includes(input.type)) invalid('Choose a supported message type');
  const keys = ['clientMessageId', 'type', 'text', ...(input.type === 'code' ? ['language'] : input.type === 'resource' ? ['title', 'url'] : input.type === 'answer' ? ['questionId'] : [])];
  if (Object.keys(input).some(key => !keys.includes(key)) || typeof input.clientMessageId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(input.clientMessageId)) invalid('Unexpected fields or invalid send ID');
  const result = { type: input.type, text: bounded(input.text, input.type === 'code' ? 32768 : 8192, input.type === 'code' ? 'Code' : 'Text', input.type !== 'resource') };
  // Preserve code byte-for-byte; ordinary prose keeps the P4.1 trimming convention.
  if (input.type !== 'code') result.text = result.text.trim();
  if (input.type === 'code') {
    if (!languages.includes(input.language)) invalid('Choose a supported code language');
    result.language = input.language;
  }
  if (input.type === 'resource') { result.title = bounded(input.title, 160, 'Resource title').trim(); result.url = resourceUrl(input.url); }
  if (input.type === 'answer') {
    if (typeof input.questionId !== 'string' || !/^[a-f0-9]{24}$/.test(input.questionId)) invalid('Choose a question in this channel');
    result.questionId = input.questionId;
  }
  return result;
}
module.exports = { languages, types, normalizeMessage, resourceUrl };
