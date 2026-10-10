# Source and documentation reconciliation — P11.2

Reviewed 2026-10-11. This is an implementation/source inventory, not legal certification or a new review of the original report/paper.

| Source | Active integration | Preserved provenance |
|---|---|---|
| SocialStream root/server | Shared web/Core community, auth and theme, then scoped messages/Study/Aura | Git history and original contributor acknowledgement |
| Digital Arcade | NumberGuess and MathAmplitude interaction flows; new server validators and Sorting Complexity | `legacy/digital-arcade-main/README.md`; do not invent an MIT grant |
| AI Interviewer | Resume and Interview UI/model/service adaptations with Core identity and durable delivery | Original MIT license and full notice in `THIRD_PARTY.md` |
| MargaAI | Roadmap layout, learner/assessment/resource/planning adaptations in shared React and independent SQL API | Legacy source retained; supplied snapshot has no standalone license; plan D1 records reuse authorization |
| Learn content | Original `demo-v1` questions and descriptions, attributed MDN links | Seed metadata records Codex review; no human-certified/calibrated assessment claim |
| Fonts | Abril Fatface and Archivo via Google Fonts CSS | Publisher-served assets; no new bundled font binary or invented attribution |

## Active dependency review

Active npm workspaces are `apps/*`, `services/*`, `packages/*`; root lock/build and `render.yaml` do not install legacy projects. A source search found no active legacy application runtime imports, Clerk or Next imports. `pdfjs-dist/legacy/build/pdf.mjs` is the supported PDF package entry, not an imported legacy application. The Arcade source comment identifying its upstream is attribution, not a runtime dependency. Services communicate through contracts/HTTP rather than another service's runtime models.

Old Vercel gateway material stays in `legacy/retired-gateway` as historical source. Preserve legacy notices and unrelated work; no blanket deletion is needed. Fresh setup uses workspace `.env` names in current docs and never requires a legacy `.env`, frontend or install.

## Current-document corrections

Root README now describes actual Learn quizzes/mastery and all four hosted APIs. Service READMEs link their actual setup/recovery contracts. Deployment README no longer says there are no hosted services. About removes unsupported global-rank, multi-provider calendar/export and public-profile promises, documents password-domain and free-tier limits, and uses shared theme tokens. Unverified third-party team portraits are no longer fetched by About; textual original credits remain.

Historical phase evidence retains its original dates/status (including older inactive Aura and unhosted claims). Use `release-evidence.md` and `p11.1-evidence.md` for current release claims. `implementation_plan_mvp.md` remains the governing roadmap; P10 features are not retroactively marked complete. Original report/paper citations have not been re-audited and must not be described as newly verified.

## Remaining review boundaries

D1 authorization does not establish rights to every third-party asset or linked resource. Dependency notices remain in installed packages; preserve them when redistributing. Human rights/content review and production security certification are not claimed. See `THIRD_PARTY.md` for retained notices rather than changing upstream licenses.
