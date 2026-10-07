import { parentPort, workerData } from 'node:worker_threads';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
let task;
try {
  task = getDocument({ data: workerData, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, stopAtErrors: true, verbosity: 0 });
  const doc = await task.promise;
  if (await doc.getPermissions() !== null) throw Object.assign(new Error(), { code: 'PDF_ENCRYPTED' });
  if (doc.numPages > 20) throw Object.assign(new Error(), { code: 'PDF_PAGE_LIMIT' });
  let text = '';
  for (let i = 1; i <= doc.numPages && text.length <= 8000; i++) {
    const page = await doc.getPage(i), content = await page.getTextContent();
    for (const item of content.items) {
      if (typeof item.str === 'string') text += item.str.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') + (item.hasEOL ? '\n' : ' ');
      if (text.length > 8000) break;
    }
    page.cleanup();
  }
  text = text.trim();
  if (!text) throw Object.assign(new Error(), { code: 'PDF_EMPTY' });
  parentPort.postMessage({ text: text.slice(0, 8000), pageCount: doc.numPages, truncated: text.length > 8000 });
} catch (error) { parentPort.postMessage({ error: error.name === 'PasswordException' ? 'PDF_ENCRYPTED' : error.code || 'PDF_INVALID' }); }
finally { await task?.destroy(); }
