# Interview contracts and operation

TP9.1 adds [fixed inference adapters and provider-free practice](tp9.1-evidence.md).
Curated sessions save an ungraded self-review without a score or reward event.
Local generated sessions are also ungraded. Existing graded sessions retain their
provider/model binding and saved reports remain readable with inference disabled.

The independent `services/interview` Express/Mongo service and shared `/interview` React feature adapt the supplied AI-Interviewer resume flow. The original MIT notice remains in [THIRD_PARTY](../THIRD_PARTY.md). P8.2 adds five-question Groq practice, durable answers, immutable reports and Core receipts. There is no active local User/auth/admin/jobs/socket stack.

See [TP9.2 lifecycle, pagination and optional transport decisions](tp9.2-evidence.md). Streaming and voice remain explicitly off.

## Identity and persistence

Use Node 24.12+ and the names in `services/interview/.env`. Default port is 5002. `INTERVIEW_MONGO_URI` must address a separate Interview database on a replica set (transactions are required), with an Interview-only database user. Core, Arcade and Interview can share Atlas infrastructure, never credentials or collection ownership. Hosting permissions still require P11 verification.

A3 bootstrap exchanges a Core one-use grant server-to-server with an Interview-only service credential. Core issues audience `collegehubs-interview`; the service pins its public RSA key/key ID and issuer, validates signed subject/Hub/membership/theme, then persists only an opaque session handle's hash. Browser cookies are HttpOnly, SameSite=Lax, Path=/api/interview and Secure on HTTPS. Sessions are bounded by the signed 15-minute expiry; callback state lasts 60 seconds and is one-use. Mutations require exact APP_ORIGIN plus the session CSRF token. A Core bearer alone cannot authorize module resources. Core is needed to establish a new session; an existing valid session can operate during a Core outage.

Every Resume/Interview/Session belongs to a string Core userId and hubId. Both scope every owned query and reference check. Foreign IDs yield 404. No local User population, passwords, browser selectors, public resume URL or cross-service database import is retained. Only scoped session/setup list cursors are accepted as query parameters. Resume storage and unfinished setups are limited to 20 per owner; completed history uses 20-row cursor pages. Draft creation and deletion use transactions; attaching a resume increments its reference fence, so a concurrent deletion cannot leave a usable stale attachment.

## Resume API

| Request | Result |
|---|---|
| GET `/api/interview/resumes` | Up to 20 owned metadata rows; no extracted text |
| POST `/api/interview/resumes/upload` | One multipart `file`, application/pdf and .pdf filename; 201 metadata, or 200 for an identical owned content hash |
| GET `/api/interview/resumes/:id` | Owned metadata and bounded private extractedText |
| DELETE `/api/interview/resumes/:id` | Physically removes original extracted text; detaches owned interview references and interrupts in-flight generation atomically |

No extra multipart fields, DOC/DOCX, cloud upload, file URL, download, chunk-preview, AI reparse or default-resume hook is accepted. Public metadata explicitly says `storageDriver: "none"`, `fileUrl: null`. The PDF buffer exists only for the request/parser and is not written to disk, Mongo or a storage provider. Mongo retains extracted text until owned deletion or the 30-day expiry cleanup. Expiry blocks reads and generation immediately, even while the host sleeps. Do not log request bodies, extracted text or credentials; private browser state is cleared on account change/unmount.

The ordinary gateway body cap remains 64 KiB. Only exact POST `/api/interview/resumes/upload` streams a bounded 5 MiB + 64 KiB multipart envelope; the service separately enforces the **5 MiB file** cap before parsing. The gateway forwards only Interview cookies and CSRF/Origin, never Core bearer/service credentials. Size excess is 413. The Vite adapter drains a rejected body without destroying the browser response socket.

## Parser bounds and errors

Maintained PDF.js 6.4.299 extracts local text in an isolated worker thread; Multer 2.4.0 uses memory storage. MIME, extension, PDF header and byte size are checked. Limits: one admitted upload/parser per process, 30 upload attempts per IP/minute, 20 pages, 8,000 retained characters, eight-second parser wall timeout, worker V8 heap limits of 128 MiB old/16 MiB young with a 4 MiB stack. Direct HTTP requests have a 20-second request timeout and 10-second header timeout; the gateway has a 15-second ordinary upstream deadline. Cancellation/timeouts terminate the worker before releasing its parse permit. Worker diagnostic output is discarded.

These are application/V8 bounds, **not an OS sandbox or a guarantee that native/external memory stays within the V8 heap limit**. No OCR, JavaScript evaluation, remote document fetch or AI parsing is used. Images without readable text are rejected. Password-protected/encrypted PDFs, malformed bytes, empty text, excess pages, timeout and busy admission return explicit errors; rejected uploads create no row. Text can be truncated; both metadata and UI disclose it. No scanned-image success is simulated.

