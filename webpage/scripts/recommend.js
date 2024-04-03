//HANDLE FILM INFO RENDERING ON FRONTEND, CAROUSEL NAVIGATION

async function updateProfile(user_id) {
    try {
        // Fetch films data from the API
        const response = await axios.post(`http://127.0.0.1:8081/update_profile_and_vectors?user_id=${user_id}`);
        console.log(response.data.message)
    } catch (error) {
        console.error('Error fetching films:', error);
    }
};

async function cacheRecommendedFilms(user_id) {
    try {
        // Fetch films data from the API
        const response = await axios.post(`http://127.0.0.1:8081/cache_recommend_pack?user_id=${user_id}`);
        console.log(response.data.message)
    } catch (error) {
        console.error('Error fetching films:', error);
    }
};

async function getRecommendedFilmsBatch(user_id, category, page) {
    try {
        const response = await axios.get(`http://127.0.0.1:8081/get_batch?user_id=${user_id}&category=${category}&page=${page}`)
        const films = response.data.films;
        return films

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;
    }
};

async function getLikedStaff(user_id) {
    try {
        const response = await axios.get(`http://127.0.0.1:8081/get_liked_staff?user_id=${user_id}`)
        const liked_cast = response.data.liked_cast;
        const liked_crew = response.data.liked_crew;
        return { liked_cast, liked_crew }

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;
    }
};

async function refreshFilms(user_id) {
    try {
        const response = await axios.post(`http://localhost:8080/shuffleFilms?user_id=${user_id}`);
        return response.data
    } catch (error) {
        console.error('Error shuffling films')
    }

}


