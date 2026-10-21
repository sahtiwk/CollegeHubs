const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  hubId: mongoose.Schema.Types.ObjectId, channelId: mongoose.Schema.Types.ObjectId, membershipVersion: Number,
  generation: String, nonceHash: String, nonceExpiresAt: Date,
  state: { type: String, enum: ['pending', 'connected', 'disconnected', 'reconnect', 'error'], required: true },
  tokenCipher: { type: String, select: false }, calendarId: String,
  lastSyncedAt: Date, nextAttemptAt: Date, leaseUntil: Date, leaseOwner: String,
  scanAfter: mongoose.Schema.Types.ObjectId, lastError: String,
}, { strict: 'throw', timestamps: true });
schema.index({ state: 1, nextAttemptAt: 1, leaseUntil: 1 });
module.exports = mongoose.model('GoogleCalendarConnection', schema);
