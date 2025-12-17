import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const PAGE_SIZE = parseInt(import.meta.env.VITE_PAGE_SIZE);
const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Index = () => {
  const [filmCache, setFilmCache] = useState([]);
  const [cacheStartIndex, setCacheStartIndex] = useState(0);
  const [filmIndex, setFilmIndex] = useState(0);
  const [currentFilm, setCurrentFilm] = useState(null);
  const [isClickLocked, setIsClickLocked] = useState(false);
  const [filtered, setFiltered] = useState(false);
  const [outside, setOutside] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [watchList, setWatchList] = useState([]);
  const [myLiked, setMyLiked] = useState([]);
  const [myLoved, setMyLoved] = useState([]);
  const [likedElements, setLikedElements] = useState([]);
  const [likedCast, setLikedCast] = useState([]);
  const [isLoved, setIsLoved] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState({
    rating: 'Any',
    genre: 'Any',
    runtime: 'Any',
    year: 'Any'
  });
  const isLoadingRef = useRef(false);
  const isLoadingUserDataRef = useRef(false);

  const session = getSession();
  const user_id = session?.id;
  const location = useLocation();

  // Load user's watchlist, liked, and loved films from cache or API
  const loadUserData = async () => {
    if (!user_id) return;
    if (isLoadingUserDataRef.current) return;

    isLoadingUserDataRef.current = true;

    try {
      const cached = localStorage.getItem('user_data');

      if (cached) {
        try {
          const data = JSON.parse(cached);
          setWatchList(data.watchlist || []);
          setMyLiked(data.liked || []);
          setMyLoved(data.loved || []);

        } catch (e) {
          console.error('Error parsing cached user data:', e);
        }
      }
      else {
        try {
          const [watchListRes, likedRes, lovedRes] = await Promise.all([
            axios.get(`/api/getWatchlist?user_id=${user_id}`),
            axios.get(`/api/getLikedFilms?user_id=${user_id}`),
            axios.get(`/api/getLovedFilms?user_id=${user_id}`),
          ]);
          // Ensure we store full film objects with metadata
          const userData = {
            watchlist: watchListRes.data,
            liked: likedRes.data,
            loved: lovedRes.data,
          };

          setWatchList(userData.watchlist);
          setMyLiked(userData.liked);
          setMyLoved(userData.loved);

          localStorage.setItem('user_data', JSON.stringify(userData));

        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    } finally {
      isLoadingUserDataRef.current = false;
    }
  };

  // Update cache with current state values
  const updateUserDataCache = () => {
    try {
      localStorage.setItem('user_data', JSON.stringify({
        watchlist: watchList,
        liked: myLiked,
        loved: myLoved,
      }));
    } catch (e) {
      console.error('Error updating user_data cache:', e);
    }
  };

  // Update cache with explicit values (use when state hasn't updated yet)
  const updateUserDataCacheWithValues = (watchlist, liked, loved) => {
    try {
      localStorage.setItem('user_data', JSON.stringify({
        watchlist: watchlist ?? watchList,
        liked: liked ?? myLiked,
        loved: loved ?? myLoved,
      }));
    } catch (e) {
      console.error('Error updating user_data cache:', e);
    }
  };

  useEffect(() => {
    const shouldShuffle = localStorage.getItem('shouldShuffle');

    if (shouldShuffle === 'true') {
      localStorage.removeItem('shouldShuffle');
      setLoading(true);
      setCurrentFilm(null);
      setFilmCache([]);

      const shuffleAndReset = async () => {
        try {
          const currentUserId = getSession()?.id;
          const url = currentUserId ? `/api/shuffleFilms?user_id=${currentUserId}` : `/api/shuffleFilms`;
          await axios.post(url);
        } catch (error) {
          console.error('Error shuffling films:', error);
        }
        setFiltered(false);
        setOutside(false);
        setFilmIndex(0);
        setCacheStartIndex(0);
        localStorage.setItem('filmIndex', 0);
        // Clear any cached index page films when shuffling
        localStorage.removeItem('indexPageFilms');
        localStorage.removeItem('films-source');
        const defaultFilters = { rating: 'Any', genre: 'Any', runtime: 'Any', year: 'Any' };
        setFilterValues(defaultFilters);
        localStorage.setItem('activeFilters', JSON.stringify(defaultFilters));
        await loadFilms(0);
      };
      shuffleAndReset();
      return;
    }
    const savedIndex = localStorage.getItem('filmIndex');
    const initialIndex = savedIndex ? parseInt(savedIndex) : 0;

    // Check if coming from another page
    const hasFilmsSource = localStorage.getItem('films-source');
    let initialCacheStart;

    if (hasFilmsSource) {
      setOutside(true);
      // Clear filters when coming from Profile/other pages
      setFiltered(false);

      // For outside films, calculate cache start based on the actual film list size
      const films_JSON = JSON.parse(hasFilmsSource);
      const totalFilms = films_JSON.length;
      initialCacheStart = totalFilms < PAGE_SIZE
        ? 0
        : Math.floor(initialIndex / PAGE_SIZE) * PAGE_SIZE;
      setFilmIndex(initialIndex);
      setCacheStartIndex(initialCacheStart);
    } else {
      initialCacheStart = Math.floor(initialIndex / PAGE_SIZE) * PAGE_SIZE;
      setFilmIndex(initialIndex);
      setCacheStartIndex(initialCacheStart);
    }

    if (!localStorage.getItem('films-source')) {
      const savedFilters = localStorage.getItem('activeFilters');
      if (savedFilters) {
        try {
          const filters = JSON.parse(savedFilters);
          setFilterValues(filters);
          const hasActiveFilters = !(filters.rating === 'Any' && filters.genre === 'Any' &&
            filters.runtime === 'Any' && filters.year === 'Any');
          if (hasActiveFilters) {
            setFiltered(true);
          }
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      }
    }

    loadUserData();
    loadFilms(initialCacheStart);
  }, [location.key]);

  // Listen for mobile menu opening to close filter menu (mobile only)
  useEffect(() => {
    const handleCloseFilterMenu = () => {
      // Only close filter on mobile views
      if (window.innerWidth <= 991) {
        setShowFilters(false);
      }
    };
    
    const handleToggleFilterMenu = (event) => {
      if (window.innerWidth <= 991) {
        setShowFilters(event.detail);
      }
    };
    
    window.addEventListener('closeFilterMenu', handleCloseFilterMenu);
    window.addEventListener('toggleFilterMenu', handleToggleFilterMenu);
    
    return () => {
      window.removeEventListener('closeFilterMenu', handleCloseFilterMenu);
      window.removeEventListener('toggleFilterMenu', handleToggleFilterMenu);
    };
  }, []);

  // Render filter form into mobile filter menu
  useEffect(() => {
    if (window.innerWidth <= 991 && showFilters) {
      const mobileFilterContent = document.getElementById('mobile-filter-content');
      const filterOptions = document.getElementById('filterOptions');
      
      if (mobileFilterContent && filterOptions) {
        const formContent = filterOptions.querySelector('form');
        if (formContent) {
          mobileFilterContent.innerHTML = '';
          const clonedForm = formContent.cloneNode(true);
          mobileFilterContent.appendChild(clonedForm);
          
          // Re-attach event handlers using event delegation
          clonedForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFilterSubmit(e);
          });
          
          // Attach reset button handler
          const resetButton = clonedForm.querySelector('button[type="button"]');
          if (resetButton) {
            resetButton.addEventListener('click', () => {
              handleFilterReset();
            });
          }
          
          // Update select values and attach change handlers
          ['filterRating', 'filterGenre', 'filterRuntime', 'filterYear'].forEach(id => {
            const select = clonedForm.querySelector(`#${id}`);
            if (select) {
              const key = id.replace('filter', '').toLowerCase();
              select.value = filterValues[key];
              select.addEventListener('change', (e) => {
                setFilterValues({ ...filterValues, [key]: e.target.value });
              });
            }
          });
        }
      }
    }
  }, [showFilters, filterValues]);

  // Check if current film is in cache, load new cache if needed
  useEffect(() => {
    const cacheEndIndex = cacheStartIndex + filmCache.length;

    if (outside) {
      const films_JSON = JSON.parse(localStorage.getItem('films-source'));
      const totalFilms = films_JSON.length;

      if (filmIndex >= totalFilms) {
        setFilmIndex(Math.max(0, totalFilms - 1));
        return;
      }

      if (filmIndex < cacheStartIndex || filmIndex >= cacheEndIndex) {
        if (!loading) {
          const newCacheStart = totalFilms < PAGE_SIZE
            ? 0
            : Math.floor(filmIndex / PAGE_SIZE) * PAGE_SIZE;
          loadFilms(newCacheStart);
        }
      } else if (filmCache.length > 0 && !loading) {
        updateFilm();
      }
    } else {
      if (filmIndex < cacheStartIndex || filmIndex >= cacheEndIndex) {
        if (!loading) {
          const newCacheStart = Math.floor(filmIndex / PAGE_SIZE) * PAGE_SIZE;
          loadFilms(newCacheStart);
        }
      } else if (filmCache.length > 0 && !loading) {
        updateFilm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filmIndex, cacheStartIndex, outside, loading]);

  // Fetch films from API or localStorage based on filter state
  const getFilms = async (startGlobalIndex) => {
    try {
      const filmsSource = localStorage.getItem('films-source');
      const startPage = Math.floor(startGlobalIndex / PAGE_SIZE) + 1;
      const endPage = Math.floor(startGlobalIndex / PAGE_SIZE) + 2;

      let allFilmsData = [];

      if (filtered) {
        // Map global index to backend pages using PAGE_SIZE
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          const response = await fetch(`/api/filteredPageFilms?page=${pageNum}`);
          if (response.ok) {
            const pageData = await response.json();
            allFilmsData = allFilmsData.concat(pageData);
          }
        }
      } else if (filmsSource) {
        const films_JSON = JSON.parse(localStorage.getItem('films-source'));
        allFilmsData = films_JSON.slice(startGlobalIndex, startGlobalIndex + PAGE_SIZE);
      } else {
        // Load all pages needed for 250 films
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          const response = await fetch(`/api/indexPageFilms?page=${pageNum}`);
          if (response.ok) {
            const pageData = await response.json();
            allFilmsData = allFilmsData.concat(pageData);
          }
        }
      }

      return allFilmsData.slice(0, PAGE_SIZE);

    } catch (error) {
      console.error('Error fetching films:', error);
      return [];
    }
  };

  const loadFilms = async (startIndex) => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setLoading(true);
    try {
      const filmsData = await getFilms(startIndex);
      if (filmsData && filmsData.length > 0) {
        setFilmCache(filmsData);
        setCacheStartIndex(startIndex);
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Update displayed film info and user interaction state
  const updateFilm = async () => {
    const localIndex = filmIndex - cacheStartIndex;
    if (filmCache.length === 0 || localIndex < 0 || localIndex >= filmCache.length) return;

    let film = filmCache[localIndex];
    let likedEntry = null;
    let lovedEntry = null;
    
    if (user_id) {
      likedEntry = myLiked.find((f) => f.tconst === film.tconst);
      lovedEntry = myLoved.find((f) => f.tconst === film.tconst);
      const watchlistEntry = watchList.find((f) => f.tconst === film.tconst);
      
      if (!likedEntry && !lovedEntry) {
        try {
          const cached = localStorage.getItem('user_data');
          if (cached) {
            const data = JSON.parse(cached);
            lovedEntry = data?.loved.find((f) => f.tconst === film.tconst);
            likedEntry = data?.liked.find((f) => f.tconst === film.tconst);
          }
        } catch (e) {
          console.error('Error parsing cached user data:', e);
        }
      }
      
      const fullFilmData = likedEntry || lovedEntry || watchlistEntry;
      if (fullFilmData) {
        film = { ...fullFilmData, ...film };
        if (likedEntry && likedEntry.likedElements) {
          film.likedElements = likedEntry.likedElements;
        }
        if (likedEntry && likedEntry.likedCast) {
          film.likedCast = likedEntry.likedCast;
        }
      }
    }
    
    const imageUrl = film.poster ? baseImagePath + film.poster : "/images/MissingPoster.jpeg";
    const imagePreload = new Image();

    await new Promise((resolve, reject) => {
      imagePreload.onload = resolve;
      imagePreload.onerror = resolve;
      imagePreload.src = imageUrl;
    });

    setCurrentFilm(film);
    localStorage.setItem('filmIndex', filmIndex);

    if (user_id) {
      // Watchlist state is driven purely from current watchList
      setIsInWatchlist(watchList.some((f) => f.tconst === film.tconst));

      // Check both state and cache for loved/liked status (state might not be loaded yet)
      let isLovedFilm = myLoved.some((f) => f.tconst === film.tconst);
      let likedEntry = myLiked.find((f) => f.tconst === film.tconst);
      
      // Fallback to cache if state isn't ready yet
      if (!likedEntry && !isLovedFilm) {
        try {
          const cached = localStorage.getItem('user_data');
          if (cached) {
            const data = JSON.parse(cached);
            isLovedFilm = (data.loved || []).some((f) => f.tconst === film.tconst);
            likedEntry = (data.liked || []).find((f) => f.tconst === film.tconst);
          }
        } catch (e) {
          // Ignore cache parse errors
        }
      }
      
      setIsLoved(isLovedFilm);

      if (isLovedFilm) {
        // Loved films: highlight everything.
        const allElements = [
          'Title', 'Plot', 'Rating', 'Genre', 'Runtime', 'Year',
          'Director', 'Camera', 'Writer', 'Producer', 'Editor', 'Composer'
        ];
        const allCast = film.cast ? film.cast.split(',').map(c => c.trim()) : [];
        setLikedElements(allElements);
        setLikedCast(allCast);

      } else if (likedEntry) {
        // Safely get liked elements and cast, with fallbacks
        const elements = (likedEntry.likedElements && Array.isArray(likedEntry.likedElements)) ? likedEntry.likedElements : [];
        const cast = (likedEntry.likedCast && Array.isArray(likedEntry.likedCast)) ? likedEntry.likedCast : [];
        setLikedElements(elements || []);
        setLikedCast(cast || []);

        // If all likeables are liked, mark as loved in UI (without another API call).
        setTimeout(() => {
          const totalLikeables = document.querySelectorAll('.likeable').length;
          const likedCount = elements.length + cast.length;
          if (totalLikeables > 0 && likedCount === totalLikeables) {
            setIsLoved(true);
          }
        }, 0);
      } else {
        // Film is neither loved nor liked
        setLikedElements([]);
        setLikedCast([]);
      }
    }

    setIsClickLocked(false);
  };

  // Navigate to next film with looping support
  const handleNext = async () => {
    if (isClickLocked) return;
    setIsClickLocked(true);

    setFilmIndex(prev => {
      if (outside) {
        const films_JSON = JSON.parse(localStorage.getItem('films-source') || '[]');
        const totalFilms = films_JSON.length;
        if (prev + 1 >= totalFilms) {
          return 0;
        }
      }
      return prev + 1;
    });

    setIsClickLocked(false);
  };

  const handlePrev = async () => {
    if (isClickLocked) return;
    setIsClickLocked(true);

    setFilmIndex(prev => {
      if (prev === 0) {
        // If we're outside, loop to the end
        if (outside) {
          const films_JSON = JSON.parse(localStorage.getItem('films-source') || '[]');
          return Math.max(0, films_JSON.length - 1);
        }
        return 0;
      }
      return prev - 1;
    });

    setIsClickLocked(false);
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
  }, [filmIndex, isClickLocked]);

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

    // Handle moving films between loved and liked based on attribute state
    setTimeout(async () => {
      const totalLikeables = document.querySelectorAll('.likeable').length;
      const likedCount = newLikedElements.length + newLikedCast.length;
      const allAttributesLiked = likedCount === totalLikeables && totalLikeables > 0;

      // If all attributes are liked and film is not loved -> move from liked to loved
      if (allAttributesLiked && !isLoved) {
        await handleLoveFilm();
      } else if (isLoved && !allAttributesLiked) {
        try {
          await axios.post(`/api/unloveFilm`, {
            film_id: currentFilm.tconst,
            user_id: user_id,
          });
          setIsLoved(false);
          
          // Remove from loved (film can only be in one list)
          const newLoved = myLoved.filter(f => f.tconst !== currentFilm.tconst);
          setMyLoved(newLoved);

          // Add/update in liked (ensure no duplicates)
          const existingLikedIndex = myLiked.findIndex(f => f.tconst === currentFilm.tconst);
          const filmToAdd = {
            ...currentFilm,
            likedElements: newLikedElements,
            likedCast: newLikedCast,
          };
          
          let updatedLiked;
          if (existingLikedIndex >= 0) {
            // Update existing entry
            updatedLiked = [...myLiked];
            updatedLiked[existingLikedIndex] = filmToAdd;
          } else {
            // Add new entry
            updatedLiked = [...myLiked, filmToAdd];
          }
          setMyLiked(updatedLiked);
          updateUserDataCacheWithValues(null, updatedLiked, newLoved);
          clearRecommendationsCache();

          await saveElements(newLikedElements, newLikedCast, updatedLiked);
        } catch (error) {
          console.error('Error unloving film:', error);
        }
      } 
      // Film remains in liked list (some but not all attributes liked)
      else {
        // Update liked entry with new liked elements/cast
        await saveElements(newLikedElements, newLikedCast);
      }
    }, 0);
  };

  const clearRecommendationsCache = () => {
    if (!user_id) return;
    const cacheKey = `recommendations_${user_id}`;
    localStorage.removeItem(cacheKey);
  };

  const handleLoveFilm = async () => {
    if (!user_id || !currentFilm) return;

    try {
      await axios.post(`/api/loveFilm`, {
        film_id: currentFilm.tconst,
        user_id: user_id,
      });
      setIsLoved(true);
      
      const filteredLoved = myLoved.filter(f => f.tconst !== currentFilm.tconst);
      const newLoved = [...filteredLoved, currentFilm];
      setMyLoved(newLoved);

      const newLiked = myLiked.filter(f => f.tconst !== currentFilm.tconst);
      setMyLiked(newLiked);

      const allElements = ['Title', 'Plot', 'Rating', 'Genre', 'Runtime', 'Year', 'Director', 'Camera', 'Writer', 'Producer', 'Editor', 'Composer'];
      const allCast = currentFilm.cast ? currentFilm.cast.split(',').map(c => c.trim()) : [];

      setLikedElements(allElements);
      setLikedCast(allCast);

      updateUserDataCacheWithValues(null, newLiked, newLoved);
      clearRecommendationsCache();

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
      const newLoved = myLoved.filter(f => f.tconst !== currentFilm.tconst);
      setMyLoved(newLoved);
      setLikedElements([]);
      setLikedCast([]);

      const newLiked = myLiked.filter(f => f.tconst !== currentFilm.tconst);
      setMyLiked(newLiked);
      updateUserDataCacheWithValues(null, newLiked, newLoved);
      clearRecommendationsCache();

      await saveElements([], []);
    } catch (error) {
      console.error('Error unloving film:', error);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!user_id || !currentFilm) return;

    try {
      const isRemoving = isInWatchlist;
      const endpoint = isRemoving ? '/api/deleteWatchlist' : '/api/addWatchlist';
      
      await axios.post(endpoint, {
        film_id: currentFilm.tconst,
        user_id: user_id,
      });

      const newWatchlist = isRemoving
        ? watchList.filter(f => f.tconst !== currentFilm.tconst)
        : [...watchList, currentFilm];

      setWatchList(newWatchlist);
      setIsInWatchlist(!isRemoving);
      
      // Update cache with new watchlist (state hasn't updated yet)
      updateUserDataCacheWithValues(newWatchlist, null, null);
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  const saveElements = async (elements, cast, currentLiked = null) => {
    if (!user_id || !currentFilm) return;

    try {
      await axios.post('/api/saveLikedElements', {
        user_id: user_id,
        film_id: currentFilm.tconst,
        elements: elements,
        cast: cast,
      });

      // Use provided currentLiked or fall back to state (for backward compatibility)
      const likedToUse = currentLiked ?? myLiked;

      // Update myLiked state - ensure film is NOT in myLoved (mutual exclusivity)
      const hasLikes = elements.length > 0 || cast.length > 0;
      const filmIndex = likedToUse.findIndex(f => f.tconst === currentFilm.tconst);
      const existingFilm = filmIndex >= 0 ? likedToUse[filmIndex] : null;

      // Ensure film is removed from loved (can only be in one list)
      const currentLoved = myLoved.filter(f => f.tconst !== currentFilm.tconst);
      
      let updatedLiked;
      if (hasLikes) {
        const filmToSave = {
          ...(existingFilm || currentFilm),
          ...currentFilm, // Ensure currentFilm metadata takes precedence
          likedElements: elements,
          likedCast: cast,
        };
        
        if (filmIndex >= 0) {
          updatedLiked = [...likedToUse];
          updatedLiked[filmIndex] = filmToSave;
        } else {
          updatedLiked = [...likedToUse, filmToSave];
        }
      } else {
        // Remove from liked if no elements/cast
        updatedLiked = likedToUse.filter(f => f.tconst !== currentFilm.tconst);
      }

      setMyLiked(updatedLiked);
      if (currentLoved.length !== myLoved.length) {
        setMyLoved(currentLoved);
      }
      updateUserDataCacheWithValues(null, updatedLiked, currentLoved);
      clearRecommendationsCache();
    } catch (error) {
      console.error('Error saving elements:', error);
    }
  };

  const handleFilterSubmit = async (e) => {
    e.preventDefault();
    const filter = {
      rating: filterValues.rating,
      genre: filterValues.genre,
      runtime: filterValues.runtime,
      year: filterValues.year,
    };

    localStorage.setItem('activeFilters', JSON.stringify(filter));

    try {
      const response = await axios.post('/api/filter', null, {
        params: { filter: JSON.stringify(filter) }
      });
      if (response.data !== undefined && response.data !== null) {
        setFiltered(true);
        setFilmIndex(0);
        setCacheStartIndex(0);
        setFilmCache([]);
        await loadFilms(0);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }

    setShowFilters(false);
  };

  const handleFilterReset = async () => {
    const defaultFilters = { rating: 'Any', genre: 'Any', runtime: 'Any', year: 'Any' };
    setFilterValues(defaultFilters);
    localStorage.setItem('activeFilters', JSON.stringify(defaultFilters));

    // Update mobile filter form selects to "Any"
    if (window.innerWidth <= 991) {
      const mobileFilterContent = document.getElementById('mobile-filter-content');
      if (mobileFilterContent) {
        const form = mobileFilterContent.querySelector('form');
        if (form) {
          ['filterRating', 'filterGenre', 'filterRuntime', 'filterYear'].forEach(id => {
            const select = form.querySelector(`#${id}`);
            if (select) {
              select.value = 'Any';
            }
          });
        }
      }
    }

    // Clear index page films cache when filters are reset
    localStorage.removeItem('indexPageFilms');
    localStorage.removeItem('films-source');

    setFiltered(false);
    setOutside(false);
    setFilmIndex(0);
    setCacheStartIndex(0);
    setFilmCache([]);
    await loadFilms(0);
  };

  if (loading || !currentFilm) {
    return (
      <div className="view-container" style={{ paddingTop: '75px' }}>
        <div className="loading-spinner" style={{ display: 'block' }}></div>
      </div>
    );
  }


  // Render film details with likeable attributes
  const renderFilmInfo = () => {
    if (!currentFilm) return null;

    const likeableClass = user_id ? 'likeable' : '';

    // Format runtime minutes to readable format
    const formatRuntime = (runtimeMinutes) => {
      if (runtimeMinutes === '\\N' || !runtimeMinutes) return '-';
      const hours = Math.floor(runtimeMinutes / 60);
      const minutes = runtimeMinutes % 60;
      if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h`;
      if (minutes > 0) return `${minutes}m`;
      return '-';
    };

    const genres = currentFilm.genres ? currentFilm.genres.split(',').map(g => g.trim()) : [];
    const cast = currentFilm.cast ? currentFilm.cast.split(',').map(c => c.trim()) : [];
    const directors = currentFilm.director ? currentFilm.director.split(',').map(d => d.trim()) : [];
    const cinematographers = currentFilm.cinematographer ? currentFilm.cinematographer.split(',').map(c => c.trim()) : [];
    const writers = currentFilm.writer ? currentFilm.writer.split(',').map(w => w.trim()) : [];
    const producers = currentFilm.producer ? currentFilm.producer.split(',').map(p => p.trim()) : [];
    const editors = currentFilm.editor ? currentFilm.editor.split(',').map(e => e.trim()) : [];
    const composers = currentFilm.composer ? currentFilm.composer.split(',').map(c => c.trim()) : [];

    return (
      <div id="film-info" className="h3 text-center" data-email={session?.email} data-id={user_id}>
        <div
          id="_filmTitle"
          className={`${likeableClass} ${likedElements.includes('Title') ? 'liked' : ''}`}
          onClick={() => user_id && handleLikeElement('Title')}
          style={{ cursor: user_id ? 'pointer' : 'default' }}
        >
          <strong>{currentFilm.primaryTitle || ''}</strong>
        </div>

        <div
          id="_filmPlot"
          className={`small-text py-1 mb-1 ${likeableClass} ${likedElements.includes('Plot') ? 'liked' : ''}`}
          onClick={() => user_id && handleLikeElement('Plot')}
          style={{ cursor: user_id ? 'pointer' : 'default' }}
        >
          <p>{currentFilm.plot || ''}</p>
        </div>

        <div className="row d-flex">
          <div
            id="_filmRating"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${likeableClass} ${likedElements.includes('Rating') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Rating')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">RATING</div>
            <div className="p text-center">{currentFilm.averageRating || '-'}</div>
          </div>

          <div
            id="_filmGenre"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${likeableClass} ${likedElements.includes('Genre') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Genre')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">GENRE</div>
            <div className="list-unstyled" style={{ fontSize: '18px' }}>
              {genres.map((genre, idx) => (
                <li key={idx}>{genre}</li>
              ))}
            </div>
          </div>

          <div
            id="_filmRuntime"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${likeableClass} ${likedElements.includes('Runtime') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Runtime')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">RUNTIME</div>
            <div className="p text-center">{formatRuntime(currentFilm.runtimeMinutes)}</div>
          </div>

          <div
            id="_filmYear"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${likeableClass} ${likedElements.includes('Year') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Year')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">YEAR</div>
            <div className="p text-center">{currentFilm.startYear || '-'}</div>
          </div>
        </div>

        <div className="col-lg col-md col-sm-12 py-3">
          <div className="h5 text-center">CAST</div>
          <div className="container px-2">
            <div className="d-flex justify-content-center align-items-center" style={{ flexWrap: 'wrap', gap: '5px' }}>
              {cast.map((actor, idx) => (
                <div
                  key={`${actor}-${idx}`}
                  id={actor}
                  className={`actor d-flex align-items-center ${likeableClass} cast ${likedCast.includes(actor) ? 'liked' : ''}`}
                  onClick={() => user_id && handleLikeElement(actor, true)}
                  style={{ cursor: user_id ? 'pointer' : 'default' }}
                >
                  <span className="medium-text">{actor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="row d-flex justify-content-center py-2">
          <div
            id="_filmDirector"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Director') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Director')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">DIRECTOR</div>
            {directors.map((name, idx) => (
              <div key={`director-${idx}`} className="p medium-text text-center">
                {name}
              </div>
            ))}
          </div>

          <div
            id="_filmCamera"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Camera') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Camera')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">CAMERA</div>
            {cinematographers.map((name, idx) => (
              <div key={`camera-${idx}`} className="p medium-text text-center">
                {name}
              </div>
            ))}
          </div>

          <div
            id="_filmWriter"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Writer') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Writer')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">WRITER</div>
            {writers.map((name, idx) => (
              <div key={`writer-${idx}`} className="p medium-text text-center">
                {name}
              </div>
            ))}
          </div>
        </div>

        <div className="row d-flex justify-content-center py-2" style={{ paddingBottom: '40px' }}>
          <div
            id="_filmProducer"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Producer') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Producer')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">PRODUCER</div>
            {producers.map((name, idx) => (
              <div key={`producer-${idx}`} className="p medium-text text-center">
                {name}
              </div>
            ))}
          </div>

          <div
            id="_filmEditor"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Editor') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Editor')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">EDITOR</div>
            {editors.map((name, idx) => (
              <div key={`editor-${idx}`} className="p medium-text text-center">
                {name}
              </div>
            ))}
          </div>

          <div
            id="_filmComposer"
            className={`col-lg col-md col-sm border border-3 mx-3 px-2 ${user_id ? 'likeable' : ''} ${likedElements.includes('Composer') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Composer')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <div className="h5 mb-1 py-1 border-bottom">COMPOSER</div>
            {composers.map((name, idx) => (
              <div key={`composer-${idx}`} className="p medium-text text-center">
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="view-container">
      <div className="row">
        {/* Filters */}
        <div className="filter-button-container">
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
                    <select
                      id="filterRating"
                      className="form-select"
                      value={filterValues.rating}
                      onChange={(e) => setFilterValues({ ...filterValues, rating: e.target.value })}
                    >
                      <option value="Any">Any</option>
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
                    <select
                      id="filterGenre"
                      className="form-select"
                      value={filterValues.genre}
                      onChange={(e) => setFilterValues({ ...filterValues, genre: e.target.value })}
                    >
                      <option value="Any">Any</option>
                      {['Drama', 'Action', 'Comedy', 'Sci-Fi', 'Fantasy', 'Romance', 'Family', 'Horror', 'Mystery', 'Documentary'].map((genre) => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Runtime */}
                  <div className="mb-2">
                    <label htmlFor="filterRuntime" className="form-label">
                      Runtime
                    </label>
                    <select
                      id="filterRuntime"
                      className="form-select"
                      value={filterValues.runtime}
                      onChange={(e) => setFilterValues({ ...filterValues, runtime: e.target.value })}
                    >
                      <option value="Any">Any</option>
                      {['≤ 1Hr', '≤ 1Hr 30m', '≤ 2Hrs', '≤ 2Hrs 30m', '≤ 3Hrs', 'really long...'].map((runtime) => (
                        <option key={runtime} value={runtime}>{runtime}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div className="mb-2">
                    <label htmlFor="filterYear" className="form-label">
                      Year
                    </label>
                    <select
                      id="filterYear"
                      className="form-select"
                      value={filterValues.year}
                      onChange={(e) => setFilterValues({ ...filterValues, year: e.target.value })}
                    >
                      <option value="Any">Any</option>
                      {['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s'].map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="d-flex gap-2 mt-3">
                    <button type="submit" className="btn btn-primary" style={{ flex: '2' }}>
                      apply
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ flex: '1' }} onClick={handleFilterReset}>
                      reset
                    </button>
                  </div>
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
                  <img
                    src={currentFilm.poster ? baseImagePath + currentFilm.poster : "/images/MissingPoster.jpeg"}
                    alt={currentFilm.primaryTitle || "Film Poster"}
                  />
                </div>
              </div>

              {/* Previous button */}
              <button
                style={{ backgroundColor: 'rgba(255, 255, 255, 0)' }}
                id="prev-btn"
                className="carousel-control-prev"
                type="button"
                onClick={handlePrev}
                disabled={filmIndex === 0}
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
                disabled={filmCache.length === 0 || (filmIndex - cacheStartIndex >= filmCache.length - 1 && filmCache.length < PAGE_SIZE)}
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
                      style={{ cursor: 'pointer' }}
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
                      style={{ cursor: 'pointer' }}
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

