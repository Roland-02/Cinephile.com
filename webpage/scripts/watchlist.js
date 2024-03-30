async function getWatchlist(user_id) {
    try {
        const response = await axios.get(`http://127.0.0.1:8081/get_user_watchlist?user_id=${user_id}`)
        const watchlist = response.data.watchlist;
        return watchlist;

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

    const postersBox = document.getElementById('watchlist-films');
    const user_id = postersBox.getAttribute('data-id');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';

    var films = await getWatchlist(user_id);

    if (films) {
        await displayWatchlist(films);

    } else {
        postersBox.innerHTML = `<p style="text-align: center; font-size: 20px">...</p>`;
    }

    async function displayWatchlist(films) {
        content = '';

        films.forEach(function (film) {
            content += `<figure class="poster-wrapper clickable" data-id="${film.tconst}">
                    <figcaption class="caption">
                        <p>Released: ${film.startYear}</p>
                        <p>Genre: ${film.genres}</p>
                        <p>${film.plot}</p>                    
                    </figcaption>
                    <img class="film-poster" src="${baseImagePath + film.poster}" alt="${film.title}">  
                    </figure>`;
        });

        postersBox.innerHTML = content;

    }

        // click title bar to refresh - shuffle films, reset counter, reload page
        document.getElementById('page_title').addEventListener('click', async function () {
            const shuffle = await refreshFilms(user_id)
            localStorage.setItem('counter', 0);
            localStorage.setItem('currentIndex', 0);
            window.location.href = '/';
    
        });
    
    


};