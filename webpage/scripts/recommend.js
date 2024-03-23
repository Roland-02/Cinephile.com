//HANDLE FILM INFO RENDERING ON FRONTEND, CAROUSEL NAVIGATION

//load next batch of films
async function getRecommendedFilms(user_id) {
    //load batch of films from file

    let films = '';
    try {

        // Fetch films data from the API
        const response = await fetch(`http://localhost:8080/recommendedFilms?user_id=${user_id}`);
        if (response.ok) {
            films = await response.json();
        }

    } catch (error) {
        console.error('Error fetching films:', error);
    }

    return films
};

window.onload = async function () {

    //initialise html elements
    const filmScroll = document.getElementById('film-scrollbox');
    const plotScroll = document.getElementById('plot_box');
    const castScroll = document.getElementById('cast_box');
    const genreScroll = document.getElementById('genre_box');
    const crewScroll = document.getElementById('crew_box');

    var user_id = filmScroll.getAttribute('data-id');

    var films = await getRecommendedFilms(user_id);

    console.log(films)
    console.log(films.length)

    if (films.combined_films.length > 0) {
        filmScroll.innerHTML = await loadBulkFilms(films.combined_films);
        plotScroll.innerHTML = await loadCategoryFilms(films.plot_films, 'plot');
        castScroll.innerHTML = await loadCategoryFilms(films.cast_films, 'cast');
        genreScroll.innerHTML = await loadCategoryFilms(films.genre_films, 'genres');
        crewScroll.innerHTML = await loadCategoryFilms(films.crew_films, 'crew');

    } else {
        filmScroll.innerHTML = `<span> your profile is empty </span>`;
    }


    // update the displayed film
    async function loadBulkFilms(films) {

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

            content += `<div class="film-card">`

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
            const formatted_genre = film.genres.split(',').map(genre => genre.trim()).join(', ');
            content += `<p class="film-genre">${formatted_genre}</p>`
            content += `<span class="film-cast">${film.cast}</span>`
            content += `</div>`
            content += `</div>`

        });

        return content;

    };

    async function loadCategoryFilms(films, category) {

        var content = "";

        films.forEach(function (film) {

            content += `<div class="small-film-card">`
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


    document.getElementById('page_title').addEventListener('click', function () {
        window.location.href = '/index';
    });


};






