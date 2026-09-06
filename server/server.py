import os
import json
import random
import hmac
from datetime import datetime, timedelta, timezone
import psycopg2
import psycopg2.extras
from flask import Flask, jsonify, request, send_from_directory, g
from flask_cors import CORS
from dotenv import load_dotenv
import jwt
from jwt import PyJWKClient
from recommendEngine import recommend_bp, init_recommend_cache, start_recommendation_scheduler, update_profile_and_vectors, get_user_films

load_dotenv()

app = Flask(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS(app, origins=[FRONTEND_URL], supports_credentials=True)

APP_API_KEY = os.getenv("APP_API_KEY")

# Google is the identity provider: it owns passwords, 2FA and account recovery.
# The browser obtains a Google ID token via Google Identity Services and posts
# it to /api/auth/google; we verify it and issue our own session token from
# there on. Nothing about user credentials is stored or managed here.
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Signs the app's own session tokens. Distinct from APP_API_KEY, which only
# gates the API surface and is shipped to the browser.
APP_JWT_SECRET = os.getenv("APP_JWT_SECRET")

if not APP_API_KEY:
    raise RuntimeError("Missing APP_API_KEY environment variable.")
if not GOOGLE_CLIENT_ID:
    raise RuntimeError("Missing GOOGLE_CLIENT_ID environment variable.")
if not APP_JWT_SECRET:
    raise RuntimeError("Missing APP_JWT_SECRET environment variable.")

# Google publishes its signing keys here; PyJWKClient caches them.
GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")
_google_jwks_client = PyJWKClient(GOOGLE_CERTS_URL)

# Our own session tokens. Google ID tokens last only an hour, which would mean
# an hourly re-prompt; we verify Google's token once at sign-in and then issue
# a longer-lived token of our own.
APP_TOKEN_ISSUER = "cinephile"
APP_TOKEN_TTL = timedelta(days=30)

# Routes under /api/* that may be hit without a signed-in user. Auth still
# runs (so g.user is set when present), but missing/invalid session tokens are
# permitted.
PUBLIC_API_PATHS = {
    "/api/health",
    # Sign-in itself cannot require a session token.
    "/api/auth/google",
    "/api/indexPageFilms",
    "/api/filteredPageFilms",
    "/api/filter",
    "/api/shuffleFilms",
    "/api/openClickedFilm",
    "/api/get_allFilms_index",
    "/api/datasetLength",
    "/api/search_general",
}

# Create PostgreSQL database connection (Neon)
def create_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dbname=os.getenv("DB_DATABASE"),
        port=int(os.getenv("DB_PORT")),
        sslmode=os.getenv("DB_SSLMODE", "require")
    )

def _extract_api_token_from_headers():
    token = request.headers.get("X-App-Api-Key")
    if token:
        return str(token).strip()
    return None

def _extract_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if isinstance(auth_header, str) and auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):].strip()
    return None

def _verify_google_id_token(credential):
    """Verify a Google ID token and return its claims, or None if invalid.

    Google signs ID tokens with RS256 keys published at GOOGLE_CERTS_URL. The
    audience must be this app's OAuth client id, otherwise a token minted for
    any other Google application would be accepted here.
    """
    try:
        signing_key = _google_jwks_client.get_signing_key_from_jwt(credential)
        claims = jwt.decode(
            credential, signing_key.key, algorithms=["RS256"],
            audience=GOOGLE_CLIENT_ID,
        )
    except Exception as e:
        print(f"Google ID token verification failed: {e}")
        return None

    # PyJWT does not check `iss`, and Google uses two spellings of it.
    if claims.get("iss") not in GOOGLE_ISSUERS:
        print(f"Google ID token rejected: unexpected issuer {claims.get('iss')!r}")
        return None
    # An unverified address must never match a login row by email.
    if not claims.get("email") or claims.get("email_verified") is not True:
        print("Google ID token rejected: missing or unverified email")
        return None
    return claims


