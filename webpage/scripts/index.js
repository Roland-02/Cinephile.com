//theMovieDB stuff

function Fetch(film_id) {
    const url = `https://api.themoviedb.org/3/movie/${film_id}/images`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmYxZTkxOWFjMDBkYmI2NjhjODVlODg5ZWJjZTg1ZCIsInN1YiI6IjY1OGIwNzEyMzI1YTUxNTkyNzAxNWU4OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.yKZIOsVYvJxzRO3GJ1yayqvSCZg3l-ryO9FjBkfHIZc'
        }
    };
    return fetch(url, options)
        .then(res => res.json())
        .catch(err => console.error('error:' + err));
};


window.onload = function () {
    const filmTitle = document.getElementById('film-title');
    const filmPoster = document.getElementById('film-poster');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');

    var films = JSON.parse(document.getElementById('film-carousel').getAttribute('data'));
    var currentIndex = 0;


    const baseImagePath = 'https://image.tmdb.org/t/p/w500'; 

  



    // Initial update
    updateFilm();

    // Function to update the displayed film
    async function updateFilm() {
        filmTitle.innerHTML = `<strong>${films[currentIndex].primaryTitle}</strong> <br><p></p>`;

        var filmImage = await Fetch(films[currentIndex].tconst);
        var imagePath = baseImagePath + filmImage.posters[0].file_path;

        filmPoster.innerHTML = `<img src="${imagePath}" alt="Movie Poster">`;

    }

    // Event listener for the previous button
    prevButton.addEventListener('click', function () {
        currentIndex = (currentIndex - 1);
        if (currentIndex < 0) { currentIndex = 0; }
        updateFilm();
    });

    // Event listener for the next button
    nextButton.addEventListener('click', function () {
        currentIndex = (currentIndex + 1);
        updateFilm();
    });

};