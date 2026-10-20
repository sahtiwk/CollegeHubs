// Source Session model adapted to revisioned durable answers and one immutable report/event.
module.exports = connection => {
  const { Schema } = require('mongoose');
  const nested = { _id: false, versionKey: false, strict: 'throw' };
  const answer = new Schema({ questionId: String, answer: { type: String, maxlength: 2000, default: '' }, skipped: { type: Boolean, default: false }, revision: { type: Number, default: 0 }, savedAt: Date }, nested);
  const feedback = new Schema({ questionId: String, score: { type: Number, min: 0, max: 10 }, feedback: { type: String, maxlength: 1000 } }, nested);
  const report = new Schema({ summary: { type: String, maxlength: 1500 }, score: { type: Number, min: 0, max: 100 }, answers: [feedback], answeredCount: Number, rubricVersion: String, providerModel: String, providerId:String, ungraded:Boolean, evaluatedAt: Date }, nested);
  const schema = new Schema({
    userId: { type: String, required: true, immutable: true }, hubId: { type: String, required: true, immutable: true }, interviewId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    jobTitle: { type: String, default: 'Interview' }, questions: { type: [require('./question')], default: [] },
    status: { type: String, enum: ['active', 'evaluating', 'evaluation_failed', 'completed', 'abandoned'], default: 'active' }, answers: [answer],
    report: { type: report, default: null }, completedAt: Date, serverDurationSeconds: Number,
    evaluationLease: { type: String, default: null }, evaluationLeaseUntil: { type: Date, default: () => new Date(0) }, evaluationAttempts: { type: Number, default: 0 }, lastError: { type: String, default: null }, retryAt: { type: Date, default: () => new Date(0) },
    event: { type: Object, default: null }, receipt: { type: Object, default: null }, deliveryStatus: { type: String, enum: ['none','pending','settled','attention'], default: 'none' },
    nextAttemptAt: { type: Date, default: () => new Date(0) }, deliveryLeaseId: { type: String, default: null }, deliveryLeaseUntil: { type: Date, default: () => new Date(0) }, attempts: { type: Number, default: 0 }, lastDeliveryError: { type: String, default: null },
  }, { timestamps: true, strict: 'throw', optimisticConcurrency: true });
  schema.add({ providerId: {type:String,default:'groq'}, providerModel: {type:String,default:'openai/gpt-oss-20b'}, practiceMode: {type:Boolean,default:false} });
  schema.index({ userId: 1, hubId: 1, interviewId: 1 }, { unique: true });
  schema.index({ userId: 1, hubId: 1, createdAt: -1, _id: -1 });
  schema.index({ deliveryStatus: 1, nextAttemptAt: 1, _id: 1 });
  return connection.model('Session', schema);
};
