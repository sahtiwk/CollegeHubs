# 1. Executive Summary

**Verified — Scope:** Read-only source audit of the three supplied repositories in `C:\socialstream`, following [changes.md](docs/changes.md) and the newer architecture decisions in the request. No installation, build, test execution, server, migration, database access, external API call or implementation was performed. Manifest versions are declarations, not resolved/installed versions. Findings describe source behavior, not a demonstrated running deployment. Audit date: 2026-09-28.

**Inferred — Reading convention:** Each paragraph/list/table is labeled **Verified** (source observation) or **Inferred** (assessment/proposal). In change tables, the current-behavior column is Verified and change/effort/risk columns are Inferred. “NOT FOUND” means absent from the inspected source/search scope, not proof about an uninspected deployment. S ≈ 0.5–2 engineer-days, M ≈ 3–5, L ≈ 6–10; estimates exclude permission delays and infrastructure provisioning. Percentages below are judgmental coverage of the requested integrated product, not test coverage or percent of lines reusable.

**Inferred — Arcade: partial reuse; approximately 35% coverage; difficulty 6/10.** Reuse selected mini-game interfaces and extract their rules after reuse permission is established. A playable client prototype exists, but authenticated sessions, trusted results, persistence, Core events and the three academic games are absent. Top risks: (1) contributor-only license, (2) entirely client-controlled results plus several broken games, (3) a browser-exposed OpenAI integration and eagerly loaded visual dependencies. Evidence: [license in README](C:/socialstream/digital-arcade-main/README.md), [router](<C:/socialstream/digital-arcade-main/code and stuff/src/App.tsx>), [AIChatbox](<C:/socialstream/digital-arcade-main/code and stuff/src/components/AIChatbox.tsx>).

**Inferred — Interview: reuse with heavy changes; approximately 60% coverage; difficulty 7/10.** The upload → questions → saved answers → evaluation → report workflow is the strongest reusable starting point. Keep the service boundary and candidate workflow, remove independent identity and optional job/admin subsystems, and repair completion semantics. Top risks: (1) unauthenticated Socket.io LLM access and resume ownership gap, (2) unsafe local admin provisioning/authentication, (3) non-idempotent completion and LLM failures converted into completed zero-score evaluations. Evidence: [socket.js](C:/socialstream/AI-Interviewer-main/backend/src/socket.js), [generateQuestions](C:/socialstream/AI-Interviewer-main/backend/src/controllers/interview.controller.js), [completeSession](C:/socialstream/AI-Interviewer-main/backend/src/controllers/session.controller.js).

**Inferred — Learn: reuse with heavy changes; approximately 45% coverage; difficulty 9/10.** Preserve the Next.js service, graph UI, progression concepts and PostgreSQL data ownership. Clerk removal is broad but mechanically tractable; trustworthy assessment and consistent database migrations are larger risks than swapping a provider alone. Top risks: (1) client grading/answer-key disclosure/replayable mastery, (2) Clerk-keyed identities and missing Hub isolation, (3) no reuse license found plus schema/migration drift. Evidence: [schema](C:/socialstream/MargaAI-master/src/db/schema.ts), [assessment service](C:/socialstream/MargaAI-master/src/services/assessmentService.ts), [proxy](C:/socialstream/MargaAI-master/src/proxy.ts). The manifest specifies **Next 16.3.3 / React 19.2.8**, contrary to the request/README's Next 15 description.

**Inferred — Recommendation:** Resolve Arcade/Learn permissions first; establish Core membership, token issuance and idempotent Aura ingestion; prove Learn's Clerk-free handoff **early**, before committing to the full Learn migration. Then ship a small server-validated Arcade slice, the stripped Interview workflow, and Learn's corrected assessment/progress flow. Finish cross-module recommendations after all three identities and event contracts work. If Arcade permission is unavailable, build the three small academic games independently without copying restricted code. None of the three is ready to reuse unchanged as a trusted CollegeHubs module.

**Inferred — Architecture interpretation:** Modules retain learning/game/interview **domain facts** (answers, moves, raw evaluation measurements), while Core alone computes Aura, tiers and the shared streak. This interprets the requested “interview.completed score + breakdown” as allowing raw assessment metrics, not an independent reward system; the literal “no module keeps its own score” ambiguity is recorded in section 13. This report supersedes earlier heavy-infrastructure suggestions: no Redis fanout, separate outbox, broker or shared collections are proposed.

# 2. Module Inventory (per repo)

**Verified — Path key for compact labels:** A = `C:\socialstream\digital-arcade-main\code and stuff`; I = `C:\socialstream\AI-Interviewer-main`; B = `C:\socialstream\AI-Interviewer-main\backend\src`; F = `C:\socialstream\AI-Interviewer-main\frontend\src`; L = `C:\socialstream\MargaAI-master`. Evidence links and the appendix resolve to absolute paths.

## Arcade

**Verified — Annotated tree and entry points:**

```text
C:\socialstream\digital-arcade-main
  README.md                     description and contributor-only license
  code and stuff/
    package.json                actual npm/Vite project root
    index.html                  /src/main.tsx; /vite.svg favicon reference
    vite.config.ts              React plugin; excludes lucide from optimizeDeps
    tsconfig{,.app,.node}.json   project references; strict TypeScript
    eslint.config.js            flat ESLint 9 + TypeScript + hooks/refresh
    tailwind.config.js          src-only content scan; Tailwind 3
    postcss.config.js
    src/
      main.tsx                  StrictMode/createRoot
      App.tsx                   BrowserRouter, 10 game routes; eager imports
      pages/                    Home, Games, About; unrouted Contact
      components/               Navbar, Scene, Background, GameAudio, AIChatbox
      games/                    13 components; catalog below
      index.css                 global neon styles/reset/scrollbars
```

**Verified — Tooling:** [package.json](<C:/socialstream/digital-arcade-main/code and stuff/package.json>) has `dev=vite`, `build=vite build`, `lint=eslint .`, `preview=vite preview`. npm lockfile exists; no packageManager or Node engines pin found. TypeScript `^5.5.3`; app config uses strict/noUnusedLocals/noUnusedParameters/noFallthroughCasesInSwitch, bundler resolution, ES2020, react-jsx and noEmit. Build script does not run `tsc`. No source alias is configured. Automated test files/script and CI workflow: **NOT FOUND** in supplied non-generated files.

**Verified — All declared runtime dependencies:** `@react-three/drei ^9.102.3; @react-three/fiber ^8.15.19; @react-three/postprocessing ^2.16.2; framer-motion ^11.0.14; gsap ^3.12.5; lucide-react ^0.344.0; react ^18.3.1; react-dom ^18.3.1; react-router-dom ^6.22.3; three ^0.162.0; openai ^4.28.0`.

**Verified — All declared development dependencies:** `@eslint/js ^9.9.1; @types/react ^18.3.5; @types/react-dom ^18.3.0; @types/three ^0.162.0; @vitejs/plugin-react ^4.3.1; autoprefixer ^10.4.18; eslint ^9.9.1; eslint-plugin-react-hooks ^5.1.0-rc.0; eslint-plugin-react-refresh ^0.4.11; globals ^15.9.0; postcss ^8.4.35; tailwindcss ^3.4.1; typescript ^5.5.3; typescript-eslint ^8.3.0; vite ^5.4.2`.

**Verified — Dependency usage:** Three/Fiber/Drei/postprocessing implement the global background; Framer Motion implements App route transitions; OpenAI is imported by the globally mounted AIChatbox. GSAP imports: **NOT FOUND** in A/src. **Inferred:** remove GSAP after a final import check; drop optional chatbot/OpenAI; lazy-load or remove the decorative WebGL background. No measured bundle size is available. Eager imports establish initial-load inclusion risk, not a verified byte count. The RC hooks plugin and older toolchain warrant compatibility review; vulnerability/deprecation status was not checked online.

**Verified — Environment/services:** Only source env reference is `VITE_OPENAI_API_KEY`. No actual env file/example was found in Arcade's supplied tree. The chatbot calls OpenAI's `gpt-3.5-turbo` directly with `dangerouslyAllowBrowser: true`; images/audio/fonts also depend on external hosts (Unsplash, GitHub-hosted images, Imgur, CodePen audio, Google Fonts). No game backend/database/account service exists.

**Verified — README-versus-code truth table (runtime success untested):**

| Claim | Status | Evidence and limit |
|---|---|---|
| React/TypeScript/Tailwind, Three.js, Motion | EXISTS | A/package.json; A/src/components/Scene.tsx; A/src/App.tsx |
| Multiple games: memory, tic-tac-toe, minesweeper | EXISTS | A/src/games/MemoryGame.tsx, TicTacToe.tsx, Minesweeper.tsx and router |
| Sudoku available to play | PARTIAL | Sudoku.tsx exists; route/card **NOT FOUND** |
| Algorithm practice/visualization | PARTIAL | NumberGuess is high/low guessing; no sorting/complexity or algorithm-step visualization found |
| Cognitive enhancement, reduced fatigue, productivity benefits | NOT FOUND | Marketing in README/Home/About; no measurements or validation study in repository |
| Quick games and breathing exercise | EXISTS | Local game loops; WimHofBreathing.tsx timed phases |
| Seamless desktop/mobile | PARTIAL | Responsive utilities, but Snake keyboard-only and Pong mouse/fixed canvas |
| Lightweight/fast/performance optimized | NOT FOUND | No benchmark; App eagerly imports Scene and games |
| Netlify CI/deployment and device testing completed | NOT FOUND | README URL/claims exist; deployment/CI/test evidence absent from supplied files |
| No login | EXISTS | No auth routes/provider/service in A/src |
| “No distractions” | PARTIAL | Global AI chat and animated background are implemented |
| Multiplayer/user profiles/game history | NOT FOUND | Explicit future goals; no network multiplayer/account persistence |
| Contact/support functionality | PARTIAL | Unrouted Contact.tsx logs form data only; “24/7” text is not a service |

**Verified — Complete game catalog:** Every file below is under [A/src/games](<C:/socialstream/digital-arcade-main/code and stuff/src/games>). All use React local component state; none reports authoritative results or persists game history. “Rules separation” is **Inferred** effort to extract pure rules from UI.

| File/game | Verified state and rules | Verified reachability/dependencies/quality | Inferred rules separation |
|---|---|---|---|
| TicTacToe.tsx | Board, turn, winner; calculateWinner checks 8 lines | Routed, no catalog card; same-device 2-player, no AI/network; React | S: pure winner/transition functions |
| Snake.tsx | Snake/direction/food/pause/score; generateFood, checkCollision, moveSnake; 20×20, 150ms tick | Routed/card; keyboard controls; random food can overlap body, tail checked before removal; unused RPS types; React/GameAudio | M: deterministic ticks, seeded food, input trace |
| MemoryGame.tsx | Cards/flips/moves/bestScore; initializeGame, handleCardClick | Routed/card; duplicated symbols mean some occur four times; random-sort shuffle, nested mutation and uncancelled flip timeouts; best only in memory; React | M: deck seed, isolated transition reducer, timer cleanup |
| NumberGuess.tsx | Target 1–100, attempts/max10/history; startNewGame, handleGuess | Routed/card; high/low hints; parseInt/NaN check, no server; React | S: target kept server-side and guess sequence |
| SpotDifference.tsx | Five fixed coordinates, found set, +100 hit, resetGame | Routed but no card; both pictures use identical URL; absolute coordinates not scaled; React | M: replace content and normalized hit regions; weak reuse value |
| Minesweeper.tsx | Grid/mines/flags/difficulty/gameOver; initializeGrid, revealCell, flag logic | Routed/card; 9/10,16/40,22/99 board/mine presets; unused firstClick protection; mutable nested cells; React/Lucide | M: seed board and replay reveal/flag operations |
| MathAmplitude.tsx | Score/highScore/time60, arithmetic generation/checkAnswer | Routed/card; local in-memory highscore; parseInt answers; timer depends on changing score/time; React/Lucide | S–M: server-issued question IDs, timing and answer ledger |
| CrosswordPuzzle.tsx | PUZZLES; initializeGame, handleCellChange, checkAnswers | Routed/card; medium NODE/GIT intersection conflicts; hard TYPESCRIPT needs 9 rows but grid has 7, so checking can index absent rows; React/Lucide | M: validated puzzle data and independent checker |
| WimHofBreathing.tsx | Breathe/hold/recovery, counts/timers/3 rounds; startSession/resetSession | Routed/card; 30 counted steps at 2.5s, 60s hold, 15s recovery; React/Lucide; completion is elapsed UI state | S for timer; cannot validate actual breathing |
| PingPong.tsx | Canvas refs/local physics, paddle/ball, score/pause/difficulty; RAF effect | Routed/card; 800×400 mouse canvas, first to11; effect restarts on score/pause; frame-dependent motion; React/Lucide/GameAudio | L for trusted physics; keep casual initially |
| Sudoku.tsx | Board/difficulty/selection; generateSudoku, solveSudoku, checkValidPlacement, validateBoard | Unrouted/no card; removes30/40/50 entries without uniqueness proof; React/Lucide | M: server puzzle seed/solution validator, uniqueness check |
| CoinFlip.tsx | Result/counts/last10 history; delayed Math.random flip | Unrouted/no card; React; luck game only | S, but no academic reward recommended |
| RockPaperScissors.tsx | Choices/results/player-computer counts; determineWinner/playGame | Unrouted/no card; random computer; React | S, no trusted skill signal |

**Verified — Registry mismatch:** A/src/App.tsx has ten game routes; A/src/pages/Games.tsx has eight cards (Snake, Memory, Pong, Minesweeper, Crossword, Math, Number Guess, Breathing). Three other game files are unmounted. Scores, best scores and short histories are session-local `useState`; persistent score/streak storage: **NOT FOUND** by source search.

## Interview

**Verified — Annotated tree:**

```text
C:\socialstream\AI-Interviewer-main
  package.json                  concurrently orchestration
  LICENSE                       MIT, 2026 Aftab Alam and Contributors
  README.md / PROJECT_DOCUMENTATION.md / SECURITY.md / CONTRIBUTING.md
  backend/
    package.json / .env.example / BACKEND_STRUCTURE.md
    src/server.js               dotenv, listen, Redis, job cron, Socket.io
    src/app.js                  DB connection, HTTP middleware, route mounts
    src/socket.js               live_answer → streamed Groq response
    src/config/                 db, redis, cloudinary, groq, logger
    src/routes/                 auth, user, resume, interview, session, jobs, admin
    src/controllers/            candidate flow and substantial admin CRUD
    src/models/                 14 Mongoose models
    src/services/               AI/RAG/chunking and multiple job pipelines
    src/middleware/             JWT, admin/RBAC, upload, validation, errors
    src/utils/                  JWT, normalizers, caching/search, ad hoc test
    src/scripts/seedAdmin.js    credential-bearing admin bootstrap
  frontend/
    package.json / .env.example / vite.config.js / vercel.json
    src/main.jsx                QueryClient, BrowserRouter, AdminAuth, AppProvider
    src/App.jsx                 candidate routes eager; admin routes lazy
    src/store/authStore.js      Zustand persisted credentials
    src/context/                active AdminAuth/App; overlapping unused AuthContext
    src/lib/                    candidate/admin Axios and refresh interceptors
    src/services/               overlapping API wrappers
    src/pages/                  candidate, jobs, 15 admin pages
    src/components/             common/UI/navigation/jobs/admin
```

**Verified — Scripts/tooling:** I/package.json runs `dev:backend`, `dev:frontend`, `dev` via concurrently, `install:all`, and backend `start`; dependency `concurrently ^10.0.3`. Backend scripts start/dev node/nodemon src/server.js; build is an echo, test is Jest. Frontend scripts dev/build/preview Vite, lint ESLint with zero warnings. Three npm lockfiles exist. No engines/packageManager/runtime version pin found; docs say Node18+, which is documentation only. Backend/frontend are JavaScript, no TS strictness. Frontend ESLint configuration file: **NOT FOUND** despite lint script. Jest suite files: **NOT FOUND**; B/utils/testRecommend.js is a database/controller exercise, not evidence of automated coverage.

**Verified — Backend runtime dependencies (all):** `@langchain/community ^1.1.24; @langchain/core ^1.1.35; @langchain/openai ^1.3.0; @langchain/textsplitters ^1.0.1; axios ^1.18.1; bcryptjs ^2.4.3; cloudinary ^2.2.0; compression ^1.8.1; cors ^2.8.6; dotenv ^16.4.5; express ^4.18.3; express-async-errors ^3.1.1; express-rate-limit ^7.2.0; express-validator ^7.0.1; groq-sdk ^0.3.3; helmet ^7.1.0; ioredis ^5.10.1; jsonwebtoken ^9.0.2; langchain ^1.2.36; mongoose ^8.2.3; morgan ^1.10.0; multer ^1.4.5-lts.1; multer-storage-cloudinary ^4.0.0; node-cron ^4.5.0; pdf-parse ^1.1.1; pg ^8.22.0; redis ^6.1.0; socket.io ^4.8.3; winston ^3.13.0`. Development: `jest ^29.7.0; nodemon ^3.1.0`.

**Verified — Frontend runtime dependencies (all):** `@tanstack/react-query ^5.100.5; axios ^1.6.8; clsx ^2.1.0; framer-motion ^11.1.3; lucide-react ^0.364.0; react ^18.3.1; react-dom ^18.3.1; react-dropzone ^14.2.3; react-hook-form ^7.51.2; react-hot-toast ^2.4.1; react-icons ^5.6.0; react-markdown ^9.0.1; react-router-dom ^6.22.3; recharts ^2.12.3; socket.io-client ^4.8.3; zustand ^4.5.2`. Development: `@vitejs/plugin-react ^4.3.0; autoprefixer ^10.4.19; eslint ^8.57.0; eslint-plugin-react ^7.34.1; eslint-plugin-react-hooks ^4.6.0; postcss ^8.4.38; tailwindcss ^3.4.3; vite ^5.2.8`.

**Verified — Usage flags:** Active RAG imports `@langchain/openai`; chunking is handwritten. Direct runtime imports of `langchain`, `@langchain/community`, `@langchain/core`, `@langchain/textsplitters`, `ioredis`, and frontend `react-icons`: **NOT FOUND** in searched source. Official `redis` is used through a compatibility wrapper; React Markdown is used by JobDetailsDrawer. React Query is concentrated in jobs/admin hooks while candidate pages largely call Axios directly. **Inferred:** removal candidates require checking remaining peer dependency needs, not blanket deletion by package name. Multer1, pdf-parse1, Groq SDK0.3 and mixed LangChain major versions merit update/compatibility review before exposure; no CVE/deprecation claim or audit result is asserted. Recharts/Motion and job/admin code add optional frontend weight.

**Verified — Environment names, source versus example:**

