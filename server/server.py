import os
import json
import random
import hmac
import bcrypt
import mysql.connector
from flask import Flask, jsonify, request, make_response, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from recommendEngine import recommend_bp, init_recommend_cache, start_recommendation_scheduler

load_dotenv()

app = Flask(__name__)
# CORS is restricted to API routes and Vercel origins only.
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://cinephile-com.vercel.app",
            ]
        }
    },
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-API-KEY"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

API_TOKEN = os.getenv("API_TOKEN")
if not API_TOKEN:
    raise RuntimeError("Missing API_TOKEN environment variable.")

def _extract_api_token_from_headers():
    token = request.headers.get("X-API-KEY")
    if token:
        return str(token).strip()

    auth_header = request.headers.get("Authorization", "")
    if isinstance(auth_header, str) and auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):].strip()
        if token:
            return token

    return None

@app.before_request
def enforce_api_token():
    if request.method == "OPTIONS":
        return None

    if not request.path.startswith("/api/"):
        return None

    token = _extract_api_token_from_headers()
    if not token:
        return jsonify({"message": "Unauthorized"}), 401

    if not hmac.compare_digest(token, API_TOKEN):
        return jsonify({"message": "Unauthorized"}), 401

init_recommend_cache(app)
from recommendEngine import cache

app.register_blueprint(recommend_bp, url_prefix='/api')
start_recommendation_scheduler()

hasUserInteracted = False
allFilms_global = []
filteredFilms_global = []
PAGE_SIZE = int(os.getenv("PAGE_SIZE"))
films_loaded = False

# Create MySQL database connection
def create_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_DATABASE"),
        port=int(os.getenv("DB_PORT"))
    )

def load_films_from_db():
    global allFilms_global, films_loaded
    try:
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
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

# Authentication routes
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400
        
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM login WHERE email = %s", (email,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 401
        
        if bcrypt.checkpw(password.encode('utf-8'), result['password'].encode('utf-8')):
            user_id = result['user_id']
            
            try:
                request.post(f'/api/update_profile_and_vectors?user_id={user_id}', timeout=10)
            except Exception as e:
                print(f"Warning: Could not update profile: {e}")

            cursor.close()
            conn.close()

            response = make_response(jsonify({'success': True, 'message': 'Login successful'}))
            response.set_cookie('sessionEmail', email, max_age=86400)
            response.set_cookie('sessionID', str(user_id), max_age=86400)
            return response
        else:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Credentials incorrect'}), 401
            
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/createAccount', methods=['POST'])
def create_account():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400
        
        hash_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM login WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'message': 'User already exists'}), 409

        cursor.execute("INSERT INTO login (user_id, email, password) VALUES (0, %s, %s)", 
                       (email, hash_password))
        user_id = cursor.lastrowid

        try:
            request.post(f'/api/update_profile_and_vectors?user_id={user_id}', timeout=10)
        except Exception as e:
            print(f"Warning: Could not update profile: {e}")

        conn.commit()
        cursor.close()
        conn.close()

        response = make_response(jsonify({'success': True, 'message': 'Account created successfully'}))
        response.set_cookie('sessionEmail', email, max_age=86400)
        response.set_cookie('sessionID', str(user_id), max_age=86400)
        return response
        
    except Exception as e:
        print(f"Create account error: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/signout', methods=['POST'])
def signout():
    response = make_response(jsonify({'success': True}))
    response.set_cookie('sessionEmail', '', expires=0)
    response.set_cookie('sessionID', '', expires=0)
    return response

@app.route('/api/session', methods=['GET'])
def get_session():
    email = request.cookies.get('sessionEmail')
    user_id = request.cookies.get('sessionID')
    return jsonify({'session': {'email': email, 'id': user_id}})

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
        
        user_id = request.args.get('user_id')
        exclude_tconsts = []
        if user_id:
            try:
                exclude_res = request.get(f'/api/get_user_films?user_id={user_id}', timeout=5)
                exclude_tconsts = exclude_res.json().get('tconsts', [])
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
# USER INTERACTION ROUTES
# ============================================================================

@app.route('/api/getLikedFilms', methods=['GET'])
def get_liked_films():
    """
    Return all films the user has any liked interaction with, together with
    all liked elements and liked cast for each film, including full film metadata.

    Response shape:
    [
      {
        "tconst": "tt1234567",
        "primaryTitle": "...",
        "poster": "...",
        "cast": "...",
        ... (all other film fields),
        "likedElements": ["Title", "Plot", ...],
        "likedCast": ["Actor A", "Actor B", ...]
      },
      ...
    ]
    """
    try:
        user_id = request.args.get('user_id')
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1) Get all liked attribute rows for this user
        cursor.execute("""
            SELECT tconst, Title, Plot, Rating, Genre, Runtime, Year,
                   Director, Camera, Writer, Producer, Editor, Composer
            FROM liked_attributes
            WHERE user_id = %s
        """, (user_id,))
        attr_results = cursor.fetchall()

        liked_elements_by_tconst = {}
        for row in attr_results:
            tconst = row['tconst']
            elements = []
            # Skip the tconst key when checking flags
            for key, value in row.items():
                if key == 'tconst':
                    continue
                if value == 1:
                    elements.append(key)
            liked_elements_by_tconst[tconst] = elements

        # 2) Get all liked cast rows for this user
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

        # 3) Merge tconsts from both sources
        all_tconsts = set(liked_elements_by_tconst.keys()) | set(liked_cast_by_tconst.keys())

        if not all_tconsts:
            cursor.close()
            conn.close()
            return jsonify([])

        # 4) Get full film metadata and combine with liked data
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
        user_id = request.args.get('user_id')
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
        
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
    """
    Return all films in the user's watchlist with full film metadata.
    
    Response shape:
    [
      {
        "tconst": "tt1234567",
        "primaryTitle": "...",
        "poster": "...",
        "cast": "...",
        ... (all other film fields)
      },
      ...
    ]
    """
    try:
        user_id = request.args.get('user_id')
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get tconsts from watchlist table
        cursor.execute("SELECT tconst FROM watchlist WHERE user_id = %s", (user_id,))
        watchlist_tconsts = cursor.fetchall()
        
        if not watchlist_tconsts:
            cursor.close()
            conn.close()
            return jsonify([])
        
        # Get full film metadata for all watchlist tconsts
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

