# Third-party notices

The imported applications remain in their legacy reference directories with their original manifests, lockfiles and notices. Reuse rights are settled under decision D1 in `implementation_plan_mvp.md`; this file preserves attribution and does not replace dependency or media notices.

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

The P9.1 starter reading catalog links to MDN Web Docs, credited to MDN contributors. Short descriptions are original CollegeHubs text; no MDN article is bundled or copied. External readings retain their publishers' terms and attribution. The four linked pages were checked on 2026-10-07; availability is not guaranteed. No assessment/question-bank review is claimed by this phase.
