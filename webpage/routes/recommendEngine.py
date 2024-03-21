import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import euclidean_distances
from sklearn.metrics.pairwise import linear_kernel
from sklearn.preprocessing import MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from collections import Counter
import mysql.connector
import json
import redis
import warnings
from flask import Flask, jsonify, request
warnings.filterwarnings("ignore")

redis_client = redis.Redis('localhost')

app = Flask(__name__)

data = pd.read_json('./films.json')


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

    mydb = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Leicester69lol",
        database="users"
    )

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

    mydb = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Leicester69lol",
        database="users"
    )

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
    mydb = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Leicester69lol",
        database="users"
    )

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
    mydb = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Leicester69lol",
        database="users"
    )

    mycursor = mydb.cursor()

    sql_query = "SELECT * FROM user_watchlist WHERE user_id = %s"

    mycursor.execute(sql_query, (user_id,))


    watchlist_fetch = mycursor.fetchall()

    mycursor.close()
    mydb.close()

    tconst_list = [row[1] for row in watchlist_fetch]
    attributes_template = ['tconst','primaryTitle', 'plot', 'averageRating', 'genres', 'runtimeMinutes', 'startYear', 'cast', 'director', 'cinematographer', 'writer', 'producer', 'editor', 'composer']
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
    watchlist = get_watchlist(user_id)

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
        # group_df = group_df.dropna(subset=columns[:-1], how='all')
        group_dataframes.append(group_df)

    return group_dataframes

# cosine similarity vector with tf-idf between films in row and column
def create_similarity_vector(row, column):
    tfidf = TfidfVectorizer(stop_words='english')
    row_soup_temp = row.apply(lambda x: create_soup(x, row.columns), axis=1)
    row_soup = row_soup_temp.fillna('')
    row_matrix = tfidf.fit_transform(row_soup)

    column_soup_temp = column.apply(lambda x: create_soup(x, column.columns), axis=1)
    column_soup = column_soup_temp.fillna('')
    column_matrix = tfidf.transform(column_soup)

    return linear_kernel(row_matrix, column_matrix)

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
def get_similar_films(vector, N):
    filtered_vector = vector[~data['tconst'].isin(lovedFilms['tconst'])] #don't recommend film the user has already loved
    mean_similarity = np.mean(filtered_vector, axis=1)
    sorted_indices = np.argsort(mean_similarity)[::-1]
    top_N = sorted_indices[:N]
    return data.iloc[top_N]

# function to calculate unified recommendations
def get_unified_recommendations(user_profile_groups, similarity_vectors, exclude_films , N):

    weighted_scores = {}
    
    # scale similarity score in respective vector based on likeage of feature
    for group, attributes in user_profile_groups.items():
        similarity_vector = similarity_vectors[group]
        likeage_array = np.array(list(attributes['likeage'].tolist()))
        weighted_similarity = similarity_vector * likeage_array

        # meta columns have higher similarity since its numerical so adjust for this
        if group == 'meta':
            scaling_factor = 1 - weighted_similarity
            weighted_similarity *= scaling_factor

        # dictionary of groups and weighted similarity vectors 
        weighted_scores[group] = weighted_similarity

     # combine weighted similarity scores across all groups
    combined_scores = np.sum(list(weighted_scores.values()), axis=0)

    # calculate mean similarity scores
    mean_similarity = np.mean(combined_scores, axis=1)

    # sort the mean similarity scores and retrieve the top N indices
    sorted_indices = np.argsort(mean_similarity)[::-1][:N]

    sorted_films = data.iloc[sorted_indices]
    filtered_recommendations = sorted_films[~sorted_films['tconst'].isin(exclude_films['tconst'])]

    return filtered_recommendations


data['total_likeable'] = data.apply(lambda x: count_likeable(x), axis=1)

@app.route('/update_profile_and_vectors', methods=['POST'])
def initialise_profile():
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

        # Store JSON strings in Redis cache
        redis_client.set(f'user_profile_{user_id}', user_profile.to_json())
        redis_client.set(f'similarity_vectors_{user_id}', json.dumps(similarity_vectors_json))
        
        return jsonify({"message": "User profile and vectors updated and stored in cache."})


@app.route('/get_bulk_recommend', methods=['GET'])
def bulk_recommend():
    user_id = request.args.get("user_id") 

    if user_id:

        user_profile_json = redis_client.get(f'user_profile_{user_id}')
      
        user_profile_str = user_profile_json.decode('utf-8')
        user_profile_data = json.loads(user_profile_str)
        user_profile_df = pd.DataFrame(user_profile_data)

        if(not user_profile_df.empty):

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
        
            similarity_vectors_json = redis_client.get(f'similarity_vectors_{user_id}')
            similarity_vectors_str = similarity_vectors_json.decode('utf-8')
            similarity_vectors_data = json.loads(similarity_vectors_str)

            # Convert lists to NumPy arrays
            similarity_vectors = {
                'plot': np.array(similarity_vectors_data['plot']),
                'cast': np.array(similarity_vectors_data['cast']),
                'crew': np.array(similarity_vectors_data['crew']),
                'genre': np.array(similarity_vectors_data['genre']),
                'meta': np.array(similarity_vectors_data['meta'])
            }

            lovedFilms = get_loved_films(user_id)
            recommended = get_unified_recommendations(user_profile_groups, similarity_vectors, lovedFilms, 50)
            recommended_dict = recommended.to_dict(orient='records')
           
            return jsonify({"films": recommended_dict})
        else:
            return jsonify({"films":"no films"})


# @app.rout('/get_plot_recommend', methods=['GET'])
# def plot_recommend():
#     return '' 


if __name__ == "__main__":
    app.run(debug=True, port=5000)





