# AI Interviewer Project Guide

## 1. Project Summary

AI Interviewer is a full-stack platform for practicing job interviews with an AI interviewer. A candidate can create an account, upload a resume, configure an interview for a role, answer generated questions, and receive scores and written feedback. The application also includes job discovery, resume-based recommendations, and an administration console.

The repository contains two applications:

- `backend/`: Node.js and Express API, MongoDB persistence, AI integrations, job services, and Socket.io.
- `frontend/`: React and Vite single-page application for candidate and administrator workflows.

The root `package.json` provides commands for installing and running both applications together.

## 2. Main Technologies

### Backend

- Node.js with Express
- MongoDB with Mongoose
- JWT access and refresh tokens with bcrypt password hashing
- Groq for chat completions and interview-related AI tasks
- OpenAI embeddings through LangChain for retrieval-augmented generation
- Socket.io for streamed interview follow-up responses
- Cloudinary and Multer for resume file storage and uploads
- Redis for caching and optional service support
- PostgreSQL client for an alternative job data source
- Adzuna for external job search and synchronization
- Helmet, CORS, rate limiting, compression, Morgan, and Winston for HTTP security and operations
- Jest and Nodemon for testing and development

### Frontend

- React 18 with Vite
- React Router for user and admin routes
- Zustand for user authentication state
- TanStack React Query for server state and caching
- React Hook Form for forms
- Tailwind CSS for styling
- Framer Motion for animation
- Recharts for dashboards and analytics
- Socket.io client for real-time interview feedback
- Axios for API requests

## 3. Repository Layout

```text
AI-Interviewer/
|-- package.json                 Root development commands
|-- README.md                    Existing quick-start documentation
|-- CONTRIBUTING.md              Contribution guidelines
|-- SECURITY.md                  Security guidance
|-- LICENSE                      MIT license
|-- backend/
|   |-- package.json
|   |-- BACKEND_STRUCTURE.md     Backend notes; this guide is more current
|   `-- src/
|       |-- app.js               Express application and API registration
|       |-- server.js            HTTP server and process bootstrap
|       |-- socket.js            Socket.io live interview behavior
|       |-- config/              Database, AI, storage, cache, and logging setup
|       |-- controllers/         HTTP request handlers
|       |-- middleware/          Authentication, validation, uploads, errors, logging
|       |-- models/              Mongoose schemas
|       |-- routes/              API route definitions
|       |-- services/            AI, job, RAG, sync, and business services
|       |-- scripts/              Operational scripts such as admin seeding
|       `-- utils/               Shared errors, caching, normalization, and clients
`-- frontend/
    |-- package.json
    |-- index.html
    |-- vite.config.js           Development server and API proxy
    |-- tailwind.config.js
    |-- postcss.config.js
    `-- src/
        |-- main.jsx             React bootstrap and providers
        |-- App.jsx              Route tree and route guards
        |-- components/           Reusable UI components
        |-- constants/            Shared frontend constants
        |-- context/              Admin and application UI context
        |-- hooks/                Reusable data and behavior hooks
        |-- layouts/              Auth, dashboard, and admin shells
        |-- lib/                  Axios clients and shared libraries
        |-- pages/                Candidate and admin screens
        |-- services/             User and admin API wrappers
        |-- store/                Zustand stores
        `-- utils/                Frontend helper functions
```

## 4. Running the Project

### Requirements

- Node.js 18 or newer
- MongoDB, local or hosted
- Groq API access
- OpenAI API access for embeddings
- Cloudinary account for resume storage
- Redis if caching and background job services are enabled
- Adzuna credentials for external job search and synchronization
- PostgreSQL only if the PostgreSQL job source is used

### Install

From the repository root:

```bash
npm run install:all
```

This installs dependencies in both `backend/` and `frontend/`.

### Configure

Create `backend/.env` from `backend/.env.example` and `frontend/.env` from `frontend/.env.example`. Never commit real credentials.

Typical backend configuration:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/ai_interviewer
JWT_SECRET=replace-with-a-long-secret
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=replace-with-another-long-secret
JWT_REFRESH_EXPIRE=30d
GROQ_API_KEY=replace-with-groq-key
OPENAI_API_KEY=replace-with-openai-key
CLOUDINARY_CLOUD_NAME=replace-with-cloud-name
CLOUDINARY_API_KEY=replace-with-api-key
CLOUDINARY_API_SECRET=replace-with-api-secret
CLIENT_URL=http://localhost:5173
```

