async function getWatchlist(user_id) {
    try {
        const response = await $.ajax({
            url: `http://127.0.0.1:5000/get_user_watchlist?user_id=${user_id}`,
            method: 'GET'
        });
        console.log(response);
        return response.watchlist;
    } catch (error) {
        console.error('Error getting watchlist', error);
        return null;
    }
}


window.onload = async function () {

    const postersBox = document.getElementById('watchlist-films');
    const user_id = postersBox.getAttribute('data-id');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';

    var films = await getWatchlist(user_id);
    console.log(films)

    if(films){
        await displayWatchlist(films);

    }else{
        postersBox.innerHTML = `<p style="text-align: center; font-size: 20px">...</p>`;
    }

    async function displayWatchlist(films){
        content = '';

        films.forEach(function (film) {
            if (film.poster) {
                content += `<img class="film-poster clickable" data-id="${film.tconst}" src="${baseImagePath + film.poster}" alt="${film.title}">`;

            } else {
                content += `<img class="film-poster clickable" data-id="${film.tconst}" src="/images/MissingPoster.jpeg" alt="Poster Not Available">`;
            }
        });

        postersBox.innerHTML = content;

    }

    // click title bar to go home
    document.getElementById('page_title').addEventListener('click', function () {
        window.location.href = '/index';
    });


};