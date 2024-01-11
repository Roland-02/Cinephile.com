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

        //display film poster
        var filmImage = await FetchImage(films[currentIndex].tconst);
        if (filmImage && filmImage.posters && filmImage.posters.length > 0) {
            var imagePath = baseImagePath + filmImage.posters[0].file_path;
            filmPoster.innerHTML = `<img src="${imagePath}" alt="${films[currentIndex].primaryTitle}">`;
        } else {
            filmPoster.innerHTML = `<img src="/images/MissingPoster.jpeg" alt="Poster Not Available">`;
        }

        var filmData = await FetchData(films[currentIndex].tconst);

        var content = "";

        //film title and plot
        if (filmData.success && filmData.data.title.length > 0 && filmData.data.overview.length > 0) {
            content += `<strong>${filmData.data.title}</strong> <br>`;
            content += `<div class="small-text py-2 mb-1" style="max-height: 70px; overflow-y: auto;"> <p> ${filmData.data.overview} </p> </div>`;

        } else { //api doesn't have film, display from csv
            content += `<strong>${films[currentIndex].primaryTitle}</strong> <br>`;
            content += `<div> <p> - </p> </div>`;

        }
        //END film title and plot


        //rating, genre, runtime
        content += `<div class="row d-flex">`;

        //rating
        content += `<div class="col-md border border-3 mx-3">
                        <div class="h5 mb-2 border-bottom">RATING</div>`

        if (films[currentIndex].averageRating) {
            content += `<div class="p text-center">${films[currentIndex].averageRating}</div>`
        } else {
            content += `<div class="p text-center">-</div>`
        }
        content += `</div>`;

        //genre
        content += `<div class="col-md border border-3 mx-3">
                        <div class="h5 mb-2 border-bottom">GENRE</div> 
                        <div class="list-unstyled" style="font-size: 18px;">`;

        const genreArray = films[currentIndex].genres.split(',');
        for (const genre of genreArray) {
            content += `<li>${genre}</li>`;
        }

        content += `</div></div>`;

        //runtime
        content += `<div class="col-md border border-3 mx-3"> 
                    <div class="h5 mb-2 border-bottom">RUNTIME</div>`

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
        content += `<div class="col-sm border border-3 mx-3">
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

        content += `<div class="col-md-12 py-3">
                        <div class="h5 text-center">CAST</div>
                        <div class="container px-0">
                            <div class="d-flex justify-content-center">`

        if (cast.length > 0) {
            for (const actor of cast) {
                content += `<div class="actor d-flex align-items-center">
                            <span class="px-1">|</span>
                            <span class="medium-text"> ${actor} </span>
                            <span class="px-1">|</span>
                        </div>`
            }
        } else {
            content += `<div class="actor d-flex align-items-center">
                            <span class="medium-text"> - </span>
                        </div>`
        }
        content += `</div></div></div>`
        //END cast


        //director, cinematographer, writer
        content += `<div class="row d-flex py-2">`

        //director
        content += `<div class="col-sm border border-3 mx-3">
                    <div class="h5 mb-2 border-bottom">DIRECTED</div>`

        if (films[currentIndex].director != null) {
            content += `<div class="p medium-text text-center">${films[currentIndex].director}</div>
                        <p></p>`
        }else{
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`
        }
        content += `</div>`;

        //cinematographer
        content += `<div class="col-sm border border-3 mx-3">
                    <div class="h5 mb-2 border-bottom">FILMED</div>`

        if (films[currentIndex].cinematographer != null) {
            content += `<div class="p medium-text text-center">${films[currentIndex].cinematographer}</div>
                        <p></p>`
        }else{
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`
        }
        content += `</div>`;

        //writer
        content += `<div class="col-sm border border-3 mx-3">
                    <div class="h5 mb-2 border-bottom">WRITTEN</div>`

        if (films[currentIndex].writer != null) {
            content += `<div class="p medium-text text-center">${films[currentIndex].writer}</div>
                        <p></p>`
        }else{
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`
        }
        content += `</div>`;

        content += `</div>`
        //END director, cinematographer, writer


        //producer, editor, composer
        content += `<div class="row d-flex py-4">`

        //producer
        content += `<div class="col-sm border border-3 mx-3">
                    <div class="h5 mb-2 border-bottom">PRODUCED</div>`

        if (films[currentIndex].producer != null) {
            content += `<div class="p medium-text text-center">${films[currentIndex].producer}</div>
                        <p></p>`
        }else{
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`
        }
        content += `</div>`;

        //editor
        content += `<div class="col-sm border border-3 mx-3">
                    <div class="h5 mb-2 border-bottom">EDITED</div>`

        if (films[currentIndex].editor != null) {
            content += `<div class="p medium-text text-center">${films[currentIndex].editor}</div>
                        <p></p>`
        }else{
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`
        }
        content += `</div>`;

        //composer
        content += `<div class="col-sm border border-3 mx-3">
                    <div class="h5 mb-2 border-bottom">COMPOSED</div>`

        if (films[currentIndex].composer != null) {
            content += `<div class="p medium-text text-center">${films[currentIndex].composer}</div>
                        <p></p>`
        }else{
            content += `<div class="p medium-text text-center">-</div>
                        <p></p>`
        }
        content += `</div>`;

        content += `</div>`
        //END producer, editor, composer


        //production designer
        content += `<div class="row d-flex py-2 justify-content-center align-items-center">
                        <div class="col-md-6 border border-3 mx-3">
                        <div class="h5 mb-2 border-bottom">PRODUCTION DESIGNER</div>`

        if (films[currentIndex].production_designer != null) {
            content += `<div class="p medium-text text-center">${films[currentIndex].production_designer}</div>
                        </div>`
        }else{
            content += `<div class="p medium-text text-center">-</div>
                        </div>`
        }

        content += `</div>`
        //END production designer






        filmTitle.innerHTML = content;

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