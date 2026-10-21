# Provider capability matrix — TP6.2

Interview and Learn inference capabilities, activation flags, local model/runtime
license evidence and the unapproved local grading gate are recorded in the
[TP9.1 matrix](tp9.1-evidence.md). Curated practice and template guidance require
no provider.

Checked 2026-10-21. Provider availability is feature-specific; a working public
schedule does not establish ownership of a student account or enable bonuses.

| Feature | Documented access / budget | Ownership | Decision in this installation |
| --- | --- | --- | --- |
| Codeforces contests | Anonymous official contest.list; API maximum one request per two seconds | Public system data; no account binding | Existing bounded last-good adapter retained independently |
| Codeforces current rating | Official user.info with checkHistoricHandles=false; anonymous public data; same aggregate budget | Random expiring organization-field challenge, checked by operator command through user.info; unique verified handle | Enabled and accepted live: owner proof for sahtiwk; hosted current rating 1297; UI confirms saved snapshot |
| LeetCode difficulty statistics | No permitted, documented third-party statistics endpoint established in this review | No reviewed proof method established | Disabled; no private GraphQL endpoint, scraping or user-submitted score fallback |
| LeetCode contests | Documented authenticated Clist v4 contest API | Public metadata; no ownership inferred | Enabled through Clist; four LeetCode contests in the hosted response |
| Clist contests | Official v4 contest endpoint; documentation requires authenticated API key or session and states 10 requests/minute | Public metadata; not proof of a student's CF/LC account | Enabled after owner-approved free registration and private key configuration. Bounded adapter, separate cache/lease, 15-minute freshness; hosted 14-contest response and UI accepted |
| External Aura | Formula: 2 × max(0, CF current rating), plus 10 × LC easy/medium/hard only when that future adapter is approved | Verified binding and unchanged binding version required | Default off in code; enabled here for verified CF. Live rating 1297 yields 2594 Aura, repeat reconciliation delta 0. LC remains disabled; aggregate All is never added |

## Primary evidence

- [Codeforces API introduction](https://codeforces.com/apiHelp) documents public
  anonymous methods and a maximum of one request every two seconds. The
  [methods](https://codeforces.com/apiHelp/methods?locale=en&mobile=true) document
  user.info and disabling historic-handle lookup; the
  [User object](https://codeforces.com/apiHelp/objects?locale=en) includes current
  rating and organization. Application code stores neither email nor other contact
  fields. A public rating read proves adapter access, not ownership of that profile.
- [Clist v4 documentation](https://clist.by/api/v4/doc/) identifies authentication,
  the contest endpoint and its standard ten-per-minute limit. Owner approved free registration and private credential storage. The bounded adapter
  and hosted acceptance passed on 21 October; only contest metadata is used.
- [LeetCode terms](https://leetcode.com/terms/) prohibit crawling/scraping and
  restrict automated processes. No documented permission for the proposed
  third-party statistics/contest API was established. The implementation therefore
  does not call undocumented endpoints. This is a capability decision, not a claim
  that all possible authorized LeetCode integrations are impossible.

## Explicit release exceptions

Direct LeetCode statistics, ownership and bonus remain pending supported access
and proof. LeetCode contest coverage is available through Clist; it does not
establish profile ownership or score eligibility. Codeforces owned-account proof,
hosted statistics and live bonus reconciliation passed. See
[release evidence](transition-release-evidence.md) for deployment and acceptance
records. Do not describe this as full provider statistics coverage.
