import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Recommend = () => {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('content');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const session = getSession();
  const user_id = session?.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refreshProfile = searchParams.get('refreshProfile') === 'true';
  const observerTarget = useRef(null);
  const currentPageRef = useRef(1);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const loadFilms = async () => {
    setLoading(true);
    
    try {
      const response = await axios.get(
        `/api/get_batch?user_id=${user_id}&category=${category}&page=1`
      );
      const filmsData = response.data.films || [];
      
      setFilms(filmsData);
      setCurrentPage(1);
      
      // Check if there are more pages
      if (filmsData.length === 0) {
        setHasMore(false);
      } else if (filmsData.length < 100) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (error) {
      console.error('Error loading recommended films:', error);
      setFilms([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileAndLoad = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/update_profile_and_vectors?user_id=${user_id}`);
      setCurrentPage(1);
      setHasMore(true);
      await loadFilms();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFilms = useCallback(() => {
    if (!isLoadingMore && hasMore && !loading) {
      const nextPage = currentPageRef.current + 1;
      setIsLoadingMore(true);
      
      axios.get(`/api/get_batch?user_id=${user_id}&category=${category}&page=${nextPage}`)
        .then(response => {
          const filmsData = response.data.films || [];
          
          if (filmsData.length > 0) {
            setFilms(prevFilms => {
              // Avoid duplicates
              const existingIds = new Set(prevFilms.map(f => f.tconst));
              const newFilms = filmsData.filter(f => !existingIds.has(f.tconst));
              return [...prevFilms, ...newFilms];
            });
            setCurrentPage(nextPage);
            
            // Check if there are more pages
            // Backend returns PAGE_SIZE films per page (typically 100)
            // If we got 0 films, we're at the end
            // If we got fewer than 100 films, we're at the end (partial batch)
            // If we got exactly 100 films, there might be more
            if (filmsData.length === 0) {
              setHasMore(false);
            } else if (filmsData.length < 100) {
              // Partial batch means we're at the end
              setHasMore(false);
            } else {
              // Full batch (100 films) means there might be more
              setHasMore(true);
            }
          } else {
            setHasMore(false);
          }
          
          setIsLoadingMore(false);
        })
        .catch(error => {
          console.error('Error loading more films:', error);
          setHasMore(false);
          setIsLoadingMore(false);
        });
    }
  }, [hasMore, isLoadingMore, loading, user_id, category]);

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
      // Reset pagination when category changes
      setCurrentPage(1);
      setHasMore(true);
      setFilms([]);
      loadFilms();
    }
  }, [category]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };

  const handleFilmClick = (film, filmIndex) => {
    localStorage.setItem('filmIndex', filmIndex);
    localStorage.setItem('films-source', JSON.stringify(films));
    navigate('/index');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMore || isLoadingMore || loading || films.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreFilms();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, loading, loadMoreFilms, films.length]);

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
            <>
              {films.map((film, index) => (
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
              ))}
              {/* Observer target for infinite scroll */}
              <div ref={observerTarget} style={{ height: '20px', width: '100%' }} />
              {isLoadingMore && (
                <div className="loading-spinner" style={{ display: 'block', margin: '20px auto' }}></div>
              )}
            </>
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

