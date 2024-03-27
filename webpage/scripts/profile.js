async function getLovedFilms(user_id) {
    try {
        const response = await axios.get(`http://localhost:8080/getLovedFilmsDetails?user_id=${user_id}`)
        const lovedFilms = response.data.films;
        return lovedFilms;

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;
    }

};


async function getProfileStats(user_id) {
    try {
        const response = await axios.get(`http://localhost:8080/getProfileStats?user_id=${user_id}`)
        const message = response.data.message;
        console.log(message)

        if (message) {
            var cast = response.data.cast;
            var crew = response.data.crew;
            var genre = response.data.genre
            return { cast, crew, genre }
        } else {
            return null;
        }

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;

    }

}



window.onload = async function () {

    const postersBox = document.getElementById('loved-films');
    const actorBox = document.getElementById('cast-box');
    const crewBox = document.getElementById('crew-box');
    const genreBox = document.getElementById('genre-box');

    const user_id = postersBox.getAttribute('data-id');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';



    var films = await getLovedFilms(user_id);

    //initial update
    if (films.length > 0) {
        await displayLovedFilmPosters(films);

        var stats = await getProfileStats(user_id)
        if (stats) {
            var cast = stats.cast;
            var crew = stats.crew;
            var genre = stats.genre;

            actorBox.innerHTML = await displayStats(cast);
            crewBox.innerHTML =  await displayStats(crew);
            genreBox.innerHTML =  await displayStats(genre);

        } else {
            console.log('no stats')
        }

    } else {
        console.log('no films')
    }


    //Function to update the displayed film
    async function displayLovedFilmPosters(films) {
        content = '';


        films.forEach(function (film) {
            if (film.poster) {
                content += `<img class="film-poster clickable" data-id="${film.tconst}" src="${baseImagePath + film.poster}" alt="${film.title}">`;

            } else {
                content += `<img class="film-poster clickable" data-id="${film.tconst}" src="/images/MissingPoster.jpeg" alt="Poster Not Available">`;
            }
        });


        postersBox.innerHTML = content;



    };

    async function displayStats(category) {
        let content = '';
        content += '<ol class="column-list">';
        category.forEach(function (name) {
            content += `<li>${name}</li>`;
        });
        content += '</ol>';
        return content;
    }






    document.getElementById('page_title').addEventListener('click', function () {
        // Redirect to the index page
        window.location.href = '/index';
    });

};






