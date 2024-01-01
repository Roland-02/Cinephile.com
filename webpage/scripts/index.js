window.onload = function () {
    const currentFilmElement = document.getElementById('current-film');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');


    var films = JSON.parse(document.getElementById('film-carousel').getAttribute('data'));
    console.log(films);
    //var films = document.getElementById('film-carousel').getAttribute('data');
    var currentIndex = 0;

    // Initial update
    updateFilm();

    // Function to update the displayed film
    function updateFilm() {
        currentFilmElement.innerHTML = `<strong>Title:</strong> ${films[currentIndex].primaryTitle} <br><p></p>`;
    }

    // Event listener for the previous button
    prevButton.addEventListener('click', function () {
        currentIndex = (currentIndex - 1);
        if (currentIndex < 0) {
            currentIndex = 0;
        }
        updateFilm();
    });

    // Event listener for the next button
    nextButton.addEventListener('click', function () {
        currentIndex = (currentIndex + 1);
        updateFilm();
    });

};
