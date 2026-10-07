const { Worker } = require('node:worker_threads');
const { join } = require('node:path');
const { fail } = require('../errors');
const MAX_BYTES = 5 * 1024 * 1024;
function inspectFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) throw fail(400, 'PDF_REQUIRED');
  if (file.buffer.length > MAX_BYTES || file.size > MAX_BYTES) throw fail(413, 'PDF_TOO_LARGE');
  if (file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname || '') || !/^%PDF-\d\.\d/.test(file.buffer.subarray(0, 8).toString('ascii'))) throw fail(400, 'PDF_INVALID');
  const originalName = file.originalname.replace(/[\\/\x00-\x1f\x7f]/g, '_').slice(-200);
  return { originalName, fileName: originalName, fileSize: file.buffer.length, mimeType: 'application/pdf' };
}
function parsePdf(buffer, { timeoutMs = 8000, workerPath = join(__dirname, 'pdfWorker.mjs'), signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(fail(503, 'UPLOAD_CANCELLED'));
    const worker = new Worker(workerPath, { workerData: new Uint8Array(buffer), resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 }, stdout: true, stderr: true });
    worker.stdout.resume(); worker.stderr.resume();
    let finished = false;
    const finish = (error, value) => { if (finished) return; finished = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); void worker.terminate().finally(() => error ? reject(error) : resolve(value)); };
    const abort = () => finish(fail(503, 'UPLOAD_CANCELLED'));
    const timer = setTimeout(() => finish(fail(503, 'PDF_PARSE_TIMEOUT')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    worker.once('message', value => value.error ? finish(fail(400, value.error)) : finish(null, value));
    worker.once('error', () => finish(fail(400, 'PDF_INVALID')));
    worker.once('exit', () => { if (!finished) finish(fail(400, 'PDF_INVALID')); });
  });
}
module.exports = { inspectFile, parsePdf, MAX_BYTES };
