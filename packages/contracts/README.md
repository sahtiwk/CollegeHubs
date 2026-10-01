# Module contracts

P2 contracts have no Core database/model dependency.

- module-principal.schema.json: structural claims schema; schema validation alone does not authenticate.
- module-token.cjs: pure Node crypto RS256 verifier with pinned audience/scope/issuer/kid and bounded time claims.
- module-session.cjs: opaque values, hashing, callback Origin/state checks, CSRF checks and secure module-path cookie formatting. Modules still own one-use pending-state storage and session expiry/ownership.
- [module-handoff.md](module-handoff.md): endpoints, sequencing, configuration, deployment and revocation limits.
- [module-events.schema.json](module-events.schema.json): strict module fact shapes; authentication, cross-field checks and scoring remain in Core.
- [reconciliation.md](reconciliation.md): immutable pending result, stable IDs/receipts, bounded post/read/manual recovery, caps and fixture-only scoring boundary.

Use these server-side only. Do not import them into a frontend bundle. Real module adapters arrive in their own phases. G2 lives in ../../tests/guards/module-grants.test.js; no separate contract test suite is needed.

G3 lives in ../../tests/guards/aura-events.test.js. Its transaction checks require an explicitly configured disposable local MongoDB replica set; see the development guide. P2.2 does not ship real module pending/reconcile routes.

`channel.cjs` is the P4.2 shared typed-message/HTTPS-link validator and language allowlist. It contains no persistence or execution logic; Core independently enforces it on every send. Vite prebundles this linked CommonJS entry for development.