Implementation follows [Mozilla's Node example](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs), [permissions API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentProxy.html) and [Multer's documented memory/limit controls](https://expressjs.com/en/resources/middleware/multer/). Optional PDF.js canvas native artifacts still require Linux-host acceptance under P11.

## Draft boundary and deletion

Owned draft CRUD exists at `/api/interview/interviews[/:id]`. POST requires resumeId, jobTitle (160 characters), jobDescription (5,000 characters) and 1–5 unique questionTypes. Optional company (160), experienceLevel (entry/mid/senior) and UUID clientRequestId support preferences and idempotent setup. Changed content under the same request ID conflicts. At most 20 unfinished setups are retained; completed setups remain reachable through cursor pagination. Only unused setups without frozen questions or sessions can be deleted.

Deleting a resume clears all owned references and invalidates its generation lease in the same transaction. Generation resolves and fences a live owned resume both before the provider request and before committing questions. Existing frozen questions and completed reports remain available; report data contains no copied resume-text field.

## Five-question practice API

| Request (prefix /api/interview) | Result |
|---|---|
| GET /capabilities | AI availability and configured provider/model, no secret |
| POST /interviews/:id/generate with {} | Exactly five unique schema-validated questions, frozen once; active lease returns 202 |
| POST /sessions with {interviewId} | One session per owned interview; retry returns the same session |
| GET /sessions or /sessions/:id | Owned history or canonical saved answers/report; result reads trigger due delivery |
| PUT /sessions/:id/answers/:questionId | Exact {revision,answer,skipped}; next revision only, identical retry accepted; 2,000 characters; explicit skip requires empty answer |
| POST /sessions/:id/complete with {} | All five slots must be saved; leased evaluation or explicit evaluation_failed; completed retry returns the immutable report |

Questions honor selected categories in round-robin order. Internal expected keywords never appear in browser DTOs. Provider calls happen outside transactions. Mongo time and 30-second CAS leases serialize generation/evaluation across processes; attempts survive restarts. An expired lease is recoverable from the owned detail read. Save acknowledgements precede UI advance. Five scores (integers 0–10) always remain in the denominator: round(100 × sum / 50). Skipped answers are zero. Invalid/missing/duplicate question IDs, oversized feedback, malformed JSON, truncation, timeouts and 429 create no report or event. Failures retain inputs for retry after cooldown.

Report, completed state and event commit atomically. Duration freezes when evaluation is requested, excluding provider latency. Completion uses the current signed module session's JTI and must occur before that credential expires. Web renews the handoff with at least 35 seconds remaining before a long operation. Reports label AI feedback as heuristic practice, never an employment decision.

## Groq Free configuration and limits

Set server-only GROQ_API_KEY, GROQ_FREE_CONFIRMED=true only for a verified Free account, and GROQ_MODEL=openai/gpt-oss-20b. INTERVIEW_AI_ENABLED=false is the safe stop for new provider calls. There is no paid/provider/model fallback. The endpoint is fixed to Groq HTTPS; redirects are rejected. Resume/JD/answer context is delimited as untrusted JSON, with strict JSON-schema output followed by independent application validation. Do not submit sensitive real resumes for demos.

The transport deadline is 10 seconds, response cap 64 KiB and completion cap 2,500 tokens. Persisted admission allows one provider operation across the module, 3 generation attempts/hour/owner+Hub, 6 evaluation attempts/hour/owner+Hub and 30 total operations/UTC day. Failed attempts consume allowance. Local failures wait 30 seconds; provider 429 respects bounded Retry-After and a shared cooldown. Provider account/token limits can still reject requests; the app does not bypass them.

Model/free access and strict structured output support were checked 2026-10-07 using [Groq models](https://console.groq.com/docs/models), [structured outputs](https://console.groq.com/docs/structured-outputs) and [rate limits](https://console.groq.com/docs/rate-limits). The official Free table listed 30 RPM, 1,000 RPD, 8,000 TPM and 200,000 TPD for this model. Account limits can differ/change. A key alone cannot prove billing status: Free is an operator assertion; never enable a paid upgrade for this deployment.

## Durable Aura delivery

Event ID is `interview:<sessionId>:completed:v1`; its saved facts never change on retry. The independent service sends only the A5 event contract to Core, using its own service credential scoped to interview.completed. Core activates prospective interview-five-v1 rules and remains the only award authority: at least three answered questions and 60 seconds qualify for 20 + floor(rawScore/10), at most 30, twice per India day, source cap 60. Shared Core DailyActivity/streak accounting is reused.

Delivery uses a 15-second lease, bounded four-second Core request, durable pending state and exponential 30-second to one-hour backoff. A report survives Core outages and lost acknowledgements. Owned result reads trigger due delivery; refresh again to observe acknowledgement. Sleeping services make no background delivery promise. Set a separate 43-character base64url INTERVIEW_RECONCILE_KEY to enable direct service-only GET /api/interview/integration/pending-results (20 rows) and POST /api/interview/integration/reconcile with {} (up to three due rows). Send Bearer credential directly to the Interview origin with no Origin/Sec-Fetch-Site headers. The shared browser gateway intentionally strips this credential. No cron/worker is required; no browser can force retry timing.

## Run, deploy and safe stop

`npm run dev:interview` starts independently. Root dev starts it only when ENABLE_MODULES includes interview. Configure server-only INTERVIEW_API_ORIGIN in the shared gateway; no second frontend exists. `/health/live` is process liveness; `/health/ready` and `/api/interview/health/ready` ping only Interview's own Mongo connection, returning 503 when unavailable. No Core/provider health dependency is added.

`node deploy/build.mjs interview` installs only Interview/contracts production dependencies and checks source syntax. **Run from the repository root of the intended build checkout**, not by invoking a copied script from another current directory. `render.yaml` defines the fourth Free web service; no paid worker, disk, cron or API is needed. Provision service `interview` with the existing Core stdin provisioning script and `eventTypes: ["interview.completed"]`; existing credentials need this scope. See [deployment instructions](../deploy/README.md).

Safe stop: disable INTERVIEW_AI_ENABLED to retain reports and saved answers while AI is unavailable. To stop new sessions, remove interview from Core ENABLE_MODULES to stop new handoffs, disable the gateway origin or stop the Interview process. Preserve its database and Core credentials/ledger. Existing signed sessions remain valid until expiry if the service stays up. A rollback must retain compatible models; do not reset retained resumes/reports or fall back to legacy auth/Cloudinary. The Hub/Core/Learn/Arcade remain independently operable.
