async function getLovedFilms(user_id) {
    try {
        const response = await axios.get(`http://127.0.0.1:5000/get_loved_films?user_id=${user_id}`)
        const lovedFilms = response.data.films;
        return lovedFilms;

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;
    }

    // try {
    //     const response = await $.ajax({
    //         url: `http://127.0.0.1:5000/get_loved_films?user_id=${user_id}`,
    //         method: 'GET'
    //     });
    //     const films = response.data;
    //     return films
    // } catch (error) {
    //     console.error('Error getting profile statistics', error);
    //     return null;
    // }

};

async function getProfileStats(user_id) {
    try {
        const response = await axios.get(`http://127.0.0.1:5000/get_profile_stats?user_id=${user_id}`)
        const message = response.data.message;

        if (message) {
            var cast = response.data.cast;
            var crew = response.data.crew;
            var genre = response.data.genre
            return { cast, crew, genre }
        } else {
            return null;
        }

    } catch (error) {
        console.error('Error getting films batch', error);
        return null;

    }

    // try {
    //     const response = await $.ajax({
    //         url: `http://127.0.0.1:5000/get_profile_stats?user_id=${user_id}`,
    //         method: 'GET'
    //     });
    //     const stats = response.data;
    //     return stats
    // } catch (error) {
    //     console.error('Error getting profile statistics', error);
    //     return null;
    // }


};


window.onload = async function () {

    const postersBox = document.getElementById('loved-films');
    const castBox = document.getElementById('cast-box');
    const crewBox = document.getElementById('crew-box');
    const genreBox = document.getElementById('genre-box');

    const user_id = postersBox.getAttribute('data-id');
    const baseImagePath = 'https://image.tmdb.org/t/p/w500';

    var films = await getLovedFilms(user_id);

    //initial update
    if (films.length > 0) {
        await displayLovedFilmPosters(films);

        var stats = await getProfileStats(user_id)
        if (stats) {
            var cast = stats.cast;
            var crew = stats.crew;
            var genre = stats.genre;
            console.log(genre)

            castBox.innerHTML = await displayStats(cast);
            crewBox.innerHTML = await displayStats(crew);
            await displayGenreChart(genre); //display genre pie chart

        }

    } else {
        postersBox.innerHTML = `<p style="text-align: center; font-size: 20px">...</p>`
        castBox.innerHTML = `<p style="text-align: left; font-size: 20px">...</p>`
        crewBox.innerHTML = `<p style="text-align: left; font-size: 20px">...</p>`
        genreBox.innerHTML = `<p style="text-align: left; font-size: 20px">...</p>`
        console.log('no films')
    }


    //Function to update the displayed film
    async function displayLovedFilmPosters(films) {
        content = '';


        films.forEach(function (film) {
            if (film.poster) {
                content += `<img class="film-poster clickable" data-id="${film.tconst}" src="${baseImagePath + film.poster}" alt="${film.title}">`;

            } else {
                content += `<img class="film-poster clickable" data-id="${film.tconst}" src="/images/MissingPoster.jpeg" alt="Poster Not Available">`;
            }
        });

        postersBox.innerHTML = content;

    };

    async function displayStats(category) {
        let content = '';
        content += '<ol class="column-list">';
        category.forEach(function (name) {
            content += `<li>${name}</li>`;
        });
        content += '</ol>';
        return content;
    }

    async function displayGenreChart(collection) {

        const genreData = collection.map(item => ({
            label: item.Genres,
            data: item.Count
        }));
    
        const labels = genreData.map(item => item.label);
        const data = genreData.map(item => item.data);
    

        const container = document.getElementById('genre-box');

        // Set the container's width and height
        container.style.width = '63%'; // Set the desired width
        container.style.height = '40px'; // Set the desired height   
        container.style.marginLeft = '50px'; 
        // Create the

        const ctx = document.getElementById('genreChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                

                responsive: true,
                legend: {
                    position: 'right',
                    align: 'start', // Align the legend to the start of the chart
                    labels: {
                        font: {
                            size: 12 // Adjust font size as needed
                        },
                        padding: 10,
                        
                    }
                },
                tooltips: {
                    callbacks: {
                        label: function(tooltipItem, data) {
                            const dataset = data.datasets[tooltipItem.datasetIndex];
                            const total = dataset.data.reduce((acc, value) => acc + value, 0);
                            const currentValue = dataset.data[tooltipItem.index];
                            const percentage = Math.round((currentValue / total) * 100);
                            const label = data.labels[tooltipItem.index];
                            return `${label}: ${percentage}%`;
                        }
                    }
                }
            }

        });
        
    }
    
    

    document.getElementById('page_title').addEventListener('click', function () {
        // Redirect to the index page
        window.location.href = '/index';
    });


};














