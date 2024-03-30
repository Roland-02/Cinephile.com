//HANDLE FILM INFO RENDERING ON FRONTEND, CAROUSEL NAVIGATION

//load next batch of films
async function getFilms(counter) {
    //load batch of films from file
    var films = '';
    try {
        page = Math.floor((counter / MAX_LOAD)) + 1;

        //request to the films API with the current page
        const response = await fetch(`http://localhost:8080/indexPageFilms?page=${page}`);
        if (response.ok) {
            films = await response.json();
        }

    } catch (error) {
        console.error('Error fetching films:', error);
    }
    return films
};

async function refreshFilms(user_id) {
    try {
        const response = await axios.post(`http://localhost:8080/shuffleFilms?user_id=${user_id}`);
        return response.data
    } catch (error) {
        console.error('Error shuffling films')
    }

}

async function getFilmsLength() {
    try {
        //request to the films API with the current page
        const response = await fetch(`http://localhost:8080/datasetLength`);
        const data = await response.json()
        return data

    } catch (error) {
        console.error('Error:', error);
        return null;
    }
    return films
}

//number of films loaded into frontend at a time - .env
const MAX_LOAD = 100;
let LAST_INDEX = 0;
window.onload = async function () {

    const filmsLength = await getFilmsLength();  
    LAST_INDEX = filmsLength;
    
    //initialise html elements
    const filmInfo = document.getElementById('film-info');
    const filmPoster = document.getElementById('film-poster');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');

    //track position in current load
    var currentIndex = 0;
    //track position in whole db
    var counter = 0;
    //stop processes overlapping
    var isClickLocked = false;

    //initialize counter and currentIndex with saved values
    var savedCounter = localStorage.getItem('counter');
    var savedIndex = localStorage.getItem('currentIndex');
    if (savedCounter && savedIndex) {
        counter = parseInt(savedCounter);
        currentIndex = parseInt(savedIndex);
    }

    var films = await getFilms(counter); //read in new load batch

    //for getting film poster jpegs
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';

    var user_id = document.getElementById('film-info').getAttribute('data-id')

    //initial update
    updateFilm();

    //Function to update the displayed film
    async function updateFilm() {

        //save current position to cache
        localStorage.setItem('counter', counter);
        localStorage.setItem('currentIndex', currentIndex);

        //disable prev button if counter is 0
        prevButton.disabled = counter === 0;

        var content = "";

        //load in next batch of films
        if ((currentIndex % MAX_LOAD) == 0) {
            films = await getFilms(counter); //read in new load batch

            if (counter % MAX_LOAD == 0) {
                currentIndex = 0; //first position in new load batch

            } else {
                currentIndex = MAX_LOAD - 1; //last position in previous load batch
            }

        }



        //trigger event in index.ejs jquery
        filmInfo.setAttribute('data-tconst', films[currentIndex].tconst);
        const event = new CustomEvent('updateFilm', { detail: films[currentIndex].tconst });
        document.dispatchEvent(event);

        //only allow page interaction if user is signed in
        var likeable = user_id != null ? 'likeable' : ''; //add the class only if writer is not null

        //film title and plot
        content += `<div id="_filmTitle" class="${likeable}"><strong>${films[currentIndex].primaryTitle}</strong></div>`;

        if (films[currentIndex].plot) {
            content += `<div id="_filmPlot" class="small-text py-1 overflow-scroll mb-2 ${likeable}" style="height: 60px; cursor: pointer;"> <p> ${films[currentIndex].plot} </p> </div>`;

        } else {
            content += `<div> <p> - </p> </div>`;
        }
        //END film title and plot


        //rating, genre, runtime
        content += `<div class="row d-flex">`;

        //rating
        content += `<div id="_filmRating" class="col-lg col-md col-sm border border-3 mx-3 px-1 ${likeable}">
                        <div class="h5 mb-2 border-bottom">RATING</div>`;

        if (films[currentIndex].averageRating) {
            content += `<div class="p text-center">${films[currentIndex].averageRating}</div>`;
        } else {
            content += `<div class="p text-center">-</div>`;
        }
        content += `</div>`;

        //genre
        content += `<div id="_filmGenre" class="col-lg col-md col-sm border border-3 mx-3 px-1 ${likeable}">
                        <div class="h5 mb-2 border-bottom">GENRE</div> 
                        <div class="list-unstyled" style="font-size: 18px;">`;

        const genreArray = films[currentIndex].genres.split(',');
        for (const genre of genreArray) {
            content += `<li>${genre}</li>`;
        }

        content += `</div></div>`;

        //runtime
        content += `<div id="_filmRuntime" class="col-lg col-md col-sm border border-3 mx-3 px-1 ${likeable}"> 
                    <div class="h5 mb-2 border-bottom">RUNTIME</div>`;

        //display time in hr/min
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
        content += `<div id="_filmYear" class="col-lg col-md col-sm border border-3 mx-3 px-1 ${likeable}">
                        <div class="h5 mb-2 border-bottom">YEAR</div> 
                        <div class="p text-center"> ${films[currentIndex].startYear} </div>
                    </div>`;

        content += `</div></div>`;
        //END rating, genre, runtime, year


        //cast
        //shuffle actors and actresses
        var cast = films[currentIndex].cast.split(',');

        content += `<div class="col-lg col-md col-sm-12 py-3">
                        <div class="h5 text-center">CAST</div>
                        <div class="container px-1">
                            <div class="d-flex justify-content-center">`;


        for (const actor of cast) {
            content += `<div id="${actor}" class="actor d-flex align-items-center ${likeable} cast">
                            <span class="px-1">|</span>
                            <span class="medium-text"> ${actor} </span>
                            <span class="px-1">|</span>
                        </div>`;
        }

        content += `</div></div></div>`;
        //END cast


        //director, cinematographer, writer
        // director
        content += `<div class="row d-flex justify-content-center py-2">`;

        content += `<div class="row d-flex py-2">`;

        var director = films[currentIndex].director || null;
        likeable = director != null && user_id != null ? 'likeable' : ''; //add the class only if director is not null

        content += `<div id="_filmDirector" class="col-lg col-md col-sm border border-3 mx-2 px-1 ${likeable}">
                    <div class="h5 mb-2 border-bottom">DIRECTOR</div>`;

        var directorNames = director.split(','); // Split the director names by comma
        directorNames.forEach(name => {
            content += `<div class="p medium-text text-center">${name.trim()}</div>`; // Trim to remove any leading or trailing whitespace
        });
        content += `<p></p>`;

        content += `</div>`;

        //cinematographer
        var cinematographer = films[currentIndex].cinematographer || null;
        likeable = cinematographer != null && user_id != null ? 'likeable' : ''; //add the class only if director is not null

        content += `<div id="_filmDirector" class="col-lg col-md col-sm border border-3 mx-2 px-1 ${likeable}">
                    <div class="h5 mb-2 border-bottom">CAMERA</div>`;

        var cinematographerNames = cinematographer.split(','); // Split the director names by comma
        cinematographerNames.forEach(name => {
            content += `<div class="p medium-text text-center">${name.trim()}</div>`; // Trim to remove any leading or trailing whitespace
        });
        content += `<p></p>`;

        content += `</div>`;

        //writer
        var writer = films[currentIndex].writer || null;
        likeable = writer != null && user_id != null ? 'likeable' : ''; //add the class only if director is not null

        content += `<div id="_filmDirector" class="col-lg col-md col-sm border border-3 mx-2 px-1 ${likeable}">
                    <div class="h5 mb-2 border-bottom">WRITER</div>`;

        var writerNames = writer.split(','); // Split the director names by comma
        writerNames.forEach(name => {
            content += `<div class="p medium-text text-center">${name.trim()}</div>`; // Trim to remove any leading or trailing whitespace
        });
        content += `<p></p>`;

        content += `</div>`;

        content += `</div>`;

        //END director, cinematographer, writer


        //producer, editor, composer
        content += `<div class="row d-flex py-2">`;

        //producer
        var producer = films[currentIndex].producer || null;
        likeable = producer != null && user_id != null ? 'likeable' : ''; //add the class only if director is not null

        content += `<div id="_filmDirector" class="col-lg col-md col-sm border border-3 mx-2 px-1 ${likeable}">
                    <div class="h5 mb-2 border-bottom">PRODUCER</div>`;

        var producerNames = producer.split(','); // Split the director names by comma
        producerNames.forEach(name => {
            content += `<div class="p medium-text text-center">${name.trim()}</div>`; // Trim to remove any leading or trailing whitespace
        });
        content += `<p></p>`;

        content += `</div>`;

        //editor
        var editor = films[currentIndex].editor || null;
        likeable = editor != null && user_id != null ? 'likeable' : ''; //add the class only if director is not null

        content += `<div id="_filmDirector" class="col-lg col-md col-sm border border-3 mx-2 px-1 ${likeable}">
                    <div class="h5 mb-2 border-bottom">EDITOR</div>`;

        var editorNames = editor.split(','); // Split the director names by comma
        editorNames.forEach(name => {
            content += `<div class="p medium-text text-center">${name.trim()}</div>`; // Trim to remove any leading or trailing whitespace
        });
        content += `<p></p>`;

        content += `</div>`;

        //composer
        var composer = films[currentIndex].composer || null;
        likeable = composer != null && user_id != null ? 'likeable' : ''; //add the class only if director is not null

        content += `<div id="_filmDirector" class="col-lg col-md col-sm border border-3 mx-2 px-1 ${likeable}">
                    <div class="h5 mb-2 border-bottom">COMPOSER</div>`;

        var composerNames = composer.split(','); // Split the director names by comma
        composerNames.forEach(name => {
            content += `<div class="p medium-text text-center">${name.trim()}</div>`; // Trim to remove any leading or trailing whitespace
        });
        content += `<p></p>`;

        content += `</div>`;

        content += `</div>`;
        //END producer, editor, composer


        //display all film data
        filmInfo.innerHTML = content;

        //display film poster
        if (films[currentIndex].poster) {
            var imagePath = baseImagePath + films[currentIndex].poster;
            filmPoster.innerHTML = `<img src="${imagePath}" alt="${films[currentIndex].primaryTitle}">`;
        } else {
            filmPoster.innerHTML = `<img src="/images/MissingPoster.jpeg" alt="Poster Not Available">`;
        }

        //prevent spam clicking
        isClickLocked = false;

    };

    //handle next film action
    const handleNextAction = async () => {
        if (!isClickLocked) {
            isClickLocked = true;

            if (counter < LAST_INDEX - 1) {
                currentIndex++;
                counter++;
            }

            // Clicking forwards to next load
            if (currentIndex % MAX_LOAD == 0) {
                page++;
            }

            updateFilm();
        }
    };

    //handle previous film action
    const handlePrevAction = async () => {
        if (!isClickLocked && !prevButton.disabled) {
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
    };

    //next button
    nextButton.addEventListener('click', handleNextAction);

    //prev button
    prevButton.addEventListener('click', handlePrevAction);

    //carousel navigation with keys
    document.addEventListener('keydown', function (event) {

        switch (event.key) {
            case 'ArrowRight':
                handleNextAction();
                break;
            case 'ArrowUp':
                handleNextAction();
                break;
            case 'ArrowLeft':
                handlePrevAction();
                break;
            case 'ArrowDown':
                handlePrevAction();
                break;
        }

    });


    // click title bar to refresh - shuffle films, reset counter, reload page
    document.getElementById('page_title').addEventListener('click', async function () {
        const shuffle = await refreshFilms(user_id)
        localStorage.setItem('counter', 0);
        localStorage.setItem('currentIndex', 0);
        window.location.href = '/';

    });



};






