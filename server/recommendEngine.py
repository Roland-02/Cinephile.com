import os
import time
import json
import warnings
import threading
from contextlib import contextmanager
import psycopg2
import psycopg2.extras
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import euclidean_distances, cosine_similarity
import gzip
import requests as req
import concurrent.futures
from io import BytesIO
from langdetect import detect
from collections import Counter
from multiprocessing import Manager
import schedule
from flask_caching import Cache
from flask import Blueprint, jsonify, request, g

load_dotenv()
warnings.filterwarnings("ignore")

tfidf_vectorizer = TfidfVectorizer()
recommend_bp = Blueprint('recommend', __name__)
MAX_REQUESTS_PER_SECOND = 50
MAX_INDEX_THREADS = 25
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

# ============================================================================
# SHARED CONFIG AND DATABASE ACCESS
#
# server.py imports these from here. It cannot live in server.py instead:
# server.py already imports this module, so the dependency only runs one way.
# ============================================================================

# Films per page. Shared by the API's pagination and, via vite.config.js, by
# the client - the two must agree or page boundaries drift apart.
PAGE_SIZE = int(os.getenv("PAGE_SIZE"))

# One definition of how to reach the database.
DB_SETTINGS = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "dbname": os.getenv("DB_DATABASE"),
    "port": int(os.getenv("DB_PORT")),
    "sslmode": os.getenv("DB_SSLMODE", "require"),
}

_thread_local = threading.local()


def connect():
    """A new connection. The caller closes it. Used by the request handlers,
    where a connection must not outlive the request."""
    return psycopg2.connect(**DB_SETTINGS)


def get_db_connection():
    """This thread's connection, reconnecting if it has been closed.

    The recommender fires many queries in sequence and would waste time
    reconnecting for each one.
    """
    conn = getattr(_thread_local, "conn", None)
    if conn is None or conn.closed:
        conn = psycopg2.connect(**DB_SETTINGS)
        _thread_local.conn = conn
    return conn


def get_db_cursor():
    """This thread's cursor, tied to the connection it was opened on.

    Rebuilt whenever that connection changed or the cursor was closed. Checking
    only whether a cursor exists is not enough: get_db_connection() replaces a
    dropped connection, and a cursor belonging to the dead one would still be
    handed back.
    """
    conn = get_db_connection()
    cur = getattr(_thread_local, "cursor", None)
    if cur is None or cur.closed or cur.connection is not conn:
        cur = conn.cursor()
        _thread_local.cursor = cur
    return cur


@contextmanager
def request_cursor(commit=False):
    """A dict cursor on its own connection, closed however the block exits.

    Replaces the connect / cursor / close sequence that every request handler
    repeated, including on the error paths where several of them leaked.
    """
    conn = connect()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield cursor
        if commit:
            conn.commit()
    finally:
        cursor.close()
        conn.close()

cache = None

def init_recommend_cache(app_instance):
    global cache
    config = {
        "CACHE_TYPE": "SimpleCache",
        "CACHE_DEFAULT_TIMEOUT": 2073600
    }
    app_instance.config.from_mapping(config)
    cache = Cache(app_instance)

# Remove duplicate cast members from comma-separated string
def remove_duplicates(names):
    if isinstance(names, str):
        unique_names = set(name.strip() for name in names.split(','))
        return ', '.join(unique_names)
    else:
        return names

def is_english(text):
    try:
        lang = detect(text)
        return lang == 'en'
    except:
        return False

# Fetch film plot and poster from TMDB API
def fetchDetails(film_id):
    url = f'https://api.themoviedb.org/3/movie/{film_id}'
    headers = {
        "accept": "application/json",
        "Authorization": f'Bearer {TMDB_API_KEY}'
    }
    response = req.get(url, headers=headers)
    return response

def doFetch(film_id):
    time.sleep(1 / MAX_REQUESTS_PER_SECOND)
    return fetchDetails(film_id)

# Process batch of films to fetch TMDB details using multi-threading
def doBatch(shared_data):
    film_data = shared_data.film_data
    MAX_THREADS = min(os.cpu_count(), 1000)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
            results = list(executor.map(doFetch, film_data['tconst']))

            for index, details in zip(film_data.index, results):
                if details.ok:
                    details = details.json()
                    if details.get('overview'):
                        film_data.loc[index, 'plot'] = details['overview']
                    if details.get('poster_path'):
                        film_data.loc[index, 'poster'] = details['poster_path']
                else:
                    time.sleep(1 / MAX_REQUESTS_PER_SECOND)

        shared_data.film_data = film_data
    except Exception as e:
        print(f"Error in ThreadPoolExecutor: {e}")
        time.sleep(1 / MAX_REQUESTS_PER_SECOND)
    
