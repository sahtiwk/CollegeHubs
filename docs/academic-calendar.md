# Academic calendars and export (TP6.1)

Academic events are operator imports, scoped to an active Hub and its unarchived
channels. No student write API or automatic college endorsement is provided.
Existing sample events keep their original dates and sample labels. No real
college notices were supplied or imported during implementation.

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
before applying operator imports. No production import was performed here.

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
escaped text, UTF-8 line folding and UTC start/end instants. These follow
[RFC 5545](https://www.rfc-editor.org/rfc/rfc5545). The gateway permits
text/calendar only for a successful GET on the exact export route. Other
routes retain their JSON-only policy. Downloads require the normal authenticated
request; there is no public subscription URL.

Import the downloaded file using a calendar app's file-import action. It is a
snapshot, not managed synchronization. Repeated-import behavior varies by client,
even with stable UIDs. Google OAuth/calendar writes are **pending**: permitted
free account access and consent have not been confirmed. Login consent is not
calendar consent. No Google adapter, remote identity record or automatic sync is
claimed. External calendar-client UI import remains an acceptance check to run
with an available permitted client; parser import and real browser download were
verified locally.