| Area | Names found |
|---|---|
| Base API/auth (backend example and source) | PORT, NODE_ENV, MONGO_URI, JWT_SECRET, JWT_EXPIRE, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRE, CLIENT_URL, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX |
| AI/storage (backend example and source) | GROQ_API_KEY, OPENAI_API_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET |
| Compression (source) | COMPRESSION_LEVEL, COMPRESSION_THRESHOLD_BYTES |
| Redis (source; absent from example) | REDIS_ENABLED, REDIS_URL, REDIS_HOST, REDIS_PORT, JOBS_CACHE_SEARCH_TTL_S, JOBS_CACHE_DETAIL_TTL_S |
| Jobs (source; absent from example) | ADZUNA_APP_ID, ADZUNA_APP_KEY, APP_ID, APP_KEY, ADZUNA_COUNTRY, ADZUNA_PREFETCH_PAGES, ADZUNA_CACHE_TTL_MS, ADZUNA_TIMEOUT_MS, ADZUNA_MAX_RETRIES, ADZUNA_RETRY_BASE_DELAY_MS, ADZUNA_CB_FAILURE_THRESHOLD, ADZUNA_CB_SUCCESS_THRESHOLD, ADZUNA_CB_OPEN_TIMEOUT_MS, ADZUNA_POOL_MAX_SOCKETS, ADZUNA_POOL_MAX_FREE_SOCKETS |
| Optional job PostgreSQL (source) | DATABASE_URL, PG_URL, PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, PGSSL |
| Frontend | VITE_API_URL in source/example; VITE_APP_NAME example-only, source use NOT FOUND |

**Verified:** Actual Interview env files were **NOT FOUND** in the supplied tree; deployed values were not inspected. Required active providers are MongoDB, Groq and current Cloudinary upload storage; OpenAI supplies the normal RAG path but has a degraded text fallback. Redis/Adzuna/Postgres relate to optional jobs/admin and can be disconnected.

**Verified — README/repo-description truth table:**

| Claim | Status | Source evidence and limitation |
|---|---|---|
| PDF resume upload, extraction, semantic chunking | EXISTS | B/middleware/upload.middleware.js; resume.controller.uploadResume; chunkResumeAndJD. DOC/DOCX accepted but not text-parsed by uploadResume |
| LangChain/OpenAI RAG | EXISTS | rag.service.createAndStoreEmbeddings + cosine retrieval; ephemeral vectors, not a persisted vector DB |
| Topic-based question generation | PARTIAL | ai.service.generateTopicQuestions exists but active controller calls generateInterviewQuestions without topic input |
| Live follow-up via Socket.io | EXISTS | live_answer / ai_chunk / ai_complete; optional ephemeral feedback, not answer persistence |
| Evaluate every answer in real time | PARTIAL | completeSession evaluates submitted answers in a batch on completion; live stream is a separate prompt |
| Final detailed report | EXISTS | Session model, SessionResultPage category radar/per-answer bars; numeric rubric subdimensions absent |
| History/dashboard/performance analytics | EXISTS | user.controller.getDashboard; DashboardPage, SessionHistoryPage; no Core/Hub scope |
| Voice interviews | PARTIAL | InterviewSessionPage SpeechRecognition/webkitSpeechRecognition + speechSynthesis; browser-dependent voice typing/TTS, no audio transport/transcription backend |
| Email OTP | NOT FOUND | No OTP route/controller/model/mail dependency in inspected source |
| Google auth | NOT FOUND | Login/Register are password forms; auth.routes has register/login/refresh/me/logout only |
| Secure JWT auth | PARTIAL | HTTP protect exists; socket unauthenticated; unsafe admin email privilege special-case |
| Admin dashboard | EXISTS | App admin routes, backend admin.routes/controllers; ATS page is “Coming Soon” |
| Job listings/recommendations | EXISTS | Adzuna search, Mongo sync, optional PG fallback, jobMatchService skill overlap ≥60%; not an LLM-quality ranking guarantee |
| Cloudinary storage | EXISTS | CloudinaryStorage, Resume.fileUrl/publicId, controller upload/delete |
| Redis/ioredis cache for API responses | PARTIAL | redis compatibility client and jobs caches; not general API caching; ioredis runtime use NOT FOUND |
| Zustand/React Query/forms/charts/toasts/markdown | EXISTS | authStore, useJobs/useAdminQuery, NewInterviewPage, SessionResultPage, toast calls, JobDetailsDrawer |
| React Icons | PARTIAL | Declared dependency; actual imports NOT FOUND |
| Billing/refunds/webhooks in admin guide | PARTIAL | adminPayment seeds mock transactions; refunds mutate Mongo only; live payment integration NOT FOUND |
| Automated tests | PARTIAL | Jest dependency/script; actual suite NOT FOUND; testRecommend is ad hoc |
| Production/demo deployment works | NOT FOUND | Frontend rewrite exists; public runtime not accessed |


**Verified — Frontend page/component map:** F/App.jsx mounts candidate LandingPage, auth/LoginPage, auth/RegisterPage, dashboard/DashboardPage, interview/NewInterviewPage, InterviewListPage, InterviewSessionPage, SessionResultPage, session/SessionHistoryPage, resume/ResumesPage, profile/ProfilePage, Jobs and RecommendedJobs. Admin pages are AdminLoginPage, AdminDashboardPage, AdminUsersPage, AdminInterviewsPage, AdminSessionsPage, AdminResumesPage, AdminJobsPage, AdminAtsPage, AdminSubscriptionPage, AdminPaymentsPage, AdminAnalyticsPage, AdminSettingsPage, AdminScraperPage, AdminPromptsPage and AdminLogsPage. These names map to files in F/pages and its named subfolders.

**Verified — Shared components/state:** Layouts are AuthLayout, DashboardLayout and AdminLayout. Navigation components are Sidebar/Topbar; jobs use SearchBar, FiltersPanel, JobsList, JobCard, Pagination, JobDetailsModal and JobDetailsDrawer. Admin components include ErrorBoundary, SuspenseLoader, AdminSidebar/MobileDrawer, AdminTopbar/Breadcrumb/NotificationDropdown/UserMenu; common and ui use index.js barrels. Zustand authStore persists user/accessToken/refreshToken; useAuth wraps it. QueryClientProvider configures retry1/no focus refetch; useJobs/useAdminQuery use TanStack Query. AppContext holds sidebar/loading/theme state; AdminAuthContext maintains a second localStorage identity; old AuthContext is not mounted. Local useState and direct Axios dominate the candidate workflow. Component internals outside the critical workflow were inspected only selectively, as recorded in section14.

## Learn

**Verified — Annotated tree:**

```text
C:\socialstream\MargaAI-master
  README.md / CLAUDE.md / AGENTS.md
  package.json / next.config.ts / tsconfig.json
  eslint.config.mjs / postcss.config.mjs / drizzle.config.ts
  scripts/                      seven ad hoc DB/Clerk/quiz utilities; no curriculum seed
  src/proxy.ts                  Clerk middleware and public-route matcher
  src/db/index.ts               pg Pool(max10), Drizzle
  src/db/schema.ts              eight tables; Clerk IDs; local Aura
  src/db/migrations/            0000,0001,0002 SQL plus metadata
  src/services/                 12 agents/services, including Aura and streak
  src/app/
    layout.tsx / page.tsx / globals.css
    sign-in/[[...sign-in]]/     Clerk SignIn
    sign-up/[[...sign-up]]/     Clerk SignUp
    onboarding/                client intake
    dashboard/                 client layout/context, graph, leaderboard
    module/[nodeId]/            server component + JIT resource fetch
    quiz/                      client grading and theta update
    profile/                   server Clerk profile + local progress
    settings/                  Clerk UserProfile
    leaderboard/               separate server-rendered local Aura ranking
    design-system/             showcase
    api/                       20 route handlers, detailed below
  src/components/              graph, roadmap, popover, stats, tutor, navigation
  public/                       scaffold SVGs
```

**Verified — Repo instructions:** [CLAUDE.md](C:/socialstream/MargaAI-master/CLAUDE.md) delegates to [AGENTS.md](C:/socialstream/MargaAI-master/AGENTS.md), which requires reading the installed Next documentation before writing code. No application code is being written, and node_modules inspection is excluded by this audit's instructions. Framework API feasibility below is therefore a proposal to validate in the early spike, not a claim based on an installed Next runtime.

**Verified — Scripts/tooling:** npm lockfile exists; `dev=next dev`, `build=next build`, `start=next start`, `lint=eslint`. No Node engines or packageManager pin found. README's Node18+ is not a verified runtime requirement. `@types/node ^20` is a types package, not a Node version pin. TS strict=true, allowJs=true, noEmit, Next plugin, `@/* → ./src/*`; numerous `any`/`@ts-ignore` weaken static coverage. ESLint uses Next core-web-vitals and TypeScript presets. No test script/framework/suite found; scripts named test_* access live DB/HTTP/Clerk and are not isolated tests.

**Verified — All runtime dependencies:** `@clerk/nextjs ^7.8.3; @google/genai ^2.19.0; cheerio ^1.2.0; dotenv ^17.4.2; drizzle-orm ^0.45.2; next 16.3.3; pg ^8.23.0; react 19.2.8; react-dom 19.2.8; react-force-graph-3d ^1.29.1; recharts ^3.10.1; three ^0.185.1`.

**Verified — All development dependencies:** `@tailwindcss/postcss ^4; @types/node ^20; @types/pg ^8.23.1; @types/react ^19; @types/react-dom ^19; @types/three ^0.185.4; drizzle-kit ^0.31.10; eslint ^9; eslint-config-next 16.3.3; tailwindcss ^4; typescript ^5`.

**Verified — Usage flags:** Clerk is spread across proxy, pages, components, routes and scripts. Cheerio parses roadmap.sh HTML; pg/Drizzle power all persistent state; Gemini handles planning, questions, embeddings, reranking and tutoring. Three/react-force-graph-3d are loaded through SkillGraph/ForceGraph3D dynamic components; Recharts is used in DashboardPage. **Inferred:** keep Learn independently built; do not force its React19/Tailwind4/Three185 packages into CollegeHubs' React18/Tailwind3/Arcade Three162 tree.

**Verified — Environment/services:** Source names `DATABASE_URL, GEMINI_API_KEY, YOUTUBE_API_KEY, NODE_ENV`. README also names `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_SIGN_IN_URL, NEXT_PUBLIC_CLERK_SIGN_UP_URL, NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL, NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`. Actual env/example file: **NOT FOUND** in supplied Learn tree. PostgreSQL needs vector support; configured host being Neon/pooling endpoint is unverified. Server calls include Gemini (hardcoded `gemini-3.6-flash` and `gemini-embedding-001`), YouTube search, Wikipedia and roadmap.sh. Model availability and service quotas were not queried.

**Verified — App Router/API map:** No `"use server"` server action implementation found in L/src; server components and route handlers implement the server work. All paths here are current unprefixed paths.

| Handler path under L/src/app/api | Methods/function | Current responsibility/auth |
|---|---|---|
| dashboard/domains/route.ts | GET | auth(); learner's joined domains |
| dashboard/graph/route.ts | GET | auth(); global nodes plus personal states/prerequisite edges; no local 401 if absent, relies on proxy |
| dashboard/stats/route.ts | GET | auth(); local Aura/tier/streak/activity counts |
| dashboard/milestones/route.ts | GET | auth(); recent local auraEvent joined to nodes |
| dashboard/leaderboard/route.ts | GET | global top50 local points; clerkClient names; relies on proxy |
| onboarding/route.ts | POST | auth(); dynamic DAG/init graph/self-rating and eligibility |
| onboarding/profile/route.ts | POST | auth(); Gemini goal → domain + three seed topics |
| learner/intake/route.ts | POST | auth(); ProfilerAgent.processSelfRating |
| learner/init-graph/route.ts | POST | auth(); initializeLearnerGraph |
| ingest-roadmap/route.ts | POST | imports auth but protection commented out; proxy only; scrape/cache |
| generate-dag/route.ts | POST | proxy only; PlannerAgent.generateDAG |
| process-llm/route.ts | POST | proxy only; tag/embed up to10 global content items |
| recommendation/route.ts | POST | auth(); RetrieverAgent.getRecommendation |
| quiz/generate/route.ts | POST | proxy only; caller controls count; returns generated bank including rubric |
| quiz/next/route.ts | POST | auth(); accepts previousResult/newTheta; returns answer key |
| quiz/finalize/route.ts | POST | auth(); trusts earned/total; fire-and-forget streak write |
| tutor/fast/route.ts | POST | auth(); template explanation, no LLM |
| tutor/slow/route.ts | POST | auth(); embedding/retrieval/Gemini and prompt cache |
| profile/path/route.ts | DELETE | auth(); removes user's domain states/skillVector entry |
| roadmap/delete/route.ts | POST | auth(); deletes all user's Aura events, states and learner |

**Verified — Schema, relations and indexes:** Evidence: [schema.ts](C:/socialstream/MargaAI-master/src/db/schema.ts) and the three SQL migrations.

| Table | Columns/relationships | Keys/indexes and limits |
|---|---|---|
| learner | id (comment: Clerk user id), createdAt, skillVector JSON, careerGoal, interests[], preferredFormat, auraPoints, auraTier, streakDays, lastActive | text PK id; no hubId |
| roadmap_source_cache | trajectorySlug, fetchedAt, rawTopicTree JSON, matchedRoadmapIds[] | PK trajectorySlug; no TTL enforcement in adapter |
| content_item | id, source, title,url,description,resourceSummary,domain,topicTags[],estimatedDifficulty,embedding vector(3072) | PK id; no URL unique/vector index declared |
| skill_node | id,domain,category,label,difficulty,prerequisiteIds[],linkedContentIds[],checkpointItemBank[] | PK id; arrays are not relational FKs |
| learner_node_state | learnerId,nodeId,status,testOutEligible,testOutAttempted,thetaEstimate,lastCheckpointScore,attempts,seenQuizItemIds[],personalizedPrerequisiteIds[] | FKs to learner/skill_node; indexes learner_status_idx and learner_node_idx are **non-unique**; no PK/unique pair |
| llm_cache | id,promptHash,response,createdAt | PK id; unique promptHash; no expiry |
| quiz_item | id,nodeId,mode,prompt,answerType,correctAnswerOrRubric JSON,irtDifficultyB,pointValue | PK id; node FK; no per-attempt ownership/session table |
| aura_event | id,learnerId,nodeId,type,pointsAwarded,breakdown JSON,createdAt | PK id; learner/node FKs; random UUID awards, no business-event uniqueness |

**Verified:** No Drizzle `relations()` definitions or Hub column found. SQL FK actions are NO ACTION. Migration0000 creates domain enums, vector1536 and completed_nodes; 0001 changes vector3072/adds personalized prerequisites; 0002 adds llm_cache/nonunique indexes. Migrations do **not** add the current learner careerGoal/interests/preferredFormat, skill_node.category, source enum wikipedia/youtube, or change the old domain enums to text. `CREATE EXTENSION vector`: **NOT FOUND**. **Inferred:** a fresh migration-only database will not match the current code; production may have been modified by drizzle-kit push, but that was not inspected.

**Verified — Roadmap presence/counts:** No checked-in curriculum seed dataset or seed script is present. PlannerAgent.generateArbitraryDAG requests about10–15 nodes on demand and reuses any existing nodes for that domain; generateDAG consumes ingested resources. Source enums mention frontend/backend/data_science/dsa/devops; actual schema domain fields are text. RoadmapAdapter.normalizeItems explicitly maps only frontend/backend/devops and defaults everything else to frontend.

| Requested curriculum | Verified checked-in seeded nodes | Source support |
|---|---:|---|
| DSA | 0 | dsa label in services/old schema enum; curated roadmap NOT FOUND |
| Web/frontend | 0 | frontend ingestion mapping; dynamic DAG |
| ML | 0 | no curated ML graph; machine-learning appears as prompt example; data_science supported as domain concept |
| Backend | 0 | backend ingestion mapping; dynamic DAG |
| DevOps | 0 | devops ingestion mapping; dynamic DAG |

**Verified:** “0” counts repository seed records, **not** rows in a running database. Live counts are unknown. Hardcoded example node IDs in diagnostic scripts do not constitute curricula.

**Verified — README-versus-code truth table:**

| Claim | Status | Source evidence and limitation |
|---|---|---|
| Personalized curriculum from career goal/current skill | EXISTS | onboarding/profile → onboarding → PlannerAgent/learner state; current ratings set seed theta |
| Interconnected Frontend/Backend/DevOps/Data Science/DSA mastery graphs | PARTIAL | generic graph/progression exist; zero supplied curated seed nodes; domain misclassification noted above |
| Aura, daily streaks, tiers, test-out | EXISTS | AuraEngine/StreakService/ProgressAgent/schema; currently insecure and contrary to Core ownership |
| JIT high-quality YouTube tutorials for any concept | PARTIAL | RoadmapAdapter.search max5 + Wikipedia fallback; relevance/quality not verified or ranked editorially |
| Adaptive IRT estimates true proficiency | PARTIAL | actual Rasch-style update and closest difficulty selection; client-controlled, uncalibrated items, inconsistent theta scales |
| Next.js15 | PARTIAL | Next App Router exists; manifest says16.3.3 |
| Server components | EXISTS | ModulePage/ProfilePage/root layout |
| Server Actions | NOT FOUND | no use-server implementation in L/src; route handlers used |
| Neon with pooling | PARTIAL | pg.Pool max10 exists; DATABASE_URL provider/pool endpoint unverified |
| Clerk/Gemini/YouTube/Wikipedia/Drizzle | EXISTS | imports/routes/services above |
| Custom glassmorphic CSS | EXISTS | globals.css, inline styles and Tailwind4 |
| Deploy to Vercel and it works automatically | PARTIAL | Next project structure; no basePath; migration/provider/runtime prerequisites unresolved |

# 3. What Already Exists (per module)

**Inferred — “Keep as-is” boundary:** Keep the following algorithms/presentation concepts where possible; none of the authenticated, scoring or persistence boundaries is approved for deployment unchanged. License gates still apply.

