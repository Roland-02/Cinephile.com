async function getSearchFilms(query, page = 1) {

    try {
        // Send all the queries to the server using Axios
        var response = await axios.get(`http://127.0.0.1:8081/search_general?query=${query}&page=${page}`)
        var films = response.data.films;
        return films;
    } catch (error) {
        console.error('Error sending queries:', error);
    }

}


async function refreshFilms(user_id) {
    try {
        const response = await axios.post(`http://localhost:8080/shuffleFilms?user_id=${user_id}`);
        return response.data
    } catch (error) {
        console.error('Error shuffling films')
    }

}



window.onload = async function () {

    const posterContainer = document.getElementById('search-films');
    const user_id = posterContainer.getAttribute('data-id');
    const searchForm = document.getElementById('searchForm');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';
    var scrollPage = 1;
    var allQueries = [];


    async function updateQueryFilms(page = 1) {
        var concatenatedQueries = allQueries.join(', ');

        var films = await getSearchFilms(concatenatedQueries, page);
        if (films.length > 0) {
            await displaySearchFilms(films)
        } else {
            console.log('no films')
            posterContainer.innerHTML = `<p>.....</p>`
        }
    };


    async function displaySearchFilms(films) {
        var content = '';

        films.forEach(function (film) {
            content += `<figure class="poster-wrapper clickable" data-id="${film.tconst}">
                <figcaption class="caption">
                    <p>Released: ${film.startYear}</p>
                    <p>Genre: ${film.genres}</p>
                    <p>Starring: ${film.cast}</p>
                    <p>${film.plot}</p>                    
                </figcaption>
                <img class="film-poster" src="${baseImagePath}${film.poster}" alt="${film.primaryTitle}">
                </figure>
            `;
        });
        posterContainer.innerHTML = content;
    }


    // Function to display the search query
    async function displaySearchQuery(query) {
        // Create a new div element to display the search query
        var content = `<div class="alert alert-info p-2 m-1" id="saved-query-box">${query}
        <button type="button" class="btn-close queryClose" aria-label="Close"></button>
        </div>`;

        // Append the HTML content to the searchQueries container
        document.getElementById('searchQueries').innerHTML += content;

    }


    async function loadMoreFilms() {
        let filmScroll = this;

        if (filmScroll.scrollTop + filmScroll.clientHeight >= filmScroll.scrollHeight - 2) {
            scrollPage++;
            console.log(scrollPage)
            await updateQueryFilms(scrollPage)
        }
    }

    async function deleteQuery(button) {
        var alertBox = button.parentElement;
        var query = alertBox.textContent.trim();
        alertBox.remove();
        var index = allQueries.indexOf(query);
        if (index !== -1) {
            allQueries.splice(index, 1);
        }

        await updateQueryFilms();
    };

    posterContainer.addEventListener('scroll', loadMoreFilms);

    // Function to handle form submission
    searchForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission behavior

        var searchQuery = document.getElementById('searchInput').value.trim();

        if (!(searchQuery === "")) {

            document.getElementById('searchInput').value = "";
            await displaySearchQuery(searchQuery);
            allQueries.push(searchQuery);

            await updateQueryFilms();

        }


    });

    document.getElementById('searchQueries').addEventListener('click', function (event) {
        // Check if the clicked element is a close button
        if (event.target.classList.contains('btn-close')) {
            // If it's a close button, call the deleteQuery function
            deleteQuery(event.target);
        }
    });


        // click title bar to refresh - shuffle films, reset counter, reload page
        document.getElementById('page_title').addEventListener('click', async function () {
            const shuffle = await refreshFilms(user_id)
            localStorage.setItem('counter', 0);
            localStorage.setItem('currentIndex', 0);
            window.location.href = '/';
    
        });
    
    

}

