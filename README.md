# CollegeHubs Core

A college-scoped community built with React/Vite and Express/Mongoose. The P1.2 shell uses configured college branding, a private college feed, profile editing, subject-channel discovery, and college-only Aura standings.

## Run locally

Install dependencies in both the repository root and `server/`. Copy each package's `.env.example` to a local environment file and configure the names listed there. Start Core with `npm run dev` in `server/`, and Vite with `npm run dev` at the root. See [server setup](server/README.md) and [development instructions](docs/development.md).

Core requires a transaction-capable MongoDB replica set. Real college entries stay draft until their exact domains are confirmed; then run `npm run provision:hubs` from `server/`. Unknown domains receive an explanation and assignment retry, without access to a college feed.

## Implemented through P1.2

- Current identity and membership come from `/api/me`; cached display names never select a Hub.
- Server-scoped feed, profile access, author population, bounded cursor pages, idempotent likes/unlikes, and server-calculated college ranking.
- Safe Hub/theme/channel endpoints, hexadecimal token allowlists, approved HTTPS logos, and versioned theme refresh.
- Plum/cream default with peach/pale-sky accents; Abril Fatface headings and Archivo body text, loaded from Google Fonts with system fallbacks.
- Responsive navigation drawer with focus containment, Escape, focus restoration, profile dialogs, and keyboard-accessible forms.

Chat, module application integration, new Aura scoring, live contest schedules, and calendar export remain later phases. Existing stored Aura is displayed without fabricated scores or post rewards. The inherited About page is outside this scoped application-shell phase.

Run the existing G1 guard with `node --test tests/guards/hub-isolation.test.js`. Build with `npx vite build`. No UI test suite was added.

## Evidence

[P0.1 security baseline](docs/p0.1-evidence.md) | [P0.2 development baseline](docs/p0.2-evidence.md) | [P1.1 identity](docs/p1.1-evidence.md) | [P1.2 shell and isolation](docs/p1.2-evidence.md). Imported module notices remain in [THIRD_PARTY.md](THIRD_PARTY.md).

## P2.1 module handoff

Core now issues one-use 60-second grants and module-specific RS256 access credentials of at most 15 minutes. Current Hub membership is checked at both issuance and exchange. Service credentials remain server-only and hashed; grant consumption is atomic. Browser navigation uses a state-bound form POST and a clean module URL.

Modules remain unavailable by default until an operator provisions keys and deploys each module's callback/session adapter. Core continues to run without module keys. See the [handoff contract](packages/contracts/module-handoff.md), [server configuration](server/README.md), and [P2.1 verification](docs/p2.1-evidence.md). Run both named guards with `npm run test:guards` in `server/`.

## P2.2 reward receipt foundation

Core now has a service-only event endpoint, immutable receipts, semantic deduplication, transactional daily caps/balances and shared activity-day storage. Scoring remains inactive in normal startup until P6; existing profile/leaderboard reads are unchanged. Fixture rules verify the foundation without awarding live users.

The [recovery contract](packages/contracts/reconciliation.md) specifies saved/pending results, bounded delivery, lost-receipt replay and owned-read/manual reconciliation for later module adapters. There is no automatic-delivery scheduler. Run G1/G2/G3 via `npm run test:guards` in server; G3 transaction cases require a disposable local replica set as described in the [development guide](docs/development.md). See [P2.2 evidence](docs/p2.2-evidence.md).
