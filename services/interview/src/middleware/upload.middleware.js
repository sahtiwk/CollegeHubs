// Source upload middleware adapted: memory only; no Cloudinary/DOC/DOCX storage.
const multer = require('multer');
const { fail } = require('../errors');
const { MAX_BYTES } = require('../services/fileStorage');
module.exports = function uploadMiddleware() {
  let uploading = false;
  const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 0, parts: 2 }, fileFilter: (_req, file, done) => done(file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname) ? null : fail(400, 'PDF_INVALID'), true) }).single('file');
  return (req, res, next) => {
    if (uploading) { res.set('Retry-After', '5'); return next(fail(503, 'UPLOAD_BUSY')); }
    uploading = true;
    // The permit remains held until parsing has terminated, even if the browser disconnects.
    let parsing = false, finished = false;
    const release = () => { finished = true; if (!parsing) uploading = false; };
    res.once('finish', release); res.once('close', release);
    req.beginParsing = () => { parsing = true; };
    req.endParsing = () => { parsing = false; if (finished) uploading = false; };
    receive(req, res, error => next(error ? fail(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, error.code === 'LIMIT_FILE_SIZE' ? 'PDF_TOO_LARGE' : error.status ? error.code : 'INVALID_UPLOAD') : undefined));
  };
};
