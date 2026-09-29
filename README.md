# SocialStream Landing Dashboard

This is the landing / home dashboard for **SocialStream**, a professional networking platform for developers that layers a gamified **Aura Points** system on top of a LinkedIn-style experience.

## Tech Stack

- React + Vite
- Tailwind CSS
- lucide-react (icons)

## Features

- **3-column layout** (LinkedIn-style):
  - Left: profile hub + Aura Box
  - Middle: activity feed (create post + mock posts)
  - Right: community leaderboard + upcoming contests
- **Aura Box** with glowing gradient treatment, Aura total, rank, streak, quest, and next-level progress bar.
- Responsive:
  - Mobile: center feed only
  - Large screens: left sidebar visible
  - Extra-large screens: right sidebar visible

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the app in your browser (by default `http://localhost:5173`) to see the SocialStream dashboard.


## P0.1 protected baseline

Copy `.env.example` to a local environment file and configure `VITE_API_URL` (Core origin or URL ending in `/api`) and `VITE_GOOGLE_CLIENT_ID` if using Google sign-in. Set the API's required secret and exact frontend origin allowlist as described in [server setup](server/README.md). Existing sessions need to sign in again after this update. See [verification evidence and remaining environment checks](docs/p0.1-evidence.md).
