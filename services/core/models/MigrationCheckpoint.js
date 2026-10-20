const mongoose = require('mongoose');
// Operator-only metadata. Not initialized by ordinary application startup.
const schema = new mongoose.Schema({
  _id: String, checksum: String, cursor: { type: mongoose.Schema.Types.Mixed, default: null },
  done: Boolean, batches: Number, updatedAt: Date, revision: Number,
}, { collection: 'migrationcheckpoints', versionKey: false });
module.exports = mongoose.model('MigrationCheckpoint', schema);
