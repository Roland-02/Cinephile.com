# Cinephile.com

A movie discovery and recommendation platform built with React and Flask.

## Architecture

- **Unified Flask Server (port 5000)**: Single server handling all API routes, recommendation engine, and serving React app
  - Main server: `server/server.py`
  - Recommendation engine: `server/recommendEngine.py` (integrated via Flask Blueprint)
- **React Frontend**: Single Page Application with SCSS styling
  - Source code in `client/`
  - Built files in `dist/` (production)
  - Dev server on port 3000 (development)

## Setup

### Install Dependencies

```bash
# Node.js dependencies (for React development/build)
npm install

# Python dependencies
pip install flask flask-cors flask-caching bcrypt mysql-connector-python requests python-dotenv schedule numpy pandas scikit-learn threadpoolctl langdetect sqlalchemy
```

### Development Mode

1. **Start Flask Server** (in one terminal):
   ```bash
   python server/server.py
   ```
   This runs on port 5000 and includes:
   - All API routes (auth, films, user interactions)
   - Recommendation engine routes (integrated via blueprint)
   - React app serving

2. **Start React Dev Server** (optional, in another terminal for hot-reload):
   ```bash
   npm run dev
   ```
   This runs on port 3000 and proxies API calls to Flask on port 5000.

**Access:**
- Frontend (dev): http://localhost:3000
- Backend API: http://localhost:5000/api/
- Frontend (served by Flask): http://localhost:5000/

### Production Mode

1. **Build React app**:
   ```bash
   npm run build
   ```
   This creates the `dist/` folder with the production build.

2. **Start Flask Server**:
   ```bash
   python server/server.py
   ```
   The Flask server will automatically serve the built React app from `dist/`.

**Access:**
- Application: http://localhost:5000/
- API: http://localhost:5000/api/

## File Structure

```
Cinephile.com/
├── client/                    # React frontend source code
│   ├── components/           # Reusable React components
│   │   └── Navbar.jsx
│   ├── pages/               # Page components
│   │   ├── Index.jsx
│   │   ├── Login.jsx
│   │   ├── CreateAccount.jsx
│   │   ├── Profile.jsx
│   │   ├── Search.jsx
│   │   ├── Watchlist.jsx
│   │   └── Recommend.jsx
│   ├── styles/              # SCSS stylesheets
│   │   ├── _variables.scss  # SCSS variables
│   │   ├── _mixins.scss     # SCSS mixins
│   │   ├── _base.scss       # Base styles
│   │   ├── _navbar.scss     # Navbar styles
│   │   ├── _components.scss # Component styles
│   │   ├── main.scss        # Main entry point
│   │   └── pages/           # Page-specific styles
│   └── utils/               # Utility functions
│       └── auth.js
├── server/                   # Flask backend
│   ├── server.py            # Main Flask server (unified)
│   ├── recommendEngine.py   # Recommendation engine (Blueprint)
│   └── tmdb_calls.py        # TMDB API helper functions
├── dist/                     # Built React app (generated)
├── images/                   # Static images
├── mysql_schema_tables/      # Database schema files
├── index.html                # HTML entry point
├── vite.config.js           # Vite configuration
└── package.json             # Node.js dependencies
```

## Key Features

- **Unified Backend**: Single Flask server with recommendation engine integrated via Blueprint
- **SCSS Styling**: Modular SCSS architecture with variables, mixins, and component-based organization
- **React Router**: Client-side routing for seamless navigation
- **Bootstrap & MDB**: UI framework loaded via CDN in `index.html`
- **Machine Learning**: ML-based recommendation engine using scikit-learn

## Environment Variables

Create a `.env` file in the project root with:

```env
PORT=5000
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=your_db_name
DB_PORT=3306
PAGE_SIZE=100
SECRET=your_secret_key
```

## Technology Stack

### Frontend
- React 18
- React Router DOM
- Vite (build tool)
- SCSS (styling)
- Bootstrap 5.3.3
- MDB UI Kit 4.2.0
- Axios (HTTP client)

### Backend
- Flask (Python web framework)
- Flask-CORS (CORS support)
- Flask-Caching (caching)
- MySQL Connector (database)
- bcrypt (password hashing)
- scikit-learn (machine learning)
- pandas & numpy (data processing)

## Development Notes

- The recommendation engine runs as a Flask Blueprint, integrated into the main server
- All routes are accessible on port 5000 with `/api/` prefix
- React source files are in `client/` directory
- SCSS files use the `@use` module system for better organization
- Bootstrap and MDB are loaded via CDN in `index.html` (not via React)

## Quick Start

```bash
# Install dependencies
npm install
pip install -r requirements.txt  # (if you have one) or install manually

# Development
python server/server.py          # Terminal 1: Flask server
npm run dev                      # Terminal 2: React dev server (optional)

# Production
npm run build                    # Build React app
python server/server.py          # Start Flask server
```
