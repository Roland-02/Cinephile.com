# general
import numpy as np
import pandas as pd
import mysql.connector
import json
import os
from dotenv import load_dotenv
load_dotenv()

# ml
from sklearn.metrics.pairwise import euclidean_distances
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings("ignore")

# initalising dataset
import gzip
import requests as req
import concurrent.futures
from io import BytesIO
from collections import Counter
from tmdb_calls import doBatch
from sqlalchemy import create_engine
from langdetect import detect
from multiprocessing import Manager

# flask server
from flask import Flask, jsonify, request
from flask_caching import Cache
from flask_cors import CORS
import schedule
import threading

config = {         
    "CACHE_TYPE": "SimpleCache",  # Flask-Caching related configs
    "CACHE_DEFAULT_TIMEOUT": 2073600 #1 day
}

app = Flask(__name__)
app.config.from_mapping(config)
tfidf_vectorizer = TfidfVectorizer()
cache = Cache(app) #allow caching for fast storage
CORS(app) #allow request to be made from other ports

def create_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_DATABASE")
    )

# ensure no duplicate cast members
def remove_duplicates(names):
    if isinstance(names, str):
        unique_names = set(name.strip() for name in names.split(','))
        return ', '.join(unique_names)
    else:
        return names

# langdetec check if film title is in english
def is_english(text):
    try:
        lang = detect(text)
        return lang == 'en'
    except:
        return False
    
# export film data to mysql
def save_mySQL(data):

    # MySQL connection configuration
    mydb = create_db_connection()

    # Cursor object to execute SQL queries
    mycursor = mydb.cursor()

    # Table name in the database
    table_name = "all_films"

    # Define the SQL query to delete all records from the table
    delete_query = "DELETE FROM {}".format(table_name)

    # Execute the delete query
    mycursor.execute(delete_query)
    mydb.commit()

    engine = create_engine("mysql+mysqlconnector://root:Leicester69lol@localhost/users")

    data.to_sql('all_films', con=engine, if_exists='replace', index=False)

# export recommended film interaction data to mysql
def save_interaction(user_id, tconst, position, similarity):

    # MySQL connection configuration
    mydb = create_db_connection()

    mycursor = mydb.cursor()

    table_name = "user_recommended_interaction"

    # Check if the given user_id and tconst combination already exists
    select_query = "SELECT * FROM {} WHERE user_id = %s AND tconst = %s".format(table_name)
    mycursor.execute(select_query, (user_id, tconst))
    existing_row = mycursor.fetchone()

    if existing_row:
        delete_query = "DELETE FROM {} WHERE user_id = %s AND tconst = %s".format(table_name)
        mycursor.execute(delete_query, (user_id, tconst))
        

    # Insert the new interaction record
    insert_query = "INSERT INTO {} (user_id, tconst, position, similarity) VALUES (%s, %s, %s, %s)".format(table_name)
    mycursor.execute(insert_query, (user_id, tconst, position, similarity))
    mydb.commit()

