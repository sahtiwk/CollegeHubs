# CollegeHubs Learn: P3.1 session spike

The active surface is a Core-authenticated session check, not the legacy learning product described below. Next 16.3.3 runs independently with basePath `/learn`. No Clerk, Gemini or YouTube key is required for this slice. Unconverted pages and APIs, including sign-in, quiz, generation and dashboard routes, return 404 through a deny-by-default proxy. Full Clerk removal and learning conversion belong to P9.

## Setup

Use Node 22.18 or newer (the bootstrap uses native TypeScript stripping) and a fresh disposable PostgreSQL database. Run `npm ci` in this folder. Set the names in `.env.example` through protected server configuration. `APP_ORIGIN` is the exact browser gateway origin; `CORE_API_BASE_URL` is the Core server origin without `/api`. HTTPS is required except for localhost/127.0.0.1 fixtures. `CORE_TOKEN_AUDIENCE` must be `collegehubs-learn`; issuer/key ID/public PEM must match Core. The module service credential is server-only and must be provisioned for Learn at Core. No Core private key goes into Learn.

Create an empty database named `collegehubs_demo_learn_<suffix>`. In the shell (the bootstrap intentionally does not load .env), set DATABASE_URL, DEMO_RESET_ENABLED=true and DEMO_DB_NAME_ALLOWLIST containing that exact database name. Run:

```powershell
npm run setup:demo -- --confirm=collegehubs_demo_learn_<suffix> --disposable-data-only
```

The script refuses production mode, unconfirmed/non-allowlisted names, and any existing public table. It creates only module_handoff and module_session plus indexes inside a transaction; it never drops data or runs legacy migrations. Repeated setup against populated schema intentionally refuses. Do not run `drizzle push` or old scripts against this session-only database. Legacy schema declarations remain for type compatibility with gated code and are not installed. P9 requires a separately fresh full schema after explicitly discarding this disposable spike DB.

Run `npm run build`, then `npm start` (default port 3000). A local gateway must route `/learn/*` to Next **preserving the prefix**, and Core `/api/*` before the Core SPA fallback. P3.1 used a temporary gateway; committed production/local gateway rewrites and the staging go/no-go are P3.2. Keep Core ENABLE_MODULES empty in normal deployment until those checks pass. In an isolated fixture only, enable Learn and open `/learn/auth/start` from the already-signed-in Core browser.

## Session boundary

- GET `/learn/auth/start`: random 60-second state; only its hash is saved. Secure/HttpOnly/SameSite=Lax state cookie at `/learn`; redirects to Core's state-bound handoff page.
- POST `/learn/auth/callback`: exact Origin/cookie/form state, 2 KiB form bound, atomic one-use state deletion, four-second/16 KiB bounded server exchange, local RS256 issuer/audience/key/time verification and safe theme validation. Creates an opaque session cookie and redirects to clean `/learn/session-check`. No JWT/grant is placed in a URL or frontend storage.
- GET `/learn/session-check`: protected server-rendered subject/Hub presentation, or a new-handoff prompt without private identity. Uses the plum/cream/peach/pale-sky shell, Abril Fatface and Archivo, and allowlisted Core theme tokens.
- GET `/learn/api/session`: current cookie-owned safe identity/theme/expiry/CSRF token; no caller-selected subject/Hub. Missing/expired session is 401; unavailable dependency is 503. No JWT, state, cookie handle or secret is returned.
- DELETE `/learn/api/session`: exact Origin plus CSRF, deletes only the current session and clears its cookie. Core sign-in is unaffected.

SQL stores only opaque session/state hashes, validated principal/Hub/theme, bounded expiry and CSRF hash. Expiry cannot exceed the Core token's 15-minute maximum. Current sessions verify locally; Core membership revocation can take up to that expiry. Outage/ambiguous exchange burns state and offers a fresh handoff; it never reuses a consumed grant. Session APIs and pages are no-store. Proxy is a route gate, not the sole authorization boundary.

The module imports only the shared crypto contracts from `../packages/contracts`, not Core models/DB. Build from this repository checkout; tracing includes the shared package. Imported legacy sources remain gated and may print missing Gemini-key notices during build; no provider request is made by this slice.

See [P3.1 evidence](../docs/p3.1-evidence.md). Only G1/G2 were extended; the root named guards also retain G3. A fresh full run with disposable MongoDB passes 49 checks. Local proof does not provision or certify Neon/Vercel staging.

---

## Archived upstream README (describes gated legacy code, not the active product)

# MargaAI 🚀

MargaAI is an advanced, AI-driven adaptive learning platform designed to provide a highly personalized and gamified educational experience. Using intelligent node-based roadmaps, it adapts to the learner's skill level, recommends the most optimal path, and curates high-quality resources directly from YouTube and Wikipedia.

## Features

- **Personalized Learning Paths:** Dynamically builds a curriculum based on your career goals and current skill level.
- **Node-Based Mastery:** Progress through a complex, interconnected graph of skills (Frontend, Backend, DevOps, Data Science, DSA).
- **Aura & Gamification:** Earn Aura Points, build daily streaks, and climb tiers as you master new skills and test out of prerequisites.
- **JIT Resource Fetching:** Automatically fetches the most relevant and high-quality YouTube tutorials for any concept you need to learn.
- **Adaptive Assessments:** Uses Item Response Theory (IRT) to estimate your true proficiency and provide correctly-leveled quizzes.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Database:** PostgreSQL (hosted on Neon with connection pooling)
- **ORM:** Drizzle ORM
- **Authentication:** Clerk
- **AI Integration:** Google Gemini API (for quiz generation and dynamic node planning)
- **APIs:** YouTube Data API v3, Wikipedia API
- **Styling:** Custom CSS with premium glassmorphic UI design

## Getting Started

### Prerequisites

Ensure you have Node.js (v18+) installed. You will also need API keys for the following services:
- Neon (PostgreSQL)
- Clerk
- Google Gemini
- YouTube Data API v3

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sahtiwk/margaai.git
   cd margaai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
   GEMINI_API_KEY="your_gemini_api_key"
   
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   CLERK_SECRET_KEY="your_clerk_secret_key"
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

   YOUTUBE_API_KEY="your_youtube_api_key"
   ```

4. **Initialize the Database:**
   Push the Drizzle schema to your PostgreSQL instance:
   ```bash
   npx drizzle-kit push
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Deployment

MargaAI is optimized for deployment on **Vercel**. 
1. Connect your GitHub repository to Vercel.
2. Add all environment variables listed above in the Vercel project settings.
3. Deploy! Vercel will automatically handle the build and serverless deployment.

---
*MargaAI - Precision Learning.*
