# TP1.1 — Email possession and retained membership

Implemented locally on 19 October 2026. This proves possession of an email
mailbox and matches an exact, active registry domain with recorded developer
confirmation evidence. It does **not** certify enrollment or institutional
endorsement. No hosted account, mailbox or retained production database was changed.

## Current delivery capability

Production mail is **unavailable**. No permitted SMTP/provider configuration was
supplied, and this phase does not invent one or silently auto-verify accounts.
The default adapter returns an explicit unavailable state. The production
cutover command refuses apply while mail is unavailable. Before a hosted rollout,
a maintainer must implement/configure a permitted delivery transport, confirm its
free-use terms and sender authorization, and test delivery to a real permitted
mailbox. Real mailbox delivery has **not** been tested.

`VERIFICATION_MAIL_MODE=capture` works only with `NODE_ENV=test` or `development`,
a loopback Mongo URI, and exclusively loopback allowed browser origins. It writes
a private `.local/verification-mail/<userId>.json` file containing the recipient,
challenge ID and raw token. This is an explicit local fixture mailbox, not email
sent to a person. `.local` is ignored and must never be served or published.
POSIX permission hints do not replace Windows ACLs; use a private workspace.
Capture is unavailable in production even if its flag is accidentally set.
Core's normal entry point binds only to 127.0.0.1 when capture is enabled.
No token is returned in an HTTP response or written to application logs.

## HTTP contracts

Both verification endpoints require the signed-in account's Core bearer token.
They select the email from that account, never a caller-supplied recipient. There
is no anonymous email lookup or arbitrary-recipient delivery endpoint.

- `POST /api/auth/register`: existing username/email/password input; returns
  `201 {token,user,assignment}`. Known and unknown domains initially have
  `hubId:null`, `membershipStatus:"unassigned"`, `membershipVerified:false`,
  `verificationMethod:"none"`, version 0. The token has onboarding scope.
  Registration saves the account independently of delivery; request mail separately.
- `POST /api/auth/verification/request` with `{}`: `202` returns `status:"pending"`,
  `delivery:"local-capture"`, `retryAfterSeconds:60`, `expiresInSeconds:1800` in the
  local fixture. It supersedes any prior challenge. Resend uses this same endpoint.
  `429` means cooldown/hour budget; `503` means unavailable or failed delivery;
  `409` means possession is already verified; disabled accounts receive `403`.
  There is no raw challenge/token in this response.
- `POST /api/auth/verification/consume` with `{challengeId,token}`: `200 {token,user}`
  replaces the client's token after successful proof/assignment. Challenges are
  account/email/purpose bound and one-use. Wrong, expired, exhausted, superseded
  or replayed proof returns generic `400 VERIFICATION_INVALID`; stale access tokens
  may instead be rejected with `401` before reaching consumption. No GET consumes
  a link, so mail scanners cannot finalize membership.
- `POST /api/me/assignment/retry` with `{}`: still available after proof if a
  registry domain is added later. No proof means `EMAIL_VERIFICATION_REQUIRED`
  and no Hub. Unknown verified domains remain onboarding-only and create no Hub.
- `GET /api/me` and own-account auth responses add `identity`:
  `{emailVerified,verificationRequired,mail:{available,mode},noticeAt,
  legacyAccessUntil,cutoverAt}`. Public profile DTOs exclude these fields.
  Notice/cutover values are ISO dates or null. Existing member fields remain.

A verified assigned member has `membershipStatus:"active"`, `membershipVerified:true`,
`verificationMethod:"email"` (or authoritative Google proof), a preserved/assigned
Hub ID and an incremented membershipVersion. A retained pending member retains
its historical Hub ID but receives only onboarding authority. `hubs:[]` from
`GET /api/me` is the authoritative absence of current access. Stored IDs never
constitute authorization by themselves.

The current membership screen distinguishes unverified email, unavailable delivery,
and an unconfigured verified domain. It shows the legacy deadline during the
notice window. The guided verification/resend screen, alternate email and explicit
Google linking are implemented in **TP1.2**, documented below. Current Google ID-token/authoritative-email checks
are preserved; an untrusted Google email cannot create membership or erase a
separate mailbox proof. No same-email merging or self-service transfer is added.

## Atomicity and abuse budgets

`VerificationChallenge` stores only SHA-256 token hashes, an allowlisted purpose
(membership, extended by TP1.2 with email-change), account/email binding, 30-minute expiry, five-attempt budget, delivery
state, consumption and supersession timestamps. Tokens contain 32 random bytes.
Expiry is checked by the application; TTL deletion happens only after an additional
day and is not an authorization mechanism.