def _issue_app_token(auth_id, email):
    """Mint this app's own session token for an already-authenticated user."""
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": auth_id,
            "email": email,
            "iss": APP_TOKEN_ISSUER,
            "aud": APP_TOKEN_ISSUER,
            "iat": now,
            "exp": now + APP_TOKEN_TTL,
        },
        APP_JWT_SECRET,
        algorithm="HS256",
    )


def _verify_app_token(token):
    """Verify one of our own session tokens and return its claims, or None."""
    try:
        return jwt.decode(
            token, APP_JWT_SECRET, algorithms=["HS256"],
            audience=APP_TOKEN_ISSUER, issuer=APP_TOKEN_ISSUER,
        )
    except Exception as e:
        print(f"Session token verification failed: {e}")
        return None

def _get_or_create_local_user(auth_id, email):
    """Resolve the canonical app user (login row) for an external identity.

    login.user_id stays the canonical app id that every interaction table
    references. We link an identity-provider user to it by:
      1. auth_id (fast path once linked);
      2. email - matches a row created under an earlier provider and backfills
         auth_id, preserving that user's saved data across the migration;
      3. otherwise insert a new row keyed by the provider's subject id.

    This is the mechanism that carried users through Clerk -> Supabase and now
    Supabase -> Google; auth_id is the only column that changes.
    """
    conn = create_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute(
            "SELECT user_id, email, role FROM login WHERE auth_id = %s",
            (auth_id,),
        )
        row = cursor.fetchone()
        if row:
            return {"id": row["user_id"], "email": row["email"], "role": row["role"]}

        if email:
            cursor.execute(
                "SELECT user_id, email, role FROM login WHERE email = %s",
                (email,),
            )
            row = cursor.fetchone()
            if row:
                cursor.execute(
                    "UPDATE login SET auth_id = %s WHERE user_id = %s",
                    (auth_id, row["user_id"]),
                )
                conn.commit()
                return {"id": row["user_id"], "email": row["email"], "role": row["role"]}

        cursor.execute(
            "INSERT INTO login (user_id, auth_id, email) VALUES (%s, %s, %s) "
            "RETURNING user_id, email, role",
            (auth_id, auth_id, email),
        )
        new_row = cursor.fetchone()
        conn.commit()
        return {"id": new_row["user_id"], "email": new_row["email"], "role": new_row["role"]}
    finally:
        cursor.close()
        conn.close()

def _authenticate(require_user):
    """Verify the app session token and attach g.user. Returns an error
    response when require_user is True and authentication fails."""
    token = _extract_bearer_token()
    if not token:
        if require_user:
            return jsonify({"message": "Unauthorized"}), 401
        return None

    payload = _verify_app_token(token)
    if not payload:
        if require_user:
            return jsonify({"message": "Unauthorized"}), 401
        return None

    auth_id = payload.get("sub")
    if not auth_id:
        if require_user:
            return jsonify({"message": "Unauthorized"}), 401
        return None

    email = payload.get("email")
    local = _get_or_create_local_user(auth_id, email)
    g.user = {
        "id": local["id"],
        "role": local["role"],
        "userId": auth_id,
        "email": local["email"],
    }
    return None

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

@app.before_request
def enforce_auth():
    if request.method == "OPTIONS":
        return None
    if not request.path.startswith("/api/"):
        return None
    if request.path == "/api/health":
        return None

    token = _extract_api_token_from_headers()
    if not token or not hmac.compare_digest(token, APP_API_KEY):
        return jsonify({"message": "Unauthorized"}), 401

    require_user = request.path not in PUBLIC_API_PATHS
    err = _authenticate(require_user=require_user)
    if err is not None:
        return err
    return None

init_recommend_cache(app)
from recommendEngine import cache

app.register_blueprint(recommend_bp, url_prefix='/api')
start_recommendation_scheduler()

hasUserInteracted = False
allFilms_global = []
filteredFilms_global = []
PAGE_SIZE = int(os.getenv("PAGE_SIZE"))
films_loaded = False

