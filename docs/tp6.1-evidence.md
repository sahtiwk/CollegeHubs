# TP6.1 implementation and verification

Implemented locally on 2026-10-19: reviewed-source import validation, retained
sample defaults, versioned updates, bounded scoped pagination, list/month views,
day filtering, honest empty/past/source states, authenticated ICS export and the
gateway's exact MIME exception. Home and Channel use the same calendar component.
Refresh errors retain the last view with a warning, within the same user/Hub/query.

## Checks

- Existing regression suite: **139 passed, zero failed/skipped**, including TP5.2
  recovery. Report `.local/p32-guards.tap`. New calendar guards were run separately
  and are now included in the fixture command for future runs.
- `tests/guards/calendar.test.js`: **7 passed, zero failed/skipped**, using a
  disposable Mongo replica set. Covers source validation, dry-run/no-write,
  idempotency, version updates, sample protection, batch rollback, date/range
  validation, cursor tampering/binding, stable pages, foreign/archived channel and
  Hub denial, authenticated export, whole-range content and MIME restrictions.
- Independent `ical.js` parser round-trip verifies stable UIDs, sequence,
  UTC instants, Unicode byte folding and escaped punctuation/newline content.
  `ical.js` 2.2.1 is a development-only MPL-2.0 dependency, absent from runtime UI.
- `tests/frontend/calendar-browser.cjs`: passed in Chrome with real disposable
  login, imported synthetic reviewed evidence and 27 events. Verified pagination,
  day selection, full-month download, independent parser import of the downloaded
  file, empty month, mobile overflow and retention of last-good data on failure.
- [Desktop screenshot](screenshots/tp6.1-calendar-desktop.png) and
  [mobile screenshot](screenshots/tp6.1-calendar-mobile.png). Both show synthetic
  test evidence; neither represents official college announcements.
- Web production build passes. Existing optional shader bundle warning remains.

## Remaining external acceptance

No real approved college source was supplied; reviewed imports were verified
with explicitly synthetic test evidence. No production import or deployment
was performed. Google synchronization remains pending permitted free access and
separate calendar consent. Import into an external calendar client's UI is not
verified; the actual downloaded file was imported into an independent RFC parser.
These limits are explicit in the [operator guide](academic-calendar.md), which
also documents ICS-only support and snapshot semantics.
