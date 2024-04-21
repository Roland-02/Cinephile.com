
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

};


window.onload = async function () {

    const postersBox = document.getElementById('watchlist-films');
    const user_id = postersBox.getAttribute('data-id');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';

    var films = await getWatchlist(user_id);

    if (films.length > 0) {
        await displayWatchlist(films);

    } else {
        postersBox.innerHTML = `<img class="notFound" src="./images/NotFound_Rocketman.png" alt="Watchlist is empty">`;

    }


    async function displayWatchlist(films) {
        content = '';

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

            content += `<figure class="poster-wrapper clickable" data-id="${film.tconst}">
                    <figcaption class="caption">
                        <p>Released: <strong> ${film.startYear} </strong></p>
                        <p>Runtime: <strong>${time}</strong></p>
                        <p>Rating: <strong>${film.averageRating}</strong></p>
                        <p>Genre: <strong> ${film.genres} </strong></p>
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