# User interaction routes - love/unlove films, save liked elements, watchlist
@app.route('/api/loveFilm', methods=['POST'])
def love_film():
    try:
        global hasUserInteracted
        data = request.get_json()
        tconst = data.get('film_id')
        user_id = data.get('user_id')
        
        conn = create_db_connection()
        cursor = conn.cursor()

        # Ensure mutual exclusivity: remove from liked tables first, then add to loved
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
        user_id = data.get('user_id')
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
        user_id = data.get('user_id')
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
        cursor = conn.cursor();

        # Ensure mutual exclusivity: remove from loved_films if it exists there
        cursor.execute("DELETE FROM loved_films WHERE user_id = %s AND tconst = %s",
                      (user_id, tconst))
        cursor.execute("DELETE FROM liked_attributes WHERE user_id = %s AND tconst = %s",
                      (user_id, tconst))
        cursor.execute("DELETE FROM liked_cast WHERE user_id = %s AND tconst = %s",
                      (user_id, tconst));

        if liked_elements:
            cursor.execute("""
                INSERT INTO liked_attributes 
                (user_id, tconst, Title, Plot, Rating, Genre, Runtime, Year, Director, Camera, Writer, Producer, Editor, Composer) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_id, tconst, *attribute_values.values()));

        if liked_cast:
            cast_values = [(user_id, tconst, name) for name in liked_cast]
            cursor.executemany("INSERT INTO liked_cast (user_id, tconst, name) VALUES (%s, %s, %s)",
                             cast_values);

        conn.commit();
        cursor.close();
        conn.close();

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
        user_id = data.get('user_id')
        
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
        user_id = data.get('user_id')
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
# PROXY ROUTES TO RECOMMENDATION ENGINE
# ============================================================================

# Recommendation engine routes are now handled by the recommend_bp blueprint
# All routes are registered with /api prefix in the blueprint registration above

# ============================================================================
# SERVE REACT APP
# ============================================================================

@app.route('/client/<path:filename>')
def serve_client_files(filename):
    """Serve React client files"""
    try:
        return send_from_directory('client', filename)
    except:
        return "File not found", 404

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    """Serve React app - all non-API routes go to React"""
    if path.startswith('api/'):
        return "API route not found", 404

    if path.startswith('images/'):
        try:
            return send_from_directory('.', path)
        except:
            return "File not found", 404

    if path.startswith('client/'):
        try:
            return send_from_directory('.', path)
        except:
            return "File not found", 404

    if os.path.exists('index.html'):
        return send_from_directory('.', 'index.html')
    elif os.path.exists('dist/index.html'):
        return send_from_directory('dist', 'index.html')
    else:
        return """
        <html>
            <body>
                <h1>React App Not Found</h1>
                <p>Please either:</p>
                <ol>
                    <li>Build the React app: <code>npm install && npm run build</code></li>
                    <li>Or ensure <code>index.html</code> exists in the project root</li>
                </ol>
            </body>
        </html>
        """, 404

if __name__ == "__main__":
    port = int(os.getenv("PORT"))
    print(f"Starting unified Flask server on port {port}...")
    # print(f"API available at: http://127.0.0.1:{port}/api/")
    # print(f"React app available at: http://127.0.0.1:{port}/")
    print(f"Recommendation engine routes integrated on same port")
    
    app.run(host="0.0.0.0", port=port, debug=False)