| Module | Verified reusable implementation | Inferred retention decision |
|---|---|---|
| Arcade | TicTacToe.calculateWinner, NumberGuess high/low rules, Sudoku placement/board checks in A/src/games | Preserve pure rule concepts when extracting/tested; fix generation and expose only server-verified completions |
| Arcade | Existing board/grid controls, Minesweeper/Memory/Math UI; GameAudio opt-in control | Reuse presentational pieces; repair reset/timing/input issues and replace hardcoded theme |
| Arcade | pages/Games.tsx card gallery | Reuse layout; replace duplicated registry with a single manifest |
| Interview | resume.controller upload/list/default/delete flow; PDF extraction | Preserve candidate workflow, ownership constraints and parse-status concept; storage implementation decision separate |
| Interview | chunking.service.chunkResumeAndJD and utils/normalizer.js | Keep lightweight splitting/normalization if direct bounded prompts need prioritization |
| Interview | Interview/Resume/Session domain models and HTTP CRUD | Keep domain concepts with Core IDs/Hub scope; remove User relation dependency |
| Interview | NewInterviewPage, InterviewListPage, InterviewSessionPage, SessionResultPage, SessionHistoryPage, ResumesPage | Keep user journeys; replace identity/routes/theme and correct saved-answer/LLM failure behavior |
| Interview | HTTP error middleware, Helmet/compression, validation helpers | Retain foundations; add operation-specific limits and sanitized provider errors |
| Learn | PlannerAgent.removeCycles drops self-loops, invalid prerequisites and back edges | Keep guard algorithm; add duplicate IDs/domain validation and curriculum versioning |
| Learn | LearnerStateService unlockEligibleDownstreamNodes/evaluateTestOutEligibility | Keep graph semantics; enforce unique states, access and consistent scale |
| Learn | SkillGraph/RoadmapView/NodePopover; dynamic ForceGraph3D | Keep graph and list UI; add accessible small-device fallbacks and theme variables |
| Learn | TutorAgent.getFastPathExplanation | Keep deterministic explanation route; useful without Gemini |
| Learn | RoadmapAdapter YouTube→Wikipedia fallback and resource-link persistence | Preserve bounded fallback concept; fix domain map, caching and ownership |
| Learn | Drizzle schema organization and service/route separation | Preserve PostgreSQL ownership; repair schema drift and trusted attempts before events |

**Verified — Interview end-to-end flow and exact seams:**

| Step | Active files/functions/models | Reality and failure behavior |
|---|---|---|
| 1 Upload | ResumesPage → resumeAPI.upload → POST /api/resumes/upload; upload.middleware CloudinaryStorage; resume.controller.uploadResume | Protected HTTP; 5MB MIME filter allows PDF/DOC/DOCX; Cloudinary raw file saved |
| 2 Parse | uploadResume fetches uploaded PDF, pdf-parse; Resume.extractedText/parseStatus; parseResume → parseResumeAndJD | Only PDFs auto-extract; truncates text8000 chars; Groq parser JSON prompt category resume_parser; failed AI enrichment can leave text usable |
| 3 Chunk/RAG | ai.service.generateInterviewQuestions → rag.extractContextViaRAG → buildSemanticChunks → chunkResumeAndJD/normalizeChunks → createAndStoreEmbeddings | OpenAI text-embedding-3-small, memory vectors; cosine selection + section metadata; optimizer rewrites two retrieval goals through Groq |
| 4 Generate | POST /api/interviews/:id/generate → interview.controller.generateQuestions → generateInterviewQuestions | llama-3.3-70b-versatile, temp0.7, max4096, JSON; inline technical/behavioral prompt, not the dead topic pipeline; generationStatus updated |
| 5 Start/save Q&A | session.controller.startSession, submitAnswer; Session/Interview; InterviewSessionPage | HTTP creates/resumes active session and saves answers; UI does not hydrate savedAnswers from resumed session; save errors are swallowed before advancing |
| 6 Optional live feedback | B/socket.initSocket; live_answer → ai_chunk/ai_complete/ai_error; F/InterviewSessionPage | Groq streaming, max150/temp0.5; SystemPrompt category interview; no socket auth/room/session ID/persistence |
| 7 Evaluation | POST /api/sessions/:id/complete → completeSession → ai.evaluateAnswer | Promise.all over submitted answers; ats_scorer prompt asks correctness/clarity/depth, returns single1–10 score and text; error becomes0 |
| 8 Report | ai.generateOverallFeedback; Session.calculateOverallScore; SessionResultPage | LLM prompt asks1–100 overall (schema permits0–100) and overrides arithmetic fallback; strengths/weaknesses/tips stored; charts derive category means from answer scores |

**Verified — RAG necessity versus implementation:** The current RAG fallback returns only the first1000 characters each of JD and resume. It is not equivalent to intentionally sending the full bounded resume directly. Vectors are recomputed for requests, not retained in Mongo/Redis. The exported senior/strict/follow-up/final-report/grounding/topic functions in ai.service.js have no active route callers found outside their internal topic chain.

**Inferred — Lean RAG choice:** Replace extractContextViaRAG at generateInterviewQuestions with a bounded, clearly delimited resume+JD context builder, retaining local chunk prioritization. The existing maxima (resume8000 chars, JD5000) are a manageable input-size starting point, not proof of any provider's current context window. Budget tokens together with prompt/output, reject oversize requests and verify the chosen model's actual limits during implementation. This removes OpenAI billing and two query-optimization Groq calls per generation; longer direct input can raise Groq input tokens. Retain RAG later only if evaluation demonstrates a benefit on realistic documents.

**Verified — Learn adaptive assessment:** QuizPageContent.submitAnswer implements `P=1/(1+exp(-(theta-b)))`, `theta'=clamp(theta+0.5*(actual-P),1,5)`; MCQs are graded against the answer sent by the server. Legacy short answers receive actualScore=1 in client logic (normal rendering now expects MCQs). AssessmentService accepts the newTheta, saves seen IDs, selects unseen same-mode items closest to theta, and generates five more if empty. Checkpoint uses5 questions, test-out10. QuizAgent asks Gemini for MCQs and difficulty b, then sets pointValue=max(1,round((b+3)*5)). No empirical item calibration, uncertainty estimate, calibrated bank or server attempt ledger found.

**Inferred:** This is a real adaptive heuristic, not a blank stub, but not a validated proficiency estimator. With sufficient unseen bank items, selection/grading need no LLM call; empty/exhausted bank triggers generation. At least5 checkpoint and10 test-out items per node/mode are needed for one such run, with a larger spread (e.g.20–30 editorially reviewed items across difficulties) proposed for repeatable demos. The actual bank size is unknown. Standardize theta: ProfilerAgent uses -1.5/-0.5/0.5/1.5, onboarding uses1/2/3.5, quiz clamps1–5, and Retriever's prompt describes -3…+3.

**Verified — Interview local User dependency inventory:** Direct User-model imports occur in B/controllers/auth.controller.js, adminAuth.controller.js, user.controller.js, session.controller.js, admin.controller.js, adminLog.controller.js, adminPlan.controller.js, adminScraper.controller.js, adminPayment.controller.js and adminAnalytics.controller.js; B/middleware/auth.middleware.js and adminAuth.middleware.js; B/scripts/seedAdmin.js; and B/utils/testRecommend.js. User refs occur in Resume, Interview, Session, Job, Plan, Transaction, InterviewTemplate, AuditLog and SystemPrompt models (including prompt history authors). Controllers for resume/interview/session/jobs depend on req.user._id even where they do not import User. Profile/password/dashboard counters, admin population/analytics and candidate/admin frontend identity stores therefore need replacement or removal together. These are module-local references, not permission to import Core collections.

**Verified — Socket transport and reconnect:** B/socket.js has no room joins, handshake verification, persistent conversation, message ID or application-level replay/resume protocol. InterviewSessionPage connects with withCredentials and listens for ai_chunk/ai_complete/ai_error, then disconnects on unmount; it specifies no custom reconnect/resynchronization handler. HTTP persists answers separately. **Inferred:** default library transport reconnection alone cannot resume a lost stream or recover saved answer UI. A separate Interview origin is feasible after explicit origin/path/auth configuration; include request IDs, owned session lookup, cancellation and resynchronization rather than treating the stream as the result ledger.

# 4. What Must Change (per module)

**Inferred — Table semantics:** “Current behavior” is **Verified** from cited source; “Required change”, sizes and risks are **Inferred** integration tickets. Risk means impact if left unresolved.

## Arcade

| Item | Current behavior (file) | Required change | Effort S/M/L | Risk |
|---|---|---|---|---|
| Permission | contributor-only README license | Establish CollegeHubs reuse/distribution permission before copying/shipping | S engineering; external delay unknown | Blocker |
| Identity | A/src/App.tsx no login/backend | Verify Core grants in new Arcade service; no local registration | M | Forged results/Hub access |
| Result trust | all games local state/Math.random | Introduce server-created sessions and per-game replay/checkers; raw UI counters cannot award Aura | L | Unlimited forged rewards |
| Registry/routes | 10 routes,8 cards,3 unmounted games | Single registry, /arcade base, lazy game imports, remove duplicated router if ported | M | Broken deep links/import bloat |
| Broken games | SpotDifference identical images; Crossword medium/hard defects; Memory duplicates | Exclude until fixed; validate fixtures before enabling awards | M | Demo cannot be completed |
| Timing/input | Snake keyboard, Pong mouse/fixed pixels; reset timeouts | Accessible touch/keyboard controls, cancellation, deterministic replay time model | M–L | Mobile failures and false validation |
| Browser secret | AIChatbox creates OpenAI client globally | Remove optional chatbot/key from client; separate backend feature only if explicitly wanted | S | Credential/billing exposure |
| Theme | index.css purple neon; all game utility colors; Background colors | Adopt Hub CSS variables; retain semantic success/error/game markers | M | Inconsistent branding/accessibility |
| Performance | Scene continuous Canvas/postprocessing; eager game imports | Make visual effects opt-in/lazy, reduced-motion fallback, resource cleanup | M | GPU/battery/initial-load cost |
| Persistence | scores/highscores state-only | Persist validated domain results in Arcade DB; Core owns Aura/streak; historical data migration not needed from source state | M | Lost results/replay |
| Environment | VITE_OPENAI_API_KEY only | Remove it; add server-only Core trust/service-key/Arcade DB config and public service origin | S | Secret leak |

## Interview

| Item | Current behavior (file) | Required change | Effort S/M/L | Risk |
|---|---|---|---|---|
| Auth | B/auth.controller, auth.middleware, jwt.utils; F/authStore/lib/axios | Replace password/login/register/refresh with RS256 Core verification/session bootstrap; remove module credential persistence | L | Parallel identities and stale sessions |
| User model | local ObjectId refs, User profile/password/count/admin operations | Store Core sub as string userId + hubId on Resume/Interview/Session; optional non-authoritative profile snapshot; remove User password/roles | L | Cross-service ID confusion |
| Hub ownership | queries filter userId, no hubId; Resume.findById during generation | Derive identity from verified principal; enforce userId+hubId on every related read/write/populate | M | Resume IDOR and cross-Hub leakage |
| Admin | designated-email privilege promotion; separate admin auth/seed | Remove admin module for MVP; if kept, require explicit Core permissions with scoped queries | M | Privilege escalation/default credential |
| Socket | socket.js no auth/rooms/rate/timeout; caller supplies question | Verify handshake JWT/audience/Hub; accept sessionId/questionId and load owned canonical question; cap/correlate requests | L | Anonymous LLM spend/data confusion |
| Completion | completeSession race, Promise.all, error→0, multi-document writes | Atomic active→evaluating transition; bounded evaluation; explicit failed/retry state; immutable report before event | L | Duplicate/inaccurate rewards |
| Raw report | final overall is nondeterministic LLM value; missing questions excluded from fallback | Version rubric; validate0–10 values; derive normalized raw grade consistently including unanswered items; Core maps to Aura | M | Unstable/noncomparable grades |
| Event handoff | Core event emission NOT FOUND | Persist stable eventId/delivery status with Session; POST after report commit; same ID on retry | M | Lost/double Aura |
| Prompts/topics | active generation omits questionTypes/topics; dead topic helpers | Add bounded weakSkills/topic IDs in model/controller/prompt and UI; honor questionTypes | M | Cross-feature appears wired but ignored |
| Jobs/Redis/PG | app routes + startup cron + multiple pipelines | Remove complete optional jobs/admin branch, Redis clients/startup and PG pool | M | Hidden external dependencies/cold-start failures |
| Storage | upload uses CloudinaryStorage, Resume requires URL/publicId | Keep hardened Cloudinary initially or replace with bounded memory PDF parse + text persistence/private storage; revise schema/UI/delete path | M | Broken uploads/orphan files/PII |
| LLM limits | config/groq no explicit timeout/operation cap; shared HTTP limiter only | Per-user/session quotas, bounded request sizes/concurrency/timeouts and visible retryable failures | M | Rate-limit demo failures |
| Frontend mount | BrowserRouter root; root-relative paths; VITE_API_URL used for HTTP+socket | Own /interview build/base; separate HTTP base and socket origin/path; Core nav/auth/theme shell | M | Socket connects to /api namespace by mistake |
| Theme | tailwind brand/surface literals; main toast and global index.css | Map palette to common CSS variables; scope styles if ever ported | M | Core CSS conflicts |
| Env | local JWT, job/Redis/PG/OpenAI and storage keys | Delete unused deployment config after stripping; add Core public key, issuer/audience, service key; no browser service key | S | Misconfiguration/secrets |

## Learn

| Item | Current behavior (file) | Required change | Effort S/M/L | Risk |
|---|---|---|---|---|
| Licensing | LICENSE/reuse permission NOT FOUND | Obtain rights/permission statement before redistribution | S engineering; external delay unknown | Blocker |
| Clerk replacement | proxy/layout/pages/APIs/scripts below | Core grant→HttpOnly cookie; shared requireCoreSession/getCoreSession and client identity provider | L | Login loops or unprotected endpoints |
| Identity migration | learner.id Clerk text PK, FK references | Fresh data: Core sub + hub scope; retained data: explicit verified old-ID→Core-ID mapping and FK-safe migration | L | Orphan/wrong-user progress |
| Quiz authority | assessmentService returns answer key and trusts points/theta | Server attempt/question ledger; client sends answers only; score/theta finalized server-side; no early answer disclosure | L | Trivial infinite mastery/Aura |
| Replay/eligibility | finalize lacks immutable attempt/state guards; no unique learner-node pair | Unique scoped learner-node and attempt IDs; enforce unlocked/test-out eligibility; exactly-once completion | L | Repeated rewards/duplicate rows |
| Core Aura | AuraEngine, StreakService, learner columns, aura_event | Disable local reward formulas/writes; emit verified facts; query Core reward summary for display | L | Two competing scoring systems |
| Schema bootstrap | SQL behind schema; vector extension not created | Reconciled versioned migrations, dedupe states, add unique keys; verify empty DB setup | M | First-deploy runtime errors |
| Curriculum | generated global domain graph; no seed data; fallbackdomainfrontend | Version a small curated seed; namespace IDs; fix domain normalization; distinguish private remedial from shared nodes | L | Wrong subjects/global pollution |
| Ownership | graph lists global remedial nodes; ModulePage fetches content before checking state | Enforce enrollment/Hub scope before JIT/assessment; separate immutable global curriculum from personal nodes | M | Cross-user content leakage/spend |
| External limits | most fetch/AI calls no explicit timeout/quota; quiz count unbounded | Bound inputs/generation, cap per-user spend, pool concurrency and timeouts; controlled fallback | M | Quota/function timeout |
| Transactions | failed attempts call remedial generation inside ProgressAgent transaction | Generate bounded remedial proposal outside DB transaction; validate/commit afterward | M | Long locks/connection exhaustion |
| Base path | next.config empty; raw fetch('/api/...') and redirects/root URLs | /learn basePath and path-aware request helper; preserve prefix in main rewrite; cookie/matcher/deep-link checks | M | Routing/asset/auth failures |
| Theming | globals CSS variables plus hardcoded inline/Three palettes | Set known theme tokens server-side from trusted hubId; update NodePopover/quiz/graph/chart hardcodes | M | Inconsistent themes |
| API admin scope | generate-dag/process-llm/quiz-generate rely solely on Clerk proxy | Explicit role/scope guards or disable maintenance APIs in demo; bounded count/slug | M | Any member mutates global curriculum |
| Dead/demo utilities | global cleanup scripts, placeholder leaderboard identity | Exclude destructive scripts from operational flows; consolidate leaderboard to Core | S | Accidental data loss/misleading UI |

**Verified/Inferred — Exhaustive direct Clerk touch map:** Current references are Verified; replacements/sizes are Inferred. L-relative labels refer to the absolute root above.

| File and function/component | Verified Clerk touch | Inferred replacement | Effort |
|---|---|---|---|
| package.json | @clerk/nextjs | remove after no imports remain | S |
| src/proxy.ts default clerkMiddleware | auth()/auth.protect(), createRouteMatcher | public handoff/static allowlist; session guard; API401, navigation to Core login | M |
| src/app/layout.tsx RootLayout | ClerkProvider, auth(); imported SignInButton/UserButton | server session/theme lookup + minimal client session provider; remove unused imports | M |
| src/components/Navbar.tsx Navbar | auth(), SignInButton, UserButton | Core user/menu/login link | S |
| src/components/TutorChat.tsx TutorChat | useAuth() | read client session context; server still authorizes | S |
| src/app/page.tsx Home | auth(), SignInButton | authenticated Learn landing or Core login entry | S |
| src/app/dashboard/layout.tsx DashboardLayout | useAuth() | server bootstrap/client context isLoaded,userId,hubId | M |
| src/app/onboarding/page.tsx OnboardingPage | useAuth() userId | Core context; preserve preference onboarding, remove identity onboarding | S |
| src/app/module/[nodeId]/page.tsx ModulePage | auth(), redirect('/sign-in') | requireCoreSession before node/state/resource work | M |
| src/app/profile/page.tsx ProfilePage | auth(), currentUser() | session identity / scoped Core profile API; no Clerk image/email assumption | M |
| src/app/settings/page.tsx SettingsPage | UserProfile | Core account-settings link; keep Learn preferences separately | S |
| src/app/sign-in/[[...sign-in]]/page.tsx SignInPage | SignIn | remove; redirect obsolete URL to Core login/handoff | S |
| src/app/sign-up/[[...sign-up]]/page.tsx SignUpPage | SignUp | remove; Core registration link only | S |
| src/app/api/dashboard/domains/route.ts GET | auth() | requireCoreSession + scoped states | S |
| src/app/api/dashboard/graph/route.ts GET | auth() | requireCoreSession; scope personal graph | M |
| src/app/api/dashboard/stats/route.ts GET | auth() | progress only; Core supplies Aura/streak/tier | M |
| src/app/api/dashboard/milestones/route.ts GET | auth() | domain completion records rather than local reward ledger | M |
| src/app/api/dashboard/leaderboard/route.ts GET | clerkClient().users.getUserList | scoped Core leaderboard/names; delete local rank calculation | M |
| src/app/api/onboarding/route.ts POST | auth() | requireCoreSession + scoped learner | S |
| src/app/api/onboarding/profile/route.ts POST | auth() | requireCoreSession + Gemini quota | S |
| src/app/api/learner/intake/route.ts POST | auth() | requireCoreSession | S |
| src/app/api/learner/init-graph/route.ts POST | auth() | requireCoreSession + unique scoped state inserts | M |
| src/app/api/ingest-roadmap/route.ts POST | unused auth import, commented protect | explicit maintenance permission or remove endpoint | S |
| src/app/api/recommendation/route.ts POST | auth() | requireCoreSession + enrollment check | S |
| src/app/api/quiz/next/route.ts POST | auth() | requireCoreSession + owned server attempt | M |
| src/app/api/quiz/finalize/route.ts POST | auth() | requireCoreSession + immutable attempt finalize | M |
| src/app/api/tutor/fast/route.ts POST | auth() | requireCoreSession + owned enrolled node | S |
| src/app/api/tutor/slow/route.ts POST | auth() | requireCoreSession + scoped query limits | S |
| src/app/api/profile/path/route.ts DELETE | auth() | requireCoreSession + CSRF and scoped delete | S |
| src/app/api/roadmap/delete/route.ts POST | auth() | scoped Learn reset; never delete Core identity/Aura | M |
| src/db/schema.ts learner.id | Clerk-key comment/foreign-key model | Core IDs and Hub membership key migration | L |
| scripts/test_clerk.ts test | clerkClient user lookup/logging | retire; future Core session test fixture | S |
| scripts/cleanup_learners.ts cleanup | first Clerk user-list page determines deletions | retire; never use this as Core migration | S |
| README.md | Clerk setup/key names | Core trust/handoff deployment instructions | S |

