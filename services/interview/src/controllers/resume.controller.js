// AI-Interviewer resume controller (MIT) adapted to private extracted text and Core+Hub scope.
const { createHash } = require('node:crypto');
const { fail } = require('../errors');
const { inspectFile, parsePdf } = require('../services/fileStorage');
const {expiresAt,liveResume,resumeRetention}=require('../services/resumeRetention');
const metadata = row => ({ id: String(row._id), expiresAt: expiresAt(row), originalName: row.originalName, fileSize: row.fileSize, mimeType: row.mimeType, storageDriver: 'none', fileUrl: null, parseStatus: row.parseStatus, pageCount: row.pageCount, textTruncated: row.textTruncated, createdAt: row.createdAt });
module.exports = function resumeController(connection, models, owned) {
  const retention=resumeRetention(connection,models);
  return {
    list: async (req, res) => res.json({ items: (await models.Resume.find({...req.scope,...liveResume()}).sort({ createdAt: -1 }).limit(20).lean()).map(metadata) }),
    upload: async (req, res) => {
      const file = inspectFile(req.file), contentHash = createHash('sha256').update(req.file.buffer).digest('hex');
      try {
        await retention.cleanup(req.scope);
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
    get: async (req, res) => { const row = await owned(models.Resume, req, null, '+extractedText'); if(+expiresAt(row)<=Date.now()){await retention.remove(req.scope,row._id,new Date(),true);throw fail(410,'RESUME_EXPIRED');} res.json({ resume: { ...metadata(row), extractedText: row.extractedText } }); },
    delete: async (req, res) => { const row=await owned(models.Resume,req,null); await retention.remove(req.scope,row._id,new Date()); res.json({deleted:true}); },
  };
};
