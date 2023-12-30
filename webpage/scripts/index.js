window.onload = function () {

    const filmCarousel = document.getElementById('film-carousel');
    const currentFilm = document.getElementById('current-film');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');

    let currentIndex = 0;

    // Event listener for the previous button
    prevButton.addEventListener('click', function () {
        currentIndex = (currentIndex - 1 + films.length) % films.length;
        updateFilm();
    });

    // Event listener for the next button
    nextButton.addEventListener('click', function () {
        currentIndex = (currentIndex + 1) % films.length;
        updateFilm();
    });

    // Function to update the displayed film
    function updateFilm() {
        currentFilm.innerHTML = `<strong>Title:</strong> ${films[currentIndex].primaryTitle}<br><p></p>`;
    }


};

