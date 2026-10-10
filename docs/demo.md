# Release demonstration guide

Use synthetic content only. The hosted demo is https://collegehubs.pages.dev; free services may need a fresh reconnect after sleeping. Do not reset hosted databases, force reward balances, change room deadlines or enable paid fallbacks for a demonstration.

## Local isolated rehearsal

1. Install Node 24.12+, run `npm ci` and `npm run build` at the root.
2. Prepare a separate loopback PostgreSQL database named `collegehubs_demo_learn_<suffix>` using the guarded setup in [development](development.md). Do not reuse a student database. The setup refuses existing tables and requires exact target confirmation.
3. Set `GUARD_LEARN_DATABASE_URL` to that local database URL, then run `node scripts/p32-fixture.cjs` in an interactive terminal. This creates a disposable Mongo replica set and independent web/Core/Learn/Arcade/Interview processes. It supplies synthetic CVR and Sky accounts; the fixture password is intentionally public test data in the script. Never use it for hosting.
4. Type `guards` in that terminal for existing G1–G4 checks (including the schedule regression file). Type `quit` to stop children and restore the disposable SQL database's connectivity.
5. The fixture's Interview AI is mocked unless explicitly switched to locally configured real Groq. Always label mock output; the hosted live-provider evidence is separate.

## Six walkthroughs

| Demo | Actions | Expected evidence |
|---|---|---|
| 1: Membership | Sign in to CVR, then Sky; inspect four channels/theme. Try an unknown domain in disposable data. | Exact assignment; foreign content absent; password mailbox remains unverified. Google flow excluded from this release. |
| 2: Channel learning | Two same-Hub users exchange text, literal code and HTTPS resource; reconnect, search, repeat a send ID, accept another author's answer. A second Hub remains separate. | One committed message/fact; literal rendering; no foreign history or socket delivery. |
| 3: Study | Two participants start a five-minute room, explicitly save drafts, reconnect and restart local Core; wait for the real deadline, then compare/review. | Same deadline/revision, no active peer source, one close, late edits rejected. Unsent text is not durable. |
| 4: Aura | Inspect receipts for Study 25 + accepted answer 15 + code 5 + resource 5. Complete module facts and retry delivery. | Native total 50 on a fresh account; immutable duplicates; global day and scoped rank. The plan's 113/183/203 totals require its exact synthetic score/external fixtures, not arbitrary live AI scores. |
| 5: Modules | Play all three games; upload a fictional PDF, save at least three answers over 60s, reload and evaluate; complete eligible Learn checkpoints/test-out. Stop local Core after a saved result and recover. | One frontend, private service cookies, durable results/pending receipt, no browser grading. AI scores vary. |
| 6: Schedules | Inspect Codeforces attribution and sample academic events; type `schedule-timeout` locally and inspect stale/unavailable states while Core work continues. | Original last-good timestamp preserved; no fabricated dates or official-college claim. |

## Failure rehearsal

Use only the disposable fixture commands `stop-arcade`/`start-arcade`, `stop-interview`/`start-interview`, `stop-learn`/`start-learn`, `stop-core`/`start-core`, `db-down`/`db-up`. Stop one target at a time and record Core login/chat/draft/Aura behavior, not just readiness. Do not disrupt the hosted demo to manufacture evidence. Recovery commands that make a delivery due may change only retry scheduling, never result facts or scores.

For small concurrency, use four independent browser sessions: two users per Hub and one room per Hub. Plain tabs share login storage and do not count as four independent sessions. Record concurrent HTTP/socket probes separately if browser isolation is unavailable. Check360 px, keyboard focus, both themes, back/forward and deep-link refresh; record any unperformed branch as partial.

## Free-tier operation

No keepalive, scheduler, paid preview, persistent paid disk or automatic paid AI fallback is configured. Four Render services share the workspace free-hour allowance; they cannot all remain awake continuously within 750 hours/month. API gateway limits are separate from static traffic. Review account quotas before a live demo, use synthetic PDFs, and retry deliberately after startup instead of repeatedly submitting mutations. See [deployment](deployment.md), [rollback](rollback.md) and [dated evidence](release-evidence.md).

For the four-session Core browser rehearsal, set `P112_FOUR_BROWSERS=true` before starting the fixture. Sign CVR host/peer into `localhost:5182`/`127.0.0.1:5182`, and Sky host/peer into `localhost:5187`/`127.0.0.1:5187`. The optional second Vite process exits with `quit`. Its exact loopback origins are fixture-only; module cookie handoff remains on the primary origin and production CORS is unchanged.