**Verified — Related indirect consumers:** L/src/app/dashboard/DashboardContext.tsx passes userId/isLoaded; dashboard/page.tsx and dashboard/leaderboard/page.tsx consume that context; quiz/page.tsx has a Clerk comment and relies on authenticated APIs, without a Clerk import; app/leaderboard/page.tsx uses a hardcoded test-user identifier, not Clerk. The proxy-only generate-dag/process-llm/quiz-generate routes must also receive explicit guards. Clerk webhooks, sign-up user-sync webhook and dedicated sync worker: **NOT FOUND**; learner rows are created lazily by LearnerStateService.initializeLearnerGraph and ProfilerAgent.processSelfRating.

**Verified — All local Learn reward computation/storage/display:**

- AuraEngine.getTierForPoints: Spark below1000, Ember≥1000, Flame≥5000, Blaze≥15000, Aurora≥50000.
- awardAttemptAP: raw earned quiz points ×10 × checkpoint first-attempt1.2 (otherwise1) or test-out0.7 × (1+0.05×min(streak,10)); rounded. ProgressAgent calls it on passes.
- awardMilestoneAP: round(50 × min(3,1+0.2×(max(1,depth)-1))); recursive prerequisite depth.
- evaluatePathCompletion: round(500 × (domain node count/10)); checks prior domain award in aura_event before inserting.
- awardPoints handles streak bonuses:3days50,7days150,every30days1000. StreakService.recordActivity compares server calendar dates and mutates learner.lastActive/streakDays. quiz/finalize invokes it without awaiting.
- learner.auraPoints/auraTier/streakDays and aura_event persist local rewards. api/dashboard/stats, milestones, leaderboard and app/profile/page.tsx, dashboard/page.tsx, both leaderboard pages and quiz results display them. StatsBar and AuraToast also contain display logic; imports/mounts for those two components were NOT FOUND. AuraToast accepts awardedAura from URL parameters.

**Inferred — Redirect all of the above:** Delete/disable AuraEngine calls and StreakService counter writes after new events are in place; preserve first mastery/attempt facts and timestamps independently of points. Replace `awardedAura` responses with event delivery status and a Core-sourced reward receipt/summary. Core computes shared streak once per eligible user-day across modules; never accept a module's asserted streak length or locally computed tier. Retain old reward rows read-only only if historical migration is approved; do not import them automatically as earned Core Aura.

# 5. What Must Be Created (per module)

**Inferred — All paths in this section are proposed, not existing.** To avoid pretending a reorganization already happened, these tickets use current repository roots. Section 8 gives an optional later folder layout. All services remain separately deployable; no module imports Core's User model or opens Core's database.

| Owner | Proposed absolute file/path | Purpose and acceptance boundary |
|---|---|---|
| Core | C:/socialstream/server/routes/moduleAuthRoutes.js; services/moduleTokenService.js | POST /api/auth/module-grants and authenticated exchange; derive subject/Hub from Core membership, sign RS256 and consume grant once |
| Core | C:/socialstream/server/models/ModuleGrant.js | Hash/jti/expiry/consumed state for short-lived handoff; unique jti and expiry cleanup |
| Core | C:/socialstream/server/routes/auraEventRoutes.js; models/AuraEvent.js; services/auraEventService.js | Validate service-bound event types, deduplicate, atomically update Core Aura/streak projection |
| Core | C:/socialstream/server/config/auraWeights.js | Versioned configurable weights/caps; separate external bonus from engagement ledger |
| Core | C:/socialstream/server/services/moduleReadService.js | Bounded optional Learn/Interview reads for dashboard/recommendations; independent failure states |
| Main UI | C:/socialstream/src/components/ModuleNavigation.jsx; src/components/ModuleStatusCard.jsx | /arcade,/interview,/learn links and unavailable state; no module preload on chat path |
| Main UI | C:/socialstream/src/context/HubThemeProvider.jsx | Canonical Hub theme variables and accessible defaults |
| Shared contract source | C:/socialstream/packages/contracts/module-events.schema.json; module-principal.schema.json | Versioned data-only schemas; no shared database/client singleton |
| Arcade API | C:/socialstream/digital-arcade-main/service/src/server.js; middleware/coreAuth.js | Independent Express service, Core JWT verification, body/rate limits, per-service Mongo database |
| Arcade API | C:/socialstream/digital-arcade-main/service/src/models/GameSession.js; routes/gameSessions.js | POST start/actions/complete; server seed, rulesVersion, expiry, owner+Hub, move sequence, immutable result |
| Arcade API | C:/socialstream/digital-arcade-main/service/src/validators/{memory,numberGuess,math,sorting,spotBug}.js | Replay/check domain facts; never trust posted final score |
| Arcade API | C:/socialstream/digital-arcade-main/service/src/services/coreEvents.js | Stable event serialization/delivery and explicit pending/accepted state on GameSession |
| Arcade UI | C:/socialstream/digital-arcade-main/code and stuff/src/gameRegistry.ts; services/arcadeApi.ts | One lazy route/card registry and authenticated session client |
| Arcade UI | C:/socialstream/digital-arcade-main/code and stuff/src/games/SortingComplexity.tsx | Sequence sorting steps, count comparisons, choose complexity; constrained deterministic inputs |
| Arcade UI | C:/socialstream/digital-arcade-main/code and stuff/src/games/SpotTheBug.tsx | Select bug location/fix from authored variants; server answer key, no arbitrary code execution |
| Arcade UI/API | C:/socialstream/digital-arcade-main/code and stuff/src/games/DailyChallenge.tsx; service/src/models/DailyChallenge.js | Versioned challenge shared by day/Hub; deterministic session generation, unique completion |
| Interview | C:/socialstream/AI-Interviewer-main/backend/src/middleware/coreAuth.js; services/coreEvents.js | Verified Core principal for HTTP/socket; interview.completed delivery after persisted report |
| Interview | C:/socialstream/AI-Interviewer-main/backend/src/services/evaluationPolicy.js | Finite numeric checks, canonical raw score, rubric/model version and explicit provider failure |
| Interview | C:/socialstream/AI-Interviewer-main/backend/src/routes/integration.routes.js | Internal owned report summary/reconciliation; no raw resume disclosure to dashboard |
| Interview UI | C:/socialstream/AI-Interviewer-main/frontend/src/context/CoreSessionContext.jsx; lib/moduleUrls.js | Replace local auth; distinguish API base, socket origin and path; /interview routes |
| Learn auth | C:/socialstream/MargaAI-master/src/app/auth/route.ts; C:/socialstream/MargaAI-master/src/app/auth/start/route.ts | External /learn/auth handoff and browser-state initiation; verify Core grant, exchange, HttpOnly cookie, immediate clean redirect |
| Learn auth | C:/socialstream/MargaAI-master/src/lib/coreSession.ts; src/components/CoreSessionProvider.tsx | Server get/require current principal; minimal client projection, no secret token in props |
| Learn auth | C:/socialstream/MargaAI-master/src/app/api/session/route.ts | Read current module session and clear it on logout; Core login owns renewal |
| Learn data | C:/socialstream/MargaAI-master/src/db/migrations/0003_core_identity_and_attempts.sql | Proposed reconciled migration: actual sequence number must be chosen later; Hub scope, unique state, attempts, hashed opaque module sessions with expiry, and delivery metadata |
| Learn assessment | C:/socialstream/MargaAI-master/src/services/attemptService.ts; src/app/api/quiz/answer/route.ts | Server-owned attempts/question issuance/grading/theta; finalize derives result from stored answers |
| Learn events | C:/socialstream/MargaAI-master/src/services/coreEvents.ts | Emit quiz/mastery/path facts after DB commit; no local Aura calculation |
| Learn reads | C:/socialstream/MargaAI-master/src/app/api/integration/progress/route.ts; weak-skills/route.ts | Service-authenticated, user-delegated and Hub-scoped summaries |
| Learn curriculum | C:/socialstream/MargaAI-master/src/data/curriculum/demo-v1.json; scripts/seed_curriculum.ts | Authored/validated DSA/Web/ML/Backend/DevOps sample, versioned IDs and question bank |
| Learn URLs/theme | C:/socialstream/MargaAI-master/src/lib/moduleUrls.ts; src/lib/hubTheme.ts | Prefix raw API requests; resolve allowlisted Hub palette for SSR and graph colors |

**Inferred — Arcade validator contract:** `POST /arcade/api/sessions` accepts only an allowlisted gameId/difficulty/challengeId; server selects rulesVersion/seed, saves start time, and returns sessionId plus public initial state. Keep secret targets/answer keys server-side where applicable. `POST /sessions/:id/actions` accepts bounded sequential moves or answers with monotonic sequence numbers. `POST /sessions/:id/complete` references that session; the service derives outcome/moves/duration from records and transitions once to completed. Unknown game/version, invalid sequence, expired session, altered owner, impossible outcome and replay with different input all fail without Aura.

**Inferred:** Minimum elapsed time/plausible score/daily cap are useful filters but **do not prove play**: a bot can wait and submit a valid trace. For Memory, issue reveals online and validate matches; for Number Guess retain target server-side; for Math use issued question IDs with server grading; for sorting replay swaps/comparisons against the seeded array; for SpotTheBug check a curated answer ID. Pong needs deterministic authoritative physics or must remain unranked; breathing/luck games should not award outcome-based Aura. Limit one active rewarded session per user, short expiry, game-specific completion bounds, small event payloads and a Core per-user-day cap. No claim of cheat-proof client games is made.

**Inferred — Interview event seam:** Refactor B/controllers/session.controller.js completeSession so canonical evaluation and `completedAt` are persisted atomically once, with `eventId=interview:<sessionId>:completed:v1`, reportVersion and delivery status. Emit immediately **after** that commit, not from the browser/socket, and do not re-evaluate on delivery retry. Available facts: session ID, interview ID, userId, start/end timestamps, answer IDs/text/scores/feedback, skipped flags, total client-reported time, job title, question categories and strengths/weaknesses. Add hubId, server-derived duration, evaluation status and version. Numeric per-skill/correctness/clarity/depth breakdown is **not currently stored**; compute category means from canonical answer results or add a schema-validated rubric. Keep raw answers/resume text out of Aura payloads.

**Inferred — Learn migration:** For fresh demo data, use Core sub directly as the external user key and add hubId to learner enrollment/state/attempt ownership. If multiple Hub memberships are possible, use an internal learnerMembershipId with a unique (coreUserId,hubId) key and migrate every FK rather than forcing a single hubId onto a globally keyed user row. For retained Clerk data, build an explicit verified mapping, migrate learnerNodeState/auraEvent FKs transactionally or through a reviewed staging migration, and quarantine unmapped rows. Never infer identity from username or an unverified email match. Archive local rewards rather than treating old, client-derived scores as trustworthy Core credits.


**Inferred — Proposed configuration names (values omitted):**

| Service | Add/retain | Remove after replacement |
|---|---|---|
| Core | CORE_MODULE_PRIVATE_KEY, CORE_MODULE_KEY_ID, CORE_TOKEN_ISSUER; separate ARCADE_SERVICE_KEY_HASH, INTERVIEW_SERVICE_KEY_HASH, LEARN_SERVICE_KEY_HASH; allowed module origins | No module secrets exposed through Vite |
| Arcade API | ARCADE_MONGO_URI, CORE_PUBLIC_KEY or CORE_JWKS_URL, CORE_TOKEN_ISSUER, CORE_TOKEN_AUDIENCE, CORE_API_BASE_URL, CORE_SERVICE_KEY, ALLOWED_ORIGIN | VITE_OPENAI_API_KEY and optional chatbot |
| Arcade UI | VITE_ARCADE_API_URL; build base=/arcade | No server key/public-env credential |
| Interview API | MONGO_URI for its own DB, GROQ_API_KEY, CORE_PUBLIC_KEY or CORE_JWKS_URL, CORE_TOKEN_ISSUER, CORE_TOKEN_AUDIENCE, CORE_API_BASE_URL, CORE_SERVICE_KEY, CLIENT_URL; Cloudinary vars only if retained | JWT_SECRET/JWT_REFRESH_SECRET/expiry vars; removed job/Redis/PG/OpenAI vars |
| Interview UI | VITE_INTERVIEW_API_URL, VITE_INTERVIEW_SOCKET_ORIGIN, VITE_INTERVIEW_SOCKET_PATH | Ambiguous shared VITE_API_URL once migrated |
| Learn | DATABASE_URL, GEMINI_API_KEY, optional YOUTUBE_API_KEY, CORE_PUBLIC_KEY or CORE_JWKS_URL, CORE_TOKEN_ISSUER, CORE_TOKEN_AUDIENCE, CORE_API_BASE_URL, CORE_SERVICE_KEY; APP_ORIGIN; fixed /learn build prefix | CLERK_SECRET_KEY and all NEXT_PUBLIC_CLERK_* configuration |

# 6. Strip List

**Inferred — These are future removal candidates, not deletion authorization in this audit.** “Safe” means the optional feature is intentionally dropped and the listed references are removed together. Preserve upstream license notices/provenance and necessary migration history. No files have been deleted.

| Module / candidate | Verified dependency evidence | Inferred removal and verification |
|---|---|---|
| Arcade AIChatbox.tsx + openai + VITE_OPENAI_API_KEY | Only chatbot imports OpenAI; App mounts chatbot globally | Remove import/mount/dependency; verify games load with no OpenAI key and no OpenAI request |
| Arcade gsap | Source imports NOT FOUND | Remove manifest entry after lock refresh in implementation; verify dependency scan/build later |
| Arcade Scene.tsx/Background.tsx and three/fiber/drei/postprocessing | Decorative global Scene in App, no game uses Three | Optional removal together; verify static background and no WebGL bundle; retain only if design warrants |
| Arcade Contact.tsx | No App import/route; handleSubmit logs only | Safe unused screen candidate; remove dead links if added elsewhere |
| Arcade CoinFlip/RockPaperScissors/Sudoku | Source exists, router/catalog references absent | Optional product choice; Sudoku has educational potential, so do not delete merely because currently unrouted |
| Arcade standalone Home/About/Navbar | Brand-specific full-site chrome | Replace with module shell; retain required attribution independently |
| Interview auth routes/controllers, jwt.utils, bcryptjs, User password fields | Active independent auth graph | Remove only after HTTP/socket/Core bootstrap replacement; old login/register/refresh must no longer issue module identity |
| Interview AuthContext.jsx | Re-exported by context/index.js but not mounted; active useAuth delegates Zustand | Remove dead context and barrel exports; scan useAuthContext/AuthProvider callers |
| Interview jobs pages/components/hooks/API + B/routes/jobs.routes.js, jobs.controller.js, job services/utils/models | App mounts Jobs/RecommendedJobs; backend mounts jobs; cron starts automatically | Remove UI navigation, services/api jobsAPI, backend mount/imports, all job-only schedulers/caches/helpers; verify candidate flow has no Adzuna/PG/Redis access |
| Interview Redis/ioredis/config/redis/jobs caches | Redis used for jobs/dedup/admin stats, not core interview sessions or Socket adapter | After jobs/admin removal, delete startup connect/disconnect/imports and packages; interim REDIS_ENABLED disables client; verify unavailable Redis cannot delay module startup |
| Interview postgresJobService.js + pg | Jobs controller imports pool; getAllJobs falls back to Mongo | Remove entire jobs branch/imports; interview service needs only its own Mongo DB |
| Interview Cloudinary/multer-storage-cloudinary | Upload middleware and Resume required URL/publicId; delete calls destroy | **Not a clean standalone deletion.** Replace upload parser/storage and schema/UI/delete behavior first; test PDF parsing, privacy and retention |
| Interview RAG/OpenAI chain | generateInterviewQuestions imports rag; other topic helpers also depend on it | Replace with bounded direct context; then remove rag/optimizer dependencies only where no remaining job/topic caller; preserve chunker if used |
| Interview @langchain/community/core/textsplitters/langchain | No direct source imports; @langchain/openai remains active | Candidates after peer/runtime dependency review; not proof they are unnecessary transitively |
| Interview admin subtree | routes/admin imports all admin controllers; frontend providers/layout/nav/pages/API; seedAdmin | Optional full removal; retain ErrorBoundary/SuspenseLoader if candidate shell still uses them; verify no /admin routes or auth credentials |
| Interview SystemPrompt | ai.service/socket still query it even without admin UI | Keep model/read fallback initially, or replace with versioned source prompts and remove calls before deleting model |
| Interview Plan/Transaction/WebhookLog/AuditLog/ScraperConfig/ScraperLog/InterviewTemplate/Job | Admin/job branches and User refs | Remove only with dependent branches; no live payment system to preserve in inspected code; preserve retained data per explicit migration policy |
| Interview unused senior/strict/final-report/topic AI exports | No active external callers found | Optional cleanup after weak-skills implementation chooses the active single pipeline |
| Interview react-icons/react-markdown/React Query | react-icons imports absent; markdown job drawer; Query hooks mainly jobs/admin | Remove unused imports/features first; keep React Query only if used for retained server state; update main provider |
| Learn Clerk package/sign-in/sign-up/settings widget/scripts | Touch map section4 | Remove after handoff proof; grep all source/scripts/docs; no Clerk network call or runtime key requirement |
| Learn AuraEngine/StreakService reward paths | ProgressAgent, finalize and dashboard all consume | Replace with domain completion records/Core reads before removing; preserve learner progression |
| Learn app/leaderboard and local leaderboard API | Two separate global Aura screens; one fake current-user ID | Consolidate onto Core Hub leaderboard; do not expose global learner table |
| Learn StatsBar/AuraToast | Definitions found, imports/mounts NOT FOUND | Safe dead display candidates; if kept, Core receipt data only (never querystring points) |
| Learn diagnostic/cleanup scripts | test_db_update mutates rows; clearQuizItems clears banks; cleanup_learners uses unpaginated Clerk list | Exclude from release operational commands; replace with safe fixtures/migrations; never run on retained data |
| Learn design-system page/scaffold SVGs | Presentational/demo assets | Optional; confirm actual asset references before deletion |
| Learn 3D graph | SkillGraph uses ForceGraph3D and also RoadmapView | Optional performance reduction; keep accessible roadmap/list; remove Three imports together |
| Learn arbitrary generation/maintenance APIs | generate-dag/process-llm/ingest/quiz-generate exposed behind general proxy | Disable for demo after curated seed; retain internal scripts if needed, properly restricted |

