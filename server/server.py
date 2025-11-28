"""
Main Flask Server
Handles all API routes (auth, films, user interactions) and serves React app.
Recommendation engine routes are integrated via blueprint on the same port.
"""

import os
import json
import random
import bcrypt
import mysql.connector
from flask import Flask, jsonify, request, make_response, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Import recommendation engine blueprint
from recommendEngine import recommend_bp, init_recommend_cache, start_recommendation_scheduler

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize recommendation engine cache
init_recommend_cache(app)

# Register recommendation blueprint with /api prefix
app.register_blueprint(recommend_bp, url_prefix='/api')

# Start recommendation scheduler
start_recommendation_scheduler()

# Global variables
hasUserInteracted = False
allFilms_global = []
filteredFilms_global = []
PAGE_SIZE = int(os.getenv("PAGE_SIZE", "100"))
films_loaded = False

def create_db_connection():
    """Create MySQL database connection"""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_DATABASE"),
        port=int(os.getenv("DB_PORT", "3306"))
    )

def load_films_from_db():
    """Load all films from database for index page"""
    global allFilms_global, films_loaded
    try:
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM all_films')
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

# Load films on startup
load_films_from_db()

# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

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
        
        cursor.execute("SELECT * FROM user_login WHERE email = %s", (email,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 401
        
        if bcrypt.checkpw(password.encode('utf-8'), result['password'].encode('utf-8')):
            user_id = result['user_id']
            
            # Update profile and cache films in recommendation engine
            try:
                requests.post(f'{RECOMMEND_ENGINE_URL}/update_profile_and_vectors?user_id={user_id}', timeout=10)
                requests.post(f'{RECOMMEND_ENGINE_URL}/cache_recommend_pack?user_id={user_id}', timeout=10)
            except Exception as e:
                print(f"Warning: Could not update profile: {e}")
            
            cursor.close()
            conn.close()
            
            # Set cookies
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
        
        # Check if user exists
        cursor.execute("SELECT * FROM user_login WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'message': 'User already exists'}), 409
        
        # Create new user
        cursor.execute("INSERT INTO user_login (user_id, email, password) VALUES (0, %s, %s)", 
                       (email, hash_password))
        user_id = cursor.lastrowid
        
        # Update profile in recommendation engine
        try:
            requests.post(f'{RECOMMEND_ENGINE_URL}/update_profile_and_vectors?user_id={user_id}', timeout=10)
        except Exception as e:
            print(f"Warning: Could not update profile: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Set cookies
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

# ============================================================================
# FILM ROUTES
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
        
        filter_data = request.args.get('filter')
        if isinstance(filter_data, str):
            try:
                filter_data = json.loads(filter_data)
            except:
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
                        '≤ 1 Hr': lambda x: x <= 60,
                        '≤ 1Hr 30m': lambda x: 60 < x <= 90,
                        '≤ 2Hrs': lambda x: 90 < x <= 120,
                        '≤ 2Hrs 30m': lambda x: 120 < x <= 150,
                        '≤ 3Hrs': lambda x: 150 < x <= 180,
                        'really long...': lambda x: x > 180
                    }
                    if runtime in runtime_filters:
                        filteredFilms_global = [f for f in filteredFilms_global 
                                               if f.get('runtimeMinutes') and runtime_filters[runtime](f['runtimeMinutes'])]
                
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
        
        # Get user's films to exclude from recommendation engine
        exclude_tconsts = []
        if user_id:
            try:
                exclude_res = requests.get(f'{RECOMMEND_ENGINE_URL}/get_user_films?user_id={user_id}', timeout=5)
                exclude_tconsts = exclude_res.json().get('tconsts', [])
            except:
                pass
        
        # Shuffle
        shuffled = allFilms_global.copy()
        random.shuffle(shuffled)
        
        # Separate included and excluded
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
    try:
        user_id = request.args.get('user_id')
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            (SELECT tconst FROM user_liked_attributes WHERE user_id = %s)
            UNION
            (SELECT tconst FROM user_liked_cast WHERE user_id = %s)
        """
        cursor.execute(query, (user_id, user_id))
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return jsonify(results)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/getLovedFilms', methods=['GET'])
def get_loved_films():
    try:
        user_id = request.args.get('user_id')
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT tconst FROM user_loved_films WHERE user_id = %s", (user_id,))
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
        user_id = request.args.get('user_id')
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT tconst FROM user_watchlist WHERE user_id = %s", (user_id,))
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return jsonify(results)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/getLikedElements', methods=['GET'])
def get_liked_elements():
    try:
        user_id = request.args.get('user_id')
        film_id = request.args.get('film_id')
        
        conn = create_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get liked attributes
        cursor.execute("""
            SELECT Title, Plot, Rating, Genre, Runtime, Year, Director, Camera, Writer, Producer, Editor, Composer 
            FROM user_liked_attributes WHERE user_id = %s AND tconst = %s
        """, (user_id, film_id))
        film_results = cursor.fetchall()
        
        elements = []
        if film_results:
            for result in film_results:
                for key, value in result.items():
                    if value == 1:
                        elements.append(key)
        
        # Get liked cast
        cursor.execute("SELECT name FROM user_liked_cast WHERE user_id = %s AND tconst = %s", 
                      (user_id, film_id))
        cast_results = cursor.fetchall()
        cast = [row['name'] for row in cast_results]
        
        cursor.close()
        conn.close()
        return jsonify({'likedElements': elements, 'likedCast': cast})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/loveFilm', methods=['POST'])
def love_film():
    try:
        global hasUserInteracted
        data = request.get_json()
        tconst = data.get('film_id')
        user_id = data.get('user_id')
        
        conn = create_db_connection()
        cursor = conn.cursor()
        
        # Delete existing liked attributes and cast
        cursor.execute("DELETE FROM user_liked_attributes WHERE user_id = %s AND tconst = %s", 
                      (user_id, tconst))
        cursor.execute("DELETE FROM user_liked_cast WHERE user_id = %s AND tconst = %s", 
                      (user_id, tconst))
        
        # Insert loved film
        cursor.execute("INSERT INTO user_loved_films (user_id, tconst) VALUES (%s, %s)", 
                      (user_id, tconst))
        
        conn.commit()
        cursor.close()
        conn.close()
        
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
        
        cursor.execute("DELETE FROM user_loved_films WHERE user_id = %s AND tconst = %s", 
                      (user_id, film_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
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
        cursor = conn.cursor()
        
        # Delete existing
        cursor.execute("DELETE FROM user_liked_attributes WHERE user_id = %s AND tconst = %s", 
                      (user_id, tconst))
        cursor.execute("DELETE FROM user_liked_cast WHERE user_id = %s AND tconst = %s", 
                      (user_id, tconst))
        
        # Insert attributes
        if liked_elements:
            cursor.execute("""
                INSERT INTO user_liked_attributes 
                (user_id, tconst, Title, Plot, Rating, Genre, Runtime, Year, Director, Camera, Writer, Producer, Editor, Composer) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_id, tconst, *attribute_values.values()))
        
        # Insert cast
        if liked_cast:
            cast_values = [(user_id, tconst, name) for name in liked_cast]
            cursor.executemany("INSERT INTO user_liked_cast (user_id, tconst, name) VALUES (%s, %s, %s)", 
                             cast_values)
        
        conn.commit()
        cursor.close()
        conn.close()
        
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
        
        cursor.execute("INSERT INTO user_watchlist (user_id, tconst) VALUES (%s, %s)", 
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
        
        cursor.execute("DELETE FROM user_watchlist WHERE user_id = %s AND tconst = %s", 
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
# SERVE REACT APP - Must be last route
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
    # Don't interfere with API routes
    if path.startswith('api/'):
        return "API route not found", 404
    
    # Serve static files
    if path.startswith('images/'):
        try:
            return send_from_directory('.', path)
        except:
            return "File not found", 404
    
    # Serve React client files
    if path.startswith('client/'):
        try:
            return send_from_directory('.', path)
        except:
            return "File not found", 404
    
    # Serve index.html for all other routes (React Router will handle routing)
    if os.path.exists('index.html'):
        return send_from_directory('.', 'index.html')
    elif os.path.exists('dist/index.html'):
        # Fallback to built version if it exists
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
    port = int(os.getenv("PORT", "5000"))
    print(f"Starting unified Flask server on port {port}...")
    print(f"API available at: http://127.0.0.1:{port}/api/")
    print(f"React app available at: http://127.0.0.1:{port}/")
    print(f"Recommendation engine routes integrated on same port")
    
    app.run(host="0.0.0.0", port=port, debug=False)

