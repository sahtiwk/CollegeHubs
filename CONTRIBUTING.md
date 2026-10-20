# Contributing to CollegeHubs

Use Node 24.12+ and npm from the repository root. Run `npm ci`, then follow
[development](docs/development.md) and the names-only
[configuration reference](docs/configuration.md). Preserve ignored local settings;
the deleted `.env.example` templates are intentional. Never commit environment
files, database exports, tokens, resume text or private fixture logs.

Active code lives in `apps/web`, `services/{core,arcade,interview,learn}` and
`packages/contracts`. Do not install or revive the legacy applications. Keep
service databases separate; Core owns identity, tenant checks and Aura receipts.
Do not execute student code or turn client metrics into reward authority.

Implement one transition sub-phase at a time. Inspect existing changes before
editing, preserve acknowledged work and immutable receipts, and use additive
migrations for retained databases. Fresh-demo setup is not an upgrade mechanism.
TP0.2 must establish migration/restore proof before schema-changing tickets.
Never reset hosted data or add paid services, trials or automatic paid fallbacks.

Run `npm run build` and the existing guard suite with the disposable fixture
described in [the baseline](docs/transition-baseline.md). Add a focused failing
guard when behavior changes; documentation-only changes need source/link review,
not tests that mirror prose. Record commands, results, skips and limitations.
A skipped database guard is incomplete verification. No live AI/provider request
is required for routine guards. Do not run deployment's install/prune helper in
your active development checkout.

For a change proposal, explain the problem, resulting behavior, changed contracts,
verification and remaining risks. Preserve dated evidence; add a dated update
instead of making an old test report appear current. Do not claim deployment,
load, security or human content review from local tests alone.

Original contributions are offered under the scoped root MIT license. Identify
the source and actual license of any imported code/assets and retain notices.
See [distribution scope](docs/open-source-manifest.md): this repository contains
restricted/unspecified upstream material and is not wholly MIT. Reuse permission
does not supply a missing public redistribution license. Do not bundle legacy
media, externally linked readings, fonts or model weights without verified terms.
