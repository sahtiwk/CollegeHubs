# Academic calendars and export (TP6.1)

Academic events are operator imports, scoped to an active Hub and its unarchived
channels. No student write API or automatic college endorsement is provided.
Existing sample events keep their original dates and sample labels. Two reviewed
CVR IV B.Tech 2026–27 date windows were imported on 21 October 2026; see
`transition-release-evidence.md` for the current live acceptance record.

## Importing reviewed events

Create a JSON array (at most 100 entries / 256 KiB). Each entry contains:

```json
{
  "key": "circular-2026-017-dsa",
  "hubSlug": "YOUR-HUB-SLUG",
  "channelSlugs": ["dsa"],
  "title": "Title from the reviewed notice",
  "startsAt": "2026-11-12T15:30:00+05:30",
  "endsAt": "2026-11-12T16:30:00+05:30",
  "provenance": "official_reviewed",
  "sourceUrl": "https://YOUR-COLLEGE-DOMAIN/notices/017",
  "sourceRef": "Circular 017, reviewed by the calendar operator",
  "version": 1,
  "timezone": "Asia/Kolkata",
  "reviewedAt": "2026-10-19T10:00:00+05:30"
}
```

This is a template, not an approved notice. Replace its values with reviewed
source evidence. Review timestamps must not be in the future. URLs must be HTTPS;
dates require explicit offsets and timezone must be a valid IANA name. Source
URLs are stored as links, never fetched by the importer. Operator review is an
attestation, not automatic verification that a website represents the college.

For date-only notices, set `allDay: true` and provide midnight boundaries in the
source timezone. The end is exclusive: 22–28 October ends at midnight on 29 October.
The importer rejects non-midnight boundaries rather than inventing event times.
Changing an existing timed event to all-day requires a higher source version.

With Core's MONGO_URI configured, run from the repository root:

```powershell
node services/core/scripts/seedCalendar.js --database=YOUR_DATABASE --file=C:/path/events.json --dry-run
node services/core/scripts/seedCalendar.js --database=YOUR_DATABASE --file=C:/path/events.json --apply
```

The explicit database must match MONGO_URI. Dry run validates all fields and
Hub/channel references without creating collections or writing events. Apply
uses one transaction, so a missing channel or invalid update rolls back the
batch. The stable Hub/key pair retains the event ID across edits. Identical
imports do not change timestamps; changed facts require a higher version.
Samples cannot become reviewed events, and sample dates cannot be shifted.
For bundled examples, omit --file and add --confirm-sample-dates. Normal startup
never imports academic events.

Fields are additive; retained sample documents need no destructive migration.
Reads supply sample source/version/timezone defaults for older documents. An
unchanged sample import can adopt the additive fields. Back up retained data
before applying operator imports.

## Reads and exports

`GET /api/hubs/:hubId/calendar` accepts channelId, from, to, limit and cursor.
Dates are YYYY-MM-DD in India time: from is inclusive and to exclusive, with
an overlap query that includes events spanning the boundary. Defaults select
the current India month. Ranges are at most 366 days; pages default to 25 and
allow 1–50 events, ordered by start time then ID. Signed cursors bind to Hub,
channel and date range. They are not snapshots across concurrent operator edits;
refresh the calendar after an import. Foreign, archived and missing channels
are denied; all reads require current active membership.

`GET /api/hubs/:hubId/calendar/export.ics` uses the same scope and date selectors,
but disallows limit/cursor. It exports the whole selected range, at most 500
events; larger exports return 422 and require a smaller range. The UI downloads
the selected subject's whole month, even when only one day is selected or the
list has more pages. Samples remain labeled in the downloaded file.

ICS uses stable event UIDs, version-derived sequence, persisted timestamps,
escaped text, UTF-8 line folding and UTC start/end instants for timed entries.
All-day entries use date-only values in their source timezone. These follow
[RFC 5545](https://www.rfc-editor.org/rfc/rfc5545). The gateway permits
text/calendar only for a successful GET on the exact export route. Other
routes retain their JSON-only policy. Downloads require the normal authenticated
request; there is no public subscription URL.

Import the downloaded file using a calendar app's file-import action. It is a
snapshot, not managed synchronization. Repeated-import behavior varies by client,
even with stable UIDs. Live Google OAuth/calendar acceptance is **pending**.
The operator approved API setup and the narrow scope. Login consent is not
calendar consent. Google Calendar imported both reviewed CVR entries successfully
on 21 October. See the release evidence register for deployment and live sync status.

## Managed Google synchronization (local implementation)

The separate connection requests only `calendar.app.created`, via Google's popup
authorization-code flow. It creates a secondary calendar for one selected subject.
Only reviewed events are copied; samples are excluded. Core stores an AES-256-GCM
encrypted refresh token bound to the account, plus the remote calendar ID. The
browser never receives the refresh token or client secret. Connection nonces are
single-use and membership-bound; writes require the allowed Origin, authentication
and the custom request header forwarded by the gateway.

Configure `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, and
`GOOGLE_CALENDAR_TOKEN_KEY` (64 hex characters, generated randomly), then enable
`GOOGLE_CALENDAR_SYNC_ENABLED=true` only after rollout acceptance. Store credentials
outside source control. Preserve the encryption key to retain existing connections.

The worker takes a database lease, scans at most 50 events per batch and resumes
from a persisted cursor after interruption. Full scans repeat every 15 minutes;
free-host sleep and connection volume can delay them. Stable event IDs make insert
retries idempotent. Version checks and ETags protect updates. Import a higher version
with `status: "cancelled"` to propagate cancellation; do not physically delete or
remove an event from its channel to represent cancellation. Such removal does not
currently remove already-exported Google copies. A failed calendar creation response
can leave an empty secondary calendar: creation itself has no idempotency key.

Disconnect removes the saved token and invalidates future worker writes, retaining
the Google copy. A request already sent to Google may finish. Membership loss or
revoked credentials stop synchronization. Revocation is also available through the
user's Google Account settings. Reconnection creates a new secondary calendar.
