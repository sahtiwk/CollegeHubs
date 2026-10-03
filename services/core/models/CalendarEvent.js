const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true }, seedKey: { type: String, required: true, immutable: true },
  channelIds: { type: [mongoose.Schema.Types.ObjectId], required: true }, title: { type: String, required: true, maxlength: 200 },
  startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true },
  provenance: { type: String, enum: ['seeded_fixture'], required: true }, seededAt: { type: Date, required: true },
}, { strict: 'throw' });
schema.index({ hubId: 1, seedKey: 1 }, { unique: true });
schema.index({ hubId: 1, channelIds: 1, startsAt: 1, _id: 1 });
module.exports = mongoose.model('CalendarEvent', schema);
