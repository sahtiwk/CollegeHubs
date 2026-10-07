const fail = (status, code, message = code) => Object.assign(new Error(message), { status, code });
const exact = (body, keys) => body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === keys.length && keys.every(key => Object.hasOwn(body,key));
module.exports = { fail, exact };
