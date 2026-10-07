# Interview P8.1 contracts and operation

The independent `services/interview` Express/Mongo service and shared `/interview` React feature adapt the supplied AI-Interviewer resume flow. The original MIT notice remains in [THIRD_PARTY](../THIRD_PARTY.md). There is no active local User/auth/admin/jobs/socket/provider stack. Generation, answer execution, evaluation and Aura delivery are P8.2, not enabled endpoints.

## Identity and persistence

Use Node 24.12+ and the names in `services/interview/.env.example`. Default port is 5002. `INTERVIEW_MONGO_URI` must address a separate Interview database on a replica set (transactions are required), with an Interview-only database user. Core, Arcade and Interview can share Atlas infrastructure, never credentials or collection ownership. Hosting permissions still require P11 verification.

A3 bootstrap exchanges a Core one-use grant server-to-server with an Interview-only service credential. Core issues audience `collegehubs-interview`; the service pins its public RSA key/key ID and issuer, validates signed subject/Hub/membership/theme, then persists only an opaque session handle's hash. Browser cookies are HttpOnly, SameSite=Lax, Path=/api/interview and Secure on HTTPS. Sessions are bounded by the signed 15-minute expiry; callback state lasts 60 seconds and is one-use. Mutations require exact APP_ORIGIN plus the session CSRF token. A Core bearer alone cannot authorize module resources. Core is needed to establish a new session; an existing valid session can operate during a Core outage.

Every Resume/Interview/Session belongs to a string Core userId and hubId. Both scope every owned query and reference check. Foreign IDs yield 404. No local User population, passwords, browser selectors, public resume URL or cross-service database import is retained. Query parameters are rejected. Resume/draft lists and retained records are bounded at 20 per owner. Draft creation and deletion use transactions; attaching a resume increments its reference fence, so a concurrent deletion cannot leave a usable stale attachment.

## Resume API

| Request | Result |
|---|---|
| GET `/api/interview/resumes` | Up to 20 owned metadata rows; no extracted text |
| POST `/api/interview/resumes/upload` | One multipart `file`, application/pdf and .pdf filename; 201 metadata, or 200 for an identical owned content hash |
| GET `/api/interview/resumes/:id` | Owned metadata and bounded private extractedText |
| DELETE `/api/interview/resumes/:id` | Physically removes original extracted text; detaches owned draft references atomically |

No extra multipart fields, DOC/DOCX, cloud upload, file URL, download, chunk-preview, AI reparse or default-resume hook is accepted. Public metadata explicitly says `storageDriver: "none"`, `fileUrl: null`. The PDF buffer exists only for the request/parser and is not written to disk, Mongo or a storage provider. Mongo retains extracted text until owned deletion. Do not log request bodies, extracted text or credentials; private browser state is cleared on account change/unmount.

The ordinary gateway body cap remains 64 KiB. Only exact POST `/api/interview/resumes/upload` streams a bounded 5 MiB + 64 KiB multipart envelope; the service separately enforces the **5 MiB file** cap before parsing. The gateway forwards only Interview cookies and CSRF/Origin, never Core bearer/service credentials. Size excess is 413. The Vite adapter drains a rejected body without destroying the browser response socket.

## Parser bounds and errors

Maintained PDF.js 6.4.299 extracts local text in an isolated worker thread; Multer 2.4.0 uses memory storage. MIME, extension, PDF header and byte size are checked. Limits: one admitted upload/parser per process, 30 upload attempts per IP/minute, 20 pages, 8,000 retained characters, eight-second parser wall timeout, worker V8 heap limits of 128 MiB old/16 MiB young with a 4 MiB stack. Direct HTTP requests have a 20-second request timeout and 10-second header timeout; the gateway has a 15-second ordinary upstream deadline. Cancellation/timeouts terminate the worker before releasing its parse permit. Worker diagnostic output is discarded.

These are application/V8 bounds, **not an OS sandbox or a guarantee that native/external memory stays within the V8 heap limit**. No OCR, JavaScript evaluation, remote document fetch or AI parsing is used. Images without readable text are rejected. Password-protected/encrypted PDFs, malformed bytes, empty text, excess pages, timeout and busy admission return explicit errors; rejected uploads create no row. Text can be truncated; both metadata and UI disclose it. No scanned-image success is simulated.

Implementation follows [Mozilla's Node example](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs), [permissions API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentProxy.html) and [Multer's documented memory/limit controls](https://expressjs.com/en/resources/middleware/multer/). Optional PDF.js canvas native artifacts still require Linux-host acceptance under P11.

## Draft boundary and deletion

Owned draft CRUD exists at `/api/interview/interviews[/:id]`. POST accepts exactly `resumeId`, nonempty jobTitle (160 characters), nonempty jobDescription (5,000 characters) and 1–5 unique allowed questionTypes. Question count is fixed at five for the later phase. No generation/session endpoint is active. Deletion clears draft resumeId and sets resumeUnavailable; a deleted ID cannot attach again. Completed report/answer rows are retained and their schema has no copied resume-text field. P8.2 must resolve a live owned resume before starting new generation and preserve this boundary.

## Run, deploy and safe stop

`npm run dev:interview` starts independently. Root dev starts it only when ENABLE_MODULES includes interview. Configure server-only INTERVIEW_API_ORIGIN in the shared gateway; no second frontend exists. `/health/live` is process liveness; `/health/ready` and `/api/interview/health/ready` ping only Interview's own Mongo connection, returning 503 when unavailable. No Core/provider health dependency is added.

`node deploy/build.mjs interview` installs only Interview/contracts production dependencies and checks source syntax. **Run from the repository root of the intended build checkout**, not by invoking a copied script from another current directory. `render.yaml` defines the fourth Free web service; no paid worker, disk, cron or API is needed. Provision service `interview` with the existing Core stdin provisioning script and `eventTypes: []`; it has no reward scope. See [deployment instructions](../deploy/README.md).

Safe stop: remove interview from Core ENABLE_MODULES to stop new handoffs, disable the gateway origin or stop the Interview process. Preserve its database and Core credentials/ledger. Existing signed sessions remain valid until expiry if the service stays up. A rollback must retain compatible models; do not reset retained resumes/reports or fall back to legacy auth/Cloudinary. The Hub/Core/Learn/Arcade remain independently operable.
