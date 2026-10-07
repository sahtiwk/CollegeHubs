// Source Session model adapted without local User, audio storage or copied resume text.
module.exports = connection => {
  const { Schema } = require('mongoose');
  const schema = new Schema({ userId: { type: String, required: true, immutable: true }, hubId: { type: String, required: true, immutable: true }, interviewId: { type: Schema.Types.ObjectId, required: true }, status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' }, answers: [{ questionId: String, answer: { type: String, maxlength: 8000 }, skipped: Boolean }], report: { summary: { type: String, maxlength: 8000 }, score: { type: Number, min: 0, max: 100 } } }, { timestamps: true, strict: 'throw' });
  schema.index({ userId: 1, hubId: 1, interviewId: 1 });
  return connection.model('Session', schema);
};
