//HANDLE FILM INFO RENDERING ON FRONTEND, CAROUSEL NAVIGATION

async function cacheRecommendedFilms(user_id) {
    try {
        // Fetch films data from the API
        const response = await axios.post(`http://localhost:8080/cacheRecommendedFilms?user_id=${user_id}`);
    } catch (error) {
        console.error('Error fetching films:', error);
    }

};

async function getRecommendedFilmsBatch(user_id, category, page) {
    try {
        const response = await axios.get(`http://localhost:8080/getFilmsBatch?user_id=${user_id}&category=${category}&page=${page}`)
        const films = response.data.films;
        return films

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;
    }

};

async function getLikedStaff(user_id) {
    try {
        const response = await axios.get(`http://localhost:8080/getLikedStaff?user_id=${user_id}`)
        const liked_cast = response.data.liked_cast;
        const liked_crew = response.data.liked_crew;
        return { liked_cast, liked_crew }

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;
    }

};

window.onload = async function () {

    //initialise html elements
    const combinedScroll = document.getElementById('combined_box');
    const plotScroll = document.getElementById('plot_box');
    const castScroll = document.getElementById('cast_box');
    const genreScroll = document.getElementById('genre_box');
    const crewScroll = document.getElementById('crew_box');
    const user_id = combinedScroll.getAttribute('data-id');

    var combinedScrollPosition = 1;
    var plotScrollPosition = 1;
    var castScrollPosition = 1;
    var genreScrollPosition = 1;
    var crewScrollPosition = 1;

    var likedStaff;
    var liked_cast;
    var liked_crew;

    // Check if combined films are in the cache
    var combined_films = await getRecommendedFilmsBatch(user_id, 'combined', 1);
    
    // check if recommendations are in cache
    if (combined_films !== '-') {
        await displayFilmsFromCache(combined_films, user_id); // Films are in cache, display them

    } else {

        // Films are not in cache, fetch and cache them
        await cacheRecommendedFilms(user_id);
        combined_films = await getRecommendedFilmsBatch(user_id, 'combined', 1);
       
        if (combined_films === '-') {
            // User profile is empty, there are no recommendations
            console.log('profile is empty');

        } else {
            // User profile is not empty, recommendations are now in cache
            await displayFilmsFromCache(combined_films, user_id);
        }

    }


    // Function to display films from cache
    async function displayFilmsFromCache(films, user_id) {
        likedStaff = await getLikedStaff(user_id);
        liked_cast = likedStaff.liked_cast;
        liked_crew = likedStaff.liked_crew;
        await displayRecommendedFilms(films);
    };


    async function displayRecommendedFilms(films) {
        if (films.length > 0) {
            combinedScroll.innerHTML = await displayCombinedFilms(films);

            var plot_films = await getRecommendedFilmsBatch(user_id, 'plot', 1);
            plotScroll.innerHTML = await displayGenrePlotFilms(plot_films, 'plot');

            var cast_films = await getRecommendedFilmsBatch(user_id, 'cast', 1);
            castScroll.innerHTML = await displayCastCrewFilms(cast_films, 'cast');

            var genre_films = await getRecommendedFilmsBatch(user_id, 'genre', 1);
            genreScroll.innerHTML = await displayGenrePlotFilms(genre_films, 'genres');

            var crew_films = await getRecommendedFilmsBatch(user_id, 'crew', 1);
            crewScroll.innerHTML = await displayCastCrewFilms(crew_films, 'crew');
        } else {
            combinedScroll.innerHTML = `<span> Your profile is empty. </span>`;
        }
    };


    async function displayCombinedFilms(films) {

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

            let names = film.cast.split(','); // Split the cast string into individual names
            let castContent = ''; // Initialize a variable to store the HTML content for cast
            for (let i = 0; i < names.length; i++) {
                let name = names[i].trim(); // Remove any leading/trailing spaces
                let bold = liked_cast.includes(name) ? 'myPeople' : '';
                castContent += `<span class="${bold}">${name}</span>`;
                // Add a comma if it's not the last name
                if (i < names.length - 1) {
                    castContent += ', ';
                }
            }
            content += `<p class="film-cast">${castContent}</p>`;

            const formatted_similarity = Math.round(film.similarity * 100)
            content += `<p class="film-similarity">${formatted_similarity}%</p> </i>`
            content += `</div>`
            content += `</div>`

        });

        return content;

    };


    async function displayGenrePlotFilms(films, category) {

        var content = "";

        films.forEach(function (film) {

            content += `<div class="small-film-card card-body ${category}-card clickable" data-id="${film.tconst}">`
            content += `<div class="small-film-details">`
            content += `<h3 class="small-film-title">${film.primaryTitle}</h3>`; // Use a smaller font size class
            content += `<p class="small-film-${category}">${film[category]}</p>`;
            content += `</div> </div>`;
        });
        content += `</div>`;

        return content
    };


    async function displayCastCrewFilms(films, category) {
        let content = "";

        films.forEach(function (film) {
            content += `<div class="small-film-card card-body ${category}-card clickable" data-id="${film.tconst}">`;
            content += `<div class="small-film-details">`;

            // Check if the film title is too long
            content += `<h3 class="small-film-title">${film.primaryTitle}</h3>`; // Use a smaller font size class
            content += `<p class="small-film-${category}">`;

            if (category === 'crew') {
                const fields = [];
                if (film.director) fields.push(film.director);
                if (film.producer) fields.push(film.producer);
                if (film.cinematographer) fields.push(film.cinematographer);
                if (film.composer) fields.push(film.composer);
                if (film.editor) fields.push(film.editor);
                const crewString = fields.join(', ');

                const names = crewString.split(','); // Split the crew string into individual names
                let crewContent = '';
                names.forEach(function (name) {
                    const trimmedName = name.trim(); // Remove any leading/trailing spaces
                    const bold = liked_crew.includes(trimmedName) ? 'myPeople' : '';
                    crewContent += `<span class="${bold}">${trimmedName}</span>, `;
                });

                content += crewContent;
            } else {
                const names = film.cast.split(','); // Split the cast string into individual names
                let castContent = '';
                names.forEach(function (name) {
                    const trimmedName = name.trim(); // Remove any leading/trailing spaces
                    const bold = liked_cast.includes(trimmedName) ? 'myPeople' : '';
                    castContent += `<span class="${bold}">${trimmedName}</span>, `;
                });
                // Remove the trailing comma and space
                castContent = castContent.slice(0, -2);

                content += castContent;
            }

            content += `</p>`;
            content += `</div> </div>`;
        });

        return content;
    };


    async function loadMoreCombinedFilms() {
        filmScroll = this;

        // Check if the user has scrolled to the bottom of the scroll box
        if (filmScroll.scrollTop + filmScroll.clientHeight >= filmScroll.scrollHeight - 2) {


            // Call getCombinedRecommended to fetch the next batch of films
            combinedScrollPosition++;
            const films = await getRecommendedFilmsBatch(user_id, 'combined', combinedScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayCombinedFilms(films);
            }

        }

    };


    async function loadMorePlotFilms() {
        const filmScroll = this;

        // Check if the user has scrolled to the bottom of the scroll box
        if (filmScroll.scrollTop + filmScroll.clientHeight >= filmScroll.scrollHeight - 2) {
            // Increment the scroll position
            plotScrollPosition++;

            // Call getRecommendedBatch to fetch the next batch of films
            const films = await getRecommendedFilmsBatch(user_id, 'plot', plotScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayGenrePlotFilms(films, 'plot');
            }
        }

        return plotScrollPosition;
    };


    async function loadMoreCastFilms() {
        const filmScroll = this;

        // Check if the user has scrolled to the bottom of the scroll box
        if (filmScroll.scrollTop + filmScroll.clientHeight >= filmScroll.scrollHeight - 2) {
            // Increment the scroll position
            castScrollPosition++;

            // Call getRecommendedBatch to fetch the next batch of films
            const films = await getRecommendedFilmsBatch(user_id, 'cast', castScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayCastCrewFilms(films, 'cast');
            }
        }

        return castScrollPosition;
    };


    async function loadMoreGenreFilms() {
        const filmScroll = this;

        // Check if the user has scrolled to the bottom of the scroll box
        if (filmScroll.scrollTop + filmScroll.clientHeight >= filmScroll.scrollHeight - 2) {
            // Increment the scroll position
            genreScrollPosition++;

            // Call getRecommendedBatch to fetch the next batch of films
            const films = await getRecommendedFilmsBatch(user_id, 'genre', genreScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayGenrePlotFilms(films, 'genres');
            }
        }

        return genreScrollPosition;
    };


    async function loadMoreCrewFilms() {
        const filmScroll = this;

        // Check if the user has scrolled to the bottom of the scroll box
        if (filmScroll.scrollTop + filmScroll.clientHeight >= filmScroll.scrollHeight - 2) {
            // Increment the scroll position
            crewScrollPosition++;

            // Call getRecommendedBatch to fetch the next batch of films
            const films = await getRecommendedFilmsBatch(user_id, 'crew', crewScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayCastCrewFilms(films, 'crew');
            }
        }

        return crewScrollPosition;
    };


    combinedScroll.addEventListener('scroll', loadMoreCombinedFilms);
    plotScroll.addEventListener('scroll', loadMorePlotFilms);
    castScroll.addEventListener('scroll', loadMoreCastFilms);
    genreScroll.addEventListener('scroll', loadMoreGenreFilms);
    crewScroll.addEventListener('scroll', loadMoreCrewFilms);


};






