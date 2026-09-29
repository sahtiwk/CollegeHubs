# Module contracts

P2.1 contracts have no Core database/model dependency.

- module-principal.schema.json: structural claims schema; schema validation alone does not authenticate.
- module-token.cjs: pure Node crypto RS256 verifier with pinned audience/scope/issuer/kid and bounded time claims.
- module-session.cjs: opaque values, hashing, callback Origin/state checks, CSRF checks and secure module-path cookie formatting. Modules still own one-use pending-state storage and session expiry/ownership.
- [module-handoff.md](module-handoff.md): endpoints, sequencing, configuration, deployment and revocation limits.

Use these server-side only. Do not import them into a frontend bundle. Real module adapters arrive in their own phases. G2 lives in ../../tests/guards/module-grants.test.js; no separate contract test suite is needed.
