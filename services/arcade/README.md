# Arcade API

Independent Express/Mongo service for three ranked games: NumberGuess, MathAmplitude and Sorting Complexity. Server-validated actions produce durable immutable results; Core owns Aura. Other legacy games remain unavailable.

Run `npm ci` at repository root, configure ignored `services/arcade/.env`, then `npm run dev:arcade`. Build: `npm run build:arcade`. Needs its own transaction-capable `ARCADE_MONGO_URI`, `APP_ORIGIN`, Core public key/issuer/audience/key ID, `CORE_API_BASE_URL`, distinct `CORE_SERVICE_KEY` and `ARCADE_RECONCILE_KEY`. No AI key required.

[Configuration, rules and recovery](../../docs/arcade.md) · [Deployment](../../docs/deployment.md) · [Release evidence](../../docs/release-evidence.md). `/health/ready` checks only its own database. Stopping Arcade must not stop Core; pending events retry on authorized due reads or service-only reconciliation, without changing facts.

## Optional progress summaries (P10.2)

See [the read contract and private configuration](../../docs/module-progress.md). Set `MODULE_READ_KEY` to the matching Core read credential; existing Core public-key verification remains required. Missing read configuration leaves optional dashboard progress unavailable; it does not disable ordinary module use.