# export film data to postgres
def save_mySQL(data):
    # Get thread-local connection
    mydb = get_db_connection()
    mycursor = get_db_cursor()

    # Table name in the database
    table_name = "films"

    # Define the SQL query to delete all records from the table
    delete_query = "DELETE FROM {}".format(table_name)

    # Execute the delete query
    mycursor.execute(delete_query)
    mydb.commit()

    # Prepare data for batch insert
    insert_query = """
        INSERT INTO films
        (tconst, "primaryTitle", plot, "averageRating", genres, "runtimeMinutes",
         "startYear", "cast", director, cinematographer, writer, producer, editor, composer, poster)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    values = [
        (
            row.get('tconst'),
            row.get('primaryTitle'),
            row.get('plot'),
            row.get('averageRating'),
            row.get('genres'),
            row.get('runtimeMinutes'),
            row.get('startYear'),
            row.get('cast'),
            row.get('director'),
            row.get('cinematographer'),
            row.get('writer'),
            row.get('producer'),
            row.get('editor'),
            row.get('composer'),
            row.get('poster')
        )
        for index, row in data.iterrows()
    ]

    mycursor.executemany(insert_query, values)
    mydb.commit()

def INITIALISE_FILM_DATASET():
    print('Downloading tables...')

    url_title_basics = 'https://datasets.imdbws.com/title.basics.tsv.gz'
    url_crew = 'https://datasets.imdbws.com/title.principals.tsv.gz'
    url_ratings = 'https://datasets.imdbws.com/title.ratings.tsv.gz'
    url_names = 'https://datasets.imdbws.com/name.basics.tsv.gz'
    url_langs = 'https://datasets.imdbws.com/title.akas.tsv.gz'

    res_title_basics = req.get(url_title_basics).content
    res_crew = req.get(url_crew).content
    res_ratings = req.get(url_ratings).content
    res_names = req.get(url_names).content
    res_lang = req.get(url_langs).content

    title_basics_gzip = gzip.decompress(res_title_basics)
    crew_basics_gzip = gzip.decompress(res_crew)
    title_ratings_gzip = gzip.decompress(res_ratings)
    names_gzip = gzip.decompress(res_names)
    title_langs_gzip = gzip.decompress(res_lang)

    titles = pd.read_csv(BytesIO(title_basics_gzip), delimiter='\t',low_memory=False)
    crew = pd.read_csv(BytesIO(crew_basics_gzip), delimiter='\t',low_memory=False)
    ratings = pd.read_csv(BytesIO(title_ratings_gzip), delimiter='\t',low_memory=False)
    names = pd.read_csv(BytesIO(names_gzip), delimiter='\t',low_memory=False)
    langs = pd.read_csv(BytesIO(title_langs_gzip), delimiter='\t',low_memory=False)

    print('Cleaning data...')

    desired_langs = ['en']
    filtered_langs = langs[langs['language'].isin(desired_langs)]
    tconsts_filtered_langs = filtered_langs['titleId'].tolist()
    desired_regions = ['CA', 'US', 'GB', 'IE', 'AU', 'NZ']
    filtered_regions = langs[langs['region'].isin(desired_regions)]
    tconsts_filtered_regions = filtered_regions['titleId'].tolist()

    titles = titles[titles['titleType'] == 'movie']
    titles = titles[titles['genres'] != r'\N']
    titles['isAdult'] = pd.to_numeric(titles['isAdult'], errors='coerce')
    titles = titles[titles['isAdult'] == 0 ]
    titles = titles[(titles['startYear'] >= '1955') & (titles['startYear'] != '\\N')]
    titles = titles[(titles['tconst'].isin(tconsts_filtered_langs) & (titles['tconst'].isin(tconsts_filtered_regions)))]

    film_tconsts = titles['tconst'].tolist()
    crew = crew[crew['tconst'].isin(film_tconsts)]
    ratings = ratings[ratings['tconst'].isin(film_tconsts)]

    remove_from_titles = ['originalTitle', 'endYear', 'titleType', 'isAdult']
    remove_from_crew = ['ordering','job','characters']
    remove_from_ratings = ['numVotes']
    remove_from_names = ['birthYear', 'deathYear', 'primaryProfession', 'knownForTitles']

    titles = titles.drop(columns=remove_from_titles)
    crew = crew.drop(columns=remove_from_crew)
    ratings = ratings.drop(columns=remove_from_ratings)
    names = names.drop(columns=remove_from_names)

    print('Merging tables...')

    crew_data = crew.copy()
    crew_data['nconst'] = crew_data['nconst'].str.split(', ')
    crew_data = crew_data.explode('nconst')
    crew_data = pd.merge(crew_data, names, on='nconst', how='left')
    crew_data = crew_data.pivot_table(
        index=['tconst'],
        columns=['category'],
        values=['primaryName'],
        aggfunc=lambda x: ', '.join(str(item) for item in x),
    ).reset_index()

    crew_data.columns = ['_'.join(col).strip() for col in crew_data.columns.values]
    crew_data.columns = [col.replace('primaryName_', '') for col in crew_data.columns]
    crew_data = crew_data.rename(columns={'tconst_': 'tconst'})
    columns_to_keep = ['tconst', 'actor', 'actress', 'cinematographer', 'composer', 'director', 'editor', 'producer', 'writer']
    crew_data = crew_data[columns_to_keep]

    film_data = pd.merge(titles, ratings, on='tconst', how='left')
    film_data = pd.merge(film_data, crew_data, on='tconst', how='left')

    print('Further cleaning data...')

    columns_check = ['director', 'cinematographer', 'editor', 'writer', 'composer', 'producer']
    film_data = film_data[film_data[columns_check].isna().sum(axis=1) == 0]
    film_data = film_data.dropna(subset=['actor', 'actress', 'runtimeMinutes', 'averageRating', 'genres'])

    film_data = film_data[film_data['runtimeMinutes'] != '\\N']
    film_data = film_data[film_data['startYear'] != '\\N']
    film_data = film_data[film_data['averageRating'] != '\\N']

    film_data['cast'] = film_data['actor'] + ', ' + film_data['actress']
    film_data.drop(['actor', 'actress'], axis=1, inplace=True)
    film_data['cast'] = film_data['cast'].apply(remove_duplicates)

    print('EDL testing...')

    english_titles = film_data['primaryTitle'].apply(is_english)
    film_data = film_data[english_titles]

    film_data['plot'] = np.nan
    film_data['poster'] = np.nan

    print('Films: ' + str(len(film_data)))
    print('Fetching plot summaries and posters...')

    if __name__ == '__main__':
        manager = Manager()
        shared_data = manager.Namespace()
        agg_list = []
        batch_size = 1000
        num_batches = (len(film_data) // batch_size) + 1

        with concurrent.futures.ProcessPoolExecutor(8) as process_executor:
            for i in range(num_batches):
                start_index = i * batch_size
                end_index = (i + 1) * batch_size
                shared_data.film_data = film_data.iloc[start_index:end_index]
                future = process_executor.submit(doBatch, shared_data)
                concurrent.futures.wait([future])
                agg_list.append(shared_data.film_data)
                print(f"Batch {i+1}/{num_batches} completed")

        film_data = pd.concat(agg_list, ignore_index=True)

    film_data = film_data.dropna(subset=['plot', 'poster'])

    final_order = ['tconst','primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes', 'startYear', 'cast', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer', 'poster']
    film_data = film_data[final_order]

    print('Exporting to sql...')
    film_data = film_data.sample(frac=1)
    save_mySQL(film_data)
    print('Films saved to database!')

# Load all films from database into DataFrame
def loadAllFilms():
    mycursor = get_db_cursor()
    sql_query = "SELECT * FROM films"
    mycursor.execute(sql_query)
    columns = [col[0] for col in mycursor.description]
    films = mycursor.fetchall()
    films_data = pd.DataFrame(films, columns=columns)
    films_data['averageRating'] = films_data['averageRating'].astype(float)
    return films_data

# Join and concatenate inputted columns into a single string for TF-IDF
def create_soup(x, features):
    soup_parts = [str(x[feature]) for feature in features if x[feature] is not None]
    return ' '.join(soup_parts)

def count_likeable(row):
    features = ['primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes', 'startYear', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer']
    atts = sum(1 for col in row[features] if col is not None)
    cast = len(row['cast'].split(','))
    return atts+cast

# Get user's loved films from database
def get_loved_films(user_id):
    mycursor = get_db_cursor()

    sql_query = "SELECT tconst FROM loved_films WHERE user_id = %s"

    mycursor.execute(sql_query, (user_id,))

    rows = mycursor.fetchall()

    tconst_list = [tconst[0] for tconst in rows]

    loved_films_df = data[data['tconst'].isin(tconst_list)]

    return loved_films_df

# get user liked attributes from db
def get_liked_attributes(user_id):
    # Get thread-local connection
    mycursor = get_db_cursor()

    sql_query = "SELECT * FROM liked_attributes WHERE user_id = %s"

    mycursor.execute(sql_query, (user_id,))

    attribute_fetch = mycursor.fetchall()

    tconst_list = [row[1] for row in attribute_fetch]
    attribute_bin = [row[1:] for row in attribute_fetch]

    attributes_template = ['tconst','primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes', 'startYear', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer']
    liked_attributes_df = pd.DataFrame(columns=attributes_template)

    x = 0
    for tconst, att_bin in zip(tconst_list, attribute_bin):
        row_values = [tconst]  # Initialize row values with tconst
        for liked, attribute in zip(att_bin[1:], attributes_template[1:]):
            film_att = data[data['tconst'] == tconst]

            if liked == 1:
                row_values.append(film_att[attribute].values[0])
            else:
                row_values.append(None) 
        liked_attributes_df.loc[x] = row_values
        x+=1

    return liked_attributes_df

# get user liked cast from db
def get_liked_cast(user_id):
    # Get thread-local connection
    mycursor = get_db_cursor()

    sql_query = "SELECT * FROM liked_cast WHERE user_id = %s"

    mycursor.execute(sql_query, (user_id,))

    cast_fetch = mycursor.fetchall()

    cast = [row[1:] for row in cast_fetch]
    liked_cast_df = pd.DataFrame(cast, columns=['tconst', 'name'])

    return liked_cast_df

# calculate % of liked attributes of film in profile
def calculate_percentage(row):
    total_attributes = row['total_likeable']
    total_liked = row['num_liked_atts']
    percentage = total_liked / total_attributes
    return percentage 

# count liked attributes for film
def count_liked(row):
    features = ['primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes', 'startYear', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer']
    atts = sum(1 for col in row[features] if pd.notna(col))  # Change this line
    cast = 0
    if not pd.isna(row['cast']):
        cast = len(row['cast'].split(','))
    
    return atts + cast

# CREATE USER PROFILE
def get_user_profile(user_id):
    # get user film preferences from db
    lovedFilms = get_loved_films(user_id)
    likedAtt = get_liked_attributes(user_id)
    likedCast = get_liked_cast(user_id)

    # merge liked cast with liked attribute table
    likedCast_grouped = likedCast.groupby('tconst')['name'].apply(lambda x: ', '.join(x.dropna())).reset_index()
    likedAttributes = pd.merge(likedAtt, likedCast_grouped, on='tconst', how='outer') #outer join instead of left?
    likedAttributes.rename(columns={'name': 'cast'}, inplace=True)

    # format user_profile dataframe
    merged_love_liked = pd.concat([lovedFilms, likedAttributes], ignore_index=True)
    user_profile = pd.merge(merged_love_liked, data[['tconst', 'total_likeable']], on='tconst', how='left')
    user_profile = user_profile.drop(columns=['poster', 'total_likeable_x'])
    user_profile.rename(columns={'total_likeable_y': 'total_likeable'}, inplace=True)

    # initialise columns to calculate likeage
    user_profile['num_liked_atts'] = 0
    user_profile['likeage'] = 0.0
    # count total liked attributes for each film in profile
    for index, film in user_profile.iterrows():
        tconst = film['tconst']
        user_profile.loc[user_profile['tconst'] == tconst, 'num_liked_atts'] = count_liked(film)

    # calculate likeage for each film in profile
    user_profile['likeage'] = user_profile.apply(lambda row: calculate_percentage(row), axis=1)
    user_profile.drop(columns=['num_liked_atts', 'total_likeable'], inplace=True)

    return (user_profile, lovedFilms)

# split user profile into likes by group
def collate_liked_groups(user_profile):
    group_dataframes = []

    # Define dictionary to map group names to corresponding columns
    group_columns = {
        'liked_title_plot': ['primaryTitle', 'plot', 'likeage'],
        'liked_cast': ['cast', 'likeage'],
        'liked_crew': ['director', 'cinematographer', 'writer', 'producer', 'editor', 'composer', 'likeage'],
        'liked_genre': ['genres', 'likeage'],
        'liked_meta': ['averageRating', 'startYear', 'runtimeMinutes', 'likeage']
    }

    # Iterate over the dictionary and create group dataframes
    for group_name, columns in group_columns.items():
        group_df = user_profile[columns].copy()
        group_dataframes.append(group_df)

    return group_dataframes

# cosine similarity vector with tf-idf between films in row and column
def create_similarity_vector(row, column):
    tfidf = TfidfVectorizer(stop_words='english')

    column_soup_temp = column.apply(lambda x: create_soup(x, column.columns), axis=1)
    column_soup = column_soup_temp.fillna('')
    column_matrix = tfidf.fit_transform(column_soup)
    
    row_soup_temp = row.apply(lambda x: create_soup(x, row.columns), axis=1)
    row_soup = row_soup_temp.fillna('')
    row_matrix = tfidf.transform(row_soup)
   
    return cosine_similarity(row_matrix, column_matrix)

# euclidean distance vector for numerical attributes of film
def create_euclidean_vector(row, column):
    scaler = MinMaxScaler()
    row = row.fillna('')
    column = column.fillna(0)

    row_normalized = scaler.fit_transform(row)
    column_normalized = scaler.transform(column)
    distances = euclidean_distances(row_normalized, column_normalized)
    euclidean_matrix = 1 / (1 + distances)
    return euclidean_matrix

# get top N films similar to user profile based on input vector (NOT CURRENTLY IN USE)
def get_similar_films(vector, exclude):
    mean_similarity = np.mean(vector, axis=1)
    sorted_indices = np.argsort(mean_similarity)[::-1]
    top_N = sorted_indices[:]
    sorted_films = data.iloc[top_N]
    filtered_recommendations = sorted_films[~sorted_films['tconst'].isin(exclude['tconst'])]

    return filtered_recommendations

# function to calculate content recommendations
def get_content_recommendations(user_profile_groups, similarity_vectors):

    weighted_scores = {}
    
    # scale similarity score in respective vector based on likeage of feature
    for group, attributes in user_profile_groups.items():
        similarity_vector = similarity_vectors[group]
        likeage_array = np.array(list(attributes['likeage'].tolist()))
        weighted_similarity = similarity_vector * likeage_array

        # dictionary of groups and weighted similarity vectors 
        weighted_scores[group] = weighted_similarity

     # combine weighted similarity scores across all groups
    content_scores = np.sum(list(weighted_scores.values()), axis=0)

    # calculate mean similarity scores
    mean_similarity = np.mean(content_scores, axis=1)

    # sort the mean similarity scores and retrieve the top N indices
    sorted_indices = np.argsort(mean_similarity)[::-1]

    sorted_films = data.iloc[sorted_indices]

    sorted_films['similarity'] = mean_similarity[sorted_indices] / 5


    return sorted_films

# return most recurring names in input data
def most_common_names(df, top_n=5):
    df_copy = df.copy()
    if 'likeage' in df_copy.columns:
        df_copy = df_copy.drop(columns=['likeage'])
    
    all_names = pd.Series(df_copy.values.flatten())
    all_names = all_names.dropna().astype(str)
    all_names = all_names[all_names.str.strip() != '']
    
    if len(all_names) == 0:
        return []
    
    split_names = all_names.str.split(',').explode().str.strip()
    split_names = split_names[split_names != '']
    
    if len(split_names) == 0:
        return []
    
    name_counts = split_names.value_counts()
    top_n_names = name_counts.head(top_n)
    # Return list of dictionaries with name and count
    return [{'name': name, 'count': int(count)} for name, count in top_n_names.items()]

# return user's top 5 main genres
def top_5_genres(genres_series):
    # Initialize an empty Counter to store genre counts
    genre_counts = Counter()
    
    # Iterate over each genre string in the series
    for genre_string in genres_series:
        if isinstance(genre_string, str):
            # Split the genre string into individual genres
            individual_genres = [genre.strip() for genre in genre_string.split(',')]
            
            # Update the genre counts
            genre_counts.update(individual_genres)
    
    # Get the top 5 most common genres
    top_5 = genre_counts.most_common(5)
    
    return top_5


# GENRE CLUSTERING

# Train kmeans based on every unique genre
def train_kmeans():
    optimal_k = 85  #from elbow and silhouette
    kmeans = KMeans(n_clusters=optimal_k, init='k-means++', random_state=42)
    genres_data = data['genres'].unique()
    tfidf_matrix = tfidf_vectorizer.fit_transform(genres_data)
    kmeans.fit(tfidf_matrix)

    return kmeans

# return array of predicted cluster labels for each film in dataset
def initialise_clusters():
    rec_genres = data['genres']
    allFilms_genre_tfidf = tfidf_vectorizer.transform(rec_genres)
    allFilms_cluster_labels = kmeans.predict(allFilms_genre_tfidf)
    return allFilms_cluster_labels

# return df films by genre cluster similarity
def recommend_genre_clusters(user_profile, recommendedFilms):

    grouped_likes = collate_liked_groups(user_profile)
    liked_genres = grouped_likes[3]
    liked_genres.replace([None], np.nan, inplace=True)
    liked_genres.dropna(subset=['genres'], how='all', inplace=True)
    liked_genres.reset_index(drop=True, inplace=True)
    genres_data = liked_genres['genres'].unique()

    if(len(genres_data) > 1):

        user_genres_tfidf = tfidf_vectorizer.transform(genres_data)
        user_clusters_labels = kmeans.predict(user_genres_tfidf)

        # centroids of user clusters
        user_centroids = kmeans.cluster_centers_[user_clusters_labels]

        # centroids of recommended films clusters
        recommended_centroids = kmeans.cluster_centers_[allFilms_cluster_labels]

        similarity_matrix = cosine_similarity(user_centroids, recommended_centroids)

        mean_similarity = np.mean(similarity_matrix, axis=0)

        # Add mean similarity as a new column in the recommendedFilms DataFrame
        recommendedFilms['mean_cluster_similarity'] = mean_similarity

        recommendedFilms['combined_similarity'] = (recommendedFilms['similarity'] + recommendedFilms['mean_cluster_similarity']) /2

        # Sort recommended films by cluster similarity (mean_similarity) in descending order
        recommendedFilms = recommendedFilms.sort_values(by='mean_cluster_similarity', ascending=False)

        # filter out films already in user profiles
        filtered_recommendations = recommendedFilms[~recommendedFilms['tconst'].isin(user_profile['tconst'])]

        # Reset index
        filtered_recommendations.reset_index(drop=True, inplace=True)

        return filtered_recommendations
    
    else:
        x = pd.DataFrame()
        return x


# Film dataset and models are loaded lazily (see init_recommend_data) so that a
# database outage degrades only the recommendation endpoints instead of crashing
# the whole server at import time.
data = None
attributes = ['primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes','cast' ,'startYear', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer']
kmeans = None
allFilms_cluster_labels = None

_recommend_data_ready = False
_recommend_init_lock = threading.Lock()


def init_recommend_data(force=False):
    """Load the film dataset and train the models. Safe to call repeatedly:
    work only happens once unless force=True. Raises on DB failure so callers
    can decide how to respond (see the blueprint before_request guard)."""
    global data, kmeans, allFilms_cluster_labels, _recommend_data_ready
    if _recommend_data_ready and not force:
        return
    with _recommend_init_lock:
        if _recommend_data_ready and not force:
            return
        loaded = loadAllFilms()
        loaded['total_likeable'] = loaded.apply(lambda x: count_likeable(x), axis=1)
        loaded['soup'] = loaded.apply(lambda x: create_soup(x, attributes), axis=1)
        data = loaded  # populate the global before train_kmeans/initialise_clusters read it
        kmeans = train_kmeans()
        allFilms_cluster_labels = initialise_clusters()
        _recommend_data_ready = True


@recommend_bp.before_request
def _ensure_recommend_data():
    """Lazily warm the recommender on first request. If the DB is unreachable,
    return 503 for recommendation endpoints only - the rest of the site stays up."""
    try:
        init_recommend_data()
    except Exception as exc:
        print(f"Recommendation data unavailable: {exc}")
        return jsonify({"error": "Recommendation service is temporarily unavailable"}), 503


@recommend_bp.route('/update_profile_and_vectors', methods=['POST'])
def update_profile_and_vectors(user_id=None):
    if user_id is None:
        try:
            user_id = g.user["id"] if g else None
        except (RuntimeError, KeyError, AttributeError):
            user_id = None

    if user_id:
        # get update user profile and loved films
        get_profile = get_user_profile(user_id)
        user_profile = get_profile[0]

        if user_profile.empty:
            similarity_vectors_json = {
                'plot': [],
                'cast': [],
                'crew': [],
                'genre': [],
                'meta': []
            }

        else:
            # get groups of liked attributes
            grouped_likes = collate_liked_groups(user_profile)
            liked_plot, liked_cast, liked_crew, liked_genre, liked_meta = grouped_likes

            # Define the list of features excluding 'likeage'
            plot_features = [col for col in liked_plot.columns if col != 'likeage']
            crew_features = [col for col in liked_crew.columns if col != 'likeage']
            cast_features = [col for col in liked_cast.columns if col != 'likeage']
            genre_features = [col for col in liked_genre.columns if col != 'likeage']
            meta_features = [col for col in liked_meta.columns if col != 'likeage']

            # Create similarity vectors in parallel using ThreadPoolExecutor
            with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_INDEX_THREADS) as executor:
                plot_future = executor.submit(create_similarity_vector, data[plot_features], liked_plot[plot_features])
                crew_future = executor.submit(create_similarity_vector, data[crew_features], liked_crew[crew_features])
                cast_future = executor.submit(create_similarity_vector, data[cast_features], liked_cast[cast_features])
                genre_future = executor.submit(create_similarity_vector, data[genre_features], liked_genre[genre_features])
                meta_future = executor.submit(create_euclidean_vector, data[meta_features], liked_meta[meta_features])
                
                plot_matrix = plot_future.result()
                crew_matrix = crew_future.result()
                cast_matrix = cast_future.result()
                genre_matrix = genre_future.result()
                meta_matrix = meta_future.result()

            # Convert similarity vectors to JSON strings
            similarity_vectors_json = {
                'plot': plot_matrix.tolist(),
                'cast': cast_matrix.tolist(),
                'crew': crew_matrix.tolist(),
                'genre': genre_matrix.tolist(),
                'meta': meta_matrix.tolist()
            }

        cache.set(f'user_profile_{user_id}', user_profile.to_json())
        cache.set(f'similarity_vectors_{user_id}', json.dumps(similarity_vectors_json))

        # Immediately generate and cache recommendations
        if user_profile.empty:
            # save recommendations to cache (empty lists instead of empty dicts)
            cache.set(f'user_content_recommended{user_id}', json.dumps([]))
            cache.set(f'user_plot_recommended{user_id}', json.dumps([]))
            cache.set(f'user_cast_recommended{user_id}', json.dumps([]))
            cache.set(f'user_crew_recommended{user_id}', json.dumps([]))
            cache.set(f'user_genre_recommended{user_id}', json.dumps([]))
            
            return jsonify({"message": "Profile empty, empty recommendations cached"})
        else:
            # get groups of liked attributes
            grouped_likes = collate_liked_groups(user_profile)
            liked_plot = grouped_likes[0]
            liked_cast = grouped_likes[1]
            liked_crew = grouped_likes[2]
            liked_genre = grouped_likes[3]
            liked_meta = grouped_likes[4]

            user_profile_groups = {
                'plot': liked_plot,
                'cast': liked_cast,
                'crew': liked_crew,
                'genre': liked_genre,
                'meta': liked_meta
            }

            # Convert similarity vectors to NumPy arrays
            similarity_vectors = {
                'plot': np.array(similarity_vectors_json['plot']),
                'cast': np.array(similarity_vectors_json['cast']),
                'crew': np.array(similarity_vectors_json['crew']),
                'genre': np.array(similarity_vectors_json['genre']),
                'meta': np.array(similarity_vectors_json['meta'])
            }
 
            # content recommendations 
            content_recommended = get_content_recommendations(user_profile_groups, similarity_vectors)
            content_recommended_filtered = content_recommended[~content_recommended['tconst'].isin(user_profile['tconst'])]
            content_recommended_dict = content_recommended_filtered.to_dict(orient='records')
            similarity_dict = dict(zip(content_recommended_filtered['tconst'], content_recommended_filtered['similarity']))

            #plot recommendations
            plot_recommended = get_similar_films(similarity_vectors['plot'], user_profile)
            plot_recommended['similarity'] = plot_recommended['tconst'].map(similarity_dict)
            plot_recommended_dict = plot_recommended.to_dict(orient='records')

            #cast recommendations
            cast_recommended = get_similar_films(similarity_vectors['cast'], user_profile)
            cast_recommended['similarity'] = cast_recommended['tconst'].map(similarity_dict)
            cast_recommended_dict = cast_recommended.to_dict(orient='records')

            #crew recommendations
            crew_recommended = get_similar_films(similarity_vectors['crew'], user_profile)
            crew_recommended['similarity'] = crew_recommended['tconst'].map(similarity_dict)
            crew_recommended_dict = crew_recommended.to_dict(orient='records')

            # genre recommendations from clusters
            genre_recommended = recommend_genre_clusters(user_profile, content_recommended)
            genre_recommended_dict = genre_recommended.to_dict(orient='records')

            # save recommendations to cache (handle Decimal serialization)
            cache.set(f'user_content_recommended{user_id}', json.dumps(content_recommended_dict))
            cache.set(f'user_plot_recommended{user_id}', json.dumps(plot_recommended_dict))
            cache.set(f'user_cast_recommended{user_id}', json.dumps(cast_recommended_dict))
            cache.set(f'user_crew_recommended{user_id}', json.dumps(crew_recommended_dict))
            cache.set(f'user_genre_recommended{user_id}', json.dumps(genre_recommended_dict))

            return jsonify({"message": "User profile, vectors, and recommendations updated and stored in cache"})
    else:
        return jsonify({"message": "Error loading profile"})


@recommend_bp.route('/get_batch', methods=['GET'])
def get_batch_route():

    user_id = g.user["id"]
    category = request.args.get("category")
    page = int(request.args.get("page"))
    batch_size = PAGE_SIZE


    films_json = cache.get(f'user_{category}_recommended{user_id}')

    # If cache is empty, regenerate recommendations
    if films_json is None:
        try:
            update_profile_and_vectors(user_id=user_id)
            # Try to get the cache again after regeneration
            films_json = cache.get(f'user_{category}_recommended{user_id}')
        except Exception as e:
            print(f"Error regenerating recommendations: {e}")
            return jsonify([])

 
    films_data = json.loads(films_json)

    start_index = (page - 1) * batch_size
    end_index = (page) * batch_size

    # Slice the films list to get the batch
    batch = films_data[start_index:end_index]
    
    return jsonify(batch)
    

def get_user_films():
    user_id = g.user["id"]
    user_profile = get_user_profile(user_id)[0]

    if user_profile is not None:
        tconsts = user_profile['tconst'].tolist()
    
        return jsonify({"tconsts": tconsts})
    else:
        return jsonify({"tconst": []})


@recommend_bp.route('/get_profile_stats', methods=['GET'])
def get_profile_stats():
    user_id = g.user["id"]
    user_profile_tuple = get_user_profile(user_id)
    user_profile_df = user_profile_tuple[0]
    loved_films_df = user_profile_tuple[1]
    

    if(user_profile_df.empty):
        return jsonify({"message": False})
    
    else:
        grouped_likes = collate_liked_groups(user_profile_df)
        liked_cast = grouped_likes[1]
        liked_crew = grouped_likes[2]

        top_cast = most_common_names(liked_cast)
        top_crew = most_common_names(liked_crew)
        
        # For genres, we want ALL genres from ALL films (loved and liked), not just liked genre attributes
        # Get genres from loved films
        loved_genres = loved_films_df['genres'].dropna() if not loved_films_df.empty else pd.Series(dtype=str)
        
        # Get genres from liked films (need to fetch from data since liked_attributes might have None for genres)
        liked_att = get_liked_attributes(user_id)
        liked_cast_df = get_liked_cast(user_id)
        liked_tconsts = set(liked_att['tconst'].unique()) | set(liked_cast_df['tconst'].unique())
        liked_films_genres = data[data['tconst'].isin(liked_tconsts)]['genres'].dropna() if len(liked_tconsts) > 0 else pd.Series(dtype=str)
        
        # Combine all genres
        all_genres = pd.concat([loved_genres, liked_films_genres]).dropna()
        top_genres = top_5_genres(all_genres)

        # Convert the result to a dictionary
        top_genres_dict = [{'Genres': genre, 'Count': count} for genre, count in top_genres]

        return jsonify({"message": True, "cast": top_cast, "crew": top_crew, "genre": top_genres_dict})


@recommend_bp.route('/search_general', methods=['GET'])
def search_general():
    filters_str = request.args.get("query")
    page = int(request.args.get("page", 1))  # Default to page 1 if not provided
    page_size = PAGE_SIZE

    if filters_str:
        if page < 1:
            page = 1

        filters = [f.strip() for f in filters_str.split(',') if f and f.strip()]
        keywords_lower = [keyword.lower() for keyword in filters]

        filtered_films = data.copy()
        for keyword in keywords_lower:
            soup_lower = filtered_films['soup'].str.lower()
            filtered_films = filtered_films[soup_lower.str.contains(keyword, regex=False, na=False)]

        start_index = (page - 1) * page_size
        end_index = page * page_size

        # Extract the subset of films based on pagination
        paginated_films = filtered_films.iloc[start_index:end_index]

        # Remove the 'soup' column
        paginated_films = paginated_films.drop(columns=['soup'])

        # Convert paginated films to dictionary records
        paginated_films_dict = paginated_films.to_dict(orient='records')

        return jsonify(paginated_films_dict)
    else:
        return jsonify([])


def _refresh_film_dataset():
    """Weekly: pull in new films, then rebuild the in-memory dataset/models."""
    INITIALISE_FILM_DATASET()
    init_recommend_data(force=True)



schedule.every(1).weeks.do(_refresh_film_dataset)  # pull in newly released films


def start_recommendation_scheduler():
    """Start the recommendation engine scheduler in a separate thread"""
    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    print("Recommendation engine scheduler started")

if __name__ == "__main__":
    # This block is kept for backward compatibility but won't be used
    # The blueprint should be registered in server.py instead
    print("Note: recommendEngine.py should be imported as a blueprint in server.py")

