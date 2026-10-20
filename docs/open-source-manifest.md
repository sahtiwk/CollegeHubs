# Source and distribution manifest

TP0.1 source review, 18 October 2026. The root [LICENSE](../LICENSE) adopts the
transition plan's MIT default for original CollegeHubs-owned work. It does not
make the whole repository or application MIT. Existing D1 reuse authorization
is retained; it is not represented as a newly discovered upstream license or
unrestricted redistribution grant. No public release was produced in TP0.1.

| Material / location | Evidence and attribution | Distribution treatment |
|---|---|---|
| Original CollegeHubs code, contracts, docs and original assessment text | Root LICENSE; project contributors | MIT only to the extent project-owned; retain the scope declaration and notices |
| Interview source and adapted models/practice/resume UI in `services/interview`, `apps/web/src/features/interview` | `legacy/AI-Interviewer-main/LICENSE`: MIT, copyright 2026 Aftab Alam and Contributors; full notice in THIRD_PARTY | Retain original MIT notice with source and bundled adaptations |
| Arcade NumberGuess/MathAmplitude flow in `apps/web/src/features/arcade/games`, associated service adaptations | `legacy/digital-arcade-main/README.md`: copyright 2025 Akash Gardas and Team, all rights reserved | Authorized project reuse under D1; no invented MIT grant. Exclude upstream and derived portions from an unrestricted MIT-only source/binary distribution until explicit redistribution terms are recorded |
| Learn graph/layout, SQL/session and learning/quiz adaptations in `services/learn`, `apps/web/src/features/learn` | `legacy/MargaAI-master` has no standalone LICENSE/NOTICE/COPYING found; adaptation map in THIRD_PARTY | D1 project reuse accepted; upstream distribution terms unspecified. Exclude upstream/derived portions from an unrestricted MIT-only package until terms are recorded |
| Original Sorting Complexity and original 60-question `demo-v1` bank | THIRD_PARTY adaptation record; `services/learn/src/data` and Arcade implementation | Project-owned content under scoped MIT; no human certification or calibrated assessment claim |
| Legacy reference trees, including retired gateway | Original manifests, lockfiles and available notices preserved | Not active workspaces or deployed assets. Exclude entire `legacy/` from a new distributable application archive; do not delete the working references |
| npm dependencies | Root `package-lock.json`; package-local licenses/notices; [locked dependency inventory](transition-dependencies.md) | Each package retains its own terms. Package metadata is an inventory, not a substitute for license/NOTICE text; include applicable notices in any distribution |
| System font stack (TP3.1) | `apps/web/src/styles/tokens.css` | Replaces the former remote Archivo / Abril Fatface import. No font binaries are bundled or downloaded by the app |
| Optional shaders prototype (TP3.1) | Exact `shaders@4.0.4` and four added dependencies; [review](frontend-redesign.md) | Original composition, telemetry disabled, isolated catalogue only; retained notices in `docs/licenses/`. Static default; optional bundle fails the size gate |
| MDN readings / optional Wikipedia links | `starterPaths.ts`, `roadmapAdapter.ts`, THIRD_PARTY | Original short descriptions plus attributed links; no copied article body in app. External publisher terms remain separate; linked content is not MIT project content |
| Legacy portraits, audio, textures and other media | Legacy roots; not imported by the active web app | Excluded from the application bundle and proposed public archive; provenance is not inferred from code reuse permission |
| Screenshots / evidence / private fixtures | `docs/screenshots`, ignored `.local` | Evidence only, not automatically licensed media assets. Review screenshots for private data before publication; never distribute `.local`, `.env*`, exports or credentials |
| Hosted providers and model artifacts | Current Groq interface; proposed TP9 open inference | Service access is not a source license. No weights downloaded or relicensed; no proprietary hosted infrastructure is described as OSS |

The complete current bundle includes the authorized Learn/Arcade adaptations;
it therefore must not be advertised as an unrestricted MIT-only artifact. The
exclusions above define an MIT-only distribution boundary, not a claim that a
feature-complete stripped package has been built. Future public packaging must
either document the missing redistribution terms or replace/remove the affected
adaptations and rerun feature gates. TP11 owns that publication gate. TP3 owns
font/visual asset selection; TP9 owns any selected model's separate license.

Build inspection: root workspaces are `apps/*`, `services/*`, `packages/*`, with
one root lock. `deploy/build.mjs` selects one service and contracts. Vite builds
from `apps/web`; its only public static file is `_routes.json`. Legacy manifests,
private environment files and `.local` are not build inputs for shipped assets.
See [baseline results](transition-baseline.md) for the generated-output check.
Do not publish the repository by copying its directory wholesale.

TP4.1 adds `highlight.js@11.11.1` (BSD-3-Clause), copyright 2006 Ivan Sagalaev.
Retain `docs/licenses/highlight.js-11.11.1-LICENSE.txt`; the web build also ships
`public/notices/highlight.js-LICENSE.txt`. Core and nine grammar modules are
lazy-loaded in a worker. This updates the earlier static-file inventory above;
see also TP3.2's public social-preview assets.
