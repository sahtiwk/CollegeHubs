# TP9.2 — Interview experience and private text lifecycle

Implemented 2026-10-20. This phase keeps saved REST practice authoritative.

## Experience

The campus editorial layout now covers resumes, preparation, answers, reports and
history: oversized headings, paper surfaces, a blue accent, a writing area with a
desktop progress column, and a single-column mobile layout. Shared session state,
preparation, answering, results and history are separate components.

Answers advance only after the save acknowledgement. Reload recovers saved
answers. Unsaved changes are labelled and browser unload warns before losing them.
Private answer text is not placed in local storage. Failed evaluation remains
distinct from a genuine zero score and from ungraded self-review.

## Pagination

Owned GET `/api/interview/sessions` and `/api/interview/interviews` return
`{items,nextCursor}`. Follow with `?cursor=<nextCursor>`; pages contain at most 20
rows sorted by `createdAt DESC, _id DESC`. The tie-breaker prevents duplicates
when timestamps match. The opaque cursor carries only the timestamp and ID;
every query independently enforces the authenticated user and Hub.
Unknown parameters, malformed cursors and oversized cursors reject. Other routes
retain the existing query prohibition. “Load older sessions/setups” appends pages;
refresh returns to the latest page.

The 20-interview limit now applies to unfinished setups, so completed practice
does not exhaust the creation allowance. Resume storage remains limited to 20.
New compound indexes include the cursor tie-breaker. Existing indexes/data are
not removed; no destructive migration or history backfill is required.

## Resume retention

New resume text expires **30 days after upload**, recorded as `expiresAt` and
shown in metadata and the UI. Legacy rows with a creation timestamp use that
timestamp plus 30 days, without extending expiry when read. Rows with no usable
age are unavailable and eligible for cleanup.

Expired resumes are immediately excluded from lists and cannot be attached or
used in new generation, regardless of cleanup scheduling. Expired detail reads
remove the row and return `410 RESUME_EXPIRED`. Generation checks expiry both
before provider work and before committing questions.

A bounded worker checks up to 100 expired resumes on startup and hourly while
the service is awake. Upload also cleans expired rows for its owner before quota
and content-hash checks. Each deletion transaction removes extracted text,
detaches references and invalidates active generation. Concurrent cleanup is
idempotent; no TTL deletion bypasses reference cleanup.

Sleeping hosts and large backlogs can delay physical erasure; access expiry still
applies immediately. Operators should monitor the generic “cleanup deferred”
message and database availability. Backups follow their own retention policy.
Deleting a resume cannot recall text already sent to a provider; it prevents the
in-flight response from becoming saved questions. The original PDF is never
stored. Reports, saved answers and immutable reward identities remain; reports
contain no raw resume copy. This is resume-text retention, not automatic deletion
of saved practice history.

## Optional transport decision

**Streaming: optional-off. Voice: optional-off.** `/capabilities` advertises both
as false. No streaming route, microphone request or speech API is introduced.
Current adapters consume bounded complete JSON and the gateway accepts JSON
responses; no authenticated provider stream or deployed free-host time budget
has been demonstrated. TP9.2's conditional stream work is therefore deferred
until that evidence exists. The gateway MIME/Origin/CSRF controls are unchanged.
Stream-specific reconnect/isolation acceptance is not claimed.

The replacement acceptance is ordinary REST save/reload, provider-disabled
self-review, saved report reads and immutable graded completion. Optional streams
must still establish owned question/answer scope, request/sequence IDs,
disconnect cancellation, output/concurrency limits and deployment evidence before
they can be enabled. They may never finalize reports or award Aura.

## Verification

- **173 regression checks passed**, zero failures/skips. This includes the
  existing graded Interview, ownership, lease, retry and immutable-receipt checks.
  One old synthetic fixture had no creation timestamp; it was updated to describe
  a current, unexpired resume before the final fresh run.
- **Two focused lifecycle checks passed**: malformed cursor rejection; 46 owned
  history rows with identical timestamps; foreign-Hub exclusion; deletion and
  expiry while generation is pending; legacy expiry cleanup; preservation of a
  zero-score report and its reward identity.
- Web TypeScript and production build passed. The existing shader bundle-size
  warning remains.
- Chrome desktop/mobile acceptance passed with inference disabled: 25 history
  entries reached through the gateway, malformed cursor rejection, saved-answer
  recovery after reload, ungraded completion, real PDF upload and expiry display,
  expired detail returning 410 with physical text removal, genuine zero-score
  report display and anonymous history rejection. Keyboard focus and 390-pixel
  layout were checked; no horizontal overflow.
- Visually reviewed screenshots: [desktop history](screenshots/tp9.2-history-desktop.png),
  [mobile answer](screenshots/tp9.2-answer-mobile.png),
  [mobile report](screenshots/tp9.2-report-mobile.png) and
  [mobile resumes](screenshots/tp9.2-resumes-mobile.png).

Only disposable local databases and synthetic resumes were used. No production
deployment, live provider request or retained user-data cleanup was performed.
