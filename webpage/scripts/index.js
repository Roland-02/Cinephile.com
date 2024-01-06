//theMovieDB api call for film poster
function FetchImage(film_id) {
    const url = `https://api.themoviedb.org/3/movie/${film_id}/images`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmYxZTkxOWFjMDBkYmI2NjhjODVlODg5ZWJjZTg1ZCIsInN1YiI6IjY1OGIwNzEyMzI1YTUxNTkyNzAxNWU4OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.yKZIOsVYvJxzRO3GJ1yayqvSCZg3l-ryO9FjBkfHIZc'
        }
    };
    return fetch(url, options)
        .then(res => {
            return res.json();
        })
        .catch(err => {
            console.error('Error fetching data:', err);
            return null;
        });
};

//theMovieDB api call for film data
function FetchData(film_id) {
    const url = `https://api.themoviedb.org/3/movie/${film_id}`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmYxZTkxOWFjMDBkYmI2NjhjODVlODg5ZWJjZTg1ZCIsInN1YiI6IjY1OGIwNzEyMzI1YTUxNTkyNzAxNWU4OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.yKZIOsVYvJxzRO3GJ1yayqvSCZg3l-ryO9FjBkfHIZc'
        }
    };
    return fetch(url, options)
        .then(res => {
            if (res.ok) {
                return res.json().then(data => ({ success: true, data }));
            } else {
                return res.json().then(error => ({ success: false, error }));
            }
        })
        .catch(err => {
            console.error('Error fetching data:', err);
            return null;
        });

};

window.onload = function () {
    //initialise html element
    const filmTitle = document.getElementById('film-title');
    const filmPoster = document.getElementById('film-poster');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');

    //read in film data file
    var films = JSON.parse(document.getElementById('film-carousel').getAttribute('data'));
    var currentIndex = 0;

    //for getting film poster jpegs
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';

    //Initial update
    updateFilm();

    //Function to update the displayed film
    async function updateFilm() {
        var filmData = await FetchData(films[currentIndex].tconst);
    
        //display film info from api
        if(filmData.success){
            filmTitle.innerHTML = `<strong>${filmData.data.title}</strong> <br>`;
            filmTitle.innerHTML += `<div class="text-sm-center"> <p> ${filmData.data.overview} </p> </div>`;

        }else{ //api doesn't have film, display from csv
            filmTitle.innerHTML = `<strong>${films[currentIndex].primaryTitle}</strong> <br>`;
            filmTitle.innerHTML += `<div> <p> - </p> </div>`;

        }

     
        //display film poster
        var filmImage = await FetchImage(films[currentIndex].tconst);
        if (filmImage && filmImage.posters && filmImage.posters.length > 0) {
            var imagePath = baseImagePath + filmImage.posters[0].file_path;
            filmPoster.innerHTML = `<img src="${imagePath}" alt="${films[currentIndex].primaryTitle}">`;
        } else {
            filmPoster.innerHTML = `<img src="/images/MissingPoster.jpeg" alt="Poster Not Available">`;
        }

    }


    //previous button
    prevButton.addEventListener('click', function () {
        currentIndex--;
        if (currentIndex < 0) { currentIndex = 0; }
        updateFilm();
    });


    //next button
    nextButton.addEventListener('click', function () {
        currentIndex++;
        updateFilm();
    });


};