Optional or feature-specific variables include `REDIS_ENABLED`, `REDIS_URL` or Redis host/port settings, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY`, `DATABASE_URL` or PostgreSQL connection variables, compression settings, Adzuna timeout/retry settings, and job cache settings. The code reads these in `backend/src/config/redis.js`, `backend/src/services/postgresJobService.js`, and `backend/src/utils/adzunaClient.js`.

Typical frontend configuration:

```env
VITE_API_URL=/api
VITE_APP_NAME=AI Interviewer
```

### Start in development

Run both applications from the root:

```bash
npm run dev
```

Or run them separately:

```bash
cd backend
npm run dev

cd frontend
npm run dev
```

The backend normally listens on `http://localhost:5000` and Vite on `http://localhost:5173`. The Vite configuration proxies `/api` requests to the backend.

### Build and test

```bash
cd frontend
npm run lint
npm run build

cd ../backend
npm test
```

The backend test script uses Jest. The repository currently contains the script but no substantial test suite was identified during inspection.

## 5. Backend Architecture

### Startup and middleware

`backend/src/app.js` creates the Express application. It connects the database, configures Helmet, compression, CORS, rate limiting, JSON and URL-encoded parsers, Morgan logging, the health endpoint, API routes, a 404 handler, and the global error handler.

`backend/src/server.js` loads environment variables, starts the HTTP server, connects Redis, starts job synchronization and cleanup schedulers, installs Socket.io, and handles process failures and shutdown signals.

Health check:

```text
GET /api/health
```

### API route groups

| Prefix | Responsibility |
| --- | --- |
| `/api/auth` | Registration, login, refresh, current-user lookup, and logout |
| `/api/users` | Profile, password, dashboard statistics, and user account operations |
| `/api/resumes` | Upload, parse, list, delete, default selection, and chunk preview |
| `/api/interviews` | Interview creation, question generation, retrieval, listing, and deletion |
| `/api/sessions` | Start sessions, save answers, complete sessions, and retrieve results |
| `/api/jobs` | Job listings, live search, categories, and recommendations |
| `/api/admin` | Admin authentication, CRUD screens, analytics, settings, logs, prompts, and operations |

Routes delegate to controllers. Controllers handle request and response concerns, while services contain AI, job, retrieval, synchronization, and other business logic.

### Authentication and authorization

Regular protected routes use `backend/src/middleware/auth.middleware.js`. It validates the bearer JWT, loads the user, checks account status, and detects invalidation after a password change. User roles and account information are stored in `backend/src/models/User.model.js`.

Admin requests use `adminAuth.middleware.js` and role/permission rules in `rbac.js`. The frontend has separate admin authentication context and API handling. Admin screens are routed under `/admin`.

### Backend folders

#### `config/`

Contains MongoDB, Cloudinary, Groq, Redis, and Winston logger configuration. These modules centralize external service clients and connection behavior.

#### `controllers/`

Contains request handlers for authentication, users, resumes, interviews, sessions, jobs, and the full admin area. Admin controllers cover analytics, authentication, jobs, logs, payments, plans, prompts, scraping, settings, and templates.

#### `middleware/`

Contains user and admin authentication, role-based access control, request validation, upload handling, request logging, and global error handling.

#### `models/`

The main Mongoose models are:

- `User`: identity, credentials, roles, credits, premium state, and usage counters.
- `Resume`: Cloudinary metadata, extracted text, parsed resume data, and ownership.
- `Interview`: job details, configuration, generated question subdocuments, and status.
- `Session`: submitted answers, answer scores, completion state, and final report.
- `Job`: local or synchronized job listings.
- `InterviewTemplate`, `Plan`, `Transaction`, and `WebhookLog`: product and billing-related data.
- `AuditLog`, `ScraperConfig`, `ScraperLog`, `SystemPrompt`, and `SystemSetting`: administrative and operational data.

#### `services/`

- `ai.service.js`: Groq orchestration for parsing, question creation, answer evaluation, and reports.
- `chunking.service.js`: Splits resumes and job descriptions into useful context chunks.
- `rag.service.js`: Creates embeddings, retrieves relevant chunks, and supplies context to generation.
- `optimizer.service.js`: Improves search or interview queries before AI retrieval.
- `jobSearchService.js`, `jobMatchService.js`, and `jobNormalizer.js`: Search, recommendation, normalization, and matching behavior.
- `adzuna.service.js` and `adzunaService.js`: Adzuna live search and scheduled synchronization paths.
- `jobSyncService.js` and `jobSyncScheduler.js`: Fetch and schedule job synchronization.
- `jobCleanupService.js`: Deactivates old jobs.
- `postgresJobService.js`: PostgreSQL-backed job access with fallback behavior.

#### `utils/`

Provides application errors, Adzuna clients and caching, deduplication, normalization, and other shared helpers.

## 6. Candidate User Flow

1. The user registers or logs in and receives JWT-based authentication.
2. The user uploads a PDF, DOC, or DOCX resume. Multer and Cloudinary handle storage.
3. The backend extracts text, parses resume information with Groq, and stores the result.
4. The user creates an interview with a role, job description, experience level, question types, count, and optional resume.
5. Resume and job-description content is chunked. Relevant context can be embedded with OpenAI and retrieved through the RAG service.
6. Groq generates structured interview questions.
7. A session presents questions and stores candidate answers.
8. Each answer can be evaluated by Groq. Completion produces an overall score, strengths, weaknesses, and improvement guidance.
9. During live interaction, Socket.io streams a conversational follow-up from Groq.

The important backend files are `resume.controller.js`, `interview.controller.js`, `session.controller.js`, `ai.service.js`, `rag.service.js`, and `socket.js`.

## 7. Job System

The project currently has more than one job path:

1. **Live Adzuna search** uses `/api/jobs/search`, query optimization, Adzuna requests, normalization, deduplication, scoring, Redis caching, retries, circuit-breaker behavior, pagination, and stale-result fallback.
2. **Database-backed listings** use `/api/jobs`, attempt PostgreSQL where configured, and fall back to MongoDB `Job` data. The active frontend `useJobs` hook uses this path.
3. **Scheduled synchronization** uses the older Adzuna service through the job sync scheduler. It runs periodically and stores locally available listings.
4. **Recommendations** compare parsed resume skills with job requirements through `jobMatchService.js`.

Background schedules are started by `server.js`: developer-job synchronization runs every three hours, and old-job cleanup runs daily. Exact intervals and feature flags are defined in the scheduler services and environment configuration.

## 8. Frontend Architecture

`frontend/src/main.jsx` bootstraps React and mounts the providers for React Query, routing, admin authentication, and application UI state.

`frontend/src/App.jsx` defines the route tree and guards. Candidate routes include:

- `/`, `/login`, and `/register`
- `/dashboard`
- `/interviews` and `/interviews/new`
- `/interviews/:id/session`
- `/sessions` and `/sessions/:id/results`
- `/resumes`
- `/jobs` and `/jobs/recommended`
- `/profile`

Admin routes include `/admin/login`, `/admin`, `/admin/users`, `/admin/jobs`, `/admin/interviews`, `/admin/sessions`, `/admin/resumes`, `/admin/ats`, `/admin/subscription`, `/admin/payments`, `/admin/analytics`, `/admin/settings`, `/admin/scraper`, `/admin/prompts`, and `/admin/logs`.

