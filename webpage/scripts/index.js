///*
window.onload = function () {
    const filmTitle = document.getElementById('film-title');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');

    var films = JSON.parse(document.getElementById('film-carousel').getAttribute('data'));
    var currentIndex = 0;

    // Initial update
    updateFilm();

    // Function to update the displayed film
    function updateFilm() {
        filmTitle.innerHTML = `<strong>${films[currentIndex].primaryTitle}</strong> <br><p></p>`;
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
//*/