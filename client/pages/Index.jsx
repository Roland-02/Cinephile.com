import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const MAX_LOAD = 100;
const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Index = () => {
  const [films, setFilms] = useState([]);
  const [currentFilm, setCurrentFilm] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counter, setCounter] = useState(0);
  const [isClickLocked, setIsClickLocked] = useState(false);
  const [filtered, setFiltered] = useState(false);
  const [outside, setOutside] = useState(false);
  const [page, setPage] = useState(1);
  const [lastIndex, setLastIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [watchList, setWatchList] = useState([]);
  const [myLiked, setMyLiked] = useState([]);
  const [myLoved, setMyLoved] = useState([]);
  const [likedElements, setLikedElements] = useState([]);
  const [likedCast, setLikedCast] = useState([]);
  const [isLoved, setIsLoved] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const session = getSession();
  const user_id = session?.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tconstParam = searchParams.get('tconst');
  const pageParam = searchParams.get('page');

  useEffect(() => {
    // Load saved state from localStorage
    const savedCounter = localStorage.getItem('counter');
    const savedIndex = localStorage.getItem('currentIndex');
    if (savedCounter && savedIndex) {
      setCounter(parseInt(savedCounter));
      setCurrentIndex(parseInt(savedIndex));
    }

    // Check if coming from another page
    if (localStorage.getItem('films-source')) {
      setOutside(true);
    }

    // Load initial films
    loadFilms();
  }, []);

  useEffect(() => {
    if (films.length > 0) {
      updateFilm();
    }
  }, [films, currentIndex]);

  const getFilms = async (counter) => {
    try {
      const currentPage = Math.floor(counter / MAX_LOAD) + 1;
      setPage(currentPage);

      let filmsData;
      if (filtered) {
        const response = await fetch(`/api/filteredPageFilms?page=${currentPage}`);
        if (response.ok) {
          filmsData = await response.json();
        }
      } else if (outside) {
        const films_JSON = JSON.parse(localStorage.getItem('films-source'));
        const startIndex = (currentPage - 1) * MAX_LOAD;
        const endIndex = parseInt(Number(startIndex) + Number(MAX_LOAD));
        filmsData = films_JSON.slice(startIndex, endIndex);
      } else {
        const response = await fetch(`/api/indexPageFilms?page=${currentPage}`);
        if (response.ok) {
          filmsData = await response.json();
        }
      }

      return filmsData;
    } catch (error) {
      console.error('Error fetching films:', error);
      return [];
    }
  };

  const loadFilms = async () => {
    setLoading(true);
    const filmsData = await getFilms(counter);
    if (filmsData && filmsData.length > 0) {
      setFilms(filmsData);
      setLastIndex(filmsData.length < MAX_LOAD ? filmsData.length - 1 : filmsData.length);
    }
    setLoading(false);
  };

  const updateFilm = async () => {
    if (films.length === 0 || currentIndex >= films.length) return;

    const film = films[currentIndex];
    setCurrentFilm(film);

    // Save current position
    localStorage.setItem('counter', counter);
    localStorage.setItem('currentIndex', currentIndex);

    // Load user data if authenticated
    if (user_id) {
      try {
        const [watchListRes, likedRes, lovedRes] = await Promise.all([
          axios.get(`/api/getWatchlist?user_id=${user_id}`),
          axios.get(`/api/getLikedFilms?user_id=${user_id}`),
          axios.get(`/api/getLovedFilms?user_id=${user_id}`),
        ]);

        setWatchList(watchListRes.data);
        setMyLiked(likedRes.data);
        setMyLoved(lovedRes.data);

        // Check if film is in watchlist
        setIsInWatchlist(watchListRes.data.some((f) => f.tconst === film.tconst));

        // Check if film is loved
        const isLovedFilm = lovedRes.data.some((f) => f.tconst === film.tconst);
        setIsLoved(isLovedFilm);

        // Load liked elements if film is liked
        if (likedRes.data.some((f) => f.tconst === film.tconst)) {
          const elementsRes = await axios.get(
            `/api/getLikedElements?user_id=${user_id}&film_id=${film.tconst}`
          );
          setLikedElements(elementsRes.data.likedElements || []);
          setLikedCast(elementsRes.data.likedCast || []);
        } else {
          setLikedElements([]);
          setLikedCast([]);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }

    setIsClickLocked(false);
  };

  const handleNext = async () => {
    if (isClickLocked) return;
    setIsClickLocked(true);

    let newIndex = currentIndex;
    let newCounter = counter;

    if (currentIndex < lastIndex) {
      newIndex = currentIndex + 1;
      newCounter = counter + 1;
    }

    // Load next batch if needed
    if (newIndex % MAX_LOAD === 0 && !outside) {
      const newPage = page + 1;
      setPage(newPage);
      const newFilms = await getFilms(newCounter);
      if (newFilms && newFilms.length > 0) {
        setFilms(newFilms);
        setLastIndex(newFilms.length < MAX_LOAD ? newFilms.length - 1 : newFilms.length);
        setCurrentIndex(0);
        setCounter(newCounter);
        return;
      }
    }

    setCurrentIndex(newIndex);
    setCounter(newCounter);
  };

  const handlePrev = async () => {
    if (isClickLocked || counter === 0) return;
    setIsClickLocked(true);

    let newIndex = currentIndex;
    let newCounter = counter;

    if (currentIndex === 0 && counter !== 0 && !outside) {
      newIndex = MAX_LOAD;
      setPage(page - 1);
      const newFilms = await getFilms(newCounter - MAX_LOAD);
      if (newFilms && newFilms.length > 0) {
        setFilms(newFilms);
        setLastIndex(newFilms.length < MAX_LOAD ? newFilms.length - 1 : newFilms.length);
        newIndex = MAX_LOAD - 1;
      }
    } else {
      newIndex = currentIndex - 1;
    }

    newCounter = counter - 1;

    if (newIndex < 0) newIndex = 0;
    if (newCounter < 0) newCounter = 0;

    setCurrentIndex(newIndex);
    setCounter(newCounter);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        handleNext();
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        handlePrev();
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, counter, isClickLocked]);

  const handleLikeElement = async (elementId, isCast = false) => {
    if (!user_id || !currentFilm) return;

    let newLikedElements = [...likedElements];
    let newLikedCast = [...likedCast];

    if (isCast) {
      const index = newLikedCast.indexOf(elementId);
      if (index > -1) {
        newLikedCast.splice(index, 1);
      } else {
        newLikedCast.push(elementId);
      }
      setLikedCast(newLikedCast);
    } else {
      const index = newLikedElements.indexOf(elementId);
      if (index > -1) {
        newLikedElements.splice(index, 1);
      } else {
        newLikedElements.push(elementId);
      }
      setLikedElements(newLikedElements);
    }

    // Check if all elements are liked
    setTimeout(async () => {
      const totalLikeables = document.querySelectorAll('.likeable').length;
      const likedCount = newLikedElements.length + newLikedCast.length;

      if (likedCount === totalLikeables && !isLoved) {
        await handleLoveFilm();
      } else if (isLoved && likedCount < totalLikeables) {
        await handleUnloveFilm();
      } else {
        await saveElements(newLikedElements, newLikedCast);
      }
    }, 0);
  };

  const handleLoveFilm = async () => {
    if (!user_id || !currentFilm) return;

    try {
      await axios.post(`/api/loveFilm`, {
        film_id: currentFilm.tconst,
        user_id: user_id,
      });
      setIsLoved(true);
      const lovedRes = await axios.get(`/api/getLovedFilms?user_id=${user_id}`);
      setMyLoved(lovedRes.data);
    } catch (error) {
      console.error('Error loving film:', error);
    }
  };

  const handleUnloveFilm = async () => {
    if (!user_id || !currentFilm) return;

    try {
      await axios.post(`/api/unloveFilm`, {
        film_id: currentFilm.tconst,
        user_id: user_id,
      });
      setIsLoved(false);
      const lovedRes = await axios.get(`/api/getLovedFilms?user_id=${user_id}`);
      setMyLoved(lovedRes.data);
      await saveElements(likedElements, likedCast);
    } catch (error) {
      console.error('Error unloving film:', error);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!user_id || !currentFilm) return;

    try {
      if (isInWatchlist) {
        await axios.post(`/api/deleteWatchlist`, {
          film_id: currentFilm.tconst,
          user_id: user_id,
        });
      } else {
        await axios.post(`/api/addWatchlist`, {
          film_id: currentFilm.tconst,
          user_id: user_id,
        });
      }
      setIsInWatchlist(!isInWatchlist);
      const watchListRes = await axios.get(`/api/getWatchlist?user_id=${user_id}`);
      setWatchList(watchListRes.data);
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  const saveElements = async (elements, cast) => {
    if (!user_id || !currentFilm) return;

    try {
      await axios.post('/api/saveLikedElements', {
        user_id: user_id,
        film_id: currentFilm.tconst,
        elements: elements,
        cast: cast,
      });
      const likedRes = await axios.get(`/api/getLikedFilms?user_id=${user_id}`);
      setMyLiked(likedRes.data);
    } catch (error) {
      console.error('Error saving elements:', error);
    }
  };

  const handleFilterSubmit = async (e) => {
    e.preventDefault();
    const filterRating = document.getElementById('filterRating').value;
    const filterGenre = document.getElementById('filterGenre').value;
    const filterRuntime = document.getElementById('filterRuntime').value;
    const filterYear = document.getElementById('filterYear').value;

    const filter = {
      rating: filterRating,
      genre: filterGenre,
      runtime: filterRuntime,
      year: filterYear,
    };

    try {
      const response = await axios.post('/api/filter', null, {
        params: { filter: filter }
      });
      if (response.data) {
        setFiltered(true);
        setCounter(0);
        setCurrentIndex(0);
        await loadFilms();
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }

    setShowFilters(false);
  };

  const handleRefresh = async () => {
    if (!user_id) return;

    try {
      await axios.post(`/api/shuffleFilms?user_id=${user_id}`);
      localStorage.setItem('counter', 0);
      localStorage.setItem('currentIndex', 0);
      localStorage.removeItem('films-source');
      localStorage.removeItem('marker');
      navigate('/');
    } catch (error) {
      console.error('Error refreshing films:', error);
    }
  };

  if (loading || !currentFilm) {
    return (
      <div className="view-container" style={{ paddingTop: '75px' }}>
        <div className="loading-spinner" style={{ display: 'block' }}></div>
      </div>
    );
  }


  const renderFilmInfo = () => {
    if (!currentFilm) return null;

    const likeableClass = user_id ? 'likeable' : '';

    return (
      <div id="film-info" className="h3 text-center" data-email={session?.email} data-id={user_id}>
        {/* Title */}
        <div
            id="_filmTitle"
            className={`${likeableClass} ${likedElements.includes('Title') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Title')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <strong>{currentFilm.primaryTitle}</strong>
          </div>

          {/* Plot */}
          {currentFilm.plot ? (
            <div
              id="_filmPlot"
              className={`small-text py-1 mb-1 ${likeableClass} ${likedElements.includes('Plot') ? 'liked' : ''}`}
              onClick={() => user_id && handleLikeElement('Plot')}
              style={{ cursor: user_id ? 'pointer' : 'default' }}
            >
              <p>{currentFilm.plot}</p>
            </div>
          ) : (
            <div>
              <p>-</p>
            </div>
          )}

        {/* Rating, Genre, Runtime, Year */}
        <div className="row d-flex">
          {/* Rating */}
          <div
            id="_filmRating"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${likeableClass} ${likedElements.includes('Rating') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Rating')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">RATING</div>
            <div className="p text-center">{currentFilm.averageRating || '-'}</div>
          </div>

          {/* Genre */}
          <div
            id="_filmGenre"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${likeableClass} ${likedElements.includes('Genre') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Genre')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">GENRE</div>
            <div className="list-unstyled" style={{ fontSize: '18px' }}>
              {currentFilm.genres.split(',').map((genre, idx) => (
                <li key={idx}>{genre}</li>
              ))}
            </div>
          </div>

          {/* Runtime */}
          <div
            id="_filmRuntime"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${likeableClass} ${likedElements.includes('Runtime') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Runtime')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">RUNTIME</div>
            {currentFilm.runtimeMinutes !== '\\N' ? (
              (() => {
                const hours = Math.floor(currentFilm.runtimeMinutes / 60);
                const minutes = currentFilm.runtimeMinutes % 60;
                if (hours > 0 && minutes > 0) {
                  return <div className="p text-center">{hours}h {minutes}m</div>;
                } else if (hours > 0) {
                  return <div className="p text-center">{hours}h</div>;
                } else if (minutes > 0) {
                  return <div className="p text-center">{minutes}m</div>;
                }
                return <div className="p text-center">-</div>;
              })()
            ) : (
              <div className="p text-center">-</div>
            )}
          </div>

          {/* Year */}
          <div
            id="_filmYear"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${likeableClass} ${likedElements.includes('Year') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Year')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">YEAR</div>
            <div className="p text-center">{currentFilm.startYear}</div>
          </div>
        </div>

        {/* Cast */}
        <div className="col-lg col-md col-sm-12 py-3">
          <div className="h5 text-center">CAST</div>
          <div className="container px-2">
            <div className="d-flex justify-content-center" style={{ flexWrap: 'wrap' }}>
              {currentFilm.cast.split(',').map((actor, idx) => (
                <div
                  key={idx}
                  id={actor}
                  className={`actor d-flex align-items-center ${likeableClass} cast ${likedCast.includes(actor) ? 'liked' : ''}`}
                  onClick={() => user_id && handleLikeElement(actor, true)}
                  style={{ cursor: user_id ? 'pointer' : 'default' }}
                >
                  <span className="px-2">|</span>
                  <span className="medium-text">{actor}</span>
                  <span className="px-2">|</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Director, Camera, Writer */}
        <div className="row d-flex justify-content-center py-2">
          <div className="row d-flex py-2">
            {/* Director */}
            {currentFilm.director && (
              <div
                id="_filmDirector"
                className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Director') ? 'liked' : ''}`}
                onClick={() => user_id && handleLikeElement('Director')}
                style={{ cursor: user_id ? 'pointer' : 'default' }}
              >
                <div className="h5 mb-1 py-1 border-bottom">DIRECTOR</div>
                {currentFilm.director.split(',').map((name, idx) => (
                  <div key={idx} className="p medium-text text-center">
                    {name.trim()}
                  </div>
                ))}
              </div>
            )}

            {/* Camera */}
            {currentFilm.cinematographer && (
              <div
                id="_filmCamera"
                className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Camera') ? 'liked' : ''}`}
                onClick={() => user_id && handleLikeElement('Camera')}
                style={{ cursor: user_id ? 'pointer' : 'default' }}
              >
                <div className="h5 mb-1 py-1 border-bottom">CAMERA</div>
                {currentFilm.cinematographer.split(',').map((name, idx) => (
                  <div key={idx} className="p medium-text text-center">
                    {name.trim()}
                  </div>
                ))}
              </div>
            )}

            {/* Writer */}
            {currentFilm.writer && (
              <div
                id="_filmWriter"
                className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Writer') ? 'liked' : ''}`}
                onClick={() => user_id && handleLikeElement('Writer')}
                style={{ cursor: user_id ? 'pointer' : 'default' }}
              >
                <div className="h5 mb-1 py-1 border-bottom">WRITER</div>
                {currentFilm.writer.split(',').map((name, idx) => (
                  <div key={idx} className="p medium-text text-center">
                    {name.trim()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Producer, Editor, Composer */}
        <div className="row d-flex py-2">
          {/* Producer */}
          {currentFilm.producer && (
            <div
              id="_filmProducer"
              className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Producer') ? 'liked' : ''}`}
              onClick={() => user_id && handleLikeElement('Producer')}
              style={{ cursor: user_id ? 'pointer' : 'default' }}
            >
              <div className="h5 mb-1 py-1 border-bottom">PRODUCER</div>
              {currentFilm.producer.split(',').map((name, idx) => (
                <div key={idx} className="p medium-text text-center">
                  {name.trim()}
                </div>
              ))}
            </div>
          )}

          {/* Editor */}
          {currentFilm.editor && (
            <div
              id="_filmEditor"
              className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Editor') ? 'liked' : ''}`}
              onClick={() => user_id && handleLikeElement('Editor')}
              style={{ cursor: user_id ? 'pointer' : 'default' }}
            >
              <div className="h5 mb-1 py-1 border-bottom">EDITOR</div>
              {currentFilm.editor.split(',').map((name, idx) => (
                <div key={idx} className="p medium-text text-center">
                  {name.trim()}
                </div>
              ))}
            </div>
          )}

          {/* Composer */}
          {currentFilm.composer && (
            <div
              id="_filmComposer"
              className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Composer') ? 'liked' : ''}`}
              onClick={() => user_id && handleLikeElement('Composer')}
              style={{ cursor: user_id ? 'pointer' : 'default' }}
            >
              <div className="h5 mb-1 py-1 border-bottom">COMPOSER</div>
              {currentFilm.composer.split(',').map((name, idx) => (
                <div key={idx} className="p medium-text text-center">
                  {name.trim()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="view-container" style={{ paddingTop: '75px' }}>
      <div className="row">
        {/* Filters */}
        <div className="container position-absolute m-2 d-flex" style={{ width: '15%' }}>
          <div>
            {!showFilters ? (
              <svg
                id="filter-blank"
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                type="button"
                className="bi bi-filter-circle"
                viewBox="0 0 16 16"
                onClick={() => setShowFilters(true)}
                style={{ cursor: 'pointer' }}
              >
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                <path d="M7 11.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5" />
              </svg>
            ) : (
              <svg
                id="filter-filled"
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                type="button"
                className="bi bi-filter-circle-fill"
                viewBox="0 0 16 16"
                onClick={() => setShowFilters(false)}
                style={{ cursor: 'pointer' }}
              >
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16M3.5 5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1 0-1M5 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m2 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5" />
              </svg>
            )}

            {showFilters && (
              <div
                id="filterOptions"
                className="container border border-2 m-2 p-3"
                style={{ backgroundColor: 'white', position: 'relative', zIndex: 10000 }}
              >
                <form onSubmit={handleFilterSubmit}>
                  {/* Rating */}
                  <div className="mb-2">
                    <label htmlFor="filterRating" className="form-label">
                      Rating
                    </label>
                    <select id="filterRating" className="form-select">
                      <option selected>Any</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <option key={num} value={num}>
                          {num}/10
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Genre */}
                  <div className="mb-2">
                    <label htmlFor="filterGenre" className="form-label">
                      Genre
                    </label>
                    <select id="filterGenre" className="form-select">
                      <option selected>Any</option>
                      {['Drama', 'Action', 'Comedy', 'Sci-Fi', 'Fantasy', 'Romance', 'Family', 'Horror', 'Mystery', 'Documentary'].map((genre) => (
                        <option key={genre}>{genre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Runtime */}
                  <div className="mb-2">
                    <label htmlFor="filterRuntime" className="form-label">
                      Runtime
                    </label>
                    <select id="filterRuntime" className="form-select">
                      <option selected>Any</option>
                      {['≤ 1 Hr', '≤ 1Hr 30m', '≤ 2Hrs', '≤ 2Hrs 30m', '≤ 3Hrs', 'really long...'].map((runtime) => (
                        <option key={runtime}>{runtime}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div className="mb-2">
                    <label htmlFor="filterYear" className="form-label">
                      Year
                    </label>
                    <select id="filterYear" className="form-select">
                      <option selected>Any</option>
                      {['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s'].map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary mt-3">
                    apply
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Film poster carousel */}
        <div className="col-lg-6 col-md-6 col-sm-12 py-5 carousel-container">
          <div className="carousel slide" id="film-carousel" data-bs-ride="carousel">
            <div className="d-flex align-items-center justify-content-center">
              <div className="carousel-inner">
                <div id="film-poster" className="carousel-item active">
                  {currentFilm.poster ? (
                    <img
                      src={baseImagePath + currentFilm.poster}
                      alt={currentFilm.primaryTitle}
                    />
                  ) : (
                    <img src="/images/MissingPoster.jpeg" alt="Poster Not Available" />
                  )}
                </div>
              </div>

              {/* Previous button */}
              <button
                style={{ backgroundColor: 'rgba(255, 255, 255, 0)' }}
                id="prev-btn"
                className="carousel-control-prev"
                type="button"
                onClick={handlePrev}
                disabled={counter === 0}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  fill="grey"
                  className="bi bi-caret-left-fill"
                  viewBox="0 0 16 16"
                >
                  <path d="m3.86 8.753 5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z" />
                </svg>
              </button>

              {/* Next button */}
              <button
                style={{ backgroundColor: 'rgba(255, 255, 255, 0)' }}
                id="next-btn"
                className="carousel-control-next"
                type="button"
                onClick={handleNext}
                disabled={counter >= lastIndex}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  fill="grey"
                  className="bi bi-caret-right-fill"
                  viewBox="0 0 16 16"
                >
                  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Film info */}
        <div className="col-lg-6 col-md-6 col-sm-12 py-4">
          <div className="container">
            {renderFilmInfo()}

            {/* Watchlist and like buttons */}
            {user_id && (
              <div className="row d-flex py-2">
                <div className="col-lg-6 col-md-6 col-sm-6 text-end">
                  {isLoved ? (
                    <svg
                      id="heart-filled"
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      className="bi bi-suit-heart-fill"
                      viewBox="0 0 16 16"
                      type="button"
                      onClick={handleUnloveFilm}
                      style={{ cursor: 'pointer', fill: 'red' }}
                    >
                      <path d="M4 1c2.21 0 4 1.755 4 3.92C8 2.755 9.79 1 12 1s4 1.755 4 3.92c0 3.263-3.234 4.414-7.608 9.608a.513.513 0 0 1-.784 0C3.234 9.334 0 8.183 0 4.92 0 2.755 1.79 1 4 1" />
                    </svg>
                  ) : (
                    <svg
                      id="heart-blank"
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      className="bi bi-suit-heart"
                      viewBox="0 0 16 16"
                      type="button"
                      onClick={handleLoveFilm}
                      style={{ cursor: 'pointer' }}
                    >
                      <path d="m8 6.236-.894-1.789c-.222-.443-.607-1.08-1.152-1.595C5.418 2.345 4.776 2 4 2 2.324 2 1 3.326 1 4.92c0 1.211.554 2.066 1.868 3.37.337.334.721.695 1.146 1.093C5.122 10.423 6.5 11.717 8 13.447c1.5-1.73 2.878-3.024 3.986-4.064.425-.398.81-.76 1.146-1.093C14.446 6.986 15 6.131 15 4.92 15 3.326 13.676 2 12 2c-.777 0-1.418.345-1.954.852-.545.515-.93 1.152-1.152 1.595zm.392 8.292a.513.513 0 0 1-.784 0c-1.601-1.902-3.05-3.262-4.243-4.381C1.3 8.208 0 6.989 0 4.92 0 2.755 1.79 1 4 1c1.6 0 2.719 1.05 3.404 2.008.26.365.458.716.596.992a7.6 7.6 0 0 1 .596-.992C9.281 2.049 10.4 1 12 1c2.21 0 4 1.755 4 3.92 0 2.069-1.3 3.288-3.365 5.227-1.193 1.12-2.642 2.48-4.243 4.38z" />
                    </svg>
                  )}
                </div>

                <div className="col-lg-6 col-md-6 col-sm-6 text-start">
                  {isInWatchlist ? (
                    <svg
                      id="watchlist-filled"
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      className="bi bi-plus-square-fill"
                      type="button"
                      viewBox="0 0 16 16"
                      onClick={handleWatchlistToggle}
                      style={{ cursor: 'pointer', fill: 'green' }}
                    >
                      <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm6.5 4.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3a.5.5 0 0 1 1 0" />
                    </svg>
                  ) : (
                    <svg
                      id="watchlist-blank"
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      className="bi bi-plus-square"
                      type="button"
                      viewBox="0 0 16 16"
                      onClick={handleWatchlistToggle}
                      style={{ cursor: 'pointer' }}
                    >
                      <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z" />
                      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

