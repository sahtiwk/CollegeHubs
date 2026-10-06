const { Schema } = require('mongoose');
module.exports = connection => {
  const schema = new Schema({ sessionHash: { type: String, required: true, unique: true }, user_id: { type: String, required: true }, hub_id: { type: String, required: true }, principal: { type: Object, required: true }, theme: { type: Object, required: true }, expires_at: { type: Date, required: true }, csrfHash: { type: String, required: true } }, { strict: 'throw' });
  schema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
  const state = new Schema({ stateHash: { type: String, required: true, unique: true }, expiresAt: { type: Date, required: true } });
  state.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return { ModuleSession: connection.model('ModuleSession', schema), Handoff: connection.model('Handoff', state) };
};
