// Adapted from AI-Interviewer (MIT): Core subject + Hub replace local User authority.
module.exports = connection => {
  const { Schema } = require('mongoose');
  const schema = new Schema({ userId: { type: String, required: true, immutable: true }, hubId: { type: String, required: true, immutable: true }, originalName: String, fileName: String, fileSize: Number, mimeType: { type: String, enum: ['application/pdf'] }, storageDriver: { type: String, enum: ['none'], default: 'none' }, fileUrl: { type: String, default: null, validate: v => v === null }, contentHash: { type: String, required: true, select: false }, extractedText: { type: String, required: true, maxlength: 8000, select: false }, pageCount: Number, textTruncated: Boolean, parseStatus: { type: String, enum: ['parsed'], default: 'parsed' }, referenceVersion: { type: Number, default: 0 } }, { timestamps: true, strict: 'throw' });
  schema.index({ userId: 1, hubId: 1, contentHash: 1 }, { unique: true });
  return connection.model('Resume', schema);
};
