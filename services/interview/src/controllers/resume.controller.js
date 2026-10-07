// AI-Interviewer resume controller (MIT) adapted to private extracted text and Core+Hub scope.
const { createHash } = require('node:crypto');
const { fail } = require('../errors');
const { inspectFile, parsePdf } = require('../services/fileStorage');
const metadata = row => ({ id: String(row._id), originalName: row.originalName, fileSize: row.fileSize, mimeType: row.mimeType, storageDriver: 'none', fileUrl: null, parseStatus: row.parseStatus, pageCount: row.pageCount, textTruncated: row.textTruncated, createdAt: row.createdAt });
module.exports = function resumeController(connection, models, owned) {
  return {
    list: async (req, res) => res.json({ items: (await models.Resume.find(req.scope).sort({ createdAt: -1 }).limit(20).lean()).map(metadata) }),
    upload: async (req, res) => {
      const file = inspectFile(req.file), contentHash = createHash('sha256').update(req.file.buffer).digest('hex');
      try {
        const existing = await models.Resume.findOne({ ...req.scope, contentHash });
        if (existing) return res.json({ resume: metadata(existing) });
        if (await models.Resume.countDocuments(req.scope) >= 20) throw fail(409, 'RESUME_LIMIT');
        const controller = new AbortController(); req.once('aborted', () => controller.abort()); res.once('close', () => { if (!res.writableEnded) controller.abort(); });
        if (req.aborted || res.destroyed) controller.abort();
        req.beginParsing();
        let parsed; try { parsed = await parsePdf(req.file.buffer, { signal: controller.signal }); } finally { req.endParsing(); }
        if (controller.signal.aborted) throw fail(503, 'UPLOAD_CANCELLED');
        const row = await models.Resume.create({ ...req.scope, ...file, contentHash, extractedText: parsed.text, pageCount: parsed.pageCount, textTruncated: parsed.truncated });
        res.status(201).json({ resume: metadata(row) });
      } finally { req.file.buffer = null; }
    },
    get: async (req, res) => { const row = await owned(models.Resume, req, null, '+extractedText'); res.json({ resume: { ...metadata(row), extractedText: row.extractedText } }); },
    delete: async (req, res) => { await connection.transaction(async session => { const row = await owned(models.Resume, req, session); await models.Resume.deleteOne({ ...req.scope, _id: row._id }, { session }); await models.Interview.updateMany({ ...req.scope, resumeId: row._id, status: 'draft' }, { $set: { resumeId: null, resumeUnavailable: true } }, { session }); }); res.json({ deleted: true }); },
  };
};
