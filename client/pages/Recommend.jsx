import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';
import NavbarFilter, { useFilter } from '../components/NavbarFilter';

const baseImagePath = 'https://image.tmdb.org/t/p/w500';
const PAGE_SIZE = parseInt(import.meta.env.VITE_PAGE_SIZE);

const categoryOptions = [
  { value: 'content', label: 'All combined' },
  { value: 'plot', label: 'Storylines' },
  { value: 'cast', label: 'Cast' },
  { value: 'crew', label: 'Crew' },
  { value: 'genre', label: 'Genres' },
];

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
  const { isFilterOpen, closeFilter } = useFilter();
  const [searchParams] = useSearchParams();
  const refreshProfile = searchParams.get('refreshProfile') === 'true';
  const observerTarget = useRef(null);
  const currentPageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const loadFilms = async () => {
    setLoading(true);
    
    try {
      const cacheKey = `recommendations_${user_id}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const recommendationsCache = JSON.parse(cached);
          if (recommendationsCache[category]) {
            const filmsData = recommendationsCache[category];
            setFilms(filmsData);
            setCurrentPage(1);
            setHasMore(filmsData.length === PAGE_SIZE);
            setLoading(false);
            return;
          }
        } catch {
        }
      }
      
      const response = await axios.get(
        `/api/get_batch?user_id=${user_id}&category=${category}&page=1`
      );
      const filmsData = response.data || [];
      
      setFilms(filmsData);
      setCurrentPage(1);
      setHasMore(filmsData.length === PAGE_SIZE);
      
      try {
        const recommendationsCache = cached ? JSON.parse(cached) : {};
        recommendationsCache[category] = filmsData;
        localStorage.setItem(cacheKey, JSON.stringify(recommendationsCache));
      } catch {
      }
    } catch {
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
      
      const cacheKey = `recommendations_${user_id}`;
      localStorage.removeItem(cacheKey);
      
      setCurrentPage(1);
      setHasMore(true);
      await loadFilms();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFilms = useCallback(() => {
    if (isLoadingMoreRef.current) return;
    if (!hasMore || loading) return;

    isLoadingMoreRef.current = true;
      const nextPage = currentPageRef.current + 1;
      setIsLoadingMore(true);
      
      axios.get(`/api/get_batch?user_id=${user_id}&category=${category}&page=${nextPage}`)
        .then(response => {
          const filmsData = response.data || [];
          
          if (filmsData.length > 0) {
            setFilms(prevFilms => {
              const existingIds = new Set(prevFilms.map(f => f.tconst));
              const newFilms = filmsData.filter(f => !existingIds.has(f.tconst));
              return [...prevFilms, ...newFilms];
            });
            setCurrentPage(nextPage);
            setHasMore(filmsData.length === PAGE_SIZE);
          } else {
            setHasMore(false);
          }
          
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;
        })
        .catch(() => {
          setHasMore(false);
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;
        });
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
      setCurrentPage(1);
      setHasMore(true);
      setFilms([]);
      loadFilms();
    }
  }, [category]);

  const handleCategoryChange = useCallback((e) => {
    setCategory(e.target.value);
  }, []);

  const handleMobileCategoryClick = useCallback((value) => {
    setCategory(value);
  }, []);


  const handleFilmClick = (film, filmIndex) => {
    localStorage.setItem('filmIndex', filmIndex);
    localStorage.setItem('films-source', JSON.stringify(films));
    navigate('/index');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    <div className="container page-container">
      <div className="row justify-content-center align-items-center">
        <div className="col-lg-6 col-md-6 desktop-only">
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
              <option value="content">All combined</option>
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

      {/* Mobile filter menu */}
      <NavbarFilter isOpen={isFilterOpen && window.innerWidth <= 991} onClose={closeFilter}>
        <div className="mobile-filter-content mobile-filter-content-recommend" style={{ padding: '0' }}>
          {categoryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`mobile-filter-button ${category === option.value ? 'active' : ''}`}
              onClick={() => {
                handleMobileCategoryClick(option.value);
                closeFilter();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </NavbarFilter>
    </div>
  );
};

export default Recommend;

