# Provider capability matrix — TP6.2

Interview and Learn inference capabilities, activation flags, local model/runtime
license evidence and the unapproved local grading gate are recorded in the
[TP9.1 matrix](tp9.1-evidence.md). Curated practice and template guidance require
no provider.

Checked 2026-10-20. Provider availability is feature-specific; a working public
schedule does not establish ownership of a student account or enable bonuses.

| Feature | Documented access / budget | Ownership | Decision in this installation |
| --- | --- | --- | --- |
| Codeforces contests | Anonymous official contest.list; API maximum one request per two seconds | Public system data; no account binding | Existing bounded last-good adapter retained independently |
| Codeforces current rating | Official user.info with checkHistoricHandles=false; anonymous public data; same aggregate budget | Random expiring organization-field challenge, checked by operator command through user.info; unique verified handle | Adapter and review workflow implemented. One read-only live user.info probe returned 200/OK with a rating. Linking and bonus flags remain off pending a real consenting-owner acceptance run |
| LeetCode difficulty statistics | No permitted, documented third-party statistics endpoint established in this review | No reviewed proof method established | Disabled; no private GraphQL endpoint, scraping or user-submitted score fallback |
| LeetCode contests | No permitted direct integration established | Public metadata, but access still needs permission | Disabled; Codeforces-only schedule is the explicit alternative |
| Clist contests | Official v4 contest endpoint; documentation requires authenticated API key or session and states 10 requests/minute | Public metadata; not proof of a student's CF/LC account | Disabled: no configured CLIST_API_KEY/CLIST_USERNAME, permitted account access/free eligibility and live response unverified. No account signup, paid plan or session reuse performed |
| External Aura | Prospective formula: 2 × max(0, CF current rating), plus 10 × LC easy/medium/hard only when that future adapter is approved | Verified binding and unchanged binding version required | Default off. CF branch implemented; LC formula is fixture-tested only. Aggregate All is never added |

## Primary evidence

- [Codeforces API introduction](https://codeforces.com/apiHelp) documents public
  anonymous methods and a maximum of one request every two seconds. The
  [methods](https://codeforces.com/apiHelp/methods?locale=en&mobile=true) document
  user.info and disabling historic-handle lookup; the
  [User object](https://codeforces.com/apiHelp/objects?locale=en) includes current
  rating and organization. Application code stores neither email nor other contact
  fields. A public rating read proves adapter access, not ownership of that profile.
- [Clist v4 documentation](https://clist.by/api/v4/doc/) identifies authentication,
  the contest endpoint and its standard ten-per-minute limit. This does not prove
  an approved, free account is available for this deployment. Activation requires
  that evidence, a bounded adapter and live acceptance; none is claimed yet.
- [LeetCode terms](https://leetcode.com/terms/) prohibit crawling/scraping and
  restrict automated processes. No documented permission for the proposed
  third-party statistics/contest API was established. The implementation therefore
  does not call undocumented endpoints. This is a capability decision, not a claim
  that all possible authorized LeetCode integrations are impossible.

## Explicit release exceptions

Clist coverage, direct LeetCode coverage/statistics and LeetCode bonus remain
pending permitted access and proof. CF owned-account live review/bonus acceptance
also remains pending; its anonymous API probe and disposable fixtures are not a
substitute. Existing CF schedules and academic ICS export remain available.
Carry these exceptions into TP11; do not describe this as full provider coverage.