Requests serialize through a persisted User rate record: at least 60 seconds
between requests and at most five per fixed one-hour account window. Concurrent
requests cannot exceed the budget. Delivery occurs after transaction commit;
only successfully delivered challenges can be consumed. A failed send marks the
challenge failed and does not verify the account; requests still count against
the budget. A process crash before marking sent leaves a non-consumable pending
challenge: wait for cooldown and resend. Never automatically retry an ambiguous
send with a new token outside this bounded request path.

Consumption, possession evidence, exact evidenced active-domain lookup, Hub/channel
provisioning and membership assignment share one Mongo transaction. Invalid token
attempts commit their counter; other failures roll back consumption and membership
changes. Concurrent successful consumes cannot assign twice. A disabled Hub or
cross-college transfer fails closed; a later retry can use the still-unconsumed
challenge. Unique college/Hub/channel keys remain authoritative.

## Retained rollout and cutover

Never run a demo reset on retained data. Use the TP0.2
[backup/restore runbook](transition-restore.md) and a replica set.

1. Back up stores and capture IDs, counts, receipts, balances and acknowledged work.
   Keep the old release and configuration. Rehearse restoration on disposable copies.
2. Run Core migration dry-run with the exact confirmed database. It now includes
   user, reverification-required and already-pending cohort counts. Migration
   `0002_membership_notice` records a notice timestamp for retained unproven active
   members and adds email evidence metadata. It does not change IDs, historical
   rows, passwords, reward balances or access status. Existing authoritative Google
   evidence is adopted only when the stored Google subject, verification method
   and email verification timestamp support it.
3. For an announced transition window, explicitly set
   `LEGACY_MEMBERSHIP_NOTICE_UNTIL` to the agreed UTC ISO deadline. Only previously
   assigned domain-claim members get temporary legacy access. New password accounts
   cannot acquire that status. The own-account DTO and membership banner visibly
   label the old policy and deadline. No setting means strict verified access
   immediately; **do not deploy strict defaults to retained users without notice**.
   Run the additive migration before publishing the notice window.
4. Activate and test permitted real mail before hosted cutover. The repository's
   unavailable production adapter intentionally prevents that operational step.
   Arrange a module-session drain: stop new handoffs and wait out the configured
   maximum module access lifetime (at most 15 minutes), or explicitly revoke module
   sessions using the owning services' procedure. Core checks cannot retroactively
   invalidate already-issued independent module sessions. Preserve grants needed
   to reconcile valid pending receipts; do not delete earned records.
5. Once the announced deadline has elapsed, dry-run and apply the cutover command:

   ```text
   npm run membership:cutover -w @collegehubs/core -- --database=CONFIRMED_DATABASE --cutover-at=ANNOUNCED_UTC_TIMESTAMP --dry-run
   npm run membership:cutover -w @collegehubs/core -- --database=CONFIRMED_DATABASE --cutover-at=ANNOUNCED_UTC_TIMESTAMP --apply
   ```

   Set `MONGO_URI` privately for that exact database. The command rejects future
   deadlines and unannounced members. Each apply changes at most 100 users; exit
   code 2 means rerun the same command to finish. It sets `verification-pending`,
   records the original deadline and increments membershipVersion, with a
   transactional `membershipcutovers` audit count. Repeat calls are idempotent.
   Successful mailbox proof racing the cutover is preserved by transaction conflict
   retries. CLI credentials/errors are not logged.
6. At the deadline the runtime rejects legacy authority even if batching is still
   underway. Core bearer/sockets and new module issue/exchange recheck current
   membership. Old tokens lose their Hub binding or version; sign-in returns
   onboarding authority. Re-verification restores the **same** Hub, IDs and records.

The notice window is an explicit temporary compatibility policy, not verified
membership. Do not extend it silently. If delivery fails before enforcement,
postpone the hosted rollout and communicate the decision; no deployment was
performed in this task. Once enforced, a mail outage keeps existing verified
members working while unverified members retain accounts/content without Hub access.

## Rollback and evidence

Schema adoption is additive and leaves baseline migration checksums untouched.
For rollback, stop writes/handoffs, restore a consistent pre-cutover snapshot into
a new isolated database, compare full rows/indexes and ownership/reward inventories,
and only then select the compatible release/configuration. Never decrement live
membership versions or selectively restore users while leaving newer content.
Invalidate/drain Core and module credentials before reopening a restored database;
old versions in the snapshot must not resurrect previously issued credentials.
The local BSON rollback rehearsal compares all captured collections/indexes and
retained account/post/balance/receipt rows. The separate TP0.2 suite also rehearses
SQL and Mongo disk restores, immutable receipts, and acknowledged Study drafts.

