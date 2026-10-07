module.exports = connection => {
  const { Schema } = require('mongoose');
  const schema = new Schema({ _id: String, count: { type: Number, default: 0 }, leaseToken: { type: String, default: null }, leaseUntil: { type: Date, default: () => new Date(0) }, cooldownUntil: { type: Date, default: () => new Date(0) }, expiresAt: Date }, { strict: 'throw' });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return connection.model('AiControl', schema);
};
