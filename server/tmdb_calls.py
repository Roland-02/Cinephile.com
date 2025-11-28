#TMDB api with multi-threading + multi-processing

import concurrent.futures
import os
import requests as req
import time

MAX_REQUESTS_PER_SECOND = 50
API_KEY = os.getenv("API_KEY")

#theMovieDB api call for film plot summary and poster
def fetchDetails(film_id):
    url = f'https://api.themoviedb.org/3/movie/{film_id}'
    
    headers = { 
        "accept": "application/json",
        "Authorization": f'Bearer {API_KEY}'
    }

    response = req.get(url, headers=headers)

    return response

#call api
def doFetch(film_id):
    time.sleep(1 / MAX_REQUESTS_PER_SECOND)  # Introduce delay to respect rate limits
    return fetchDetails(film_id)

#get film psoster and plot for given batch of films
def doBatch(shared_data):
        film_data = shared_data.film_data  # Access the DataFrame from the shared namespace

        #global request_counter     
        MAX_THREADS = min(os.cpu_count(), 1000)

        # Use ThreadPoolExecutor for multi-threading within each process
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
                results = list(executor.map(doFetch, film_data['tconst']))

                for index, details in zip(film_data.index, results):

                    if(details.ok):

                        details = details.json()

                        if(details['overview']):
                            film_data.loc[index, 'plot'] = details['overview']

                        if(details['poster_path']):
                            film_data.loc[index, 'poster'] = details['poster_path']

                    else:
                        time.sleep(1 / MAX_REQUESTS_PER_SECOND)  # Introduce delay if rate limit is exceeded

                    
            shared_data.film_data = film_data

        except Exception as e:
                print(f"Error in ThreadPoolExecutor: {e}")
                time.sleep(1 / MAX_REQUESTS_PER_SECOND)  # Introduce delay if rate limit is exceeded




         