Run `npm run test:identity` for disposable Mongo/HTTP verification checks. The
integration fixture now uses captured-mail proof for newly registered accounts;
its explicitly synthetic pre-seeded members carry test-only evidence. Run its
`guards` command for the full independent-service suite. Evidence/logs are under
ignored `.local/tp11*`; they contain only local fixture data, and are not deployment
or real-mail certification. Final verification results are recorded below.

Final local verification, 19 October 2026:

- Combined G1–G4 and identity suite: **112 passed, 0 failed, 0 skipped** (59.17s).
- Migration/restore suite: **9 passed, 0 failed, 0 skipped**.
- Focused identity suite: **4 passed**, including nested delivery/registry/cutover
  and BSON rollback checks. Core startup/restart regression: **9 passed**.
- All five workspace builds passed; final web and Core builds passed after the
  onboarding wording and listener-readiness fixes.
- Browser smoke: mobile password registration stays onboarding-only, no assignment
  shortcut is shown, no horizontal overflow, and a verified synthetic member can
  sign in to its Hub. The mobile notice was visually inspected.

The combined run initially exposed a listener-readiness race after restricting
capture to loopback. Core now waits for the listening event before reporting a
ready server; the restart test and combined suite passed after the fix. Earlier
unit-only attempts lacked the required fixture and were not counted as passes.
Production delivery, mailbox reachability and hosted activation remain untested
and unavailable. No paid service or new dependency was introduced.

## TP1.2 — Guided onboarding and explicit account linking

Implemented locally on 19 October 2026. The verification/account screen is now
`/verify-email`, reachable from the Hub sidebar as **Email & sign-in settings**.
It handles initial proof, resend/rate-limit feedback, pending replacement email,
cancellation, unknown college, disabled membership, failed/expired proof and
unavailable mail. It uses the shared editorial tokens and works on mobile and
keyboard. `/dashboard` is now a protected alias for the existing dashboard;
existing `/` links remain compatible.

### Alternate institutional email

`POST /api/me/email-change {email}` requires a signed-in account. The target must
match an exact active registry domain with evidence. For an existing member it
must belong to the current Hub's college. Conflicts return 409, unconfigured
domains return 400 and unavailable delivery returns 503. This endpoint shares
the persisted resend/hour budget with normal verification.

It records an own-account-only `pendingEmail` and an `email-change` challenge
bound to the account, old login email and proposed email. Login email, Hub,
password, content and rewards stay unchanged until successful proof. Resend via
`POST /api/auth/verification/request {}` targets the pending email when present.
`DELETE /api/me/email-change` clears the pending address and invalidates its
challenges. Neither cancellation nor expiry changes the login email.

The existing consume endpoint accepts both challenge purposes; callers cannot
choose the purpose or target. Consumption rechecks registry, same-college policy
and uniqueness inside the transaction. A late conflict rolls back consumption
and all identity changes. A successful change clears pendingEmail, updates login
email and proof, and increments membershipVersion, invalidating old Core tokens.
The unique email index arbitrates competing requests. Historical user/Hub IDs
and owned records are not moved. Unassigned accounts may verify a configured
institutional replacement and acquire their first membership.

### Explicit Google linking

