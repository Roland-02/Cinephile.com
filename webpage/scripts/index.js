//move all api calls to server side


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

//theMovieDB api call for film credits
function FetchCredits(film_id) {
    const url = `https://api.themoviedb.org/3/movie/${film_id}/credits?language=en-US`
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

async function getFilms(counter) {
    //load batch of films from file

    var films = '';
    try {
        page = Math.floor((counter / MAX_LOAD)) + 1;

        //request to the films API with the current page
        const response = await fetch(`http://localhost:8080/films?page=${page}`);
        if (response.ok) {
            films = await response.json();
        }

    } catch (error) {
        console.error('Error fetching films:', error);
    }

    return films
};


//number of films loaded into frontend at a time - .env
const MAX_LOAD = 100;

window.onload = async function () {

    //initialise html element
    const filmTitle = document.getElementById('film-title');
    const filmPoster = document.getElementById('film-poster');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');

    //track position in current load
    var currentIndex = 0;
    //track position in whole db
    var counter = 0;
    //stop processes overlapping
    var isClickLocked = false;

    //for getting film poster jpegs
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';

    //initial update
    updateFilm();


    //Function to update the displayed film
    async function updateFilm() {

        //load in next batch of films
        if ((currentIndex % MAX_LOAD) == 0) {
            films = await getFilms(counter); //read in new load batch

            if (counter % MAX_LOAD == 0) {
                currentIndex = 0; //first position in new load batch

            } else {
                currentIndex = MAX_LOAD - 1; //last position in previous load batch
            }
        }
  

        var content = "";

        console.log(films[currentIndex])

        //film title and plot
        content += `<strong>${films[currentIndex].primaryTitle}</strong> <br>`;

        if (films[currentIndex].plot) {
            content += `<div class="small-text py-2 overflow-scroll mb-3" style="height: 70px;"> <p> ${films[currentIndex].plot} </p> </div>`;

        } else { //api doesn't have film, display from csv
            content += `<div> <p> - </p> </div>`;

        }
        //END film title and plot


        //rating, genre, runtime
        content += `<div class="row d-flex">`;

        //rating
        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                        <div class="h5 mb-2 border-bottom">RATING</div>`;

        if (films[currentIndex].averageRating) {
            content += `<div class="p text-center">${films[currentIndex].averageRating}</div>`;
        } else {
            content += `<div class="p text-center">-</div>`;
        }
        content += `</div>`;

        //genre
        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                        <div class="h5 mb-2 border-bottom">GENRE</div> 
                        <div class="list-unstyled" style="font-size: 18px;">`;

        const genreArray = films[currentIndex].genres.split(',');
        for (const genre of genreArray) {
            content += `<li>${genre}</li>`;
        }

        content += `</div></div>`;

        //runtime
        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1"> 
                    <div class="h5 mb-2 border-bottom">RUNTIME</div>`;

        if (films[currentIndex].runtimeMinutes !== "\\N") {
            const hours = Math.floor(films[currentIndex].runtimeMinutes / 60);
            const minutes = films[currentIndex].runtimeMinutes % 60;

            if (hours > 0 && minutes > 0) {
                content += `<div class="p text-center">${hours}h ${minutes}m</div>
                            <p></p>`;

            } else if (hours > 0) {
                content += `<div class="p text-center">${hours}h</div>
                            <p></p>`;

            } else if (minutes > 0) {
                content += `<div class="p text-center">${minutes}m</div>
                            <p></p>`;
            }

        } else {
            content += `<div class="p text-center">-</div>
                        <p></p>`;
        }

        content += `</div>`;

        //release year
        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                        <div class="h5 mb-2 border-bottom">YEAR</div> 
                        <div class="p text-center"> ${films[currentIndex].startYear} </div>
                    </div>`;

        content += `</div></div>`;
        //END rating, genre, runtime, year


        //cast
        //shuffle actors and actresses
        var cast = [];
        const actorArray = films[currentIndex].actor.split(',');
        for (const actor of actorArray) {
            if (actor.trim() !== "") {
                cast.push(actor.trim());
            }
        }
        const actressArray = films[currentIndex].actress.split(',');
        for (const actress of actressArray) {
            if (actress.trim() !== "") {
                cast.push(actress.trim());
            }
        }
        cast.sort(() => Math.random() - 0.5);

        content += `<div class="col-lg col-md col-sm-12 py-3">
                        <div class="h5 text-center">CAST</div>
                        <div class="container px-1">
                            <div class="d-flex justify-content-center">`;

        if (cast.length > 0) {
            for (const actor of cast) {
                content += `<div class="actor d-flex align-items-center">
                            <span class="px-1">|</span>
                            <span class="medium-text"> ${actor} </span>
                            <span class="px-1">|</span>
                        </div>`;
            }
        } else {
            content += `<div class="actor d-flex align-items-center">
                            <span class="medium-text"> - </span>
                        </div>`;
        }
        content += `</div></div></div>`;
        //END cast


        //director, cinematographer, writer
        content += `<div class="row d-flex py-2">`;

        //director
        var director = films[currentIndex].director || null;

        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                    <div class="h5 mb-2 border-bottom">DIRECTOR</div>`;

        if (director != null) {
            content += `<div class="p medium-text text-center">${director}</div>
                        <p></p>`;
        } else {
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`;
        }
        content += `</div>`;

        //cinematographer
        var camera = films[currentIndex].cinematographer || null;

        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                    <div class="h5 mb-2 border-bottom">CAMERA</div>`;

        if (camera != null) {
            content += `<div class="p medium-text text-center">${camera}</div>
                        <p></p>`;
        } else {
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`;
        }
        content += `</div>`;

        //writer
        var writer = films[currentIndex].writer || null;

        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                    <div class="h5 mb-2 border-bottom">WRITER</div>`;

        if (writer != null) {
            content += `<div class="p medium-text text-center">${writer}</div>
                        <p></p>`;
        } else {
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`;
        }
        content += `</div>`;

        content += `</div>`;
        //END director, cinematographer, writer


        //producer, editor, composer
        content += `<div class="row d-flex py-4">`;

        //producer
        var producer = films[currentIndex].producer || null;

        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                    <div class="h5 mb-2 border-bottom">PRODUCER</div>`;

        if (producer != null) {
            content += `<div class="p medium-text text-center">${producer}</div>
                        <p></p>`;
        } else {
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`;
        }
        content += `</div>`;

        //editor
        var editor = films[currentIndex].editor || null;

        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                    <div class="h5 mb-2 border-bottom">EDITOR</div>`;

        if (editor != null) {
            content += `<div class="p medium-text text-center">${editor}</div>
                        <p></p>`;
        } else {
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`;
        }
        content += `</div>`;

        //composer
        var composer = films[currentIndex].composer || null;

        content += `<div class="col-lg col-md col-sm border border-3 mx-3 px-1">
                    <div class="h5 mb-2 border-bottom">SOUNDTRACK</div>`;

        if (composer != null) {
            content += `<div class="p medium-text text-center">${composer}</div>
                        <p></p>`;
        } else {
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`;
        }
        content += `</div>`;

        content += `</div>`;
        //END producer, editor, composer


        //display all film data
        filmTitle.innerHTML = content;


        //display film poster

        if (films[currentIndex].poster) {
            var imagePath = baseImagePath + films[currentIndex].poster;
            filmPoster.innerHTML = `<img src="${imagePath}" alt="${films[currentIndex].primaryTitle}">`;
        } else {
            filmPoster.innerHTML = `<img src="/images/MissingPoster.jpeg" alt="Poster Not Available">`;
        }


        //prevent spam clicking
        isClickLocked = false;

    }


    //previous button
    prevButton.addEventListener('click', async function () {

        if (!isClickLocked) {
            isClickLocked = true;

            if (currentIndex == 0 && counter != 0) {
                currentIndex = MAX_LOAD;
                page--;

            } else { //clicking backwards normally
                currentIndex--;
            }

            counter--;

            //prevent counters becoming negative
            if (currentIndex < 0) { currentIndex = 0; }
            if (counter < 0) { counter = 0; }

            updateFilm();
        }

    });


    //next button
    nextButton.addEventListener('click', async function () {

        if (!isClickLocked) {
            isClickLocked = true;

            currentIndex++;
            counter++;

            //clicking forwards to next load
            if (currentIndex % MAX_LOAD == 0) {
                page++;
            }

            updateFilm();
        }

    });


};



