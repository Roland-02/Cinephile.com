
async function refreshFilms(user_id) {
    try {
        const response = await axios.post(`http://localhost:8080/shuffleFilms?user_id=${user_id}`);
        return response.data
    } catch (error) {
        console.error('Error shuffling films')
    }

};

async function getSearchFilms(query, page = 1) {

    try {
        // Send all the queries to the server using Axios
        var response = await axios.get(`http://127.0.0.1:8081/search_general?query=${query}&page=${page}`)
        var films = response.data.films;
        return films;
    } catch (error) {
        console.error('Error sending queries:', error);
    }

};

window.onload = async function () {

    const posterContainer = document.getElementById('search-films');
    const searchForm = document.getElementById('searchForm');
    const user_id = posterContainer.getAttribute('data-id');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';
    const urlParams = new URLSearchParams(window.location.search);
    const queryName = urlParams.get('query');

    var scrollPage = 1;
    var allQueries = [];

    if (queryName && queryName.trim() !== '') {
        await handleFormSubmission(queryName)
    };


    async function displaySearchFilms(films) {
        var content = '';
        console.log(films)

        films.forEach(function (film) {
            content += `<figure class="poster-wrapper clickable" data-id="${film.tconst}">
                <figcaption class="caption">
                    <p>Released: <strong> ${film.startYear} </strong> </p>
                    <p>Genre: <strong> ${film.genres} </strong> </p>
                    <p>Starring: <strong> ${film.cast} </strong> </p>
                    <p>${film.plot}</p>                    
                </figcaption>
                <img class="film-poster" src="${baseImagePath}${film.poster}" alt="${film.primaryTitle}">
                </figure>
            `;
        });

        posterContainer.innerHTML = content;

        // add event listener so film opens on index page when clicked
        document.querySelectorAll('.clickable').forEach(function (element) {
            element.addEventListener('click', async function () {

                try {
                    const tconst = this.dataset.id;

                    // Find the index of the film in the allFilms dataset
                    const filmIndex = films.findIndex(film => film.tconst === tconst);

                    // Calculate the page number to which the film belongs
                    const page = Math.floor(filmIndex / 100) + 1;

                    // Calculate the currentIndex within the page
                    const startIndex = (page - 1) * 100;
                    const currentIndex = filmIndex - startIndex;

                    // Calculate the counter
                    const counter = filmIndex;

                    localStorage.setItem('counter', counter);
                    localStorage.setItem('currentIndex', currentIndex);
                    localStorage.setItem('films-source', JSON.stringify(films))
                    window.location.href = '/index';

                } catch (error) {
                    console.error('Error:', error);

                };

            });
        });

    };


    // Function to display the search query
    async function displaySearchQuery(query) {
        // Create a new div element to display the search query
        var content = `<div class="alert alert-info p-2 m-1" id="saved-query-box">${query}
            <button type="button" class="btn-close queryClose" aria-label="Close"></button>
            </div>`;

        // Append the HTML content to the searchQueries container
        document.getElementById('searchQueries').innerHTML += content;

    };


    async function deleteQuery(button) {
        var alertBox = button.parentElement;
        var query = alertBox.textContent.trim();
        alertBox.remove();

        allQueries = allQueries.filter(item => item !== query)

        // clear url
        window.history.pushState({}, document.title, window.location.pathname);

        await updateQueryFilms();

    };

    async function handleFormSubmission(query) {
        if (!(query === "")) {
            document.getElementById('searchInput').value = "";
            await displaySearchQuery(query);
            allQueries.push(query.trim());
            await updateQueryFilms();
        }
    }

    // Add event listener to the search form
    searchForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission behavior
        var searchQuery = document.getElementById('searchInput').value.trim();
        await handleFormSubmission(searchQuery);
    });

    document.getElementById('searchQueries').addEventListener('click', function (event) {
        // Check if the clicked element is a close button
        if (event.target.classList.contains('btn-close')) {
            // If it's a close button, call the deleteQuery function
            deleteQuery(event.target);
        }
    });

    async function updateQueryFilms(page = 1) {
        var concatenatedQueries = allQueries.join(', ');

        var films = await getSearchFilms(concatenatedQueries, page);
        if (films.length > 0) {
            await displaySearchFilms(films);

        } else {
            console.log('no films');
            posterContainer.innerHTML = ``;

        }
    };

    window.addEventListener('scroll', async function () {
        // Calculate the distance between the bottom of the page and the current scroll position
        let distanceToBottom = document.documentElement.offsetHeight - (window.scrollY + window.innerHeight);

        if (distanceToBottom <= 10) {
            // Load more films
            scrollPage++;
            await updateQueryFilms(scrollPage);
        }

    });


    document.getElementById('page_title').addEventListener('click', async function () {
        const shuffle = await refreshFilms(user_id)
        localStorage.setItem('counter', 0);
        localStorage.setItem('currentIndex', 0);
        localStorage.removeItem('films-source');
        window.location.href = '/';

    });



}

