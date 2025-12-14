import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const CACHE_SIZE = 250;
const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Index = () => {
  const [filmCache, setFilmCache] = useState([]); // Cache of 250 films
  const [cacheStartIndex, setCacheStartIndex] = useState(0); // Global index where cache starts
  const [filmIndex, setFilmIndex] = useState(0); // Single global index for current film
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
  const hasInitialized = useRef(false);
  const isLoadingRef = useRef(false);
  
  const session = getSession();
  const user_id = session?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();


  // Load user data once on mount or when user_id changes
  const loadUserData = async () => {
    if (!user_id) return;
    
    const cached = localStorage.getItem('user_data');
    
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setWatchList(data.watchlist || []);
        // Convert liked dictionary to array for state
        // Dictionary items are { tconst, ...filmProps, elements, cast }
        // Extract just the film properties (excluding elements and cast) for state
        const likedDict = data.liked || {};
        setMyLiked(Object.values(likedDict).map(item => {
          // Handle both old structure (item.film) and new structure (item.tconst)
          if (item.film) {
            // Old structure: { film: {...}, elements: [], cast: [] }
            return item.film;
          } else {
            // New structure: { tconst: "...", ...filmProps, elements: [], cast: [] }
            const { elements, cast, ...film } = item;
            return film;
          }
        }));
        setMyLoved(data.loved || []);
        return; // Use cached data, no API calls needed
      } catch (e) {
        console.error('Error parsing cached user data:', e);
        // Fall through to fetch from API if cache is corrupted
      }
    }
    
    // Only fetch from API if not in cache
    try {
      const [watchListRes, likedRes, lovedRes] = await Promise.all([
        axios.get(`/api/getWatchlist?user_id=${user_id}`),
        axios.get(`/api/getLikedFilms?user_id=${user_id}`),
        axios.get(`/api/getLovedFilms?user_id=${user_id}`),
      ]);

      // Convert liked array to dictionary with tconst as key
      // Store full film object, elements, and cast
      const likedDict = {};
      likedRes.data.forEach(film => {
        likedDict[film.tconst] = { ...film, elements: [], cast: [] };
      });

      const userData = {
        watchlist: watchListRes.data,
        liked: likedDict, // Dictionary: { tconst: { film, elements, cast } }
        loved: lovedRes.data,
      };

      setWatchList(userData.watchlist);
      setMyLiked(likedRes.data); // Keep array for state
      setMyLoved(userData.loved);
      
      localStorage.setItem('user_data', JSON.stringify(userData));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateUserDataCache = (watchlist, liked, loved) => {
    localStorage.setItem('user_data', JSON.stringify({ watchlist, liked, loved }));
  };

  useEffect(() => {
    const shouldShuffle = localStorage.getItem('shouldShuffle');
    
    if (shouldShuffle === 'true') {
      localStorage.removeItem('shouldShuffle');
      // Immediately show loading and clear current film for smooth UX
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
        localStorage.removeItem('films-source');
        // Reset filters
        const defaultFilters = { rating: 'Any', genre: 'Any', runtime: 'Any', year: 'Any' };
        setFilterValues(defaultFilters);
        localStorage.setItem('activeFilters', JSON.stringify(defaultFilters));
        await loadFilms(0);
      };
      shuffleAndReset();
      return;
    }

    // Normal page load - restore saved state
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
      // If the list is smaller than cache size, load from 0. Otherwise, load the chunk containing the target film
      initialCacheStart = totalFilms < CACHE_SIZE 
        ? 0 
        : Math.floor(initialIndex / CACHE_SIZE) * CACHE_SIZE;
      
      setFilmIndex(initialIndex);
      setCacheStartIndex(initialCacheStart);
    } else {
      // Normal behavior for regular films
      initialCacheStart = Math.floor(initialIndex / CACHE_SIZE) * CACHE_SIZE;
      setFilmIndex(initialIndex);
      setCacheStartIndex(initialCacheStart);
    }

    // Restore filter values from localStorage (only if not coming from another page)
    if (!localStorage.getItem('films-source')) {
      const savedFilters = localStorage.getItem('activeFilters');
      if (savedFilters) {
        try {
          const filters = JSON.parse(savedFilters);
          setFilterValues(filters);
          // Check if filters are active (not all "Any")
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

    // Load user data once (only if not cached)
    loadUserData();

    // Load initial films once
    loadFilms(initialCacheStart);
  }, [location.key]);

  useEffect(() => {
    // Check if current film is in cache, if not load new cache
    const cacheEndIndex = cacheStartIndex + filmCache.length;
    
    // If we're outside (from Profile/other pages), check bounds against the source films
    if (outside) {
      const films_JSON = JSON.parse(localStorage.getItem('films-source') || '[]');
      const totalFilms = films_JSON.length;
      
      // Ensure filmIndex is within bounds
      if (filmIndex >= totalFilms) {
        setFilmIndex(Math.max(0, totalFilms - 1));
        return;
      }
      
      // For outside films, if the current film is not in cache, load the correct chunk
      if (filmIndex < cacheStartIndex || filmIndex >= cacheEndIndex) {
        // Skip if already loading to prevent duplicate calls
        if (!loading) {
          // For small sets, load from 0. For larger sets, load the chunk containing the target film
          const newCacheStart = totalFilms < CACHE_SIZE 
            ? 0 
            : Math.floor(filmIndex / CACHE_SIZE) * CACHE_SIZE;
          loadFilms(newCacheStart);
        }
      } else if (filmCache.length > 0 && !loading) {
        updateFilm();
      }
    } else {
      // Normal behavior for non-outside films
      if (filmIndex < cacheStartIndex || filmIndex >= cacheEndIndex) {
        // Skip if already loading to prevent duplicate calls
        if (!loading) {
          const newCacheStart = Math.floor(filmIndex / CACHE_SIZE) * CACHE_SIZE;
          loadFilms(newCacheStart);
        }
      } else if (filmCache.length > 0 && !loading) {
        updateFilm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filmIndex, cacheStartIndex, outside, loading]);

  const getFilms = async (startGlobalIndex) => {
    try {
      // Check if we have films-source in localStorage (coming from Profile/other pages)
      // Check this directly instead of relying on state which might not be updated yet
      const filmsSource = localStorage.getItem('films-source');
      
      let allFilmsData = [];
      
      if (filtered) {
        // Calculate which pages we need to load (may need multiple pages to get 250 films)
        const startPage = Math.floor(startGlobalIndex / 100) + 1;
        const endPage = Math.floor((startGlobalIndex + CACHE_SIZE - 1) / 100) + 1;
        // Load all pages needed for 250 films
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          const response = await fetch(`/api/filteredPageFilms?page=${pageNum}`);
          if (response.ok) {
            const pageData = await response.json();
            allFilmsData = allFilmsData.concat(pageData);
          }
        }
      } else if (filmsSource) {
        // Coming from Profile/other pages - load from stored list
        const films_JSON = JSON.parse(filmsSource);
        // If the list is smaller than cache size, load all films from 0
        if (films_JSON.length < CACHE_SIZE) {
          allFilmsData = films_JSON.slice(0);
        } else {
          // Make sure we don't go beyond the array length
          const endIndex = Math.min(startGlobalIndex + CACHE_SIZE, films_JSON.length);
          allFilmsData = films_JSON.slice(startGlobalIndex, endIndex);
        }
      } else {
        // Normal behavior - load from API
        // Calculate which pages we need to load (may need multiple pages to get 250 films)
        const startPage = Math.floor(startGlobalIndex / 100) + 1;
        const endPage = Math.floor((startGlobalIndex + CACHE_SIZE - 1) / 100) + 1;
        // Load all pages needed for 250 films
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          const response = await fetch(`/api/indexPageFilms?page=${pageNum}`);
          if (response.ok) {
            const pageData = await response.json();
            allFilmsData = allFilmsData.concat(pageData);
          }
        }
      }

      // Return exactly CACHE_SIZE films (or less if we've reached the end)
      return allFilmsData.slice(0, CACHE_SIZE);
    } catch (error) {
      console.error('Error fetching films:', error);
      return [];
    }
  };

  const fetchLikedElements = async (filmTconst) => {
    try {
      const elementsRes = await axios.get(
        `/api/getLikedElements?user_id=${user_id}&film_id=${filmTconst}`
      );
      const elements = elementsRes.data.likedElements || [];
      const cast = elementsRes.data.likedCast || [];
      setLikedElements(elements);
      setLikedCast(cast);
      
      // Check if all attributes are liked - if so, ensure film is marked as loved
      setTimeout(() => {
        const totalLikeables = document.querySelectorAll('.likeable').length;
        const likedCount = elements.length + cast.length;
        if (totalLikeables > 0 && likedCount === totalLikeables) {
          const isCurrentlyLoved = myLoved.some((f) => f.tconst === filmTconst);
          if (!isCurrentlyLoved) {
            setIsLoved(true);
          }
        }
      }, 0);
      
      // Update cache in user_data.liked dictionary
      const cached = localStorage.getItem('user_data');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          data.liked = data.liked || {};
          if (data.liked[filmTconst]) {
            // Update existing entry with elements and cast
            data.liked[filmTconst].elements = elements;
            data.liked[filmTconst].cast = cast;
          } else {
            // If film not in liked dict, find it from myLiked state
            const film = myLiked.find(f => f.tconst === filmTconst);
            if (film) {
              // Store film properties directly (not nested in film object)
              data.liked[filmTconst] = { ...film, elements, cast };
            }
          }
          localStorage.setItem('user_data', JSON.stringify(data));
        } catch (e) {
          console.error('Error updating cache:', e);
        }
      }
    } catch (error) {
      console.error('Error loading liked elements:', error);
      setLikedElements([]);
      setLikedCast([]);
    }
  };

  const loadFilms = async (startIndex) => {
    // Prevent duplicate calls
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

  const updateFilm = async () => {
    const localIndex = filmIndex - cacheStartIndex;
    if (filmCache.length === 0 || localIndex < 0 || localIndex >= filmCache.length) return;

    const film = filmCache[localIndex];
    
    // Preload image to ensure it's ready before rendering
    const imageUrl = film.poster ? baseImagePath + film.poster : "/images/MissingPoster.jpeg";
    const imagePreload = new Image();
    
    // Wait for image to load, then update everything together
    await new Promise((resolve, reject) => {
      imagePreload.onload = resolve;
      imagePreload.onerror = resolve; // Resolve even on error to show fallback
      imagePreload.src = imageUrl;
    });

    // Now update all state together
    setCurrentFilm(film);

    // Save current position
    localStorage.setItem('filmIndex', filmIndex);

    // Use cached user data if authenticated
    if (user_id) {
      // Check if film is in watchlist (from cache)
      setIsInWatchlist(watchList.some((f) => f.tconst === film.tconst));

      // Check localStorage cache for most up-to-date loved status
      const cached = localStorage.getItem('user_data');
      let isLovedFilm = false;
      
      if (cached) {
        try {
          const data = JSON.parse(cached);
          // Check both state and cache for loved status
          isLovedFilm = myLoved.some((f) => f.tconst === film.tconst) || 
                       (data.loved && data.loved.some((f) => f.tconst === film.tconst));
        } catch (e) {
          // Fallback to state if cache parse fails
          isLovedFilm = myLoved.some((f) => f.tconst === film.tconst);
        }
      } else {
        // No cache, use state
        isLovedFilm = myLoved.some((f) => f.tconst === film.tconst);
      }
      
      setIsLoved(isLovedFilm);

      // Load liked elements if film is liked (from cache)
      const isFilmLiked = myLiked.some((f) => f.tconst === film.tconst);
      if (isFilmLiked) {
        // Check localStorage cache for liked elements in liked dictionary
        if (cached) {
          try {
            const data = JSON.parse(cached);
            const likedFilm = data.liked?.[film.tconst];
            if (likedFilm && (likedFilm.elements?.length > 0 || likedFilm.cast?.length > 0)) {
              const elements = likedFilm.elements || [];
              const cast = likedFilm.cast || [];
              setLikedElements(elements);
              setLikedCast(cast);
              
              // If all attributes are liked, ensure film is marked as loved
              // Use setTimeout to ensure DOM is ready
              setTimeout(() => {
                const totalLikeables = document.querySelectorAll('.likeable').length;
                const likedCount = elements.length + cast.length;
                if (totalLikeables > 0 && likedCount === totalLikeables && !isLovedFilm) {
                  setIsLoved(true);
                }
              }, 0);
            } else {
              // Not in cache, fetch from API
              fetchLikedElements(film.tconst);
            }
          } catch (e) {
            // If cache parse fails, fetch from API
            fetchLikedElements(film.tconst);
          }
        } else {
          // Not in cache, fetch from API
          fetchLikedElements(film.tconst);
        }
      } else {
        setLikedElements([]);
        setLikedCast([]);
      }
    }

    setIsClickLocked(false);
  };

  const handleNext = async () => {
    if (isClickLocked) return;
    setIsClickLocked(true);
    
    setFilmIndex(prev => {
      // If we're outside (from Profile/other pages), check bounds
      if (outside) {
        const films_JSON = JSON.parse(localStorage.getItem('films-source') || '[]');
        const totalFilms = films_JSON.length;
        // Loop back to 0 if we reach the end
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

    // Check if all elements are liked
    setTimeout(async () => {
      const totalLikeables = document.querySelectorAll('.likeable').length;
      const likedCount = newLikedElements.length + newLikedCast.length;

      if (likedCount === totalLikeables && !isLoved) {
        // All elements liked - automatically love the film
        await handleLoveFilm();
      } else if (isLoved && likedCount < totalLikeables) {
        // Loved film but not all elements are liked - automatically unlove but keep current liked elements
        // Don't call handleUnloveFilm as that clears all elements - just unlove but keep current state
        try {
          await axios.post(`/api/unloveFilm`, {
            film_id: currentFilm.tconst,
            user_id: user_id,
          });
          setIsLoved(false);
          
          // Update cache
          const newLoved = myLoved.filter(f => f.tconst !== currentFilm.tconst);
          setMyLoved(newLoved);
          
          // Keep current liked elements (film goes from loved to liked, other attributes stay highlighted)
          const cached = localStorage.getItem('user_data');
          if (cached) {
            try {
              const data = JSON.parse(cached);
              data.liked = data.liked || {};
              const film = myLiked.find(f => f.tconst === currentFilm.tconst) || currentFilm;
              data.liked[currentFilm.tconst] = { ...film, elements: newLikedElements, cast: newLikedCast };
              // Update myLiked state if not already there
              if (!myLiked.some(f => f.tconst === currentFilm.tconst)) {
                setMyLiked([...myLiked, film]);
              }
              updateUserDataCache(watchList, data.liked, newLoved);
            } catch (e) {
              console.error('Error updating cache:', e);
            }
          }
          
          await saveElements(newLikedElements, newLikedCast);
        } catch (error) {
          console.error('Error unloving film:', error);
        }
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
      
      // Update cache
      const newLoved = [...myLoved, { tconst: currentFilm.tconst }];
      setMyLoved(newLoved);
      
      // Automatically like all attributes
      const allElements = ['Title', 'Plot', 'Rating', 'Genre', 'Runtime', 'Year', 'Director', 'Camera', 'Writer', 'Producer', 'Editor', 'Composer'];
      const allCast = currentFilm.cast ? currentFilm.cast.split(',').map(c => c.trim()) : [];
      
      // Add all elements and cast to liked arrays
      const newLikedElements = [...new Set([...likedElements, ...allElements])];
      const newLikedCast = [...new Set([...likedCast, ...allCast])];
      
      setLikedElements(newLikedElements);
      setLikedCast(newLikedCast);
      
      // Update liked dictionary in cache
      const cached = localStorage.getItem('user_data');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          data.liked = data.liked || {};
          // Find or use current film, store film properties directly (not nested)
          const film = myLiked.find(f => f.tconst === currentFilm.tconst) || currentFilm;
          data.liked[currentFilm.tconst] = { ...film, elements: newLikedElements, cast: newLikedCast };
          updateUserDataCache(watchList, data.liked, newLoved);
        } catch (e) {
          console.error('Error updating cache:', e);
        }
      }
      
      // Save all liked elements
      await saveElements(newLikedElements, newLikedCast);
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
      
      // Update cache
      const newLoved = myLoved.filter(f => f.tconst !== currentFilm.tconst);
      setMyLoved(newLoved);
      
      // Remove all highlights (clear all liked elements and cast) when button is pressed
      setLikedElements([]);
      setLikedCast([]);
      
      // Update cache - remove from liked dictionary since all elements are unliked
      const cached = localStorage.getItem('user_data');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          data.liked = data.liked || {};
          // Remove from liked dictionary since all elements are unliked
          delete data.liked[currentFilm.tconst];
          // Update myLiked state - remove if it was there
          const newLiked = myLiked.filter(f => f.tconst !== currentFilm.tconst);
          setMyLiked(newLiked);
          updateUserDataCache(watchList, data.liked, newLoved);
        } catch (e) {
          console.error('Error updating cache:', e);
        }
      }
      
      // Save empty elements (remove all highlights)
      await saveElements([], []);
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
        // Update cache
        const newWatchlist = watchList.filter(f => f.tconst !== currentFilm.tconst);
        setWatchList(newWatchlist);
        const cached = localStorage.getItem('user_data');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            updateUserDataCache(newWatchlist, data.liked || {}, myLoved);
          } catch (e) {
            console.error('Error updating cache:', e);
          }
        }
      } else {
        await axios.post(`/api/addWatchlist`, {
          film_id: currentFilm.tconst,
          user_id: user_id,
        });
        // Update cache
        const newWatchlist = [...watchList, { tconst: currentFilm.tconst }];
        setWatchList(newWatchlist);
        const cached = localStorage.getItem('user_data');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            updateUserDataCache(newWatchlist, data.liked || {}, myLoved);
          } catch (e) {
            console.error('Error updating cache:', e);
          }
        }
      }
      setIsInWatchlist(!isInWatchlist);
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
      
      // Update liked dictionary in cache
      const cached = localStorage.getItem('user_data');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          data.liked = data.liked || {};
          const isFilmLiked = myLiked.some((f) => f.tconst === currentFilm.tconst);
          
          if (elements.length > 0 || cast.length > 0) {
            // Film has liked elements - add/update in liked dictionary
            const film = myLiked.find(f => f.tconst === currentFilm.tconst) || currentFilm;
            // Store film properties directly (not nested in film object)
            data.liked[currentFilm.tconst] = { ...film, elements, cast };
            
            // Update state if film wasn't in liked list
            if (!isFilmLiked) {
              const newLiked = [...myLiked, film];
              setMyLiked(newLiked);
            }
          } else if (isFilmLiked) {
            // Film is liked but has no elements - remove from liked dictionary
            delete data.liked[currentFilm.tconst];
            const newLiked = myLiked.filter(f => f.tconst !== currentFilm.tconst);
            setMyLiked(newLiked);
          }
          
          updateUserDataCache(watchList, data.liked, myLoved);
        } catch (e) {
          console.error('Error updating cache:', e);
        }
      }
    } catch (error) {
      console.error('Error saving elements:', error);
    }
  };

  const handleFilterSubmit = async (e) => {
    e.preventDefault();    
    // Use current filter values from state
    const filter = {
      rating: filterValues.rating,
      genre: filterValues.genre,
      runtime: filterValues.runtime,
      year: filterValues.year,
    };

    // Save filter values to localStorage
    localStorage.setItem('activeFilters', JSON.stringify(filter));

    try {
      // Send filter as JSON string (backend expects JSON string in query params)
      const response = await axios.post('/api/filter', null, {
        params: { filter: JSON.stringify(filter) }
      });
      // Backend returns the count of filtered films
      if (response.data !== undefined && response.data !== null) {
        setFiltered(true);
        setFilmIndex(0);
        setCacheStartIndex(0);
        // Clear cache to force reload with filtered films
        setFilmCache([]);
        await loadFilms(0);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }

    setShowFilters(false);
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
    
    // Format runtime
    const formatRuntime = (runtimeMinutes) => {
      if (runtimeMinutes === '\\N' || !runtimeMinutes) return '-';
      const hours = Math.floor(runtimeMinutes / 60);
      const minutes = runtimeMinutes % 60;
      if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h`;
      if (minutes > 0) return `${minutes}m`;
      return '-';
    };

    // Parse arrays
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
        {/* Title */}
        <div
            id="_filmTitle"
            className={`${likeableClass} ${likedElements.includes('Title') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Title')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <strong>{currentFilm.primaryTitle || ''}</strong>
          </div>

          {/* Plot */}
          <div
            id="_filmPlot"
            className={`small-text py-1 mb-1 ${likeableClass} ${likedElements.includes('Plot') ? 'liked' : ''}`}
            onClick={() => user_id && handleLikeElement('Plot')}
            style={{ cursor: user_id ? 'pointer' : 'default' }}
          >
            <p>{currentFilm.plot || ''}</p>
          </div>

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
              {genres.map((genre, idx) => (
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
            <div className="p text-center">{formatRuntime(currentFilm.runtimeMinutes)}</div>
          </div>

          {/* Year */}
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

        {/* Cast */}
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

        {/* Director, Camera, Writer */}
        <div className="row d-flex justify-content-center py-2">
          {/* Director */}
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

          {/* Camera */}
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

          {/* Writer */}
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

        {/* Producer, Editor, Composer */}
        <div className="row d-flex justify-content-center py-2" style={{ paddingBottom: '40px' }}>
          {/* Producer */}
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

          {/* Editor */}
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

          {/* Composer */}
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
                    <select 
                      id="filterRating" 
                      className="form-select"
                      value={filterValues.rating}
                      onChange={(e) => setFilterValues({...filterValues, rating: e.target.value})}
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
                      onChange={(e) => setFilterValues({...filterValues, genre: e.target.value})}
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
                      onChange={(e) => setFilterValues({...filterValues, runtime: e.target.value})}
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
                      onChange={(e) => setFilterValues({...filterValues, year: e.target.value})}
                    >
                      <option value="Any">Any</option>
                      {['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s'].map((year) => (
                        <option key={year} value={year}>{year}</option>
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
                disabled={filmCache.length === 0 || (filmIndex - cacheStartIndex >= filmCache.length - 1 && filmCache.length < CACHE_SIZE)}
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

