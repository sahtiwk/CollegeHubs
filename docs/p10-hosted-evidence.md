# P10.1 / P10.2 hosted activation — 2026-10-11

Feature release `d585a1dbc15954c9c95825b8acf8acb0d61fb1b1` was pushed to `sahtiwk/CollegeHubs` main and deployed to the existing free Render services and Cloudflare Pages app. No paid resources, database resets or new provider accounts were used.

## Configuration and deployment

Core received `LEARN_API_ORIGIN`, `ARCADE_API_ORIGIN`, `INTERVIEW_API_ORIGIN` and the three corresponding `*_READ_KEY` settings. Each module received only its matching `MODULE_READ_KEY`. Private staging environment files retain these settings outside Git; frontend configuration contains no read credentials.

Render reported the feature release live on all four APIs. Deployment IDs:

| Service | Deployment |
| --- | --- |
| Core | `dep-db5hrl0u01pc73em6f6g` |
| Learn | `dep-db5hrl0u01pc73em6fgg` |
| Arcade | `dep-db5hrl8u01pc73em6fp0` |
| Interview | `dep-db5hrl0u01pc73em6esg` |

All four own-database readiness endpoints returned HTTP 200. Password login, module bootstrap, foreign-origin rejection, callback replay rejection and missing-CSRF rejection passed through `https://collegehubs.pages.dev` using the existing synthetic CVR account.

## Hosted acceptance

- Core progress returned all three modules `ok`: Learn one enrollment, one mastered node and two completed quizzes; Arcade one completed game and one win; Interview two completed interviews. All pending counts were zero. The browser rendered these same counts beside the canonical Aura card.
- A normal Learn checkpoint was intentionally answered incorrectly using the synthetic account. Finalization returned ratio zero; Core returned the owned **Iteration & traversal** suggestion.
- A normal Interview draft reused the synthetic resume. Core minted a reference, Interview imported the selected topic, and reuse returned HTTP 409. No direct database fixture inserts were used.
- Real Groq generation returned five questions covering array iteration, traversal methods, while-loops and React list rendering. Sanitized output is in `p10-hosted-output.json`. This verifies this observed result, not guaranteed coverage for every model response.
- Initial optional summaries reported unavailable while services warmed. A later normal read returned all three counts. The 800ms upstream budget and one-minute failure cooldown remain unchanged; no keepalive or paid capacity was added.

The initial acceptance helper expected an `interview` wrapper from the import endpoint; the actual documented response is `{topics}`. The helper was corrected, then import, replay and generation completed successfully. No application change was needed for that helper error.

Local evidence remains 108 passing guards with zero failures/skips and all workspace builds passing. Hosted testing supplements those ownership/concurrency tests; it does not claim a hosted load test or permanent free-service availability.

Browser evidence: `screenshots/p10-hosted-progress.png`. P11.1/P11.2 retain their original scope; this document adds the newly activated optional P10 functionality.
