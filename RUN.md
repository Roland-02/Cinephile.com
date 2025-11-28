# How to Run Cinephile.com

## Backend (Flask Server)

The backend is unified and runs on a single port:

```bash
python routes/server.py
```

This starts:
- Main Flask server on port 5000 (or PORT from .env)
- All API routes at `/api/`
- Recommendation engine routes (integrated)
- React app serving

**Access:**
- API: http://127.0.0.1:5000/api/
- Frontend: http://127.0.0.1:5000/

## Frontend (React App)

You have two options:

### Option 1: Build React App (Recommended for Production)

Temporarily install Node.js to build once:

```bash
# Install Node.js dependencies
npm install

# Build React app
npm run build

# The dist/ folder will be created
# You can remove Node.js after building if you want
```

Then the Flask server will automatically serve the built app from `dist/`.

### Option 2: Use Development Setup (No Build Required)

The server is configured to serve React source files directly. However, React components need to be transpiled. For development, you can:

1. **Keep Node.js installed** and use Vite dev server:
   ```bash
   npm install
   npm run dev
   ```
   This runs React on port 3000 with hot-reload.

2. **Or use the built version** (Option 1) for production.

## Quick Start

1. **Start Backend:**
   ```bash
   python routes/server.py
   ```

2. **For Development (with hot-reload):**
   ```bash
   # Terminal 1: Backend
   python routes/server.py
   
   # Terminal 2: Frontend (if you have Node.js)
   npm run dev
   ```

3. **For Production:**
   ```bash
   # Build React app first
   npm install && npm run build
   
   # Then start backend
   python routes/server.py
   ```

## Environment Variables

Create a `.env` file with:
```
PORT=5000
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=your_db_name
DB_PORT=3306
PAGE_SIZE=100
SECRET=your_secret_key
```

## Python Dependencies

Make sure you have all Python packages installed:

```bash
pip install flask flask-cors flask-caching bcrypt mysql-connector-python requests python-dotenv schedule numpy pandas scikit-learn threadpoolctl langdetect sqlalchemy
```

