import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Search = () => {
  const [films, setFilms] = useState([]);
  const [query, setQuery] = useState('');
  const [searchQueries, setSearchQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const session = getSession();
  const user_id = session?.id;
  const navigate = useNavigate();

  useEffect(() => {
    // Load queries from URL params on mount
    const queryParam = searchParams.get('query');
    if (queryParam) {
      const queries = queryParam.split(',').filter(q => q.trim() !== '');
      if (queries.length > 0) {
        setSearchQueries(queries);
        // Search for all queries if we don't have films yet
        if (films.length === 0) {
          handleSearchForQueries(queries);
        }
      }
    }
  }, []); // Only run on mount

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchForQueries = async (queries) => {
    if (!queries || queries.length === 0) return;

    setLoading(true);
    try {
      // Search for all queries and combine results
      const allFilms = [];
      for (const searchQuery of queries) {
        if (searchQuery.trim() !== '') {
          const response = await axios.get(`/api/search_general?query=${searchQuery.trim()}&page=1`);
          const filmsData = response.data.films || [];
          // Combine films, avoiding duplicates
          filmsData.forEach(film => {
            if (!allFilms.find(f => f.tconst === film.tconst)) {
              allFilms.push(film);
            }
          });
        }
      }
      setFilms(allFilms);
    } catch (error) {
      console.error('Error searching films:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') return;

    setLoading(true);
    try {
      const response = await axios.get(`/api/search_general?query=${searchQuery.trim()}&page=1`);
      const filmsData = response.data.films || [];
      
      // Add new films to existing results, avoiding duplicates
      setFilms(prevFilms => {
        const combined = [...prevFilms];
        filmsData.forEach(film => {
          if (!combined.find(f => f.tconst === film.tconst)) {
            combined.push(film);
          }
        });
        return combined;
      });
    } catch (error) {
      console.error('Error searching films:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Add to search queries if not already present
    if (!searchQueries.includes(trimmedQuery)) {
      const newQueries = [...searchQueries, trimmedQuery];
      setSearchQueries(newQueries);
      
      // Update URL params
      setSearchParams({ query: newQueries.join(',') });
      
      // Perform search
      handleSearch(trimmedQuery);
    }
    
    // Clear the input
    setQuery('');
  };

  const handleRemoveQuery = (queryToRemove) => {
    const newQueries = searchQueries.filter(q => q !== queryToRemove);
    setSearchQueries(newQueries);
    
    if (newQueries.length > 0) {
      setSearchParams({ query: newQueries.join(',') });
      // Re-search with remaining queries
      handleSearchForQueries(newQueries);
    } else {
      setSearchParams({});
      setFilms([]);
    }
  };

  const handleFilmClick = (film, filmIndex) => {
    localStorage.setItem('filmIndex', filmIndex);
    localStorage.setItem('films-source', JSON.stringify(films));
    navigate('/index');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-10">
          <form id="searchForm" className="search-container" onSubmit={handleSubmit}>
            <div className="search-input-wrapper">
              <div className="search-input-group">
                <input
                  type="text"
                  id="searchInput"
                  name="query"
                  className="form-control search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for films..."
                />
                <button type="submit" className="btn btn-primary search-submit-btn">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="currentColor"
                    className="bi bi-search"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>

        {searchQueries.length > 0 && (
          <div className="search-query-display">
            {searchQueries.map((searchQuery, index) => (
              <div key={index} className="search-query-badge">
                <span>{searchQuery}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveQuery(searchQuery)}
                  className="search-query-close"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    padding: '0',
                    marginLeft: '8px',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {showBackToTop && (
          <button
            id="backToTopBtn"
            className="btn btn-secondary"
            onClick={scrollToTop}
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
          ) : searchQueries.length > 0 ? (
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

