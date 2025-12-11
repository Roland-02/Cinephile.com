import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Recommend = () => {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('content');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const session = getSession();
  const user_id = session?.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refreshProfile = searchParams.get('refreshProfile') === 'true';

  useEffect(() => {
    if (!user_id) {
      navigate('/login');
      return;
    }

    if (refreshProfile) {
      updateProfileAndLoad();
    } else {
      loadFilms();
    }

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user_id, refreshProfile]);

  useEffect(() => {
    if (user_id) {
      loadFilms();
    }
  }, [category]);

  const updateProfileAndLoad = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/update_profile_and_vectors?user_id=${user_id}`);
      await axios.post(`/api/cache_recommend_pack?user_id=${user_id}`);
      await loadFilms();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilms = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/get_batch?user_id=${user_id}&category=${category}&page=1`
      );
      const filmsData = response.data.films;      
      setFilms(filmsData);
    } catch (error) {
      console.error('Error loading recommended films:', error);
      setFilms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
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
        <div className="col-lg-6 col-md-6">
          <div id="showMe">
            <label htmlFor="showMeOptions" className="h3 form-label m-2">
              filter:{' '}
            </label>
            <select
              id="showMeOptions"
              className="form-select"
              value={category}
              onChange={handleCategoryChange}
            >
              <option value="content">From your profile</option>
              <optgroup label="from features you may like...">
                <option value="plot">Storylines</option>
                <option value="cast">Cast</option>
                <option value="crew">Crew</option>
                <option value="genre">Genres</option>
              </optgroup>
            </select>
          </div>
        </div>

        {showBackToTop && (
          <button
            id="backToTopBtn"
            className="btn btn-secondary"
            onClick={scrollToTop}
          >
            Back to Top
          </button>
        )}

        <div id="filmsContainer" className="films-container m-1" data-id={user_id}>
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
          ) : (
            <img
              className="notFound"
              src="/images/NotFound_Sailor.png"
              alt="No films found"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Recommend;

