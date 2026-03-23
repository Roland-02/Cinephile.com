# Cinephile.com

A personalized movie discovery platform powered by a content-based machine learning recommendation engine.

**Live site:** [cinephile-com.vercel.app](https://cinephile-com.vercel.app/)

## Tech Stack

- **Frontend:** React, Vite, SCSS
- **Backend:** Flask (Python), PostgreSQL
- **ML:** scikit-learn (TF-IDF, K-Means, cosine similarity)
- **Infrastructure:** Docker, Vercel (frontend), VPS (backend)

## Recommendation Engine

The system builds a user taste profile across 5 similarity dimensions:

- **Plot** — TF-IDF vectorization + cosine similarity on film synopses
- **Cast** — Weighted matching on liked actors/actresses
- **Crew** — Similarity across directors, cinematographers, writers, producers, editors, composers
- **Genre** — K-Means clustering (85 clusters) on genre vectors with cosine similarity
- **Meta** — Euclidean distance on rating, year, and runtime

Users select *what* they liked about a film (the plot? a specific actor? the director?), and the engine weighs recommendations accordingly — producing 5 distinct recommendation feeds: combined, storyline, cast, crew, and genre.

## Features

- Browse and filter films by genre, rating, runtime, and decade
- Like films with granular attribute selection (plot, cast, crew, genre, meta)
- Love films for strong positive signals
- Watchlist management
- Personalized recommendations across 5 categories
- Profile analytics — favourite actors, filmmakers, and genre distribution charts
- Search for films and people
- OAuth 2.0 authentication (Google, Facebook) + email/password

## Architecture

```
Vercel (Frontend)              VPS (Backend)
┌──────────────────┐           ┌──────────────────────--┐
│  React + Vite    │──/api/*──>│  Flask API (Python)    │
│  SCSS            │──/auth/*─>│  Recommendation Engine │
│                  │           │  PostgreSQL (Docker)   │
└──────────────────┘           └──────────────────────--┘
```

Vercel serves the React SPA and proxies `/api/*` and `/auth/*` requests to the Flask backend on the VPS. The backend and database run as Docker Compose services.

## Local Development

### Prerequisites

- Docker & Docker Compose
- Node.js & npm
- Python 3.13+

### Setup

1. Clone the repo
   ```bash
   git clone https://github.com/Roland-02/Cinephile.com.git
   cd Cinephile.com
   ```

2. Create a `.env` file in the project root with the required environment variables:
   ```
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_DATABASE=cinephile
   DB_PORT=5432
   API_TOKEN=your_api_token
   VITE_API_TOKEN=your_vite_api_token
   ```

3. Start the backend with Docker:
   ```bash
   docker compose up --build
   ```

4. Or run the frontend separately for development:
   ```bash
   npm install
   npm run dev
   ```