Reviewed the installed `google-auth-library`, React Google wrapper's nonce support,
and [Google's current server-side verification guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
on 19 October 2026. The library verifies the signature, audience, issuer and expiry;
our boundary additionally validates the subject and verified-email claims. Only
Gmail or a matching hosted-domain claim supplies authoritative mailbox evidence.
A Google account's third-party email does not establish college mailbox possession.

`POST /api/google/link/start {}` requires Core authentication and an exact allowed
Origin. It returns a random nonce valid for five minutes; only its hash and expiry
are stored on the User. Starting again invalidates the prior nonce. The screen
starts this only when the user chooses **Start linking Google**.

`POST /api/google/link {credential,nonce}` requires the same authenticated account
and allowed Origin. The verified Google token must include that nonce, have an
issued-at time within five minutes (30-second future tolerance), and be unexpired.
The transaction checks the nonce and current Core membershipVersion, refuses a
pre-existing subject/link or another account's email, attaches the unique Google
subject, clears the nonce and increments the membershipVersion. It returns a new
Core token and own-user DTO. No email match merges accounts; no other account's
rows are transferred. Linking itself does not mark the college email verified.

The linked Google email is stored separately from the login/college email, so a
later verified institutional replacement does not break the linked Google sign-in.
Existing Google-only rows fall back to their prior email until a change needs to
record that separate binding. Google sign-in uses subject identity; an unexpected
Google-side email change requires review. Another account cannot attach the same
subject because of the existing unique index. No unlink or account-merge endpoint
was introduced.

A provider-credential rejection is `401 GOOGLE_IDENTITY_INVALID` and keeps the
valid Core session alive. A rejected Core bearer still follows normal sign-out
handling. Late verification/linking results cannot overwrite a different Core
session in browser storage. Password reset, refresh rotation and cookie-based
sessions remain TP2 work; the current bearer architecture is not claimed as that
completed session lifecycle.

### Capability and delivery status

`GET /api/auth/capabilities` returns `{google:{available,clientId},mail:{available,mode}}`.
The public client ID is configuration, not a credential. The browser offers Google
only when the backend reports it configured and its client ID matches the browser
build. Missing/mismatched configuration hides the action. With no frontend ID,
the Google provider script is not mounted. Capability failure also hides Google.
Own identity DTOs now include `pendingEmail` and `googleLinked` (boolean); subjects,
nonce hashes, expiry internals and proof tokens remain private.

The local Core/frontend environment files contain matching Google client IDs;
only presence/equality was inspected, without logging their values. No Google
Cloud console, authorized-origin settings or real user sign-in was exercised.
`available` means configured, not a guarantee of provider availability. Browser
Google-enabled tests use an explicitly synthetic SDK/API and backend tests inject
verified-library payloads; neither is real provider certification. Production
mail remains unavailable as described above. No mail was sent externally.

### Verification links and return intent

Captured mail now includes a local `/verify-email#challengeId=…&token=…` link.
The fragment is read into memory and removed with replaceState, including when a
link is opened while already on the page. It is never an API query parameter or
persistent browser-storage item. Users explicitly choose **Confirm email ownership**;
opening a link does not consume it. The same signed-in account must consume it.
If signed out, the Sign in action returns to confirmation; reopen the email if a
full reload discarded the in-memory proof. Challenge
proof remains account-bound even if a link is opened under a different account.

Protected-route entry passes an allowlisted relative path to login. A sessionStorage
record holds only the path, an account binding and a 30-minute expiry. Login/register
switches and rerenders cannot extend that deadline. Success consumes the intent;
unknown colleges retain onboarding until membership is granted. Defaults go to
`/dashboard`. External URLs, protocol-relative forms, percent encoding, whitespace,
backslashes, query strings, fragments, dot segments and nonallowlisted destinations
are rejected. Explicit logout clears intent; expiry may capture the current safe
workspace path for sign-in. This state never grants authorization to a feature.

### Tests and reproduction

`npm run test:identity` includes the challenge/cutover suite, new Google/alternate
email tests and return-intent tests. The integration fixture's `guards` command
includes all three. Its capture files remain private and ignored.

For browser checks, run the disposable integration fixture and set
`PLAYWRIGHT_MODULE` to an installed Playwright module if it is not in root modules:
`node tests/identity/onboarding-browser.cjs`. It checks mobile keyboard registration,
link scrubbing/confirmation, error retry, return intent, unknown-college gating,
replacement-email commit, unavailable delivery and Google-disabled states.

For the isolated Google-enabled UI fixture, run a separate local Vite server with
`VITE_GOOGLE_CLIENT_ID=test-google-client` on 127.0.0.1:5194, then run
`node tests/identity/google-link-browser.cjs`. That test intercepts the SDK and all
API calls with synthetic data; it never signs in to a Google account.

New User fields are optional additive metadata, and existing unique constraints
are retained; no retained-data rewrite or new migration is needed for TP1.2.
Production activation still requires the TP1.1 notice/mail/drain procedure.

Final TP1.2 local results (19 October 2026): **118 combined guard tests passed,
0 failed, 0 skipped** (66.90s); focused identity/return-intent suite: **10 passed**.
All five workspace builds passed. The final web build was repeated after the
signed-out confirmation/return-intent refinements. Mobile/keyboard browser tests
passed for real local captured-mail registration, signed-out link continuation,
fragment scrubbing, expired/error feedback, confirmation, unknown college,
alternate email and requested-page return. Google-enabled UI passed with the
synthetic SDK/API; Google-disabled and mail-unavailable states passed separately.
Screenshots were visually reviewed for wrapping and overflow at 390px.

Evidence: [mobile pending-email screen](screenshots/tp1.2-verification-mobile.png),
[desktop unavailable-delivery screen](screenshots/tp1.2-verification-desktop.png),
and ignored `.local/tp12` / `.local/tp12-*.log`. No hosted settings were changed.