**Verified — Removal caveat:** Interview has two distinct Adzuna services: `adzuna.service.js` (live search) and `adzunaService.js` (scheduled sync). Removing one does not remove the other. `server.js` starts sync after15seconds and every3hours, cleanup after30seconds and daily. Redis is enabled unless REDIS_ENABLED explicitly disables it. Optional services are therefore not inert merely because their frontend page is hidden.

# 7. Integration Contracts

**Inferred — Everything in this section is a proposed v1 contract. Existing equivalents were NOT FOUND.** Core's current HS-signed `id` tokens must not simply be accepted as module grants. Core must first establish trusted Hub membership; freeform college text is not authorization.

## Core tokens and session handoff

**Inferred — Module access claims/header:**

```json
{
  "header": { "alg": "RS256", "typ": "JWT", "kid": "<active-key-id>" },
  "claims": {
    "iss": "collegehubs-core",
    "aud": "collegehubs-learn",
    "sub": "<Core-user-id-as-string>",
    "hubId": "<verified-hub-id>",
    "college": "<display-label>",
    "username": "<display-name>",
    "scope": ["learn:use"],
    "iat": 0,
    "nbf": 0,
    "exp": 0,
    "jti": "<unique-token-id>",
    "membershipVersion": 1,
    "themeVersion": 1
  }
}
```

**Inferred:** Times above are shape placeholders, not usable tokens. Core alone holds the private key. Modules pin allowed issuer/audience/algorithm, resolve an allowlisted kid to a public key, validate times with bounded clock skew and require sub/hubId/scopes. Reject none/HS confusion, wrong module audience and token-supplied arbitrary key URLs. Use separate public-key configuration or a tightly controlled Core JWKS with cached keys; no Core request required on every normal module request. Display college/username claims are not permission checks.

**Inferred — Endpoints:** Authenticated `POST /api/auth/module-grants` at Core takes `{module,returnPath,state}`; module must be an allowlisted enum, returnPath restricted to that module's relative routes, and hubId derived from the current verified membership rather than trusted from the body. Return a one-use grant expiring after roughly60seconds, with audience `collegehubs-<module>-handoff`, state, jti and identity. Protected `POST /api/auth/module-grants/exchange` accepts the grant from the module backend, verifies module service credentials and consumes its jti atomically in Core; return a Core-signed module access credential (proposed15minutes). That credential, not the short handoff grant, backs the module session.

**Inferred — Learn sequence:**

1. A same-origin `/learn/auth/start` handler issues a short-lived random browser-state cookie and returns state. The logged-in Core shell asks Core for a module grant bound to that state.
2. Browser navigates to `/learn/auth?grant=<one-use-grant>`. Implement as L/src/app/auth/route.ts with Next basePath=/learn, not a second app/learn/auth nesting.
3. Handler verifies Core signature/audience/expiry/state, calls Core's authenticated atomic exchange, verifies the returned access token and creates an opaque module session in Learn's DB. It stores only a hash of the opaque session handle; expiry cannot exceed the Core credential.
4. Set a host-only cookie such as `__Secure-collegehubs-learn`, Secure, HttpOnly, SameSite=Lax, Path=/learn; avoid __Host- prefix because that requires Path=/. Redirect immediately to a validated clean /learn path. Add no-store and no-referrer on handoff; redact grants in access logs and analytics; no third-party content on that response.
5. `getCoreSession()` reads cookie and validated stored principal; `requireCoreSession()` also verifies expiry/membership constraints and rejects API access if absent. Server components use it before data reads; client provider gets only display identity/Hub/theme, never keys or grant.
6. Cookie-authenticated mutations validate Origin and a CSRF token; SameSite alone is insufficient for all same-site sibling-origin cases. Clear sessions on logout; expired/revoked membership re-enters Core handoff. Define short-expiry revocation window or implement a small Core session-version check/revocation hook where immediate revocation matters.

**Inferred:** Interview/Arcade can use the same grant/session pattern through their own backends. For direct cross-origin Interview Socket.io, the frontend obtains a short-lived audience-scoped Core token through authenticated bootstrap and keeps it only in memory; send it in `handshake.auth.token`. Expiry/reconnect must reauthorize. A path-scoped Learn cookie is not an Interview credential.

**Inferred — basePath/rewrite details:** Build Learn with /learn basePath; main Vercel rules must forward /learn and /learn/:path* before the current catch-all and preserve the prefix expected by the Next build. Validate /learn/_next assets, route handlers, RSC/prefetch requests, cookies, redirects, callback paths and public assets. Prefix raw `fetch('/api/...')` calls using a helper; do not blindly double-prefix framework links. Recheck proxy matcher/public paths against the actual installed Next16 docs at implementation. Set trusted origin/forwarded-host handling explicitly for the rewrite and direct deployment origin.

## Service-to-Core events

**Inferred — Authentication:** HTTPS, `Authorization: Bearer <module-service-key>`, `Content-Type: application/json`, `X-Event-Schema-Version: 1`; no service key in VITE_/NEXT_PUBLIC_ variables. Core stores hashed high-entropy per-service credentials, binds each to source/type scopes, supports rotation and compares credentials safely. Browser JWTs cannot call the service-ingestion endpoint. An idempotent event is not trusted merely because its eventId is unique: module validation and Core membership/type/cap checks remain mandatory.

**Inferred — POST /api/aura/events payload:**

```json
{
  "eventId": "interview:<session-id>:completed:v1",
  "userId": "<Core-sub>",
  "hubId": "<verified-hub-id>",
  "source": "interview",
  "type": "interview.completed",
  "value": 1,
  "occurredAt": "<server-completion-ISO-time>",
  "metadata": {
    "sessionId": "<session-id>",
    "rawScore": 76,
    "rawScoreMax": 100,
    "answeredCount": 8,
    "questionCount": 10,
    "rubricVersion": "interview-v1",
    "evaluationStatus": "complete",
    "categoryBreakdown": [
      { "category": "technical", "score": 7.5, "max": 10, "count": 6 }
    ]
  }
}
```

**Inferred — Semantics and errors:**

| Case | Contract |
|---|---|
| Valid first event | 201 {eventId,status:"accepted",awardedAura,weightVersion}; Core computes awardedAura |
| Identical retry | 200 {eventId,status:"duplicate",awardedAura}; returns original receipt, no reapplication |
| Same eventId with different canonical payload | 409 EVENT_ID_CONFLICT; never silently overwrite |
| Invalid JSON/type/size/finite number/time | 400 INVALID_EVENT or 413 PAYLOAD_TOO_LARGE |
| Missing/invalid service credential | 401 INVALID_SERVICE_CREDENTIAL |
| Source/type not authorized or user/Hub mismatch | 403 EVENT_NOT_ALLOWED / HUB_MEMBERSHIP_MISMATCH |
| Unknown subject/entity reference | 404 SUBJECT_NOT_FOUND where appropriate; no cross-user detail |
| Valid but no reward due to cap/previous mastery | 201 accepted with awardedAura=0 and policy reason; do not retry forever |
| Per-service ingress rate exhausted | 429 with Retry-After |
| Core temporarily unavailable | 503/timeout; retry same eventId, never mint a replacement |

**Inferred:** Validate source against the credential, restrict metadata shape/size, reject future/stale timestamps outside a documented replay window, check membership appropriate to the event time, and enforce a globally unique eventId plus a business uniqueness key (e.g. source/entity/version/type). Bind module entity ownership from server-derived data. In a Core Mongo transaction, insert event and update score/streak/cap counters; duplicate insertion must not update projections. If transaction cannot complete, no accepted receipt is returned. Core alone computes `sum(weighted engagement events)+external bonus`; refactor auraService.updateUserAura so an external refresh cannot overwrite engagement totals.

**Inferred — Lean delivery:** The module commits the domain result with a deterministic event ID and pending/accepted metadata on that same result, then attempts a bounded HTTP POST. On timeout it returns “result saved; Aura pending,” not “result failed.” Retry on a controlled reconciliation call or subsequent result read; a small periodic reconciliation trigger can be added if automatic eventual delivery is required. No separate outbox collection/table, broker, Redis or worker fleet. A pending-result read API lets operators/Core reconcile stranded results after a restart. Without any later reconciliation trigger, immediate delivery is best effort; this limitation is explicit. Do not use fire-and-forget promises or serverless timers as the only retry mechanism.

## Event catalog and suggested Core policy

**Inferred — Starting weights only; configurable and versioned in Core.** These are product proposals, not existing weights or proven incentives. Domain results persist even when rewards are capped.

| Source/type | Module-provided facts | Suggested Core reward | Anti-abuse/business uniqueness |
|---|---|---:|---|
| arcade.game_completed | sessionId/game/rulesVersion/outcome/serverDuration/validated moves | 5 for eligible validated completion | At most3 rewarded sessions/day and one per game/day; proposed arcade total≤30/day |
| arcade.daily_challenge_completed | challengeId/version/day/validated outcome | 15 | One per user/challenge/day; replaces ordinary completion reward for same session |
| interview.completed | immutable report/raw grade0–100/question/answer counts/version | 20 + floor(rawScore/10), max30 | One reward/session, ≤2/day; sufficient answered questions/time; failed evaluation ineligible |
| learn.quiz_completed | attemptId,nodeId,mode,answer counts,raw ratio,server result | 5 for valid passed assessment | ≤5 rewarded quizzes/day; one node+mode/day; no client totals |
| learn.node_mastered | first completion transition/node/curriculumVersion | 15 | One per user/node/version; test-out and normal completion cannot both count first mastery |
| learn.path_completed | curated curriculum/version, required nodes completed | 30 | One per user/path/version; personal remedial nodes do not change completion denominator |
| qualifying activity from any module | server timestamp + accepted entity | Shared streak participation; no standalone extra event points | Core deduplicates one user/Hub/calendar-day across sources; choose one timezone policy |
| learn.streak_updated (if compatibility name retained) | activity occurrence only | 0 | Ignore reported streak length; prefer activity recorded from existing completion events |

**Inferred:** Proposed Learn cap100/day; Interview60/day; Arcade30/day. Prevent deletion/re-enrollment and arbitrary new graph versions from resetting reward uniqueness. Reserve curriculum versions centrally/administratively. Keep betting/luck outcomes and breathing duration out of scored rewards. Define whether caps/shared streak are per user globally or per Hub; default cap across Hubs to prevent membership-switch farming.

## Read APIs and weak-skill flow

**Inferred — Use service authentication plus a short-lived delegated user token/audience, or browser-owned /me endpoints.** A userId query string alone is not authorization. All responses include schemaVersion/asOf and only authorized Hub data.

| Proposed endpoint | Realistic response based on current data | Needed changes |
|---|---|---|
| GET /learn/api/integration/progress?userId=…&hubId=… | domains[{domain,completed,total,nextNodeId}], completedNodes, lastActivityAt | Join learner_node_state/skill_node; fix personal/global node scope; no Aura calculation |
| GET /learn/api/integration/weak-skills?userId=…&hubId=…&limit=5 | nodes[{nodeId,label,domain,theta,difficulty,attempts,lastCheckpointRatio,reason,curriculumVersion}] | Persist trusted ratio/time (lastCheckpointScore currently not populated by inspected finalize flow); weak=(low theta gap/failed attempts), exclude never-assessed “unknown” |
| GET /interview/api/integration/summary?userId=…&hubId=… | completedCount,lastReport{sessionId,rawScore,scoreMax,completedAt,categoryBreakdown} | New scoped aggregator; no resume or answer text |
| GET /arcade/api/me/activity | recent validated sessions/challenge status | New Arcade service; Core's shared streak supplied separately |
| GET /api/me/aura at Core | total,engagement,externalBonus,tier,sharedStreak,asOf | New authoritative Core projection/read |
| GET /api/hubs/:hubId/theme at Core | allowlisted palette tokens,logo URL,themeVersion | New canonical Hub theme registry; safely cache |
| GET /<module>/api/integration/pending-results | bounded cursor page of event facts pending receipt | Server-only reconciliation; ownership/scope and same stable IDs |

**Inferred — Weak skills sequence:** Core authenticates a learner and fetches Learn weak nodes with timeout; user chooses topics; Core issues Interview grant with a bounded recommendation reference. Interview backend validates delegated subject/Hub and resolves the recommendation, then writes normalized topic IDs/labels onto Interview and passes them to generateInterviewQuestions. The browser cannot send an unlimited arbitrary prompt as “trusted weak skills.” Keep normal JD/resume interview available when Learn is down. No shared DB or direct Learn imports.

# 8. Compatibility and Conflict Matrix

**Verified — Declared versions:** A dash means dependency/config NOT FOUND in the relevant manifest, not an installed-runtime fact.

| Technology | CollegeHubs | Arcade | Interview | Learn |
|---|---|---|---|---|
| React / DOM | ^18.2.0 | ^18.3.1 | ^18.3.1 | 19.2.8 exact |
| Router/framework | react-router-dom ^6.30.3 | router ^6.22.3 | router ^6.22.3 | Next16.3.3 App Router |
| Vite | ^5.0.0 | ^5.4.2 | ^5.2.8 | — |
| Tailwind | ^3.4.0 | ^3.4.1 | ^3.4.3 | ^4 |
| TypeScript | — (JS/JSX) | ^5.5.3 strict | — (JS/JSX) | ^5 strict, many any/ts-ignore |
| Express | ^4.19.2 | — (new service needed) | ^4.18.3 + async-errors | — (Next handlers) |
| Mongoose | ^8.10.0 | — (new service needed) | ^8.2.3 | — (pg/Drizzle) |
| Socket.io server/client | — / — | — / — | ^4.8.3 / ^4.8.3 | — / — |
| Node | no engines pin | no engines pin | no engines pin; docs18+ | no engines pin; docs18+; @types/node20 is not runtime |
| Three | — | ^0.162.0, Fiber8/Drei9 | — | ^0.185.1 |
| Charts | — | — | Recharts^2.12.3 | Recharts^3.10.1 |
| ESLint | — | 9 flat TS | 8 frontend, config NOT FOUND | 9 Next flat |
| Storage | MongoDB Core | none today | MongoDB + optional jobs PG/Redis + Cloudinary | PostgreSQL/vector |
| Identity | JWT id claim/Google | none | own JWT id/local User | Clerk text IDs |

**Inferred — Runtime policy:** Select and pin a supported Node runtime separately for each service after checking actual installed package requirements; do not use the README18+ claims as a compatibility guarantee, particularly for Learn Next16 and Interview's newer LangChain/Redis dependencies. No installation/lockfile audit was performed.

**Verified — Main integration starting point:** [src/App.jsx](C:/socialstream/src/App.jsx) has only /, /about, /login, /register, /leaderboard, /contests. [src/main.jsx](C:/socialstream/src/main.jsx) creates the single BrowserRouter/Google provider. [src/api.js](C:/socialstream/src/api.js) adds /api to VITE_API_URL and reads socialstream_token from localStorage. [User.js](C:/socialstream/server/models/User.js) has college text and currentStreak fields but no Hub membership relation. [collegeThemes.js](C:/socialstream/src/utils/collegeThemes.js) derives theme by substring, including IIT before IIIT. [auraService.js](C:/socialstream/server/services/auraService.js) overwrites auraPoints from external stats. Module-token/Aura-event endpoints and Socket.io packages are NOT FOUND in Core.

**Inferred — Hosting decision:** Prefer three independent frontend deployments behind same-origin path rewrites, with a consistent CollegeHubs header/navigation and shared theme contract. This preserves independent release/failure boundaries and avoids combining Learn's React19/Tailwind4 with the main SPA. Navigation to module deployments should use full document navigation rather than letting Core's BrowserRouter swallow /learn. Core dashboard widgets may use bounded optional APIs. Interview WebSockets connect directly to its own persistent Node origin with explicit CORS/auth/path; do not assume a frontend rewrite will proxy WebSocket upgrades.

