async function getLovedFilms(user_id) {
    try {
        const response = await axios.get(`http://localhost:8080/getLovedFilmsDetails?user_id=${user_id}`)
        const lovedFilms = response.data.films;
        console.log(lovedFilms)
        return lovedFilms;

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;
    }

};



window.onload = async function () {

    const postersBox = document.getElementById('loved-films');
    const user_id = postersBox.getAttribute('data-id');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';

    var films = await getLovedFilms(user_id);

    //initial update
    if (films.length > 0) {
       lovedFavouriteFilmPosters(films);

    } else {
        console.log('no films')
    }


    //Function to update the displayed film
    async function lovedFavouriteFilmPosters(films) {
        content = '';

    
        films.forEach(function (film) {
            content += `<img class="film-poster" src="${baseImagePath + film.poster}" alt="${film.title}">`;
        });
    
    
        postersBox.innerHTML = content;

    };



    document.getElementById('page_title').addEventListener('click', function () {
        // Redirect to the index page
        window.location.href = '/index';
    });

};