def load_films_from_db():
    global allFilms_global, films_loaded
    try:
        conn = create_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute('SELECT * FROM films')
        allFilms_global = cursor.fetchall()
        cursor.close()
        conn.close()
        random.shuffle(allFilms_global)
        films_loaded = True
        print(f"Loaded {len(allFilms_global)} films from database")
    except Exception as e:
        print(f"Error loading films: {e}")
        allFilms_global = []
        films_loaded = False

load_films_from_db()

# ============================================================================
# AUTH ROUTES
# ============================================================================

@app.route('/api/auth/google', methods=['POST'])
def auth_google():
    """Exchange a Google ID token for one of this app's session tokens.

    The browser gets the credential from Google Identity Services; Google has
    already authenticated the person by then. We verify the token's signature
    and audience, resolve (or re-link) the local login row, and hand back a
    session token the SPA sends as a bearer on every subsequent request.
    """
    data = request.get_json(silent=True) or {}
    credential = data.get('credential')
    if not credential:
        return jsonify({"message": "Missing credential"}), 400

    claims = _verify_google_id_token(credential)
    if not claims:
        return jsonify({"message": "Invalid Google credential"}), 401

    auth_id = claims.get("sub")
    email = claims.get("email")
    if not auth_id:
        return jsonify({"message": "Invalid Google credential"}), 401

    # Resolves by auth_id, else by email - backfilling auth_id and preserving
    # the saved films of accounts created under earlier auth providers.
    local = _get_or_create_local_user(auth_id, email)

    return jsonify({
        "token": _issue_app_token(auth_id, local["email"]),
        "user": {
            "id": local["id"],
            "email": local["email"],
            "role": local["role"],
            "userId": auth_id,
        },
    })

@app.route('/api/account/me', methods=['GET'])
def account_me():
    user = g.get('user')
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    return jsonify({
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "userId": user["userId"],
    })

# ============================================================================
# PUBLIC FILM ROUTES
# ============================================================================

@app.route('/api/indexPageFilms', methods=['GET'])
def get_index_page_films():
    try:
        if not films_loaded:
            load_films_from_db()

        page = int(request.args.get('page', 1))
        start_index = (page - 1) * PAGE_SIZE
        end_index = start_index + PAGE_SIZE
        films_for_page = allFilms_global[start_index:end_index]
        return jsonify(films_for_page)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/filteredPageFilms', methods=['GET'])
def get_filtered_page_films():
    try:
        page = int(request.args.get('page', 1))
        start_index = (page - 1) * PAGE_SIZE
        end_index = start_index + PAGE_SIZE
        films_for_page = filteredFilms_global[start_index:end_index]
        return jsonify(films_for_page)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/filter', methods=['POST'])
