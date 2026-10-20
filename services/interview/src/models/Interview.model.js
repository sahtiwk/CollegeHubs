// Source Interview model adapted to scoped drafts and leased, frozen questions.
module.exports = connection => {
  const { Schema } = require('mongoose');
  const schema = new Schema({ userId: { type: String, required: true, immutable: true }, hubId: { type: String, required: true, immutable: true }, resumeId: { type: Schema.Types.ObjectId, default: null }, resumeUnavailable: { type: Boolean, default: false }, jobTitle: { type: String, maxlength: 160 }, jobDescription: { type: String, maxlength: 5000 }, company: { type: String, maxlength: 160 }, experienceLevel: { type: String, enum: ['entry', 'mid', 'senior'] }, questionTypes: [{ type: String, enum: ['technical', 'behavioral', 'situational', 'system-design', 'coding'] }], questionCount: { type: Number, enum: [5], default: 5 }, status: { type: String, enum: ['draft', 'completed'], default: 'draft' } }, { timestamps: true, strict: 'throw' });
  schema.add({ learnTopics: { type: [new Schema({ domain: String, nodeId: String, label: { type: String, maxlength: 120 }, version: String, reason: String, asOf: Date }, { _id: false, strict: 'throw' })], default: [] }, topicLease: { type: String, default: null }, topicLeaseUntil: { type: Date, default: () => new Date(0) } });
  schema.add({ providerId: {type:String,default:'groq'}, providerModel: {type:String,default:'openai/gpt-oss-20b'}, practiceMode: {type:Boolean,default:false} });
  schema.index({ userId: 1, hubId: 1, createdAt: -1, _id: -1 });
  schema.path('status').enumValues.push('generating', 'generation_failed', 'ready', 'in_progress');
  schema.add({ clientRequestId: String, creationHash: { type: String, select: false }, questions: { type: [require('./question')], default: [] }, generationLease: { type: String, default: null }, generationLeaseUntil: { type: Date, default: () => new Date(0) }, generationAttempts: { type: Number, default: 0 }, lastError: { type: String, default: null }, retryAt: { type: Date, default: () => new Date(0) } });
  schema.index({ userId: 1, hubId: 1, clientRequestId: 1 }, { unique: true, partialFilterExpression: { clientRequestId: { $type: 'string' } } });
  return connection.model('Interview', schema);
};
