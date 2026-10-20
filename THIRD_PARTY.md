# Third-party notices

TP6.1 adds development-only `ical.js` 2.2.1 (MPL-2.0) for independent ICS parser
tests. Its installed license is retained in `node_modules/ical.js/LICENSE`.
It is not imported into the production browser or server bundles.

The imported applications remain in their legacy reference directories with their original manifests, lockfiles and notices. Reuse rights are settled under decision D1 in `implementation_plan_mvp.md`; this file preserves attribution and does not replace dependency or media notices.

TP0.1 distribution scope (18 October 2026): the root [LICENSE](LICENSE) covers original project-owned work only. See the [source/distribution manifest](docs/open-source-manifest.md) and [locked dependency inventory](docs/transition-dependencies.md). Arcade's rights restriction and Learn's unspecified upstream license remain exceptions; neither is relabeled MIT. No unrestricted whole-repository distribution is implied.

## CollegeHubs Interview / AI-Interviewer-main

Source location: `legacy/AI-Interviewer-main/`. P8.1 adapts its Resume/Interview/Session models, candidate resume upload/list/detail/delete flow and `frontend/src/pages/resume/ResumesPage.jsx` controls into the standalone Interview service and shared web feature. Cloudinary, AI parsing, default-resume hooks, local auth/admin/jobs and duplicate navigation/state are removed from the active flow. P8.2 additionally adapts ai.service.js, NewInterviewPage.jsx, InterviewSessionPage.jsx, SessionResultPage.jsx and SessionHistoryPage.jsx into bounded REST services and shared-shell components, without RAG, voice, local auth or duplicate global navigation. The original `legacy/AI-Interviewer-main/LICENSE` is retained. Its complete MIT notice follows verbatim:

```text
MIT License

Copyright (c) 2026 Aftab Alam and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## CollegeHubs Arcade / digital-arcade-main

Source location: `legacy/digital-arcade-main/code and stuff/`. Preserve the rights notice in `legacy/digital-arcade-main/README.md`; do not relicense it as MIT. P7.1 ports the NumberGuess attempt/history/hint flow into `apps/web/src/features/arcade/games/NumberGuess.tsx`, with server authority in the independent Arcade API. P7.2 also ports the original MathAmplitude question/feedback/score/timed-round flow, replacing local question generation/grading with the independent service. Sorting Complexity is new CollegeHubs code. Original source and rights notice remain intact. No original App, router, Navbar, global stylesheet, AI client, media or WebGL assets are imported.

## CollegeHubs Learn / MargaAI-master

Source location: `legacy/MargaAI-master/`. The supplied snapshot has no standalone license notice identified in the module audit. D1 records the project's reuse authorization; this file does not invent an upstream license.

## Dependencies and assets

Retain each package's dependency licenses and notices when distributing it. Repository rights do not automatically establish rights to third-party portraits, images, audio, fonts or externally linked learning resources. Human notice/media-provenance review remains part of the plan; no such review or external license certification is claimed here.

P3.2 ports the MargaAI RoadmapView topological layout into the shared frontend, and its P3.1 SQL/session boundary into the Learn API. The remaining source is retained for later phases.

P9.1 adapts the MargaAI dashboard, onboarding, node-reading and learning-preferences journeys to `apps/web/src/features/learn/pages/`. `services/learn/src/services/learnerService.ts` adapts LearnerStateService's idempotent root initialization, ProfilerAgent's self-rating intake, RetrieverAgent's linked-resource selection and TutorAgent's fast template guidance. Authentication, SQL ownership, validation, reset and resource authorization are rewritten for Core subjects and Hubs. Next/Clerk rendering, arbitrary generation, vector retrieval and local Aura/streak engines are not imported. See [the retained route inventory](docs/learn.md).

P9.2 adapts the quiz journey and NodePopover into that same React feature; PlannerAgent, AssessmentService, QuizAgent, ProgressAgent and the Wikipedia roadmap fallback are reworked in `services/learn/src/services/`. Questions/answers, immutable attempts, unlocks and delivery are server-owned. The 60 `demo-v1` questions and explanations are original CollegeHubs content with an explicitly recorded Codex content/key review. MDN readings remain attributed links; the optional Wikipedia result links to the article, contributor history and license and does not reproduce its body. The question bank is not a calibrated or human-certified assessment.

The P9.1 starter reading catalog links to MDN Web Docs, credited to MDN contributors. Short descriptions are original CollegeHubs text; no MDN article is bundled or copied. External readings retain their publishers' terms and attribution. The four linked pages were checked on 2026-10-07; availability is not guaranteed. No assessment/question-bank review is claimed by this phase.

## TP3.1 optional shader prototype

The isolated design catalogue uses `shaders@4.0.4` (MIT), with added dependencies
`typegpu@0.12.3` (MIT), `tinyest@0.3.4` (MIT), `typed-binary@4.3.3` (MIT), and
`tsover-runtime@0.0.7` (Apache-2.0). Exact upstream license texts are retained in
[docs/licenses](docs/licenses). See the [source and feasibility review](docs/frontend-redesign.md)
for version provenance, telemetry opt-out, composition and distribution scope.
The normal app does not import the prototype. Fonts now use a system stack;
the former Google Fonts stylesheet request has been removed.

## TP4.1 code grammar highlighting

`highlight.js@11.11.1` is distributed under BSD-3-Clause, copyright 2006 Ivan
Sagalaev. The exact installed license is retained in
[docs/licenses/highlight.js-11.11.1-LICENSE.txt](docs/licenses/highlight.js-11.11.1-LICENSE.txt)
and included in the web build at `/notices/highlight.js-LICENSE.txt`.
Only the core and nine explicitly selected grammar modules are loaded, inside a
terminable worker. No CDN, automatic language discovery or user code execution
is involved. Library output is converted to vetted React spans and literal text.