window.onload = async function () {

    const filmContainer = document.getElementById('filmsContainer');
    const user_id = filmContainer.getAttribute('data-id');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';
    const spinner = document.querySelector('.spinner'); //loading spinner

    var scrollPage = 1;

    var liked_cast;
    var liked_crew

    let option;

    if (refreshProfile) { //user has interacted with film, reload profile
        filmContainer.innerHTML = `<div class="loading-msg">`
        filmContainer.innerHTML += `<p><strong>Updating profile...</strong></p>`
        filmContainer.innerHTML += `<div class="spinner"></div>`
        await updateProfile(user_id);
        filmContainer.innerHTML += `<p><strong>Getting films...</strong></p> </div> </div>`
    
        await cacheRecommendedFilms(user_id);
    }

    var combined_films = await getRecommendedFilmsBatch(user_id, 'combined', 1);
    if (combined_films !== '-') {
        document.getElementById('showMeOptions').disabled = false;

        filmContainer.innerHTML = `<div class="spinner"></div>`

        await initialiseStaff(user_id);
        option = 'combined';
        filmContainer.innerHTML = ''

        await displayFilms(combined_films);

    } else {
        filmContainer.innerHTML = `<img class="notFound" src="./images/NotFound_Sailor.png" alt="No films found">`;
        document.getElementById('showMeOptions').disabled = true;

    }

    // Function to display films from cache
    async function initialiseStaff(user_id) {
        let likedStaff = await getLikedStaff(user_id);
        liked_cast = likedStaff.liked_cast;
        liked_crew = likedStaff.liked_crew;
    };


    async function displayFilms(films) {
        let content = '';

        films.forEach(function (film) {
            // format similarity
            const formatted_similarity = Math.round(film.similarity * 100);

            // format runtime
            const hours = Math.floor(film.runtimeMinutes / 60);
            const minutes = film.runtimeMinutes % 60;
            let time = ''
            if (hours > 0 && minutes > 0) {
                time = `${hours}h ${minutes}m`;

            } else if (hours > 0) {
                time = `${hours}h`;

            } else if (minutes > 0) {
                time = `${minutes}m`;;
            }

            //format cast
            let thisFilmCast = film.cast.split(',').map(name => name.trim()); // Split the cast string into individual names and trim each name
            let filmLikedCast = thisFilmCast.filter(name => liked_cast.includes(name)); // Filter out only the liked names

            //format crew
            const fields = [];
            if (film.director) fields.push(film.director);
            if (film.producer) fields.push(film.producer);
            if (film.cinematographer) fields.push(film.cinematographer);
            if (film.composer) fields.push(film.composer);
            if (film.editor) fields.push(film.editor);
            const crewString = fields.join(', ');

            let thisFilmCrew = crewString.split(','); // Split the crew string into individual names
            let filmLikedCrew = thisFilmCrew.filter(name => liked_crew.includes(name));


            content += `<figure class="poster-wrapper clickable" data-id="${film.tconst}">
                        <figcaption class="caption">`

            if (option === 'combined') {
                content += `<p class="film-similarity" style="text-align:center;">${formatted_similarity}% match</p>`

            }

            content += `<p>Released: <strong>${film.startYear}</strong></p>
                            <p>Runtime: <strong>${time}</strong></p>
                            <p>Rating: <strong>${film.averageRating}</strong></p>
                            <p>Genre: <strong>${film.genres}</strong></p>`

            if (filmLikedCast.length > 0 && option != 'plot') {
                let castString = "";
                filmLikedCast.forEach(function (castName, index) {
                    // Add comma if the name is not the last one in the array
                    if (index < filmLikedCast.length - 1) {
                        castString += `<span>${castName}, </span>`;
                    } else {
                        castString += `<span>${castName}</span>`;
                    }
                });
                content += `<p class="film-cast">cast: <strong>${castString}</strong></p>`;
            }

            if (filmLikedCrew.length > 0 && option != 'plot') {
                let crewString = "";
                filmLikedCrew.forEach(function (crewName, index) {
                    // Add comma if the name is not the last one in the array
                    if (index < filmLikedCrew.length - 1) {
                        crewString += `<span>${crewName}, </span>`;
                    } else {
                        crewString += `<span>${crewName}</span>`;
                    }
                });
                content += `<p class="film-crew">crew: <strong>${crewString}</strong></p>`;
            }

            content += `<p>${film.plot}</p>                    
                        </figcaption>
                    <img class="film-poster" src="${baseImagePath + film.poster}" alt="${film.title}">  
                    </figure>`;

        });

        filmContainer.innerHTML += content;
    };


    // change filter option
    document.getElementById('showMeOptions').addEventListener('change', async function (event) {
        option = event.target.value;
        filmContainer.setAttribute('current-option', option)
        filmContainer.scrollTop = 0;

        filmContainer.innerHTML = `<div class="spinner"></div>`

        scrollPage = 1;
        let films = await getRecommendedFilmsBatch(user_id, option, scrollPage)

        filmContainer.innerHTML = ''
        await displayFilms(films);

    });


    async function displaFilms(films) {

        var content = "";

        films.forEach(function (film) {

            // format runtime
            const hours = Math.floor(film.runtimeMinutes / 60);
            const minutes = film.runtimeMinutes % 60;
            let time = ''
            if (hours > 0 && minutes > 0) {
                time = `${hours}h ${minutes}m`;

            } else if (hours > 0) {
                time = `${hours}h`;

            } else if (minutes > 0) {
                time = `${minutes}m`;;
            }

            content += `<div class="film-card card-body clickable" data-id="${film.tconst}">`

            // check if poster exists
            if (film.poster) {
                content += `<img src="https://image.tmdb.org/t/p/w500/${film.poster}" class="film-poster">`;
            } else {
                content += `<img src="/images/MissingPoster.jpeg" class=film-poster>`;
            }

            content += `<div class="film-details">`

            // Check if the film title is too long
            if (film.primaryTitle.length > 40) { // Adjust the threshold as needed
                content += `<h3 class="film-title small-title">${film.primaryTitle}</h3>`; // Use a smaller font size class
            } else {
                content += `<h3 class="film-title">${film.primaryTitle}</h3>`;
            }

            content += `<p class="film-plot">${film.plot}</p>`
            content += `<div class="film-metadata">`
            content += `<span class="film-year">${film.startYear}</span>`
            content += `<span class="film-runtime">${time}</span>`
            content += `<span class="film-rating">${film.averageRating}/10</span>`
            content += `</div>`
            const formatted_genre = film.genres.split(',').map(genre => genre.trim()).join(', ')
            content += `<p class="film-genre">${formatted_genre}</p>`


            let thisFilmCast = film.cast.split(',').map(name => name.trim()); // Split the cast string into individual names and trim each name
            let likedNamesIncl = thisFilmCast.filter(name => liked_cast.includes(name)); // Filter out only the liked names
            let castContent = '';

            // Add liked names first
            for (let i = 0; i < Math.min(likedNamesIncl.length, 6); i++) {
                let name = likedNamesIncl[i];
                castContent += `<span class="myPeople">${name}</span>`;
                if (i < Math.min(likedNamesIncl.length, 6)) {
                    castContent += ', ';
                }
            }

            // Add remaining names if needed
            if (likedNamesIncl.length < 6) {
                let remainingNames = thisFilmCast.filter(name => !likedNamesIncl.includes(name)).slice(0, 5 - likedNamesIncl.length);
                for (let name of remainingNames) {
                    castContent += `<span>${name}</span>`;
                    if (name !== remainingNames[remainingNames.length - 1]) {
                        castContent += ', ';
                    }
                }
            }

            content += `<p class="film-cast">${castContent}</p>`;

            const formatted_similarity = Math.round(film.similarity * 100)
            content += `<p class="film-similarity">${formatted_similarity}%</p>`
            content += `</div>`
            content += `</div>`
            content += `</div>`

        });

        return content;

    };



    async function loadMoreFilms() {
        const filmScroll = this;

        // Check if the user has scrolled to the bottom of the scroll box
        if (filmContainer.scrollTop + filmContainer.clientHeight >= filmContainer.scrollHeight - 2) {
            // Increment the scroll position
            scrollPage++;

            // Call getRecommendedBatch to fetch the next batch of films
            const films = await getRecommendedFilmsBatch(user_id, option, scrollPage);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                await displayFilms(films);
            }

        }
    }



    filmContainer.addEventListener('scroll', loadMoreFilms);



    // click title bar to refresh - shuffle films, reset counter, reload page
    document.getElementById('page_title').addEventListener('click', async function () {
        const shuffle = await refreshFilms(user_id)
        localStorage.setItem('counter', 0);
        localStorage.setItem('currentIndex', 0);
        window.location.href = '/';

    });



};






