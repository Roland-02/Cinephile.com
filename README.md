# Cinephile.com

A personalised film discovery platform built around a content-based recommendation
engine. You tell it *what* you liked about a film — the plot, a particular actor,
the director — and it weighs recommendations accordingly.

## Tech Stack

- **Frontend:** React 18, Vite, SCSS, Bootstrap 5 (CDN)
- **Backend:** Flask (Python 3.13), psycopg2
- **Database:** Neon (managed PostgreSQL 18)
- **ML:** scikit-learn — TF-IDF, K-Means, cosine similarity, Euclidean distance
- **Auth:** Google Identity Services
- **Infrastructure:** Docker, Coolify VPS behind Traefik

## Architecture

One image, two build stages. Node compiles the SPA to `dist/`; the Python runtime
serves both the API and those static files on a single port, so there is one
origin and no CORS in production.

```
                    ┌─────────────────────────────────┐
  browser  ─────────>  Flask :8080                    │
                    │    /api/*   → API + recommender │
                    │    /*       → dist/index.html   │
                    └──────────────┬──────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     │  Neon PostgreSQL          │
                     │  (aws-eu-central-1)       │
                     └───────────────────────────┘
```

The recommendation engine is a Flask blueprint mounted on the same app under
`/api`, not a separate service. It warms its in-memory dataset lazily on first
request and returns 503 for recommendation routes only if the database is
unreachable, so the rest of the site stays up.

Coolify assigns the public domain via `SERVICE_FQDN_APP_8080` in
`docker-compose.yaml`. The deployment is hand-rolled rather than managed by
deploykit; only the Neon database was provisioned through it.

## Authentication

Google is the identity provider — it owns passwords, 2FA and account recovery.
No credential ever reaches this application.

1. The browser obtains a Google ID token via Google Identity Services.
2. It posts that token once to `POST /api/auth/google`.
3. The server verifies the signature against Google's JWKS with
   `audience=GOOGLE_CLIENT_ID`, and checks the issuer and `email_verified`.
4. It returns the app's own HS256 session token (30-day TTL), which the SPA
   sends as `Authorization: Bearer` on every later request.

Users are resolved by the provider's subject id, falling back to a match on
verified email — which is what carried existing accounts through the Clerk →
Supabase → Google migrations without losing their saved films.

Separately, every `/api/*` request must carry an `X-App-Api-Key` header. Note
that this key is compiled into the public JS bundle, so it filters undirected
traffic rather than authorising anyone; the session token above is the real
authorisation.

Google Identity Services uses **Authorized JavaScript origins**, not redirect
URIs — there is no redirect leg. The OAuth client needs the site origin and
`http://localhost:8080` listed there.

## Recommendation Engine

The engine builds a taste profile across five similarity dimensions:

| Dimension | Method |
|---|---|
| **Plot** | TF-IDF vectorisation + cosine similarity on synopses |
| **Cast** | Weighted matching on liked actors |
| **Crew** | Directors, cinematographers, writers, producers, editors, composers |
| **Genre** | K-Means (85 clusters) on genre vectors + cosine similarity |
| **Meta** | Euclidean distance on rating, year and runtime |

These produce five recommendation feeds: combined, storyline, cast, crew and
genre. Results are cached per user and invalidated whenever the user loves,
un-loves, or re-tags a film.

A weekly job pulls newly released films from IMDb's dataset exports, enriches
them via TMDB, and rebuilds the in-memory models.

## Features

- Browse and filter films by genre, rating, runtime and decade
- Like a film with granular attribute selection — plot, cast, crew, genre, meta
- Love a film as a strong positive signal
- Watchlist management
- Personalised recommendations across the five categories above
- Profile analytics — favourite actors, filmmakers, genre distribution
- Search across films and people
- Sign in with Google

## Environment

Create a `.env` file in the project root.

**Required — the server refuses to start without these:**

| Variable | Purpose |
|---|---|
| `APP_API_KEY` | Gates the `/api/*` surface; also compiled into the client bundle |
| `APP_JWT_SECRET` | Signs the app's own session tokens. Must differ from `APP_API_KEY` |
| `GOOGLE_CLIENT_ID` | Google OAuth client id, used as the ID-token audience |

**Required — no default, the app will fail at runtime without them:**

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `DB_PORT` | Neon connection |
| `PAGE_SIZE` | Films per page, shared by the API and the client |
| `TMDB_API_KEY` | Enriching new films during the weekly dataset refresh |

**Build-time, read by Vite:**

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Same client id, needed in the browser |
| `VITE_API_BASE_URL` | API origin. Empty in production (same origin); the dev proxy target |

**Optional:**

| Variable | Default |
|---|---|
| `DB_SSLMODE` | `require` |
| `FRONTEND_URL` | `http://localhost:3000` — the CORS origin |

`PAGE_SIZE` and `APP_API_KEY` are mapped into the bundle as `VITE_PAGE_SIZE` and
`VITE_APP_API_KEY` by `vite.config.js`; you do not set the `VITE_` forms yourself.

## Local Development

### Prerequisites

Docker and Docker Compose, Node.js and npm, Python 3.13+.

### Full stack in Docker

`docker-compose.yaml` alone does not publish a host port — production sits behind
Traefik. Add the local layer to reach it directly:

```bash
docker compose -f docker-compose.yaml -f docker-compose.local.yml up -d --build
```

Then open <http://localhost:8080>.

### Frontend against a running backend

```bash
npm install
npm run dev
```

Vite serves on port 3000 and proxies `/api` to `VITE_API_BASE_URL`.

## Repository Layout

```
client/          React SPA — pages, components, contexts, SCSS
server/
  server.py           Flask app: auth, film browsing, user interactions, SPA serving
  recommendEngine.py  Recommendation blueprint, dataset ingest, scheduled jobs
images/          Static art served at /images/*
public/          Vite public assets (favicon)
index.html       Vite entry template
dist/            Build output (generated; not committed)
docs/            Migration specs and design notes
```
