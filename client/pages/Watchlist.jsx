import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Watchlist = () => {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const session = getSession();
  const user_id = session?.id;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user_id) {
      navigate('/login');
      return;
    }

    loadWatchlist();

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user_id]);

  const loadWatchlist = async () => {
    try {
      const response = await axios.get(`/api/get_user_watchlist?user_id=${user_id}`);
      const watchlist = response.data.watchlist || [];
      setFilms(watchlist);
    } catch (error) {
      console.error('Error loading watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilmClick = (film, filmIndex) => {
    // Set the film index that Index.jsx expects
    localStorage.setItem('filmIndex', filmIndex.toString());
    // Store the film list so Index.jsx knows we're coming from another page
    localStorage.setItem('films-source', JSON.stringify(films));
    navigate('/index');
  };

  const formatRuntime = (runtimeMinutes) => {
    const hours = Math.floor(runtimeMinutes / 60);
    const minutes = runtimeMinutes % 60;
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    }
    return '-';
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '60px' }}>
        <div className="loading-spinner" style={{ display: 'block' }}></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '60px', paddingBottom: '90px' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8" style={{ width: '100%' }}>
          <div id="watchlist-films" className="poster-container" data-id={user_id}>
            {films.length > 0 ? (
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
                      Runtime: <strong>{formatRuntime(film.runtimeMinutes)}</strong>
                    </p>
                    <p>
                      Rating: <strong>{film.averageRating || '-'}</strong>
                    </p>
                    <p>
                      Genre: <strong>{film.genres}</strong>
                    </p>
                    <p>{film.plot}</p>
                  </figcaption>
                  <img
                    className="film-poster"
                    src={film.poster ? baseImagePath + film.poster : '/images/MissingPoster.jpeg'}
                    alt={film.title || film.primaryTitle}
                  />
                </figure>
              ))
            ) : (
              <img
                className="notFound"
                src="/images/NotFound_Rocketman.png"
                alt="Watchlist is empty"
              />
            )}
          </div>
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
    </div>
  );
};

export default Watchlist;

