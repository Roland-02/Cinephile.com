# Cinephile.com

A movie discovery and recommendation platform built with React and Flask.

## Architecture

- **Flask Server (port 5000)**: Main server handling all API routes and serving React app
  - File: `routes/server.py`
- **Flask Recommendation Engine (port 8081)**: ML-based recommendation service
  - File: `routes/recommendEngine.py`
- **React Frontend**: Single Page Application
  - Built files in `dist/` (production)
  - Dev server on port 3000 (development)

## Setup

### Install Dependencies

```bash
# Node.js dependencies
npm install

# Python dependencies
pip install flask flask-cors flask-caching bcrypt mysql-connector-python requests python-dotenv
```

### Development Mode

1. **Start Recommendation Engine** (in one terminal):
   ```bash
   python routes/recommendEngine.py
   ```
   This runs on port 8081.

2. **Start Main Flask Server** (in another terminal):
   ```bash
   python routes/server.py
   ```
   This runs on port 5000 and serves the React app.

3. **Start React Dev Server** (optional, for hot-reload):
   ```bash
   npm run dev
   ```
   This runs on port 3000 and proxies API calls to Flask.

### Production Mode

1. **Build React app**:
   ```bash
   npm run build
   ```

2. **Start Recommendation Engine**:
   ```bash
   python routes/recommendEngine.py
   ```

3. **Start Main Server**:
   ```bash
   python routes/server.py
   ```

The Flask server will serve the built React app from `dist/`.

## File Structure

- `routes/server.py` - Main Flask server (auth, films, user interactions, React serving)
- `routes/recommendEngine.py` - Recommendation engine (ML-based recommendations)
- `routes/tmdb_calls.py` - TMDB API helper functions
- `src/` - React source code
- `dist/` - Built React app (generated)

## Environment Variables

Create a `.env` file with:
- `PORT` - Main server port (default: 5000)
- `DB_HOST` - MySQL host
- `DB_USER` - MySQL user
- `DB_PASSWORD` - MySQL password
- `DB_DATABASE` - MySQL database name
- `DB_PORT` - MySQL port
- `PAGE_SIZE` - Films per page (default: 100)
- `SECRET` - Session secret