# download, process and filter IMDB non-commercial dataset, save to mysql db
def INITIALISE_FILM_DATASET():

    print('Downloading tables...')

    #get film datasets ~ 10-30mins

    #set urls
    url_title_basics = 'https://datasets.imdbws.com/title.basics.tsv.gz' #film name, year, runtime, genres
    url_crew = 'https://datasets.imdbws.com/title.principals.tsv.gz' #actors, actresses, cinematographers, directors (redundant)
    url_ratings = 'https://datasets.imdbws.com/title.ratings.tsv.gz' #ratings for films (not all)
    url_names = 'https://datasets.imdbws.com/name.basics.tsv.gz' #link table for names against nconst
    url_langs = 'https://datasets.imdbws.com/title.akas.tsv.gz' #link table for names against nconst

    #download from url
    res_title_basics = req.get(url_title_basics).content
    res_crew = req.get(url_crew).content
    res_ratings = req.get(url_ratings).content
    res_names = req.get(url_names).content
    res_lang = req.get(url_langs).content

    #decompress
    title_basics_gzip = gzip.decompress(res_title_basics)
    crew_basics_gzip = gzip.decompress(res_crew)
    title_ratings_gzip = gzip.decompress(res_ratings)
    names_gzip = gzip.decompress(res_names)
    title_langs_gzip = gzip.decompress(res_lang)

    #read csv into dataframes
    titles = pd.read_csv(BytesIO(title_basics_gzip), delimiter='\t',low_memory=False)
    crew = pd.read_csv(BytesIO(crew_basics_gzip), delimiter='\t',low_memory=False)
    ratings = pd.read_csv(BytesIO(title_ratings_gzip), delimiter='\t',low_memory=False)
    names = pd.read_csv(BytesIO(names_gzip), delimiter='\t',low_memory=False)
    langs = pd.read_csv(BytesIO(title_langs_gzip), delimiter='\t',low_memory=False)


    print('Cleaning data...')

    #first data clean

    # #filter only english films
    desired_langs = ['en']
    filtered_langs = langs[langs['language'].isin(desired_langs)]
    tconsts_filtered_langs = filtered_langs['titleId'].tolist()
    desired_regions = ['CA', 'US', 'GB', 'IE', 'AU', 'NZ']
    filtered_regions = langs[langs['region'].isin(desired_regions)]
    tconsts_filtered_regions = filtered_regions['titleId'].tolist()

    #remove unsuitable titles
    titles = titles[titles['titleType'] == 'movie']
    titles = titles[titles['genres'] != r'\N']
    titles['isAdult'] = pd.to_numeric(titles['isAdult'], errors='coerce')
    titles = titles[titles['isAdult'] == 0 ]
    titles = titles[(titles['startYear'] >= '1955') & (titles['startYear'] != '\\N')]
    titles = titles[(titles['tconst'].isin(tconsts_filtered_langs) & (titles['tconst'].isin(tconsts_filtered_regions)))]

    #get tconsts for remaining non-film rows, and remove corresponding non-film rows
    film_tconsts = titles['tconst'].tolist()
    crew = crew[crew['tconst'].isin(film_tconsts)]
    ratings = ratings[ratings['tconst'].isin(film_tconsts)]

    #set columns to remove from dataset
    remove_from_titles = ['originalTitle', 'endYear', 'titleType', 'isAdult']
    remove_from_crew = ['ordering','job','characters']
    remove_from_ratings = ['numVotes']
    remove_from_names = ['birthYear', 'deathYear', 'primaryProfession', 'knownForTitles']

    #remove unneeded columns
    titles = titles.drop(columns=remove_from_titles)
    crew = crew.drop(columns=remove_from_crew)
    ratings = ratings.drop(columns=remove_from_ratings)
    names = names.drop(columns=remove_from_names)

    print('Merging tables...')

    #merge relational tables

    crew_data = crew.copy()

    #merge crew data with names table to get respective names rather than nconst
    crew_data['nconst'] = crew_data['nconst'].str.split(', ')
    crew_data = crew_data.explode('nconst')
    crew_data = pd.merge(crew_data, names, on='nconst', how='left')
    crew_data = crew_data.pivot_table(
        index=['tconst'],
        columns=['category'],
        values=['primaryName'],
        aggfunc=lambda x: ', '.join(str(item) for item in x),
    ).reset_index()


    #format and restructure columns before merging
    crew_data.columns = ['_'.join(col).strip() for col in crew_data.columns.values]
    crew_data.columns = [col.replace('primaryName_', '') for col in crew_data.columns]
    crew_data = crew_data.rename(columns={'tconst_': 'tconst'})
    columns_to_keep = ['tconst', 'actor', 'actress', 'cinematographer', 'composer', 'director', 'editor', 'producer', 'writer']
    crew_data = crew_data[columns_to_keep]

    #merge film and cast datasets for one complete table
    film_data = pd.merge(titles, ratings, on='tconst', how='left')
    film_data = pd.merge(film_data, crew_data, on='tconst', how='left')

    print('Further cleaning data...')

    # second data clean, drop data sparse rows

    columns_check = ['director', 'cinematographer', 'editor', 'writer', 'composer', 'producer']
    film_data = film_data[film_data[columns_check].isna().sum(axis=1) == 0] #don't allow films with any missing data
    film_data = film_data.dropna(subset=['actor', 'actress', 'runtimeMinutes', 'averageRating', 'genres'])

    # double-check for null columns
    film_data = film_data[film_data['runtimeMinutes'] != '\\N']
    film_data = film_data[film_data['startYear'] != '\\N']
    film_data = film_data[film_data['averageRating'] != '\\N']

    # combine actor and actress into 1 column ~ 10 cast member (can reduce)
    film_data['cast'] = film_data['actor'] + ', ' + film_data['actress']
    film_data.drop(['actor', 'actress'], axis=1, inplace=True)
    film_data['cast'] = film_data['cast'].apply(remove_duplicates) # double-check for duplicate cast members from merging

    # remove data-sparse films
    print('EDL testing...')

    # check titles are in english (filter out MFL films release in West or mis-labelled)
    english_titles = film_data['primaryTitle'].apply(is_english)
    film_data = film_data[english_titles]

    #add columns for plot and poster path
    film_data['plot'] = np.nan
    film_data['poster'] = np.nan


    print('Films: ' + str(len(film_data)))


    print('Fetching plot summaries and posters...')

    # get film plot and poster with tmdb api ~ inconsistent runtime (<2Hrs)

    #call api/details for each film with multiprocessing and mutlithreading
    if __name__ == '__main__':

        manager = Manager()
        shared_data = manager.Namespace() #allow data to be shared with external function
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

    # #remove films with no plot
    film_data = film_data.dropna(subset=['plot', 'poster'])

    final_order = ['tconst','primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes', 'startYear', 'cast', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer', 'poster']
    film_data = film_data[final_order]

    print('Exporting to sql...')

    #shuffle order
    film_data = film_data.sample(frac=1)

    # export film data to sql db
    save_mySQL(film_data)

    print('Films saved to database!')

# load whole films dataset from db
def loadAllFilms():

    mydb = create_db_connection()

    mycursor = mydb.cursor()

    sql_query = "SELECT * FROM all_films"

    mycursor.execute(sql_query)
    
    columns = [col[0] for col in mycursor.description]

    films = mycursor.fetchall()

    mycursor.close()
    mydb.close()

    films_data = pd.DataFrame(films, columns=columns)

    return films_data

# join and concatenate inputted columns
def create_soup(x, features):
    soup_parts = [str(x[feature]) for feature in features if x[feature] is not None]  # Convert to string and filter out None values
    return ' '.join(soup_parts)

# count number of likeable elements for film
def count_likeable(row):
    features = ['primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes', 'startYear', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer']
    atts = sum(1 for col in row[features] if col is not None)
    cast = len(row['cast'].split(','))
    return atts+cast

# get user loved films from db
def get_loved_films(user_id):

    mydb = create_db_connection()

    mycursor = mydb.cursor()

    sql_query = "SELECT tconst FROM user_loved_films WHERE user_id = %s"

    mycursor.execute(sql_query, (user_id,))

    rows = mycursor.fetchall()

    tconst_list = [tconst[0] for tconst in rows]

    mycursor.close()
    mydb.close()

    loved_films_df = data[data['tconst'].isin(tconst_list)]

    return loved_films_df

# get user liked attributes from db
def get_liked_attributes(user_id):

    mydb = create_db_connection()

    mycursor = mydb.cursor()

    sql_query = "SELECT * FROM user_liked_attributes WHERE user_id = %s"

    mycursor.execute(sql_query, (user_id,))

    attribute_fetch = mycursor.fetchall()

    tconst_list = [row[1] for row in attribute_fetch]
    attribute_bin = [row[1:] for row in attribute_fetch]

    mycursor.close()
    mydb.close()

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

    mydb = create_db_connection()

    mycursor = mydb.cursor()

    sql_query = "SELECT * FROM user_liked_cast WHERE user_id = %s"

    mycursor.execute(sql_query, (user_id,))

    cast_fetch = mycursor.fetchall()

    mycursor.close()
    mydb.close()

    cast = [row[1:] for row in cast_fetch]
    liked_cast_df = pd.DataFrame(cast, columns=['tconst', 'name'])

    return liked_cast_df

# get user watchlist from db
def get_watchlist(user_id):
    mydb = create_db_connection()

    mycursor = mydb.cursor()

    sql_query = "SELECT * FROM user_watchlist WHERE user_id = %s"

    mycursor.execute(sql_query, (user_id,))


    watchlist_fetch = mycursor.fetchall()

    mycursor.close()
    mydb.close()

    tconst_list = [row[1] for row in watchlist_fetch]
    attributes_template = ['tconst','primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes', 'startYear', 'cast', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer', 'poster']
    watchlist_df = pd.DataFrame(columns=attributes_template)

    x = 0
    for tconst in tconst_list:
        watchlist_df.loc[x] = data[data['tconst'] == tconst][attributes_template].values[0]
        x+=1

    return watchlist_df

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

# get array of names from inputted dataframe
def extract_names(data):
    names = set()
    for column in data.columns:
        for value in data[column]:
            if value and isinstance(value, str) and value.lower() not in ['none', 'null', 'nan']:
                names.update(value.split(", "))
    return list(names)

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
        # group_df = group_df.dropna(subset=columns[:-1], how='all')
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

    # filtered_recommendations = sorted_films[~sorted_films['tconst'].isin(exclude_films['tconst'])]

    return sorted_films

# return most recurring names in input data
def most_common_names(df, top_n=10):
    all_names = pd.Series(df.values.flatten())
    split_names = all_names.str.split(',').explode()
    name_counts = split_names.value_counts()
    top_n_names = name_counts.head(top_n)
    return top_n_names.index.tolist()

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

# RECOMMENDATIONS EVALUATION METRICS

# repeat of get_conent_recommendations - for evaluation metrics
def recommend_content_films(user_id):
    # get update user profile and loved films

    user_id = str(user_id)
    get_profile = get_user_profile(user_id)
    user_profile = get_profile[0]

    # get groups of liked attributes
    grouped_likes = collate_liked_groups(user_profile)
    liked_plot = grouped_likes[0]
    liked_cast = grouped_likes[1]
    liked_crew = grouped_likes[2]
    liked_genre = grouped_likes[3]
    liked_meta = grouped_likes[4]

    # Define the list of features excluding 'likeage'
    plot_features = [col for col in liked_plot.columns if col != 'likeage']
    crew_features = [col for col in liked_crew.columns if col != 'likeage']
    cast_features = [col for col in liked_cast.columns if col != 'likeage']
    genre_features = [col for col in liked_genre.columns if col != 'likeage']
    meta_features = [col for col in liked_meta.columns if col != 'likeage']

    # Call the function with the selected columns
    plot_matrix = create_similarity_vector(data[plot_features], liked_plot[plot_features])
    crew_matrix = create_similarity_vector(data[crew_features], liked_crew[crew_features])
    cast_matrix = create_similarity_vector(data[cast_features], liked_cast[cast_features])
    genre_matrix = create_similarity_vector(data[genre_features], liked_genre[genre_features])
    meta_matrix = create_euclidean_vector(data[meta_features], liked_meta[meta_features])

    # Similarity vectors for each group
    similarity_vectors = {
        'plot': plot_matrix,
        'cast': cast_matrix,
        'crew': crew_matrix,
        'genre': genre_matrix,
        'meta': meta_matrix
    }

    user_profile_groups = {
        'plot': liked_plot,
        'cast': liked_cast,
        'crew': liked_crew,
        'genre': liked_genre,
        'meta': liked_meta
    }

    weighted_scores = {}
    
    # scale similarity score in respective vector based on likeage of feature
    for group, attributes in user_profile_groups.items():
        similarity_vector = similarity_vectors[group]
        likeage_array = np.array(list(attributes['likeage'].tolist()))

        # assign weights to recommendations based on ratings
        weighted_similarity = similarity_vector * likeage_array

        # dictionary of groups and weighted similarity vectors 
        weighted_scores[group] = weighted_similarity

     # combine weighted similarity scores across all groups
    combined_scores = np.sum(list(weighted_scores.values()), axis=0)

    # calculate mean similarity scores
    mean_similarity = np.mean(combined_scores, axis=1)

    # sort the mean similarity scores and retrieve the top N indices
    sorted_indices = np.argsort(mean_similarity)[::-1]

    sorted_films = data.iloc[sorted_indices]

    sorted_films['similarity'] = mean_similarity[sorted_indices] / 5

    filtered_recommendations = sorted_films[~sorted_films['tconst'].isin(user_profile['tconst'])] #NOT FILTERING RIGHT NOW

    return sorted_films

# return all user_ids from db
def get_user_ids():
    # Establish a connection to the MySQL database
    mydb = create_db_connection()

    # Create a cursor object to execute SQL queries
    mycursor = mydb.cursor()

    # SQL query to select all user IDs from the user_login table
    sql_query = "SELECT user_id FROM user_login"

    # Execute the SQL query
    mycursor.execute(sql_query)

    # Fetch all rows of the result
    rows = mycursor.fetchall()

    # Extract user IDs from the fetched rows
    user_ids = [row[0] for row in rows]

    # Close the cursor and database connection
    mycursor.close()
    mydb.close()

    return user_ids

# get interaction data between user and recommended films
def get_recommended_interaction_data():
    # MySQL connection configuration
    mydb = create_db_connection()

    # Cursor object to execute SQL queries
    mycursor = mydb.cursor()

    # Table name in the database
    table_name = "user_recommended_interaction"

    # Define the SQL query to select interaction data for the given user_id
    select_query = "SELECT * FROM {}".format(table_name)

    # Execute the select query with user_id parameter
    mycursor.execute(select_query)

    # Fetch all rows of the result
    interaction_data = mycursor.fetchall()

    # Create a DataFrame from the fetched data
    df = pd.DataFrame(interaction_data, columns=["user_id", "tconst", "position", "similarity"])

    # Close the database connection
    mydb.close()

    return df

# create df of user film ratings based on db data
def create_user_ratings_df():
    users = get_user_ids()
    all_user_feedback = []

    for user_id in users:
        user_id = int(user_id)

        watchlist = get_watchlist(user_id)    
        user_profile_pkg = get_user_profile(user_id)
        user_profile = user_profile_pkg[0]
        
        user_feedback_temp = user_profile[['tconst', 'likeage']] #pd.merge(interacted_films[interacted_films['user_id'] == user_id], user_profile[['tconst', 'likeage']], on='tconst', how='left')
        user_feedback_temp['user_id'] = user_id

        # Set likeage to 0.5 for films in the watchlist
        watchlist_tconsts = watchlist['tconst']
        user_feedback_temp.loc[user_feedback_temp['tconst'].isin(watchlist_tconsts), 'likeage'] = 0.5

        # Append the user feedback to the list
        all_user_feedback.append(user_feedback_temp)

    user_feedback = pd.concat(all_user_feedback, ignore_index=True)
    user_feedback.fillna(0, inplace=True)
    order = ['user_id', 'tconst', 'likeage']
    user_feedback = user_feedback[order]
    user_feedback.rename(columns={'likeage': 'rating'}, inplace=True)

    return user_feedback

# count occurrences of A in B
def count_occurrences(A, B):
    tally = 0
    for item in B:
        if item in A:
            tally += 1
    return tally

# return precision of recommendations at k (0-1)
def calculate_precision_at_k(user_interactions, recommended_films, k):
    total_precision = 0
    num_users = len(user_interactions)
    
    for user_id, user_interacted_films in user_interactions.items():
        
        # get recommended films for the user
        recommended_top_k = recommended_films.get(user_id, [])['tconst'][:k]

        # count how many relevant items appear in top-k recommended films
        num_true_positives = count_occurrences(user_interacted_films, recommended_top_k)
        
        # calculate precision for users
        precision_at_k = num_true_positives / k if k > 0 else 0
        
        # accumulate precision for all users
        total_precision += precision_at_k
    
    # average precision across all users
    average_precision_at_k = total_precision / num_users
    return average_precision_at_k

# return recall of recommendations at k (0-1)
def calculate_recall_at_k(user_interactions, recommended_films, k):
    total_recall = 0
    num_users = len(user_interactions)
    
    for user_id, user_interacted_films in user_interactions.items():
        num_user_films = len(user_interacted_films)

        # get recommended films for the user
        recommended_top_k = recommended_films.get(user_id, [])['tconst'][:k]
        
        # count how many relevant items appear in top-k recommended films
        num_true_positives = count_occurrences(user_interacted_films, recommended_top_k)
        
        # calculate recall for user
        recall_at_n = num_true_positives / num_user_films if num_user_films > 0 else 0
        
        # accumulate recall for all users
        total_recall += recall_at_n
    
    # average recall across all users
    average_recall_at_n = total_recall / num_users
    return average_recall_at_n

# perform single hit rate calculation
def calculate_hit_rate(df, n):
    top_n = df[df['position'] <= n]
    hit_rate = len(top_n) / len(df)
    return hit_rate

# return hit rate of recommendations (list of 0-1 values for top10, top25 and top50)
def generate_hit_rate_stats():
    users = get_user_ids()
    recommended_interaction_data = get_recommended_interaction_data()
    rates = []
    for i in [10, 25, 50]:
        hit_rate = 0
        user_len = 0
        for user_id in users:
            user_interaction = recommended_interaction_data[recommended_interaction_data['user_id'] == user_id]
            if(len(user_interaction) > 0):
                user_len += 1
                hit_rate += calculate_hit_rate(user_interaction, i)

        hit_rate = hit_rate / user_len
        rates.append(hit_rate)

    return rates

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


data = loadAllFilms()
attributes = ['primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes','cast' ,'startYear', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer']
data['total_likeable'] = data.apply(lambda x: count_likeable(x), axis=1)
data['soup'] = data.apply(lambda x: create_soup(x, attributes), axis=1)
kmeans = train_kmeans()
allFilms_cluster_labels = initialise_clusters()


@app.route('/update_profile_and_vectors', methods=['POST'])
def initialise_profile_route():
    user_id = request.args.get("user_id") 

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

            # Call the function with the selected columns
            plot_matrix = create_similarity_vector(data[plot_features], liked_plot[plot_features])
            crew_matrix = create_similarity_vector(data[crew_features], liked_crew[crew_features])
            cast_matrix = create_similarity_vector(data[cast_features], liked_cast[cast_features])
            genre_matrix = create_similarity_vector(data[genre_features], liked_genre[genre_features])
            meta_matrix = create_euclidean_vector(data[meta_features], liked_meta[meta_features])

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

        return jsonify({"message": "User profile and vectors updated and stored in cache"})
    else:
        return jsonify({"message": "Error loading profile"})


@app.route('/cache_recommend_pack', methods=['POST'])
def bulk_recommend_route():
    user_id = request.args.get("user_id") 

    if user_id:

        # user_profile_json = redis_client.get(f'user_profile_{user_id}')
        user_profile_json = cache.get(f'user_profile_{user_id}')
        if(user_profile_json):

            user_profile_data = json.loads(user_profile_json)
            user_profile_df = pd.DataFrame(user_profile_data)

            if(user_profile_df.empty):

                # save recommendations to cache
                cache.set(f'user_content_recommended{user_id}', json.dumps({}))
                cache.set(f'user_plot_recommended{user_id}', json.dumps({}))
                cache.set(f'user_cast_recommended{user_id}', json.dumps({}))
                cache.set(f'user_crew_recommended{user_id}', json.dumps({}))
                cache.set(f'user_genre_recommended{user_id}', json.dumps({}))

                return jsonify({"message": "Profile empty, empty recommendations cached"})
        
            else:    
                # get groups of liked attributes
                grouped_likes = collate_liked_groups(user_profile_df)
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
            
                # similarity_vectors_json = redis_client.get(f'similarity_vectors_{user_id}')
                similarity_vectors_json = cache.get(f'similarity_vectors_{user_id}')
                similarity_vectors_data = json.loads(similarity_vectors_json)

                # Convert lists to NumPy arrays
                similarity_vectors = {
                    'plot': np.array(similarity_vectors_data['plot']),
                    'cast': np.array(similarity_vectors_data['cast']),
                    'crew': np.array(similarity_vectors_data['crew']),
                    'genre': np.array(similarity_vectors_data['genre']),
                    'meta': np.array(similarity_vectors_data['meta'])
                }
     
                # content recommendations 
                content_recommended = get_content_recommendations(user_profile_groups, similarity_vectors)
                content_recommended_filtered = content_recommended[~content_recommended['tconst'].isin(user_profile_df['tconst'])]
                content_recommended_dict = content_recommended_filtered.to_dict(orient='records')
                similarity_dict = dict(zip(content_recommended_filtered['tconst'], content_recommended_filtered['similarity']))

                #plot recommendations
                plot_recommended = get_similar_films(similarity_vectors['plot'], user_profile_df)
                plot_recommended['similarity'] = plot_recommended['tconst'].map(similarity_dict)
                plot_recommended_dict = plot_recommended.to_dict(orient='records')

                #cast recommendations
                cast_recommended = get_similar_films(similarity_vectors['cast'], user_profile_df)
                cast_recommended['similarity'] = cast_recommended['tconst'].map(similarity_dict)
                cast_recommended_dict = cast_recommended.to_dict(orient='records')

                #crew recommendations
                crew_recommended = get_similar_films(similarity_vectors['crew'], user_profile_df)
                crew_recommended['similarity'] = crew_recommended['tconst'].map(similarity_dict)
                crew_recommended_dict = crew_recommended.to_dict(orient='records')

                # genre recommendations from clusters
                genre_recommended = recommend_genre_clusters(user_profile_df, content_recommended)
                genre_recommended_dict = genre_recommended.to_dict(orient='records')

                #save recommendations to cache
                cache.set(f'user_content_recommended{user_id}', json.dumps(content_recommended_dict))
                cache.set(f'user_plot_recommended{user_id}', json.dumps(plot_recommended_dict))
                cache.set(f'user_cast_recommended{user_id}', json.dumps(cast_recommended_dict))
                cache.set(f'user_crew_recommended{user_id}', json.dumps(crew_recommended_dict))
                cache.set(f'user_genre_recommended{user_id}', json.dumps(genre_recommended_dict))

                return jsonify({"message": "Recommendations stored in cache"})
            
        else:
            # save recommendations to cache
            cache.set(f'user_content_recommended{user_id}', json.dumps({}))
            cache.set(f'user_plot_recommended{user_id}', json.dumps({}))
            cache.set(f'user_cast_recommended{user_id}', json.dumps({}))
            cache.set(f'user_crew_recommended{user_id}', json.dumps({}))
            cache.set(f'user_genre_recommended{user_id}', json.dumps({}))

            return jsonify({"message": "Profile empty, empty recommendations cached"})
    else:
        return jsonify({"message": "User not found"})


@app.route('/get_batch', methods=['GET'])
def get_batch_route():

    user_id = request.args.get("user_id")
    category = request.args.get("category")
    page = int(request.args.get("page"))
    batch_size = 100

    films_json = cache.get(f'user_{category}_recommended{user_id}')
    
    if(films_json is not None):

        films_data = json.loads(films_json)

        if films_data:
            start_index = (page - 1) * batch_size
            end_index = (page) * batch_size

            # Slice the films list to get the batch
            batch = films_data[:end_index]
            
            return jsonify({"films": batch})
   
    return jsonify({"films": "-"})
    

@app.route('/get_liked_staff', methods=['GET'])
def get_staff_route():

    user_id = request.args.get("user_id")
    get_profile = get_user_profile(user_id)
    user_profile = get_profile[0]
    grouped_likes = collate_liked_groups(user_profile)

    liked_cast = grouped_likes[1]
    liked_crew = grouped_likes[2]
    liked_cast_names = ''
    liked_crew_names = ''

    if not liked_cast.empty:
        liked_cast_names = extract_names(liked_cast)

    if not liked_crew.empty:
        liked_crew_names = extract_names(liked_crew)

    return jsonify({"liked_cast": liked_cast_names, "liked_crew": liked_crew_names})
      

@app.route('/get_loved_films', methods=['GET'])
def get_loved_route():
    user_id = request.args.get("user_id")
    loved_films = get_loved_films(user_id)
    loved_films_dict = loved_films.to_dict(orient='records')
    return jsonify({"films": loved_films_dict})


@app.route('/get_liked_films', methods=['GET'])
def get_liked_route():
    user_id = request.args.get("user_id")
    user_profile = get_user_profile(user_id)
    liked_films_attr = user_profile[0] 
    liked_films_tconsts = liked_films_attr[liked_films_attr['likeage'] != 1]['tconst']
    liked_films = data[data['tconst'].isin(liked_films_tconsts)]
    liked_films_dict = liked_films.to_dict(orient='records')
    return jsonify({"films": liked_films_dict})


@app.route('/get_user_watchlist', methods=['GET'])
def get_watchlist_route():
    user_id = request.args.get("user_id")
    watchlist = get_watchlist(user_id)

    if watchlist is not None:
        watchlist_dict = watchlist.to_dict(orient='records')

        return jsonify({"watchlist": watchlist_dict})
    else:
        return jsonify({"watchlist": {}})


@app.route('/get_user_films', methods=['GET'])
def get_user_films_route():
    user_id = request.args.get("user_id")
    user_profile = get_user_profile(user_id)[0]

    if user_profile is not None:
        tconsts = user_profile['tconst'].tolist()
    
        return jsonify({"tconsts": tconsts})
    else:
        return jsonify({"tconst": []})


@app.route('/get_profile_stats', methods=['GET'])
def get_fav_cast_route():
    user_id = request.args.get("user_id")
    user_profile_df = get_user_profile(user_id)[0]
    

    if(user_profile_df.empty):
        return jsonify({"message": False})
    
    else:
        grouped_likes = collate_liked_groups(user_profile_df)
        liked_cast = grouped_likes[1]
        liked_crew = grouped_likes[2]
        liked_genre = grouped_likes[3]

        top_cast = most_common_names(liked_cast)
        top_crew = most_common_names(liked_crew)
        top_genres = top_5_genres(liked_genre['genres'])

        # Convert the result to a dictionary
        top_genres_dict = [{'Genres': genre, 'Count': count} for genre, count in top_genres]

        return jsonify({"message": True, "cast": top_cast, "crew": top_crew, "genre": top_genres_dict})


@app.route('/search_general', methods=['GET'])
def search_general():
    filters_str = request.args.get("query")
    page = int(request.args.get("page", 1))  # Default to page 1 if not provided
    page_size = 100  # Default page size to 100 if not provided

    if filters_str:
        filters = filters_str.split(',')
        keywords_lower = set(keyword.lower() for keyword in filters)
        filtered_films = data.copy()
        for keyword in keywords_lower:
            filtered_films = filtered_films[filtered_films['soup'].str.lower().str.contains(keyword)]

        end_index = (page) * page_size

        # Extract the subset of films based on pagination
        paginated_films = filtered_films.iloc[:end_index]

        # Remove the 'soup' column
        paginated_films = paginated_films.drop(columns=['soup'])

        # Convert paginated films to dictionary records
        paginated_films_dict = paginated_films.to_dict(orient='records')

        return jsonify({'films': paginated_films_dict})
    else:
        return jsonify({'films': []})


@app.route('/save_recommended_interaction', methods=['POST'])
def interaction():
    user_id = request.args.get("user_id")
    tconst = request.args.get("tconst")
    position = request.args.get("position")
    similarity = request.args.get("sim")
    save_interaction(user_id, tconst, position, similarity)
    return jsonify({"message":"interaction stored successfully"})


@app.route('/recommender_performance', methods=['GET'])
def get_model_stats():
    # output hit rate, precision-k, recall-k
    all_interactions = create_user_ratings_df()
    users = all_interactions['user_id'].unique()
    user_interactions = {}
    for index, row in all_interactions.iterrows():
        user_id = row['user_id']
        tconst = row['tconst']
        
        if user_id in user_interactions:
            user_interactions[user_id].append(tconst)
        else:
            user_interactions[user_id] = [tconst]

    user_films = {}
    for user_id in users:
        recommended = recommend_content_films(user_id)
        user_films[user_id] = recommended

    precision = calculate_precision_at_k(user_interactions, user_films, 100) * 100
    recall = calculate_recall_at_k(user_interactions, user_films, 100) * 100
    f1 = (2 * precision * recall) / (precision + recall)
    hit_rate = generate_hit_rate_stats()
    hit_rate_top10 = hit_rate[0] * 100
    hit_rate_top25 = hit_rate[1] * 100
    hit_rate_top50 = hit_rate[2] * 100

    return jsonify({"Average Precision@10" : f"{precision:.2f}%", 
                    "Average Recall@10" : f"{recall:.2f}%",
                    "Average F1@10" : f"{f1:.2f}%",
                    "Hit-rate at Top-10" : f"{hit_rate_top10:.2f}%", 
                    "Hit-rate at Top-25" : f"{hit_rate_top25:.2f}%",
                    "Hit-rate at Top-50" : f"{hit_rate_top50:.2f}%"})


schedule.every(2).weeks.do(INITIALISE_FILM_DATASET) #run intialise dataset every fortnite - add new films


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8081)

    threading.Thread(target=app.run, kwargs={'debug': True, 'port': 5000}).start()
  
    # Run the scheduler in the main thread
    while True:
        schedule.run_pending()

