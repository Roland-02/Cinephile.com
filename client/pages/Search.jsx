import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Search = () => {
  const [films, setFilms] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const session = getSession();
  const user_id = session?.id;
  const navigate = useNavigate();

  useEffect(() => {
    const queryParam = searchParams.get('query');
    if (queryParam) {
      setQuery(queryParam);
      handleSearch(queryParam);
    }

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') return;

    setLoading(true);
    try {
      const response = await axios.get(`/api/search_general?query=${searchQuery}&page=1`);
      const filmsData = response.data.films || [];
      setFilms(filmsData);
      setSearchParams({ query: searchQuery });
    } catch (error) {
      console.error('Error searching films:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleFilmClick = (film, filmIndex) => {
    const page = Math.floor(filmIndex / 100) + 1;
    const startIndex = (page - 1) * 100;
    const currentIndex = filmIndex - startIndex;
    const counter = filmIndex;

    localStorage.setItem('counter', counter);
    localStorage.setItem('currentIndex', currentIndex);
    localStorage.setItem('films-source', JSON.stringify(films));
    navigate('/index');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container" style={{ paddingTop: '60px' }}>
      <div className="row justify-content-center align-items-center">
        <div className="col-lg-6">
          <form id="searchForm" className="search-container" onSubmit={handleSubmit}>
            <div className="input-group">
              <div className="form-outline border" style={{ borderRadius: '10px' }}>
                <input
                  type="search"
                  id="searchInput"
                  name="query"
                  className="form-control"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <label htmlFor="searchInput" className="form-label search-btn">
                  Search...
                </label>
              </div>
              <button type="submit" className="btn btn-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-search"
                  viewBox="0 0 16 16"
                >
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {query && (
          <div className="searchQueriesContainer">
            <div id="searchQueries" className="col container d-flex justify-content-center inline-block">
              <div className="alert alert-info p-2 m-1">{query}</div>
            </div>
          </div>
        )}

        {showBackToTop && (
          <button
            id="backToTopBtn"
            className="btn btn-secondary"
            onClick={scrollToTop}
            style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}
          >
            Back to Top
          </button>
        )}

        <div className="poster-container m-1" id="search-films" data-id={user_id}>
          {loading ? (
            <div className="loading-spinner" style={{ display: 'block' }}></div>
          ) : films.length > 0 ? (
            films.map((film, index) => (
              <figure
                key={film.tconst}
                className="poster-wrapper clickable"
                data-id={film.tconst}
                onClick={() => handleFilmClick(film, index)}
                style={{ cursor: 'pointer' }}
              >
                <figcaption className="caption">
                  <p>
                    Released: <strong>{film.startYear}</strong>
                  </p>
                  <p>
                    Genre: <strong>{film.genres}</strong>
                  </p>
                  <p>
                    Starring: <strong>{film.cast}</strong>
                  </p>
                  <p>{film.plot}</p>
                </figcaption>
                <img
                  className="film-poster"
                  src={film.poster ? baseImagePath + film.poster : '/images/MissingPoster.jpeg'}
                  alt={film.primaryTitle}
                />
              </figure>
            ))
          ) : query ? (
            <img
              className="notFound"
              src="/images/NotFound_CouchRain.png"
              alt="No films found"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Search;

