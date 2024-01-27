#TMDB api with multi-threading + multi-processing

import concurrent.futures
import os
import requests as req

#theMovieDB api call for film plot summary and poster
def fetchDetails(film_id):
    url = f'https://api.themoviedb.org/3/movie/{film_id}'
    
    headers = { 
        "accept": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmYxZTkxOWFjMDBkYmI2NjhjODVlODg5ZWJjZTg1ZCIsInN1YiI6IjY1OGIwNzEyMzI1YTUxNTkyNzAxNWU4OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.yKZIOsVYvJxzRO3GJ1yayqvSCZg3l-ryO9FjBkfHIZc"
    }

    response = req.get(url, headers=headers)

    return response

#call api
def doFetch(film_id):
    return fetchDetails(film_id)

#get film psoster and plot for given batch of films
def doBatch(shared_data):
        film_data = shared_data.film_data  # Access the DataFrame from the shared namespace
        number = shared_data.number

        #global request_counter     
        MAX_THREADS = min(os.cpu_count(), 1000)

        # Use ThreadPoolExecutor for multi-threading within each process
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
            results = list(executor.map(doFetch, film_data['tconst']))

        
        for index, details in zip(film_data.index, results):
            
            shared_data.number += 1

            if(details.ok):

            
                details = details.json()

                if(details['overview']):
                    film_data.at[index, 'plot'] = details['overview']

                if(details['poster_path']):
                    film_data.at[index, 'poster'] = details['poster_path']

         