def filter_films():
    try:
        global filteredFilms_global
        if not films_loaded:
            load_films_from_db()

        filter_data = request.get_json(silent=True)
        if not filter_data:
            filter_data = request.args.get('filter')
            if isinstance(filter_data, str):
                try:
                    filter_data = json.loads(filter_data)
                except Exception:
                    filter_data = {}

        filteredFilms_global = allFilms_global.copy()

        if filter_data:
            if not (filter_data.get('rating') == 'Any' and filter_data.get('genre') == 'Any' and
                   filter_data.get('runtime') == 'Any' and filter_data.get('year') == 'Any'):

                if filter_data.get('rating') != 'Any':
                    rating = int(filter_data['rating'])
                    filteredFilms_global = [f for f in filteredFilms_global
                                           if f.get('averageRating') and int(float(f['averageRating'])) == rating]

                if filter_data.get('genre') != 'Any':
                    genre = filter_data['genre']
                    filteredFilms_global = [f for f in filteredFilms_global
                                           if genre in (f.get('genres') or '')]

                if filter_data.get('runtime') != 'Any':
                    runtime = filter_data['runtime']
                    runtime_filters = {
                        '≤ 1Hr': lambda x: x <= 60,
                        '≤ 1Hr 30m': lambda x: 60 < x <= 90,
                        '≤ 2Hrs': lambda x: 90 < x <= 120,
                        '≤ 2Hrs 30m': lambda x: 120 < x <= 150,
                        '≤ 3Hrs': lambda x: 150 < x <= 180,
                        'really long...': lambda x: x > 180
                    }

                    def is_valid_runtime(film):
                        film_runtime = film.get('runtimeMinutes')
                        try:
                            runtime_val = float(film_runtime)
                            if runtime in runtime_filters:
                                return runtime_filters[runtime](runtime_val)
                            return True
                        except Exception:
                            return False

                    filteredFilms_global = [f for f in filteredFilms_global if is_valid_runtime(f)]

                if filter_data.get('year') != 'Any':
                    year_ranges = {
                        '2020s': (2020, 2029), '2010s': (2010, 2019), '2000s': (2000, 2009),
                        '1990s': (1990, 1999), '1980s': (1980, 1989), '1970s': (1970, 1979),
                        '1960s': (1960, 1969), '1950s': (1950, 1959)
                    }
                    if filter_data['year'] in year_ranges:
                        start_year, end_year = year_ranges[filter_data['year']]
                        filteredFilms_global = [f for f in filteredFilms_global
                                               if f.get('startYear') and start_year <= int(f['startYear']) <= end_year]

        return jsonify(len(filteredFilms_global))
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/shuffleFilms', methods=['POST'])
def shuffle_films():
    try:
        global allFilms_global
        if not films_loaded:
            load_films_from_db()

        user = g.get('user')
        exclude_tconsts = []
        if user:
            try:
                exclude_res = get_user_films()
                exclude_json = exclude_res.get_json() or {}
                exclude_tconsts = exclude_json.get('tconsts', [])
            except:
                pass

        shuffled = allFilms_global.copy()
        random.shuffle(shuffled)
        included = [f for f in shuffled if f.get('tconst') not in exclude_tconsts]
        excluded = [f for f in shuffled if f.get('tconst') in exclude_tconsts]

        allFilms_global = included + excluded
        return jsonify('Film shuffled')
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/openClickedFilm', methods=['GET'])
def open_clicked_film():
    try:
        if not films_loaded:
            load_films_from_db()

        tconst = request.args.get('tconst')
        film_index = next((i for i, f in enumerate(allFilms_global) if f.get('tconst') == tconst), -1)

        if film_index == -1:
            return jsonify({'error': 'Film not found'}), 404

        page = (film_index // PAGE_SIZE) + 1
        start_index = (page - 1) * PAGE_SIZE
        current_index = film_index - start_index
        counter = film_index

        return jsonify({"counter": counter, "currentIndex": current_index})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_allFilms_index', methods=['GET'])
def get_all_films_index():
    try:
        if not films_loaded:
            load_films_from_db()

        tconst = request.args.get('tconst')
        film_index = next((i for i, f in enumerate(allFilms_global) if f.get('tconst') == tconst), -1)
        return jsonify(film_index)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/datasetLength', methods=['GET'])
def dataset_length():
    try:
        if not films_loaded:
            load_films_from_db()
        return jsonify(len(allFilms_global))
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# USER INTERACTION ROUTES (user_id taken from the verified session via g.user.id)
# ============================================================================

@app.route('/api/getLikedFilms', methods=['GET'])
def get_liked_films():
    try:
        user_id = g.user["id"]
        conn = create_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("""
            SELECT tconst, "Title", "Plot", "Rating", "Genre", "Runtime", "Year",
                   "Director", "Camera", "Writer", "Producer", "Editor", "Composer"
            FROM liked_attributes
            WHERE user_id = %s
        """, (user_id,))
        attr_results = cursor.fetchall()

        liked_elements_by_tconst = {}
        for row in attr_results:
            tconst = row['tconst']
            elements = []
            for key, value in row.items():
                if key == 'tconst':
                    continue
                if value == 1:
                    elements.append(key)
            liked_elements_by_tconst[tconst] = elements

        cursor.execute("""
            SELECT tconst, name
            FROM liked_cast
            WHERE user_id = %s
        """, (user_id,))
        cast_results = cursor.fetchall()

        liked_cast_by_tconst = {}
        for row in cast_results:
            tconst = row['tconst']
            name = row['name']
            liked_cast_by_tconst.setdefault(tconst, []).append(name)

        all_tconsts = set(liked_elements_by_tconst.keys()) | set(liked_cast_by_tconst.keys())

        if not all_tconsts:
            cursor.close()
            conn.close()
            return jsonify([])

        placeholders = ','.join(['%s'] * len(all_tconsts))
        cursor.execute(f"SELECT * FROM films WHERE tconst IN ({placeholders})", tuple(all_tconsts))

        liked_films = []
        for film in cursor.fetchall():
            tconst = film['tconst']
            film['likedElements'] = liked_elements_by_tconst.get(tconst, [])
            film['likedCast'] = liked_cast_by_tconst.get(tconst, [])
            liked_films.append(film)

        cursor.close()
        conn.close()
        return jsonify(liked_films)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/getLovedFilms', methods=['GET'])
def get_loved_films():
    try:
        user_id = g.user["id"]
        conn = create_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("SELECT tconst FROM loved_films WHERE user_id = %s", (user_id,))
        results = cursor.fetchall()

        cursor.close()
        conn.close()
        return jsonify(results)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/getWatchlist', methods=['GET'])
def get_watchlist():
    try:
        user_id = g.user["id"]
        conn = create_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("SELECT tconst FROM watchlist WHERE user_id = %s", (user_id,))
        watchlist_tconsts = cursor.fetchall()

        if not watchlist_tconsts:
            cursor.close()
            conn.close()
            return jsonify([])

        all_tconsts = [row['tconst'] for row in watchlist_tconsts]
        placeholders = ','.join(['%s'] * len(all_tconsts))
        cursor.execute(f"SELECT * FROM films WHERE tconst IN ({placeholders})", tuple(all_tconsts))

        watchlist_films = cursor.fetchall()

        cursor.close()
        conn.close()
        return jsonify(watchlist_films)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/loveFilm', methods=['POST'])
def love_film():
    try:
        global hasUserInteracted
        data = request.get_json()
        tconst = data.get('film_id')
        user_id = g.user["id"]

        conn = create_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM liked_attributes WHERE user_id = %s AND tconst = %s",
                      (user_id, tconst))
        cursor.execute("DELETE FROM liked_cast WHERE user_id = %s AND tconst = %s",
                      (user_id, tconst))
        cursor.execute("INSERT INTO loved_films (user_id, tconst) VALUES (%s, %s)",
                      (user_id, tconst))

        conn.commit()
        cursor.close()
        conn.close()

        cache.delete(f'user_content_recommended{user_id}')
        cache.delete(f'user_plot_recommended{user_id}')
        cache.delete(f'user_cast_recommended{user_id}')
        cache.delete(f'user_crew_recommended{user_id}')
        cache.delete(f'user_genre_recommended{user_id}')
        cache.delete(f'user_profile_{user_id}')
        cache.delete(f'similarity_vectors_{user_id}')

        hasUserInteracted = True
        return jsonify('Film saved successfully')
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/unloveFilm', methods=['POST'])
def unlove_film():
    try:
        global hasUserInteracted
        data = request.get_json()
        user_id = g.user["id"]
        film_id = data.get('film_id')

        conn = create_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM loved_films WHERE user_id = %s AND tconst = %s",
                      (user_id, film_id))

        conn.commit()
        cursor.close()
        conn.close()

        cache.delete(f'user_content_recommended{user_id}')
        cache.delete(f'user_plot_recommended{user_id}')
        cache.delete(f'user_cast_recommended{user_id}')
        cache.delete(f'user_crew_recommended{user_id}')
        cache.delete(f'user_genre_recommended{user_id}')
        cache.delete(f'user_profile_{user_id}')
        cache.delete(f'similarity_vectors_{user_id}')

        hasUserInteracted = True
        return jsonify('Removed successfully')
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/saveLikedElements', methods=['POST'])
def save_liked_elements():
    try:
        global hasUserInteracted
        data = request.get_json()
        user_id = g.user["id"]
        tconst = data.get('film_id')
        liked_elements = data.get('elements', [])
        liked_cast = data.get('cast', [])

        attribute_values = {
            'Title': 0, 'Plot': 0, 'Rating': 0, 'Genre': 0, 'Runtime': 0,
            'Year': 0, 'Director': 0, 'Camera': 0, 'Writer': 0,
            'Producer': 0, 'Editor': 0, 'Composer': 0
        }

        for element in liked_elements:
            attr_name = element.replace('_film', '')
            if attr_name in attribute_values:
                attribute_values[attr_name] = 1

        conn = create_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM loved_films WHERE user_id = %s AND tconst = %s",
                      (user_id, tconst))
        cursor.execute("DELETE FROM liked_attributes WHERE user_id = %s AND tconst = %s",
                      (user_id, tconst))
        cursor.execute("DELETE FROM liked_cast WHERE user_id = %s AND tconst = %s",
                      (user_id, tconst))

        if liked_elements:
            cursor.execute("""
                INSERT INTO liked_attributes
                (user_id, tconst, "Title", "Plot", "Rating", "Genre", "Runtime", "Year", "Director", "Camera", "Writer", "Producer", "Editor", "Composer")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_id, tconst, *attribute_values.values()))

        if liked_cast:
            cast_values = [(user_id, tconst, name) for name in liked_cast]
            cursor.executemany("INSERT INTO liked_cast (user_id, tconst, name) VALUES (%s, %s, %s)",
                             cast_values)

        conn.commit()
        cursor.close()
        conn.close()

        cache.delete(f'user_content_recommended{user_id}')
        cache.delete(f'user_plot_recommended{user_id}')
        cache.delete(f'user_cast_recommended{user_id}')
        cache.delete(f'user_crew_recommended{user_id}')
        cache.delete(f'user_genre_recommended{user_id}')
        cache.delete(f'user_profile_{user_id}')
        cache.delete(f'similarity_vectors_{user_id}')

        hasUserInteracted = True
        return jsonify('Data saved successfully')
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/addWatchlist', methods=['POST'])
def add_watchlist():
    try:
        data = request.get_json()
        film_id = data.get('film_id')
        user_id = g.user["id"]

        conn = create_db_connection()
        cursor = conn.cursor()

        cursor.execute("INSERT INTO watchlist (user_id, tconst) VALUES (%s, %s)",
                      (user_id, film_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify('Saved successfully')
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/deleteWatchlist', methods=['POST'])
def delete_watchlist():
    try:
        data = request.get_json()
        user_id = g.user["id"]
        film_id = data.get('film_id')

        conn = create_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM watchlist WHERE user_id = %s AND tconst = %s",
                      (user_id, film_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify('Removed successfully')
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/hasUserInteracted', methods=['GET'])
def has_user_interacted():
    global hasUserInteracted
    result = hasUserInteracted
    hasUserInteracted = False
    return jsonify({'hasUserInteracted': result})

# ============================================================================
# SERVE REACT APP
# ============================================================================

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(PROJECT_ROOT, 'dist')
IMAGES_DIR = os.path.join(PROJECT_ROOT, 'images')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    if path.startswith('api/'):
        return "API route not found", 404

    if path.startswith('images/'):
        return send_from_directory(IMAGES_DIR, path[len('images/'):])

    dist_candidate = os.path.join(DIST_DIR, path)
    if path and os.path.isfile(dist_candidate):
        return send_from_directory(DIST_DIR, path)

    return send_from_directory(DIST_DIR, 'index.html')

if __name__ == "__main__":
    port = 8080
    print(f"Starting unified Flask server on port {port}...")
    print(f"Recommendation engine routes integrated on same port")

    app.run(host="0.0.0.0", port=port, debug=False)