The main layouts are:

- `AuthLayout.jsx`: login and registration presentation.
- `DashboardLayout.jsx`: candidate navigation and application shell.
- `AdminLayout.jsx`: administrative navigation and protected admin shell.

The user API client and token refresh behavior are in `frontend/src/lib/axios.js`. Admin requests use `adminAxios.js`. API wrappers are in `frontend/src/services/api.js` and `admin.service.js`. Zustand stores user authentication, while `AdminAuthContext.jsx` manages the separate admin session and `AppContext.jsx` manages shared UI state.

## 9. Real-Time Interview Protocol

Socket.io is attached to the HTTP server in `backend/src/socket.js`. The client sends a `live_answer` event containing `questionText`, `answerText`, and optional `expectedKeywords`.

The server builds an interviewer prompt, calls Groq with streaming enabled, and emits:

- `ai_chunk`: one streamed text fragment
- `ai_complete`: the response has finished
- `ai_error`: the response could not be generated

The socket layer currently uses the configured CORS origin, but it does not independently authenticate the socket connection. Treat socket input and authorization as an area for future hardening.

## 10. Data and AI Flow

```text
Resume upload
  -> Cloudinary storage
  -> PDF/text extraction
  -> Resume parsing with Groq
  -> Chunking and optional embeddings
  -> Interview configuration
  -> Context retrieval and question generation
  -> Session answers
  -> Per-answer evaluation
  -> Final score and feedback report
```

The current RAG implementation uses OpenAI `text-embedding-3-small`, cosine similarity, section-aware ranking, and an in-memory vector store. Embeddings are regenerated for generation requests rather than persisted as a durable vector database.

## 11. Operations and Security Notes

- Keep JWT, database, AI, Cloudinary, Redis, Adzuna, and PostgreSQL credentials outside source control.
- Use strong, separate JWT secrets for access and refresh tokens.
- Confirm `CLIENT_URL` and the frontend API URL match the deployment topology.
- Rate limiting is applied to `/api/`; its window and maximum can be configured with `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
- MongoDB connection errors are logged by the current implementation; the server may continue starting and fail later requests.
- `server.js` currently logs Adzuna credential identifiers at startup. Remove that logging before production deployment.
- Review `backend/src/scripts/seedAdmin.js` before use because it contains administrative account setup behavior and a hard-coded password pattern.
- Validate and authorize Socket.io events if live interview sessions are exposed beyond a trusted client.

## 12. Known Implementation Differences

The existing README and older backend notes describe parts of an earlier design. The current source should be treated as authoritative where they differ.

- Current code includes both `redis` and `ioredis` dependencies and a Redis compatibility layer; the README only describes ioredis.
- The RAG vector store is currently in memory, not a persisted vector database.
- There are two Adzuna service filenames with different responsibilities.
- Job data can come from Adzuna, MongoDB, or PostgreSQL, so schemas and behavior vary by path.
- The active frontend job hook uses `/api/jobs`, while the advanced live search pipeline is `/api/jobs/search`.
- The admin payment area contains Stripe-oriented UI concepts, but no clear Stripe dependency or complete Stripe integration is present in the backend.
- The admin ATS screen is currently a placeholder.
- `frontend/src/context/AuthContext.jsx` overlaps with the Zustand auth flow but is not mounted by the current application bootstrap.

## 13. Useful Files to Read First

For a quick orientation, read these files in order:

1. `README.md`
2. `backend/src/server.js`
3. `backend/src/app.js`
4. `backend/src/routes/`
5. `backend/src/controllers/`
6. `backend/src/services/ai.service.js`
7. `backend/src/services/rag.service.js`
8. `frontend/src/main.jsx`
9. `frontend/src/App.jsx`
10. `frontend/src/services/` and `frontend/src/hooks/`

This document describes the source tree and current behavior as inspected on September 18, 2026.