| Concern | Verified code evidence | Inferred action |
|---|---|---|
| Arcade port to src/arcade | React18/Vite5/Tailwind3 align; main Tailwind already scans ts/tsx | Technically feasible; remove createRoot/BrowserRouter, export child route tree, lazy import, add TS/types/type-check config with allowJs/checkJs=false for existing JS, scope CSS |
| Arcade missing main dependencies | Main has React/router/Lucide; lacks Motion/Three ecosystem/TS | Add Motion only if retained; Three/Fiber/Drei/postprocessing only for optional Scene; no GSAP/OpenAI needed for lean port |
| Interview port to src/interview | Same React major/router6/Tailwind3; @ alias maps /src | Feasible but M–L wiring; change aliases to module-relative or dedicated @interview, remove second BrowserRouter/admin/auth providers, reuse Core principal, lazy entire feature |
| Interview dependencies absent in main | @tanstack/react-query,clsx,framer-motion,react-dropzone,react-hook-form,react-hot-toast,react-icons,react-markdown,recharts,socket.io-client,zustand | Install only retained imports; most candidate UI needs forms/dropzone/toasts/Motion/charts/socket; no need to carry job/admin-only packages |
| Learn port to main | Next server components/routes, React19, Tailwind4, pg and server SDKs | Do not copy into SPA; retain standalone Next frontend/backend |
| CSS collisions | Global A index.css; Interview .card/.btn-* and palette; Learn root reset | Separate documents simplest; shared page fragments require scoped CSS and one Tailwind pipeline |
| Alias collision | Interview @→/src, Learn @/*→src/* | Keep build roots isolated; no shared alias that silently resolves to CollegeHubs src |
| API/socket URLs | Interview Axios VITE_API_URL often includes /api; io uses same variable as origin | Separate INTERVIEW_API_BASE and INTERVIEW_SOCKET_ORIGIN public config plus socket path; test non-root deployments |
| Local ports | Main/Arcade/Interview Vite default5173; main/Interview API commonly5000; Learn3000 | Assign distinct dev ports and explicit origin allowlists |
| Vercel rewrite | Main vercel.json catches all paths to /; Interview to /index.html; Learn config empty | Place module rewrites before SPA fallback; service build roots explicit; deep links/assets must remain within module prefix |
| Nested repos | Three folders untracked under main; independent package/lockfiles; root no npm workspace config | Review additions deliberately; avoid accidental huge commits/deploy contexts; retain separate installs/build roots |
| Vite scanning | Root Vite no explicit entries; nested Vite index.html files exist; root Tailwind only ./src | Production imports do not automatically bundle every nested package. Dev dependency discovery may examine nested HTML; narrow optimizeDeps.entries/watch/ignore scope and verify later |
| TS scope | Learn tsconfig includes broad TS patterns; root has none | Limit each future root TS config include/exclude; avoid capturing Learn/server code when adding Arcade TS |
| Database boundary | Local model names overlap (User/Session), Learn unrelated SQL schema | Separate DB credentials/names per service; no shared Mongoose connection/model registry |
| Failure isolation | No existing Core module orchestration | Lazy UI plus bounded optional reads; chat/study handlers cannot depend on LLM/module availability |


**Verified/Inferred — Concrete theme conversion:** Current colors below are Verified; replacements are Inferred.

| Surface | Current hardcodes | Replacement |
|---|---|---|
| Arcade index.css / Background.tsx | #6441A5, #2a0845, #ffffff and purple gradient RGB variants | --hub-accent/--hub-secondary/--hub-surface/--hub-text; feed resolved colors into Three materials |
| Arcade pages/games/Navbar | purple/pink/black/white Tailwind classes; green/red status utilities | Palette utilities backed by variables; retain separate --status-success/error and game-specific mine-number colors |
| Arcade Pong canvas | white and translucent white drawing literals | Read computed CSS palette when theme changes; canvas cannot inherit CSS fill colors automatically |
| Interview tailwind.config.js / main.jsx | brand indigo50…950, #6366f1/#4f46e5, surfaces #0f0f1a/#16162a/#2a2a4a/#1e1e36; toast literals | Shared semantic tokens for brand/surface/border/text; chart status colors stay semantic |
| Learn globals.css | --bg-page #FCFCFD, --bg-surface #FFFFFF, --text-primary #111827, --brand-slate-deep #0F172A, --brand-blue-navy #1E3A8A | Existing variables are a useful adapter: map to Core Hub tokens server-side |
| Learn quiz/NodePopover/StatsBar/graph | repeated #1E3A8A/#EFF6FF plus status green/orange/yellow and Three material colors | Replace brand literals, preserve status contrast, update WebGL and Recharts palettes explicitly |

**Inferred:** Resolve trusted hubId to a sanitized known palette, not arbitrary CSS from a query string or unverified college label. Separate deployments need the same token vocabulary and theme version; they do not need a shared React context instance. Main collegeThemes can supply a temporary visual adapter but substring matching cannot determine Hub authorization.

**Inferred — Optional folder/branding proposal, no moves now:** Keep existing roots during integration. A later reviewed layout could be `C:/socialstream/apps/core-web`, `services/core`, `services/arcade/{web,api}`, `services/interview/{web,api}`, `services/learn`, and `packages/contracts`. Names shown to users: **CollegeHubs Arcade**, **CollegeHubs Interview**, **CollegeHubs Learn**. Preserve third-party attribution in a notices page/file, not necessarily each upstream marketing screen. Do not rename/move files as a prerequisite to the first working integration.

# 9. Security, License and Cost Review

**Verified/Inferred — Current findings are Verified; severity/remediation are Inferred. No live exploitation or dependency advisory lookup was performed.**

| Finding | Evidence | Severity and required boundary |
|---|---|---|
| Browser OpenAI secret exposure | A/components/AIChatbox new OpenAI with VITE key and dangerouslyAllowBrowser | Critical if a real key is deployed: remove client SDK/key and rotate any actually exposed key via owner process |
| Client result forgery | Arcade local state; Learn quiz answer keys/newTheta/earnedPoints accepted | Critical for rewards: server-authoritative sessions/attempts before enabling Aura |
| Anonymous LLM socket access | B/socket.js connection handler has no authentication middleware | Critical spend/abuse path: verify handshake and owned question/session on every event |
| Resume IDOR | createInterview accepts resumeId; generateQuestions uses Resume.findById | High: lookup must include authenticated user+Hub; likewise details/populated relations |
| Admin privilege special-case | B/auth.controller register/login promotes designated email; adminAuth self-heals role | Critical: remove module auth/admin or use Core-issued roles; no email-string privilege rules |
| Hardcoded admin password | B/scripts/seedAdmin.js contains literal password and prints it (values omitted) | High: do not run; remove unsafe bootstrap after migration; any deployed use needs credential replacement |
| Credential logging | B/server.js logs ADZUNA_APP_ID/ADZUNA_APP_KEY values | High: remove logs and restrict historical log access if ever deployed |
| Refresh/logout weakness | local access7d/refresh30d; refresh token not compared with stored token; logout stateless | High: replace with Core handoff; define expiry/revocation explicitly |
| Inconsistent admin roles | adminLogin allows support/content_manager; protectAdmin allows only admin/super_admin | Medium correctness/security maintenance risk; stripping admin removes inconsistent duplicate policy |
| LLM failure counted as completed | completeSession catches evaluation errors→0 and still saves completed | High: failed/pending evaluation cannot produce rewardable completion |
| Upload validation/PII | MIME-based 5MB filter; DOC/DOCX accepted but only PDF parsed; Cloudinary raw URL; full buffer download | High: magic-byte/type/size/time validation, PDF-only MVP, private access and retention/delete; no secure-delivery setting found |
| Prompt injection | Resume/JD/answers/learning goal/external content concatenated into prompts | High result-integrity risk: delimit as data, validate outputs, bound text, never turn LLM text into permissions/code |
| HTTP versus socket rate limits | B/app global /api limiter; Socket outside it; no per-operation cost limits | High: separate generation/evaluation/socket quotas and bounded concurrent work |
| Public optional job endpoints | jobs search/categories/list lack protect; admin payment mock seed writes during GET | Medium: strip or scope; no arbitrary public expensive ingestion |
| Learn server trust | general proxy auth; maintenance APIs no roles; quiz/generate returns rubric; ModulePage doesn't reject locked/no-state before JIT | High: explicit session/scopes/eligibility checks at each operation |
| Learn replay/global leakage | no unique learner-node state; ProgressAgent repeatable awards; global remedial nodes included in graph query | High: owned attempts, unique keys and private remedial scope |
| Learn reset/reward farming | roadmap/delete removes learner/local reward history; profile/path deletes progress | High: immutable Core award uniqueness survives Learn reset |
| Learn cleanup script | cleanup_learners uses first Clerk getUserList page as complete identity set | High if executed: may target valid users absent from that page; retire rather than reuse |
| Error leakage | Learn returns error.message; Interview returns provider/error messages, stacks in development | Medium: public error codes; private sanitized diagnostics; do not log tokens/raw resumes |
| Database/query risks | Drizzle parameterization used; Interview search regex built from input; optional PGSSL disables certificate verification | Medium: retain SQL parameterization; cap/escape regex where kept; valid TLS configuration |
| Startup health | B/config/db catches connect failure and continues; app health static; redis/job bootstrap active | Medium: readiness must reflect required DB, optional provider failure separate |
| Core readiness dependency | Main freeform college, unprotected profile/refresh routes in changes.md, Aura overwrite | High prerequisite: module grant issuer must rely on trusted membership, not current self-editable college |

**Verified — Secret-review scope:** No actual module .env files were found; Interview .env.example exists and variable names were inventoried without reproducing values. Source contains the hardcoded admin password assignment and dangerous credential logging noted above. Other live credential presence in deployment settings, git history, ignored/generated artifacts and accounts was not examined. **Inferred:** this is not a certified clean secret scan; do not claim “no secrets” from absent env files.

**Verified/Inferred — Licensing (not legal advice; I am not a lawyer):**

| Repository | Verified license text/evidence | Inferred reuse decision / attribution |
|---|---|---|
| Arcade | README explicitly says all rights reserved and limits use/modification/distribution to project contributors for personal/team development; no separate LICENSE found | Do not treat it as open-source permission for CollegeHubs. Establish that the planned product/distribution is authorized by rights holders; contributor status alone may not cover intended use. Preserve notices; obtain scope in writing |
| Interview | I/LICENSE: MIT; copyright2026 Aftab Alam and Contributors | Allows reuse/modification/redistribution including commercial use under the notice condition. Include copyright and permission notice with copies/substantial portions; retain license in redistributed module |
| Learn | LICENSE/COPYING or other reuse grant NOT FOUND in supplied files; package private=true | No permission grant established. Obtain permission/license or evidence of ownership before redistribution; attribution alone does not grant rights |

**Inferred:** Dependency licenses and external image/audio/font/resource rights need separate verification; repository licensing does not automatically cover linked third-party assets or scraped content. Do not reuse Arcade team portraits as CollegeHubs branding without permission.

**Verified/Inferred — Provider behavior and demo cost drivers:** Code behavior is Verified; cost/exhaustion assessments and mitigations are Inferred. No pricing/free-tier limits were looked up because external calls are forbidden; actual quotas depend on account, plan, model, region and date.

| Provider | Verified calls/caching/fallback | Inferred cost/free-tier implication and lean action |
|---|---|---|
| Arcade OpenAI | Browser gpt-3.5-turbo call; local60s cooldown on429 | Client cooldown cannot control spend. Remove optional chatbot; no LLM needed for games |
| Interview Groq | Question generation, optional parsing,2 RAG rewrites, N answer evaluations,1 final report, each live feedback click | Completion fans out up to configured question count; concurrent users easily create bursts. Bound concurrency, per-user calls and output, pre-generate demo interviews |
| Interview OpenAI | Embed document chunks and2 retrieval queries each generation; no persistent vector cache; fallback first1000 chars each | Repeated costs/latency; remove RAG for bounded demo prompts or cache by document/version if proven necessary |
| Interview Cloudinary | Upload raw file then download for parsing; delete cleanup can fail independently | Storage/egress/retention use grows with resumes. PDF-only text-extraction path can avoid storage if original downloads aren't needed |
| Interview Adzuna | Search + scheduled initial/3-hour sync; retries/circuit breaker in live-search client; caches | Unneeded quota consumption even without user page traffic; strip jobs/cron |
| Interview Redis / optional PG | Job cache/alternative job store, Mongo fallback; Redis reconnect attempts | Extra deployment/state burden without interview benefit; remove for lean build |
| Learn Gemini planning | Goal normalization + dynamic DAG; no global timeout/retry policy | New learners/domains cause latency/bursts; seed curated demo graphs |
| Learn Gemini quiz | Batch5 generation when bank exhausted; 3 attempts,2s/4s waits for429/503/quota-like errors | Ten-question test-out may need2 cold-bank generations; retries also consume function time. Preseed bank, cap generation, show unavailable |
| Learn Gemini embeddings/rerank | process-llm ≤10 items→tag+embed per item; recommendations with >1 resource→embedding+generation; remedial→generation+embedding | Expensive repeated work; JIT resources have null embeddings until processed, so vector relevance may be poor/undefined. Cache/preprocess a small fixed set |
| Learn tutor | Query embedding precedes cache lookup; top3 pgvector retrieval; distance0.35 guard; cached generated response by prompt hash | Even a response-cache hit pays an embedding call. Empty/out-of-scope corpus refuses; embedding failure returns busy message; generation failure returns resource titles |
| Learn YouTube Data API v3 | One search.list per uncached node, part=snippet,type=video,maxResults5; successful linked IDs persist on node; missing key/non-OK/empty→Wikipedia | Search is the costly quota operation. Five returned videos are not five requests. No global quota counter/cache lock; concurrent cold opens or empty results repeat calls |
| Wikipedia | Roadmap fallback opensearch up to2 requests; JIT query/search up to2; JIT errors caught→empty resources | Network availability/rate policies still matter; repeated empty nodes have no negative cache/backoff; keep seeded links |
| roadmap.sh | Scrapes HTML external anchors; fallback Wikipedia; trajectory cache with no expiry | HTML/terms can change; stale cache or unrelated links; default demo should not depend on live scrape |
| Mongo Atlas | Core+Arcade+Interview separate databases in one cluster | Data isolation is logical; shared cluster storage/connections/CPU are still shared failure/cost resources. Separate users/quotas and capped workloads |
| Neon/PostgreSQL | Pool max10 per Learn process;3072-dimensional embeddings; no vector index declared | Many serverless instances can multiply connections; pooled URL, region, extension and actual limits need deployment verification |
| Vercel/Render | Learn generation in request; Interview persistent Socket process; current module routing not configured | Function duration/cold-start/sleep/connection limits may break demos; confirm selected plans, preload seed data and keep Core chat independent |

**Inferred — YouTube planning example only:** If the chosen project's quota model is100 units per search and10,000 units/day, about100 cold-node searches exhaust that allocation before other requests;20 learners opening5 uncached nodes would reach it. These are explicit planning assumptions, **not verified current limits**. Check the actual project console before a demo. Likewise no Groq/Gemini “free/unlimited” claim is justified; verify the hardcoded model identifiers exist for the intended accounts.

**Verified — Failure nuances:** Most Learn fetch/Gemini calls lack an explicit AbortSignal/deadline; only QuizAgent implements limited retry logic. Roadmap fetch falls back to Wikipedia, but failure of both propagates500; JIT resource fetch returns an empty list on provider failures, so revisits retry. RetrieverAgent only bypasses AI for a single linked resource; embedding/generation errors otherwise propagate through the route. TutorAgent has explicit busy/refusal messages. A template explanation and existing stored graph can work without Gemini, but cold onboarding/quiz-bank refill/remedial insertion cannot.

# 10. Cross-Module Feature Feasibility

**Inferred — Feasibility based on Verified code seams:**

| Feature | Existing seam/evidence | Code required and difficulty |
|---|---|---|
| Learn weak nodes → Interview topics | learner_node_state theta/attempts and skill_node labels; ai.generateTopicQuestions exists but unused | L overall: first fix trusted assessment; add weak-skills read, bounded Core recommendation, Interview.topics/controller/prompt/UI. No AI is needed just to rank weak nodes |
| Arcade daily activity → shared streak | Arcade has no persistence; Core User has currentStreak/lastActiveDate; Learn has separate counter | M after foundation: server sessions/events; Core one qualifying day across all sources/timezone; remove Learn local counter |
| Dashboard Learn progress next to Aura | Learn dashboard computes progress client-side from graph; Core dashboard currently social/Aura | M: server summary endpoint + optional timed read + stale/asOf UI; do not merge Aura totals |
| Sorting/complexity puzzle | No implementation found; NumberGuess marketing mentions algorithms only | M: authored puzzle/rule engine, trace validation, complexity choice, deterministic tests; reuse gallery styling only |
| Spot-the-bug round | Existing SpotDifference is image-click prototype, not code debugging | M: new curated snippets, bounded choices, hidden server answer key; no code sandbox required |
| Daily challenge | No challenge scheduler/data/model found | M: pre-authored schedule/seed chosen by Core timezone/day, one rewarded completion; can use date lookup without a scheduler |
| Per-Hub theme throughout | Main collegeThemes helper; Learn CSS vars; Interview palette; Arcade purple literals | M per frontend: shared vocabulary/Hub metadata and canvas/Three mapping; no shared runtime bundle necessary |
| Stop LLM module, keep chat/study usable | Core target boundary; current Core has no implemented chat/study module per earlier audit | M architecture work + future isolation test; cannot claim current chat/study behavior was proven |

**Inferred — Academic MVP:** Start rewarded Arcade play with Math/NumberGuess or the new sorting/bug puzzle, not Pong. Seed a small reviewed Learn curriculum/bank and cap interviews at a modest question count. This yields demonstrable cross-module value while limiting provider variability. Preserve user consent/choice before transporting weak-skill labels into Interview; no resume or private answers should travel through Core's dashboard APIs.

# 11. Recommended Integration Order and Effort

**Inferred — Estimates assume one engineer familiar with the stack, access to deployment accounts, and a small demo scope. Rows are work packages, not fixed calendar commitments; related work overlaps. No phase below was executed.**

| Phase/order | Scope/size | Definition of done |
|---|---|---|
| 0. Rights + baseline | S; permission timing unknown | Arcade/Learn reuse scope documented; MIT notice retained; original snapshots/lockfile changes accounted for |
| 1. Core identity/event foundation | L, ~7–10days | Trusted Hub memberships, module issuer/exchange, public-key rotation, service credentials, idempotent event/score/streak transaction; external Aura refresh preserves event totals |
| 2. **Early Learn Clerk-removal spike** | M, ~3–5days | One server page + one protected API work through /learn grant→cookie, no Clerk provider; expired/replayed/wrong-Hub grants fail; Next16 basePath rewrite/assets verified using installed docs |
| 3. Arcade thin slice | M, ~3–5days after permission/foundation | One corrected game + server session/checker + Core event/receipt + theme; browser cannot post a score directly |
| 4. Interview lean service | L plus hardening, ~8–12days | Core auth replaces both local auths; jobs/admin/Redis/PG removed; chosen upload path works; scoped resume lookup, authenticated socket and retryable immutable completion |
| 5. Learn full migration | L ×2–3, ~14–22days after spike | All Clerk touchpoints gone; schema migration/ID map correct; server attempts/theta/eligibility, unique states, Core events, no local Aura/streak computation, seeded curriculum |
| 6. Arcade academic games | L, ~6–9days | Sorting, bug and daily challenge authored, validated/capped; nonvalidated games unranked; mobile controls |
| 7. Cross-feature/dashboard | M–L, ~4–7days | Learn weak skills seed active Interview prompt; progress shown with Core Aura; safe fallback when a module fails |
| 8. Integration verification/demo | M, ~3–5days | Checklist section12 passes on isolated staging; quotas/model IDs/deep links/cookies/Socket behavior proven; no Core dependency on LLM availability |

**Inferred — Approximate totals:** Shared foundation/verification/cross-feature work ~14–22days; Arcade ~9–14days; Interview ~8–12days; Learn spike+full ~17–27days. Overall roughly48–75 engineer-days for this hardened scope, with a smaller thin demo available earlier. Do not add the phase rows and these ranges as separate work: these are two views of the same estimate. Existing data migration, production observability, broad accessibility/device support and full game hardening can expand scope.

**Inferred — Learn stop/go checkpoint:** If the early spike fails due to the exact Next16 runtime/rewrite/session behavior, resolve that before converting every Clerk call. If licensing cannot be established, hold source reuse; do not silently replace the agreed architecture with shared authentication/database shortcuts. Auth failure must never be “fixed” by making APIs public.

**Inferred — Isolation constraint:** Run independent Render services for Core/Arcade/Interview and a separate Learn Next deployment. One Mongo cluster may host separate databases/users; Learn remains PostgreSQL. Keep provider calls, optional summary reads and event retries off Core chat/study critical paths. One Socket process per service is adequate for the lean first deployment; scale/fanout architecture is deferred until measured need.

# 12. Test Checklist

**Inferred — Proposed tests only; none were run.** Use isolated fixtures/staging. Existing scripts that mutate databases or call providers are not a substitute for this checklist.

- [ ] **Core auth:** both password/Google login issue grants only for verified memberships; cannot choose arbitrary userId/hubId/role; bad issuer/audience/alg/kid/expired/not-yet-valid tokens rejected.
- [ ] **Handoff:** browser state matches, one-use grant consumed exactly once under concurrent exchange; return URL allowlist; no grant in final URL/referrers/logs/cache; cookie Secure/HttpOnly/SameSite/path; CSRF/Origin checks; direct deployment-origin bypass denied.
- [ ] **Logout/revocation:** module session expires/revokes as designed; old local Interview/Clerk tokens no longer authorize; multiple tabs/Hub switch cannot retain wrong-Hub access.
- [ ] **Identity/data migration:** old-ID→Core mapping verified; no orphan SQL FKs/Mongo records; unmatched users quarantined; two-Hub fixtures cannot read/write/populate each other's results.
- [ ] **Aura:** identical concurrent events increment once; changed payload/same ID409; new ID/same entity still no second award; wrong service source/type403; invalid finite bounds/timestamps rejected; caps/timezone/day boundaries verified.
- [ ] **Aura durability:** crash after result commit/before POST, after Core acceptance/before receipt, and during Core transaction; retry same ID yields correct totals. External-stat refresh cannot erase engagement points.
- [ ] **Arcade rules:** deterministic fixtures for wins/losses/invalid moves; wrong seed/version/session/owner, impossible score/timing, duplicate sequence, oversized trace, expired session and repeated daily challenge rejected.
- [ ] **Arcade quality:** Memory reset during pending flip, Snake food placement/tail handling, valid Crossword intersections/bounds, Sudoku uniqueness if enabled, real SpotDifference assets if retained; missing OpenAI key does not prevent load.
- [ ] **Arcade UX:** mobile/touch/keyboard/reduced-motion; WebGL unavailable; audio play denial; no initial Three/game bundle on Core landing; casual games do not emit trusted reward events.
- [ ] **Interview uploads:** valid PDF, MIME-spoofed file, DOC/DOCX policy, oversized/malformed/encrypted PDF, parser timeout, failed storage/download/delete; another user's resumeId cannot be attached or fetched.
- [ ] **Interview auth cleanup:** register/login/refresh/admin auth removed or Core-only; no hardcoded admin promotion; removed jobs/Redis/PG/Cloudinary (if chosen) leave no startup/import dependency.
- [ ] **Interview questions:** weak topic IDs and questionTypes affect active generation; missing Learn still supports normal interview; output schema/count/category/difficulty/keyword limits; prompt injection fixture cannot change permissions.
- [ ] **Interview session:** reload restores saved answers; failed save blocks navigation; duplicate start/complete serializes; unanswered/skipped denominator consistent; LLM malformed/429/down results marked retryable, not successful zero-score completion.
- [ ] **Interview sockets:** reject no token/wrong audience/user/Hub/session; load canonical question; rate/payload/time limits; overlapping request IDs don't mix streams; disconnect cancels work; reconnect resyncs HTTP state and refreshes authorization.
- [ ] **Interview deployment:** cross-origin CORS, separate HTTP /api and socket origin/path, Render restart; no inference that Vercel SPA rewrites support WebSocket upgrade.
- [ ] **Learn database:** fresh versioned migrations including vector extension/schema fields; dedupe before unique learner-node key; init graph repeated/concurrent produces one state per node.
- [ ] **Learn assessment:** no answer/rubric before submission; server computes correctness/theta/ratio; forged earnedPoints/newTheta ignored/rejected; cross-attempt question IDs, locked nodes, repeat test-out and repeated finalize cannot progress/reward.
- [ ] **Learn progression:** correct unlocks, one first mastery, scoped remediation, acyclic graph, no global user-specific nodes leaked; reset cannot reset Core award uniqueness; consistent theta scale and stored lastCheckpointScore.
- [ ] **Learn provider failure:** cold/cached banks; Gemini429/503/malformed/model unavailable; YouTube quota/error/missing key→Wikipedia; both resources unavailable→clear empty/retry state; cache and bounded retry verified.
- [ ] **Learn route/theme:** /learn refresh/deep-link/_next/public assets/RSC/API/matcher work; no Clerk request/key required; profile identity correct; graph/chart/quiz all adopt two contrasting Hub themes.
- [ ] **Dashboard:** progress/asOf separated from Core Aura; unavailable Learn/Interview widget does not blank main dashboard.
- [ ] **Failure isolation:** stop each module independently, then deny Groq/Gemini/YouTube/OpenAI; existing Core login, chat delivery/reconnect and Study Rooms remain functional. Because chat/Study Rooms are not implemented in current Core, execute this when those services exist; source audit alone cannot pass it.
- [ ] **Operational demo:** required model IDs/quotas/storage/DB pools confirmed by owner outside this read-only audit; seed data works without live scraping; logs contain no credentials/grants/resume content; licenses/notices present.

# 13. Open Questions and Assumptions

**Inferred — Decisions needed before implementation (not requests blocking this report):**

1. **Rights:** Does the team own/have express CollegeHubs redistribution permission for Arcade and Learn? No such authorization was established from supplied licenses.
2. **Meaning of score:** May modules store raw academic/game evaluation metrics while Core owns all engagement/Aura scoring? This report assumes yes because the task requires an interview score/breakdown event. If literally no local numeric grade is allowed, Core must own the final raw aggregation too, and reporting contracts change.
3. **Hub membership:** One Hub per user or multiple? Proposed unique membership-based learner data supports multiple; no current Core Hub schema exists. How do transfers affect historical progress, caps and event-time membership?
4. **Shared streak day:** Hub timezone, user timezone or global Asia/Kolkata? Proposed one stable policy and global anti-farming caps; timezone changes must not generate a second rewarded day.
5. **Existing data:** Are there live Interview users/resumes and Clerk learners to migrate, or can new demo databases start empty? We did not query accounts/databases.
6. **Core prerequisite:** Are the auth/ownership/Aura-overwrite gaps in changes.md already scheduled elsewhere? They remain prerequisites, not resolved by module code.
7. **UI deployment:** Default proposal is independent frontends under same-origin routes. A lazy in-SPA Arcade/Interview port is feasible but couples UI deployment; clarify if a single persistent React shell is essential.
8. **Upload retention:** Must users download original resumes later? If no, memory parse + extracted text allows removing Cloudinary; if yes, retain private object storage and retention/delete policy.
9. **Provider access:** Exact Groq/Gemini model availability, account quotas, region limits, pricing, runtime requirements, Vercel/Render plan limits and Neon pgvector setup are unverified. No current external facts were fetched.
10. **Curriculum:** Who authors/approves the initial DSA/Web/ML/Backend/DevOps node/quiz bank? Source supplies no fixed counts/data and currently relies on generated global domains.
11. **Weak-skill quality:** What threshold/confidence/recency should mark a node weak? Proposed attempt/theta heuristics require trustworthy assessment first; unassessed does not mean weak.
12. **Reward policy:** Suggested weights/caps are placeholders to tune, not inherited from Learn. Which game types and minimum valid interview/quiz evidence should count?
13. **Event delivery SLA:** Is immediate best-effort delivery plus explicit reconciliation enough for demo, or must pending results automatically reconcile within a fixed time? Add a minimal scheduled trigger if needed, not an outbox/broker by default.
14. **Revocation:** Is a ≤15minute membership/logout propagation window acceptable? Immediate invalidation requires an explicit version/revocation check workflow.
15. **Voice:** Browser speech support is partial. Is cross-browser audio capture/transcription a required feature? That would add work/provider costs beyond current reuse.
16. **Tests/builds:** Source findings are unexecuted. No assertion is made that manifests install, lint succeeds, pages render, routes are reachable in production or source-declared models exist at provider accounts.
17. **Secrets/history:** This audit did not inspect git history or deployment secrets. Hardcoded seed password/logging must be treated as exposure risks if previously used; source-only observations cannot establish operational compromise.
18. **Shared physical infrastructure:** Separate databases on one Atlas cluster do not guarantee physical failure isolation; the chosen lean design accepts that shared cluster dependency.

# 14. Appendix

**Verified — Inspection method and limits:** Read changes.md before module analysis; enumerated all non-generated module paths, manifests and source env references; read critical workflow/security/service/schema files and selected frontend/config/doc sections. Searches covered imports, Clerk/auth, storage, scoring, external calls, tests, licenses and routes. Some large multi-file outputs were truncated; targeted rereads recovered the cited critical logic. Remaining presentation/admin/search internals are explicitly listed as partial or not reviewed below. No inaccessible-file error prevented a material finding; a few guessed nonexistent paths were corrected by file inventory.

**Verified — The following evidence register distinguishes content inspection from filename-only inventory.** “Critical/full” means the key implementation was read in full or across targeted excerpts; “partial” means imports/routes/selected logic or documentation sections were inspected and no complete correctness review is claimed. Lockfile contents, generated artifacts and installed packages were excluded; hashing a file for preservation did not constitute content review.

## Main app/context files

**Verified — Content or targeted sections inspected:**

- [changes.md](docs/changes.md) — content/targeted inspection.
- [package.json](C:/socialstream/package.json) — content/targeted inspection.
- [server/package.json](C:/socialstream/server/package.json) — content/targeted inspection.
- [vite.config.js](C:/socialstream/vite.config.js) — content/targeted inspection.
- [tailwind.config.js](C:/socialstream/tailwind.config.js) — content/targeted inspection.
- [vercel.json](C:/socialstream/vercel.json) — content/targeted inspection.
- [.gitignore](C:/socialstream/.gitignore) — content/targeted inspection.
- [src/App.jsx](C:/socialstream/src/App.jsx) — content/targeted inspection.
- [src/main.jsx](C:/socialstream/src/main.jsx) — content/targeted inspection.
- [src/api.js](C:/socialstream/src/api.js) — content/targeted inspection.
- [src/utils/collegeThemes.js](C:/socialstream/src/utils/collegeThemes.js) — content/targeted inspection.
- [src/components/Sidebar.jsx](C:/socialstream/src/components/Sidebar.jsx) — content/targeted inspection.
- [server/models/User.js](C:/socialstream/server/models/User.js) — content/targeted inspection.
- [server/services/auraService.js](C:/socialstream/server/services/auraService.js) — content/targeted inspection.

**Verified — Targeted source search / earlier audit context:**

- [server/routes/authRoutes.js](C:/socialstream/server/routes/authRoutes.js) — auth/college/ownership searches; earlier detailed findings in changes.md.
- [server/routes/googleAuthRoutes.js](C:/socialstream/server/routes/googleAuthRoutes.js) — auth/college/ownership searches; earlier detailed findings in changes.md.
- [server/routes/userRoutes.js](C:/socialstream/server/routes/userRoutes.js) — auth/college/ownership searches; earlier detailed findings in changes.md.
- [server/routes/postRoutes.js](C:/socialstream/server/routes/postRoutes.js) — auth/college/ownership searches; earlier detailed findings in changes.md.

**Verified — Task specification inspected:** `C:/Users/sathw/.codex/attachments/df98f0b6-f916-4974-89fb-fdcf9666eb12/Pasted text.txt`. The earlier main-audit request was context for changes.md; this report follows the newer module-audit instructions.

## digital-arcade-main file register

**Verified — File paths and inspection level:**

| Absolute file | Inspection level |
|---|---|
| [C:/socialstream/digital-arcade-main/README.md](<C:/socialstream/digital-arcade-main/README.md>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/eslint.config.js](<C:/socialstream/digital-arcade-main/code and stuff/eslint.config.js>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/index.html](<C:/socialstream/digital-arcade-main/code and stuff/index.html>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/package-lock.json](<C:/socialstream/digital-arcade-main/code and stuff/package-lock.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/digital-arcade-main/code and stuff/package.json](<C:/socialstream/digital-arcade-main/code and stuff/package.json>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/postcss.config.js](<C:/socialstream/digital-arcade-main/code and stuff/postcss.config.js>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/App.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/App.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/components/AIChatbox.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/components/AIChatbox.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/components/Background.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/components/Background.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/components/GameAudio.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/components/GameAudio.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/components/Navbar.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/components/Navbar.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/components/Scene.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/components/Scene.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/CoinFlip.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/CoinFlip.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/CrosswordPuzzle.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/CrosswordPuzzle.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/MathAmplitude.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/MathAmplitude.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/MemoryGame.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/MemoryGame.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/Minesweeper.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/Minesweeper.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/NumberGuess.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/NumberGuess.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/PingPong.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/PingPong.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/RockPaperScissors.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/RockPaperScissors.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/Snake.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/Snake.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/SpotDifference.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/SpotDifference.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/Sudoku.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/Sudoku.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/TicTacToe.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/TicTacToe.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/games/WimHofBreathing.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/games/WimHofBreathing.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/index.css](<C:/socialstream/digital-arcade-main/code and stuff/src/index.css>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/main.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/main.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/pages/About.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/pages/About.tsx>) | Partial page content/marketing/styles |
| [C:/socialstream/digital-arcade-main/code and stuff/src/pages/Contact.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/pages/Contact.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/pages/Games.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/pages/Games.tsx>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/src/pages/Home.tsx](<C:/socialstream/digital-arcade-main/code and stuff/src/pages/Home.tsx>) | Partial page content/marketing/styles |
| [C:/socialstream/digital-arcade-main/code and stuff/src/vite-env.d.ts](<C:/socialstream/digital-arcade-main/code and stuff/src/vite-env.d.ts>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/tailwind.config.js](<C:/socialstream/digital-arcade-main/code and stuff/tailwind.config.js>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/tsconfig.app.json](<C:/socialstream/digital-arcade-main/code and stuff/tsconfig.app.json>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/tsconfig.json](<C:/socialstream/digital-arcade-main/code and stuff/tsconfig.json>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/tsconfig.node.json](<C:/socialstream/digital-arcade-main/code and stuff/tsconfig.node.json>) | Game logic/config/component content inspected; no runtime test |
| [C:/socialstream/digital-arcade-main/code and stuff/vite.config.ts](<C:/socialstream/digital-arcade-main/code and stuff/vite.config.ts>) | Game logic/config/component content inspected; no runtime test |

## AI-Interviewer-main file register

**Verified — File paths and inspection level:**

| Absolute file | Inspection level |
|---|---|
| [C:/socialstream/AI-Interviewer-main/CONTRIBUTING.md](<C:/socialstream/AI-Interviewer-main/CONTRIBUTING.md>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/LICENSE](<C:/socialstream/AI-Interviewer-main/LICENSE>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/PROJECT_DOCUMENTATION.md](<C:/socialstream/AI-Interviewer-main/PROJECT_DOCUMENTATION.md>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/README.md](<C:/socialstream/AI-Interviewer-main/README.md>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/SECURITY.md](<C:/socialstream/AI-Interviewer-main/SECURITY.md>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/.env.example](<C:/socialstream/AI-Interviewer-main/backend/.env.example>) | Variable names only; values omitted |
| [C:/socialstream/AI-Interviewer-main/backend/.gitignore](<C:/socialstream/AI-Interviewer-main/backend/.gitignore>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/BACKEND_STRUCTURE.md](<C:/socialstream/AI-Interviewer-main/backend/BACKEND_STRUCTURE.md>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/package-lock.json](<C:/socialstream/AI-Interviewer-main/backend/package-lock.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/AI-Interviewer-main/backend/package.json](<C:/socialstream/AI-Interviewer-main/backend/package.json>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/app.js](<C:/socialstream/AI-Interviewer-main/backend/src/app.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/config/cloudinary.js](<C:/socialstream/AI-Interviewer-main/backend/src/config/cloudinary.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/config/db.js](<C:/socialstream/AI-Interviewer-main/backend/src/config/db.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/config/groq.js](<C:/socialstream/AI-Interviewer-main/backend/src/config/groq.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/config/logger.js](<C:/socialstream/AI-Interviewer-main/backend/src/config/logger.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/config/redis.js](<C:/socialstream/AI-Interviewer-main/backend/src/config/redis.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/admin.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/admin.controller.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminAnalytics.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminAnalytics.controller.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminAuth.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminAuth.controller.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminJob.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminJob.controller.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminLog.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminLog.controller.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminPayment.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminPayment.controller.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminPlan.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminPlan.controller.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminPrompt.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminPrompt.controller.js>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminScraper.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminScraper.controller.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminSettings.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminSettings.controller.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminTemplate.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/adminTemplate.controller.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/auth.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/auth.controller.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/interview.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/interview.controller.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/jobs.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/jobs.controller.js>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/resume.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/resume.controller.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/session.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/session.controller.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/controllers/user.controller.js](<C:/socialstream/AI-Interviewer-main/backend/src/controllers/user.controller.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/middleware/adminAuth.middleware.js](<C:/socialstream/AI-Interviewer-main/backend/src/middleware/adminAuth.middleware.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/middleware/auth.middleware.js](<C:/socialstream/AI-Interviewer-main/backend/src/middleware/auth.middleware.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/middleware/errorHandler.js](<C:/socialstream/AI-Interviewer-main/backend/src/middleware/errorHandler.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/middleware/index.js](<C:/socialstream/AI-Interviewer-main/backend/src/middleware/index.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/middleware/rbac.js](<C:/socialstream/AI-Interviewer-main/backend/src/middleware/rbac.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/middleware/requestLogger.js](<C:/socialstream/AI-Interviewer-main/backend/src/middleware/requestLogger.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/middleware/upload.middleware.js](<C:/socialstream/AI-Interviewer-main/backend/src/middleware/upload.middleware.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/middleware/validate.js](<C:/socialstream/AI-Interviewer-main/backend/src/middleware/validate.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/AuditLog.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/AuditLog.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/Interview.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/Interview.model.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/InterviewTemplate.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/InterviewTemplate.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/Job.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/Job.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/Plan.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/Plan.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/Resume.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/Resume.model.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/ScraperConfig.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/ScraperConfig.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/ScraperLog.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/ScraperLog.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/Session.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/Session.model.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/SystemPrompt.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/SystemPrompt.model.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/SystemSetting.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/SystemSetting.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/Transaction.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/Transaction.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/User.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/User.model.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/models/WebhookLog.model.js](<C:/socialstream/AI-Interviewer-main/backend/src/models/WebhookLog.model.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/routes/admin.routes.js](<C:/socialstream/AI-Interviewer-main/backend/src/routes/admin.routes.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/routes/auth.routes.js](<C:/socialstream/AI-Interviewer-main/backend/src/routes/auth.routes.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/routes/interview.routes.js](<C:/socialstream/AI-Interviewer-main/backend/src/routes/interview.routes.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/routes/jobs.routes.js](<C:/socialstream/AI-Interviewer-main/backend/src/routes/jobs.routes.js>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/backend/src/routes/resume.routes.js](<C:/socialstream/AI-Interviewer-main/backend/src/routes/resume.routes.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/routes/session.routes.js](<C:/socialstream/AI-Interviewer-main/backend/src/routes/session.routes.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/routes/user.routes.js](<C:/socialstream/AI-Interviewer-main/backend/src/routes/user.routes.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/scripts/seedAdmin.js](<C:/socialstream/AI-Interviewer-main/backend/src/scripts/seedAdmin.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/server.js](<C:/socialstream/AI-Interviewer-main/backend/src/server.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/adzuna.service.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/adzuna.service.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/adzunaService.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/adzunaService.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/ai.service.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/ai.service.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/chunking.service.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/chunking.service.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/jobCleanupService.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/jobCleanupService.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/jobDeduplicator.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/jobDeduplicator.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/jobMatchService.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/jobMatchService.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/jobSearchService.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/jobSearchService.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/jobSyncScheduler.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/jobSyncScheduler.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/jobSyncService.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/jobSyncService.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/optimizer.service.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/optimizer.service.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/postgresJobService.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/postgresJobService.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/services/rag.service.js](<C:/socialstream/AI-Interviewer-main/backend/src/services/rag.service.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/socket.js](<C:/socialstream/AI-Interviewer-main/backend/src/socket.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/AppError.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/AppError.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/adzunaCache.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/adzunaCache.js>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/adzunaClient.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/adzunaClient.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/deduplicator.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/deduplicator.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/jobNormalizer.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/jobNormalizer.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/jobsCache.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/jobsCache.js>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/jwt.utils.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/jwt.utils.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/normalizer.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/normalizer.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/pagination.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/pagination.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/queryParser.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/queryParser.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/responseFormatter.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/responseFormatter.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/scoringEngine.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/scoringEngine.js>) | Import/User-reference/env/function search only; remaining internals not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/backend/src/utils/testRecommend.js](<C:/socialstream/AI-Interviewer-main/backend/src/utils/testRecommend.js>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/.env.example](<C:/socialstream/AI-Interviewer-main/frontend/.env.example>) | Variable names only; values omitted |
| [C:/socialstream/AI-Interviewer-main/frontend/.gitignore](<C:/socialstream/AI-Interviewer-main/frontend/.gitignore>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/index.html](<C:/socialstream/AI-Interviewer-main/frontend/index.html>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/package-lock.json](<C:/socialstream/AI-Interviewer-main/frontend/package-lock.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/AI-Interviewer-main/frontend/package.json](<C:/socialstream/AI-Interviewer-main/frontend/package.json>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/postcss.config.js](<C:/socialstream/AI-Interviewer-main/frontend/postcss.config.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/App.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/App.jsx>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/ErrorBoundary.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/ErrorBoundary.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/SuspenseLoader.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/SuspenseLoader.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/sidebar/AdminSidebar.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/sidebar/AdminSidebar.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/sidebar/MobileDrawer.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/sidebar/MobileDrawer.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/topbar/AdminTopbar.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/topbar/AdminTopbar.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/topbar/Breadcrumb.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/topbar/Breadcrumb.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/topbar/NotificationDropdown.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/topbar/NotificationDropdown.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/topbar/UserMenu.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/admin/topbar/UserMenu.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/common/index.js](<C:/socialstream/AI-Interviewer-main/frontend/src/components/common/index.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/FiltersPanel.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/FiltersPanel.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/JobCard.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/JobCard.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/JobDetailsDrawer.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/JobDetailsDrawer.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/JobDetailsModal.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/JobDetailsModal.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/JobsList.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/JobsList.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/Pagination.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/Pagination.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/SearchBar.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/jobs/SearchBar.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/navigation/Sidebar.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/navigation/Sidebar.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/navigation/Topbar.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/components/navigation/Topbar.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/components/ui/index.js](<C:/socialstream/AI-Interviewer-main/frontend/src/components/ui/index.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/constants/index.js](<C:/socialstream/AI-Interviewer-main/frontend/src/constants/index.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/constants/routes.js](<C:/socialstream/AI-Interviewer-main/frontend/src/constants/routes.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/context/AdminAuthContext.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/context/AdminAuthContext.jsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/context/AppContext.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/context/AppContext.jsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/context/AuthContext.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/context/AuthContext.jsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/context/index.js](<C:/socialstream/AI-Interviewer-main/frontend/src/context/index.js>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/hooks/index.js](<C:/socialstream/AI-Interviewer-main/frontend/src/hooks/index.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useAdminQuery.js](<C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useAdminQuery.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useApi.js](<C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useApi.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useAuth.js](<C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useAuth.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useFetch.js](<C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useFetch.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useJobs.js](<C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useJobs.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useLocalStorage.js](<C:/socialstream/AI-Interviewer-main/frontend/src/hooks/useLocalStorage.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/index.css](<C:/socialstream/AI-Interviewer-main/frontend/src/index.css>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/layouts/AdminLayout.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/layouts/AdminLayout.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/layouts/AuthLayout.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/layouts/AuthLayout.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/layouts/DashboardLayout.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/layouts/DashboardLayout.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/lib/adminAxios.js](<C:/socialstream/AI-Interviewer-main/frontend/src/lib/adminAxios.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/lib/axios.js](<C:/socialstream/AI-Interviewer-main/frontend/src/lib/axios.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/src/main.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/main.jsx>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/Jobs.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/Jobs.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/LandingPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/LandingPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/RecommendedJobs.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/RecommendedJobs.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminAnalyticsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminAnalyticsPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminAtsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminAtsPage.jsx>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminDashboardPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminDashboardPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminInterviewsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminInterviewsPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminJobsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminJobsPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminLoginPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminLoginPage.jsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminLogsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminLogsPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminPaymentsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminPaymentsPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminPromptsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminPromptsPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminResumesPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminResumesPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminScraperPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminScraperPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminSessionsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminSessionsPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminSettingsPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminSettingsPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminSubscriptionPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminSubscriptionPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminUsersPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/admin/AdminUsersPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/auth/LoginPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/auth/LoginPage.jsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/auth/RegisterPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/auth/RegisterPage.jsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/dashboard/DashboardPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/dashboard/DashboardPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/interview/InterviewListPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/interview/InterviewListPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/interview/InterviewSessionPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/interview/InterviewSessionPage.jsx>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/interview/NewInterviewPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/interview/NewInterviewPage.jsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/interview/SessionResultPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/interview/SessionResultPage.jsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/profile/ProfilePage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/profile/ProfilePage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/resume/ResumesPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/resume/ResumesPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/pages/session/SessionHistoryPage.jsx](<C:/socialstream/AI-Interviewer-main/frontend/src/pages/session/SessionHistoryPage.jsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/services/admin.service.js](<C:/socialstream/AI-Interviewer-main/frontend/src/services/admin.service.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/services/api.js](<C:/socialstream/AI-Interviewer-main/frontend/src/services/api.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/src/services/auth.service.js](<C:/socialstream/AI-Interviewer-main/frontend/src/services/auth.service.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/services/index.js](<C:/socialstream/AI-Interviewer-main/frontend/src/services/index.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/services/interview.service.js](<C:/socialstream/AI-Interviewer-main/frontend/src/services/interview.service.js>) | Import/env search only; remaining implementation not fully reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/store/authStore.js](<C:/socialstream/AI-Interviewer-main/frontend/src/store/authStore.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/src/utils/index.js](<C:/socialstream/AI-Interviewer-main/frontend/src/utils/index.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/src/utils/useDebounce.js](<C:/socialstream/AI-Interviewer-main/frontend/src/utils/useDebounce.js>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/AI-Interviewer-main/frontend/tailwind.config.js](<C:/socialstream/AI-Interviewer-main/frontend/tailwind.config.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/vercel.json](<C:/socialstream/AI-Interviewer-main/frontend/vercel.json>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/frontend/vite.config.js](<C:/socialstream/AI-Interviewer-main/frontend/vite.config.js>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/AI-Interviewer-main/package-lock.json](<C:/socialstream/AI-Interviewer-main/package-lock.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/AI-Interviewer-main/package.json](<C:/socialstream/AI-Interviewer-main/package.json>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |

## MargaAI-master file register

**Verified — File paths and inspection level:**

| Absolute file | Inspection level |
|---|---|
| [C:/socialstream/MargaAI-master/AGENTS.md](<C:/socialstream/MargaAI-master/AGENTS.md>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/CLAUDE.md](<C:/socialstream/MargaAI-master/CLAUDE.md>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/README.md](<C:/socialstream/MargaAI-master/README.md>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/drizzle.config.ts](<C:/socialstream/MargaAI-master/drizzle.config.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/eslint.config.mjs](<C:/socialstream/MargaAI-master/eslint.config.mjs>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/next.config.ts](<C:/socialstream/MargaAI-master/next.config.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/package-lock.json](<C:/socialstream/MargaAI-master/package-lock.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/MargaAI-master/package.json](<C:/socialstream/MargaAI-master/package.json>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/postcss.config.mjs](<C:/socialstream/MargaAI-master/postcss.config.mjs>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/public/file.svg](<C:/socialstream/MargaAI-master/public/file.svg>) | Asset filename only; binary/image content not inspected |
| [C:/socialstream/MargaAI-master/public/globe.svg](<C:/socialstream/MargaAI-master/public/globe.svg>) | Asset filename only; binary/image content not inspected |
| [C:/socialstream/MargaAI-master/public/next.svg](<C:/socialstream/MargaAI-master/public/next.svg>) | Asset filename only; binary/image content not inspected |
| [C:/socialstream/MargaAI-master/public/vercel.svg](<C:/socialstream/MargaAI-master/public/vercel.svg>) | Asset filename only; binary/image content not inspected |
| [C:/socialstream/MargaAI-master/public/window.svg](<C:/socialstream/MargaAI-master/public/window.svg>) | Asset filename only; binary/image content not inspected |
| [C:/socialstream/MargaAI-master/scripts/cleanup_learners.ts](<C:/socialstream/MargaAI-master/scripts/cleanup_learners.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/scripts/cleanup_quiz.ts](<C:/socialstream/MargaAI-master/scripts/cleanup_quiz.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/scripts/clearQuizItems.ts](<C:/socialstream/MargaAI-master/scripts/clearQuizItems.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/scripts/test_clerk.ts](<C:/socialstream/MargaAI-master/scripts/test_clerk.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/scripts/test_db_error.ts](<C:/socialstream/MargaAI-master/scripts/test_db_error.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/scripts/test_db_update.ts](<C:/socialstream/MargaAI-master/scripts/test_db_update.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/scripts/test_quiz.ts](<C:/socialstream/MargaAI-master/scripts/test_quiz.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/dashboard/domains/route.ts](<C:/socialstream/MargaAI-master/src/app/api/dashboard/domains/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/dashboard/graph/route.ts](<C:/socialstream/MargaAI-master/src/app/api/dashboard/graph/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/dashboard/leaderboard/route.ts](<C:/socialstream/MargaAI-master/src/app/api/dashboard/leaderboard/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/dashboard/milestones/route.ts](<C:/socialstream/MargaAI-master/src/app/api/dashboard/milestones/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/dashboard/stats/route.ts](<C:/socialstream/MargaAI-master/src/app/api/dashboard/stats/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/generate-dag/route.ts](<C:/socialstream/MargaAI-master/src/app/api/generate-dag/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/ingest-roadmap/route.ts](<C:/socialstream/MargaAI-master/src/app/api/ingest-roadmap/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/learner/init-graph/route.ts](<C:/socialstream/MargaAI-master/src/app/api/learner/init-graph/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/learner/intake/route.ts](<C:/socialstream/MargaAI-master/src/app/api/learner/intake/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/onboarding/profile/route.ts](<C:/socialstream/MargaAI-master/src/app/api/onboarding/profile/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/onboarding/route.ts](<C:/socialstream/MargaAI-master/src/app/api/onboarding/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/process-llm/route.ts](<C:/socialstream/MargaAI-master/src/app/api/process-llm/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/profile/path/route.ts](<C:/socialstream/MargaAI-master/src/app/api/profile/path/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/quiz/finalize/route.ts](<C:/socialstream/MargaAI-master/src/app/api/quiz/finalize/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/quiz/generate/route.ts](<C:/socialstream/MargaAI-master/src/app/api/quiz/generate/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/quiz/next/route.ts](<C:/socialstream/MargaAI-master/src/app/api/quiz/next/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/recommendation/route.ts](<C:/socialstream/MargaAI-master/src/app/api/recommendation/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/roadmap/delete/route.ts](<C:/socialstream/MargaAI-master/src/app/api/roadmap/delete/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/tutor/fast/route.ts](<C:/socialstream/MargaAI-master/src/app/api/tutor/fast/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/api/tutor/slow/route.ts](<C:/socialstream/MargaAI-master/src/app/api/tutor/slow/route.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/dashboard/DashboardContext.tsx](<C:/socialstream/MargaAI-master/src/app/dashboard/DashboardContext.tsx>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/dashboard/layout.tsx](<C:/socialstream/MargaAI-master/src/app/dashboard/layout.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/dashboard/leaderboard/page.tsx](<C:/socialstream/MargaAI-master/src/app/dashboard/leaderboard/page.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/dashboard/page.tsx](<C:/socialstream/MargaAI-master/src/app/dashboard/page.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/design-system/page.tsx](<C:/socialstream/MargaAI-master/src/app/design-system/page.tsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/MargaAI-master/src/app/favicon.ico](<C:/socialstream/MargaAI-master/src/app/favicon.ico>) | Asset filename only; binary/image content not inspected |
| [C:/socialstream/MargaAI-master/src/app/globals.css](<C:/socialstream/MargaAI-master/src/app/globals.css>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/layout.tsx](<C:/socialstream/MargaAI-master/src/app/layout.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/leaderboard/page.tsx](<C:/socialstream/MargaAI-master/src/app/leaderboard/page.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/module/[nodeId]/page.tsx](<C:/socialstream/MargaAI-master/src/app/module/[nodeId]/page.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/onboarding/page.tsx](<C:/socialstream/MargaAI-master/src/app/onboarding/page.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/page.tsx](<C:/socialstream/MargaAI-master/src/app/page.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/profile/page.tsx](<C:/socialstream/MargaAI-master/src/app/profile/page.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/quiz/page.tsx](<C:/socialstream/MargaAI-master/src/app/quiz/page.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/app/settings/page.tsx](<C:/socialstream/MargaAI-master/src/app/settings/page.tsx>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/app/sign-in/[[...sign-in]]/page.tsx](<C:/socialstream/MargaAI-master/src/app/sign-in/[[...sign-in]]/page.tsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/MargaAI-master/src/app/sign-up/[[...sign-up]]/page.tsx](<C:/socialstream/MargaAI-master/src/app/sign-up/[[...sign-up]]/page.tsx>) | Filename inventory / source environment-name scan only; implementation not reviewed |
| [C:/socialstream/MargaAI-master/src/components/AuraToast.tsx](<C:/socialstream/MargaAI-master/src/components/AuraToast.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/components/DeletePathButton.tsx](<C:/socialstream/MargaAI-master/src/components/DeletePathButton.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/components/ForceGraph3D.tsx](<C:/socialstream/MargaAI-master/src/components/ForceGraph3D.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/components/Navbar.tsx](<C:/socialstream/MargaAI-master/src/components/Navbar.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/components/NodePopover.tsx](<C:/socialstream/MargaAI-master/src/components/NodePopover.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/components/RoadmapView.tsx](<C:/socialstream/MargaAI-master/src/components/RoadmapView.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/components/SkillGraph.tsx](<C:/socialstream/MargaAI-master/src/components/SkillGraph.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/components/StatsBar.tsx](<C:/socialstream/MargaAI-master/src/components/StatsBar.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/components/TutorChat.tsx](<C:/socialstream/MargaAI-master/src/components/TutorChat.tsx>) | Partial content / targeted logic, import or role searches |
| [C:/socialstream/MargaAI-master/src/db/index.ts](<C:/socialstream/MargaAI-master/src/db/index.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/db/migrations/0000_quiet_madrox.sql](<C:/socialstream/MargaAI-master/src/db/migrations/0000_quiet_madrox.sql>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/db/migrations/0001_chubby_bedlam.sql](<C:/socialstream/MargaAI-master/src/db/migrations/0001_chubby_bedlam.sql>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/db/migrations/0002_bizarre_zarda.sql](<C:/socialstream/MargaAI-master/src/db/migrations/0002_bizarre_zarda.sql>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/db/migrations/meta/0000_snapshot.json](<C:/socialstream/MargaAI-master/src/db/migrations/meta/0000_snapshot.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/MargaAI-master/src/db/migrations/meta/0001_snapshot.json](<C:/socialstream/MargaAI-master/src/db/migrations/meta/0001_snapshot.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/MargaAI-master/src/db/migrations/meta/0002_snapshot.json](<C:/socialstream/MargaAI-master/src/db/migrations/meta/0002_snapshot.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/MargaAI-master/src/db/migrations/meta/_journal.json](<C:/socialstream/MargaAI-master/src/db/migrations/meta/_journal.json>) | Intentionally unread: lockfile or generated migration metadata |
| [C:/socialstream/MargaAI-master/src/db/schema.ts](<C:/socialstream/MargaAI-master/src/db/schema.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/proxy.ts](<C:/socialstream/MargaAI-master/src/proxy.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/assessmentService.ts](<C:/socialstream/MargaAI-master/src/services/assessmentService.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/auraEngine.ts](<C:/socialstream/MargaAI-master/src/services/auraEngine.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/learnerStateService.ts](<C:/socialstream/MargaAI-master/src/services/learnerStateService.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/llmProcessor.ts](<C:/socialstream/MargaAI-master/src/services/llmProcessor.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/plannerAgent.ts](<C:/socialstream/MargaAI-master/src/services/plannerAgent.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/profilerAgent.ts](<C:/socialstream/MargaAI-master/src/services/profilerAgent.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/progressAgent.ts](<C:/socialstream/MargaAI-master/src/services/progressAgent.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/quizAgent.ts](<C:/socialstream/MargaAI-master/src/services/quizAgent.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/retrieverAgent.ts](<C:/socialstream/MargaAI-master/src/services/retrieverAgent.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/roadmapAdapter.ts](<C:/socialstream/MargaAI-master/src/services/roadmapAdapter.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/streakService.ts](<C:/socialstream/MargaAI-master/src/services/streakService.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/src/services/tutorAgent.ts](<C:/socialstream/MargaAI-master/src/services/tutorAgent.ts>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |
| [C:/socialstream/MargaAI-master/tsconfig.json](<C:/socialstream/MargaAI-master/tsconfig.json>) | Critical implementation/config content inspected (full or recovered targeted excerpts) |

**Verified — Intentionally uninspected:** node_modules, .next, dist/build outputs, npm lockfile internals, migration JSON snapshots, image contents, live databases/provider accounts/deployment settings and git-history secret contents. Root env values were not read for this module audit. Filename/environment-reference scans do not establish that every admin/job/presentation function is correct.

**Verified — Read errors/coverage:** No existing critical file was unreadable. Initial guesses such as C:/socialstream/src/context/AuthContext.jsx, src/services/api.js and server/controllers/authController.js did not exist; inventory resolved the real main auth/API locations. An initial PowerShell wildcard argument to rg did not expand; directory searches were used afterward. Large-output truncation was handled with targeted rereads; unreviewed interiors remain labeled above.

**Verified — Delivery boundary:** Only modules.md is created for this audit. Existing code, configuration, lockfiles and changes.md are outside the write scope. Builds/tests/migrations/provider calls remain unperformed.
