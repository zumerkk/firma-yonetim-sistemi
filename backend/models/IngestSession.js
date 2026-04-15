const mongoose = require('mongoose');

const ingestSessionSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: String, required: true },
    confidence: { type: Number, default: 0 },
    mapping: { type: Object, default: {} },
    // Raw parsed preview (keep small)
    headers: { type: [String], default: [] },
    sampleRows: { type: [Object], default: [] },
    // For commit
    payloadRows: { type: [Object], default: [] }, // optional: store all rows (careful with size)
    expiresAt: { type: Date, default: () => new Date(Date.now() + 6 * 60 * 60 * 1000) }, // 6h
  },
  { timestamps: true, collection: 'ingest_sessions' }
);

ingestSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IngestSession', ingestSessionSchema);

