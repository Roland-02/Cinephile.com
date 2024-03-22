//HANDLE FILM INFO RENDERING ON FRONTEND, CAROUSEL NAVIGATION

//load next batch of films
async function getRecommendedFilms(user_id) {
    //load batch of films from file

    let films = '';
    try {

        // Fetch films data from the API
        const response = await fetch(`http://localhost:8080/recommendedFilms?user_id=${user_id}`);
        // films = response.data.films;
        if (response.ok) {
            films = await response.json();
        }

    } catch (error) {
        console.error('Error fetching films:', error);
    }

    return films
};

var films;
window.onload = async function () {

    //initialise html elements
    const filmScroll = document.getElementById('film-scrollbox');

    var user_id = filmScroll.getAttribute('data-id');

    var films = await getRecommendedFilms(user_id)
    console.log(films)
    //initial update
    loadBulkFilms();

    //Function to update the displayed film
    async function loadBulkFilms() {

        var content = "";

        films.forEach(function (film) {

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
            content += `<img src="https://image.tmdb.org/t/p/w500/${film.poster}" class="film-poster">`
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
            content += `<p class="film-genre">${film.genres}</p>`
            content += `<span class="film-cast">${film.cast}</span>`
            content += `</div>`
            content += `</div>`
            
        });

        filmScroll.innerHTML = content;

    };


    document.getElementById('page_title').addEventListener('click', function () {
        // Redirect to the index page
        window.location.href = '/index';
    });


};






