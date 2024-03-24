//HANDLE FILM INFO RENDERING ON FRONTEND, CAROUSEL NAVIGATION

async function cacheRecommendedFilms(user_id) {
    //load batch of films from file

    try {
        // Fetch films data from the API
        const response = await axios.post(`http://localhost:8080/recommendedFilms?user_id=${user_id}`);
    } catch (error) {
        console.error('Error fetching films:', error);
    }

};

//load next batch of films
async function getRecommendedBatch(user_id, category, page) {

    try {
        const response = await axios.get(`http://localhost:8080/getFilmsBatch?user_id=${user_id}&category=${category}&page=${page}`)
        const films = response.data.films;
        return films

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;
    }


}
var combinedScrollPosition;
var plotScrollPosition;
var castScrollPosition;
var genreScrollPosition;
var crewScrollPosition;

window.onload = async function () {

    //initialise html elements
    const combinedScroll = document.getElementById('combined_box');
    const plotScroll = document.getElementById('plot_box');
    const castScroll = document.getElementById('cast_box');
    const genreScroll = document.getElementById('genre_box');
    const crewScroll = document.getElementById('crew_box');

    combinedScrollPosition = 1,
    plotScrollPosition = 1;
    castScrollPosition = 1;
    genreScrollPosition = 1;
    crewScrollPosition = 1;

    var user_id = combinedScroll.getAttribute('data-id');

    // Check if combined films are in the cache
    var combined_films = await getRecommendedBatch(user_id, 'combined', 1);

    if (combined_films !== '-') {
        // Films are in cache, display them
        await displayRecommendedFilms(combined_films);
    } else {
        // Films are not in cache, fetch and cache them
        await cacheRecommendedFilms(user_id);
        combined_films = await getRecommendedBatch(user_id, 'combined', 1);
        await displayRecommendedFilms(combined_films);
    }

    async function displayRecommendedFilms(films) {
        if (films.length > 0) {
            combinedScroll.innerHTML = await displayCombinedFilms(films);

            var plot_films = await getRecommendedBatch(user_id, 'plot', 1);
            plotScroll.innerHTML = await displayCategoryFilms(plot_films, 'plot');

            var cast_films = await getRecommendedBatch(user_id, 'cast', 1);
            castScroll.innerHTML = await displayCategoryFilms(cast_films, 'cast');

            var genre_films = await getRecommendedBatch(user_id, 'genre', 1);
            genreScroll.innerHTML = await displayCategoryFilms(genre_films, 'genres');

            var crew_films = await getRecommendedBatch(user_id, 'crew', 1);
            crewScroll.innerHTML = await displayCategoryFilms(crew_films, 'crew');
        } else {
            combinedScroll.innerHTML = `<span> Your profile is empty. </span>`;
        }
    }

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

            content += `<div class="film-card" data-id="${film.tconst}">`

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
            content += `<p class="film-cast">${film.cast}</p>`
            const formatted_similarity = Math.round(film.similarity * 100)
            content += `<p class="film-similarity">${formatted_similarity}%</p> </i>`
            content += `</div>`
            content += `</div>`

        });

        return content;

    };

    async function displayCategoryFilms(films, category) {

        var content = "";

        films.forEach(function (film) {

            content += `<div class="small-film-card" id="${category}-card" data-id="${film.tconst}">`
            content += `<div class="small-film-details">`

            // Check if the film title is too long
            content += `<h3 class="small-film-title">${film.primaryTitle}</h3>`; // Use a smaller font size class

            if (category === 'crew') {
                const fields = [];
                if (film.director) fields.push(film.director);
                if (film.producer) fields.push(film.producer);
                if (film.cinematographer) fields.push(film.cinematographer);
                if (film.composer) fields.push(film.composer);
                if (film.editor) fields.push(film.editor);
                const crewString = fields.join(', ');

                content += `<p class="small-film-${category}">${crewString}</p>`;

            } else {
                content += `<p class="small-film-${category}">${film[category]}</p>`;
            }
            content += `</div> </div>`;

        });
        content += `</div>`;

        return content
    };


    async function loadMoreCombinedFilms() {
        filmScroll = this;

        // Check if the user has scrolled to the bottom of the scroll box
        if (filmScroll.scrollTop + filmScroll.clientHeight >= filmScroll.scrollHeight - 2) {


            // Call getCombinedRecommended to fetch the next batch of films
            combinedScrollPosition++;
            const films = await getRecommendedBatch(user_id, 'combined', combinedScrollPosition);

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
            const films = await getRecommendedBatch(user_id, 'plot', plotScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayCategoryFilms(films, 'plot');
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
            const films = await getRecommendedBatch(user_id, 'cast', castScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayCategoryFilms(films, 'cast');
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
            const films = await getRecommendedBatch(user_id, 'genre', genreScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayCategoryFilms(films, 'genres');
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
            const films = await getRecommendedBatch(user_id, 'crew', crewScrollPosition);

            // Append the newly fetched films to the scroll box
            if (films.length > 0) {
                filmScroll.innerHTML += await displayCategoryFilms(films, 'crew');
            }
        }

        return crewScrollPosition;
    };

    combinedScroll.addEventListener('scroll', loadMoreCombinedFilms);
    plotScroll.addEventListener('scroll', loadMorePlotFilms);
    castScroll.addEventListener('scroll', loadMoreCastFilms);
    genreScroll.addEventListener('scroll', loadMoreGenreFilms);
    crewScroll.addEventListener('scroll', loadMoreCrewFilms);


    document.getElementById('page_title').addEventListener('click', function () {
        window.location.href = '/index';
    });


};






