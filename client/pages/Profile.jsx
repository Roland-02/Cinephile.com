import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Profile = () => {
  const [lovedFilms, setLovedFilms] = useState([]);
  const [likedFilms, setLikedFilms] = useState([]);
  const [stats, setStats] = useState({ cast: [], crew: [], genre: [] });
  const [loading, setLoading] = useState(true);
  const session = getSession();
  const user_id = session?.id;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user_id) {
      navigate('/login');
      return;
    }

    loadProfileData();
  }, [user_id]);

  // Load user's loved/liked films and analytics stats
  const loadProfileData = async () => {
    setLoading(true);
    
    // Try to load from cache first
    const cached = localStorage.getItem('user_data');
    let filmsLoadedFromCache = false;
    
    if (cached) {
      try {
        const data = JSON.parse(cached);
        
        // Load loved films from cache
        if (data.loved && Array.isArray(data.loved)) {
          setLovedFilms(data.loved);
          filmsLoadedFromCache = true;
        }
        
        // Load liked films from cache
        if (data.liked && typeof data.liked === 'object') {
          const likedDict = data.liked;
          const likedFilmsList = Object.values(likedDict).map(item => {
            if (item.film) {
              return item.film;
            } else {
              const { elements, cast, ...film } = item;
              return film;
            }
          });
          setLikedFilms(likedFilmsList);
          filmsLoadedFromCache = true;
        }
      } catch (e) {
        console.error('Error parsing cached user data:', e);
      }
    }
    
    try {
      // Always fetch stats from API (not cached)
      // Only fetch films if cache was not available
      const promises = [axios.get(`/api/get_profile_stats?user_id=${user_id}`)];
      
      if (!filmsLoadedFromCache) {
        promises.push(
          axios.get(`/api/get_loved_films?user_id=${user_id}`),
          axios.get(`/api/get_liked_films?user_id=${user_id}`)
        );
      }
      
      const results = await Promise.all(promises);
      const statsRes = results[0];
      const profileStats = statsRes.data;
      
      setStats({
        cast: profileStats.cast,
        crew: profileStats.crew,
        genre: profileStats.genre,
      });
      
      // If we didn't load from cache, fetch and update films
      if (!filmsLoadedFromCache) {
        const lovedRes = results[1];
        const likedRes = results[2];
        
        const loved = lovedRes.data;
        const liked = likedRes.data;
        
        setLovedFilms(loved);
        setLikedFilms(liked);
        
        // Update cache with full film data, preserving existing liked elements/cast
        try {
          const cached = localStorage.getItem('user_data');
          const data = cached ? JSON.parse(cached) : {};
          data.loved = loved;
          data.liked = liked;
          localStorage.setItem('user_data', JSON.stringify(data));
        } catch (e) {
          console.error('Error updating cache with full film data:', e);
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilmClick = (film, filmIndex, filmList, isLoved = false) => {
    // Combine loved and liked films for seamless navigation
    const combinedFilms = [...lovedFilms, ...likedFilms];
    
    // Calculate the correct index in the combined array
    let combinedIndex = filmIndex;
    if (!isLoved) {
      // If it's a liked film, add the length of loved films to get the correct position
      combinedIndex = lovedFilms.length + filmIndex;
    }
    
    localStorage.setItem('filmIndex', combinedIndex.toString());
    localStorage.setItem('films-source', JSON.stringify(combinedFilms));
    navigate('/index');
  };

  const handleItemClick = (name) => {
    navigate(`/search?query=${encodeURIComponent(name)}`);
  };

  // Display top 5 items (actors, filmmakers) with numbering
  const displayStats = (items) => {
    if (!items || items.length === 0) return <p></p>;

    return (
      <div>
        {items.slice(0, 5).map((item, index) => {
          return (
            <div
              key={index}
              className="favourite-item"
              onClick={() => handleItemClick(item.name)}
              style={{ cursor: 'pointer' }}
            >
              <p>
                <span style={{ marginRight: '12px' }}>{index + 1}.</span>
                <strong>{item.name}</strong>
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // Display genre pie chart with legend
  const displayGenreChart = () => {
    if (!stats.genre) return <p></p>;

    let genreEntries = stats.genre.map(item => ({
      genre: item.Genres,
      count: item.Count
    })).sort((a, b) => b.count - a.count);
    if (genreEntries.length === 0) {
      return <p></p>;
    }

    const total = genreEntries.reduce((sum, item) => sum + item.count, 0);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
    const chartData = {
      labels: genreEntries.map(item => item.genre),
      datasets: [
        {
          data: genreEntries.map(item => item.count),
          backgroundColor: colors.slice(0, genreEntries.length),
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const percentage = Math.round((value / total) * 100);
              return `${label}: (${percentage}%)`;
            }
          }
        }
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>

        <div style={{ flexShrink: 0 }}>
          <div style={{ width: '250px', height: '250px' }}>
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          {genreEntries.map((item, index) => {
            return (
              <div
                key={index}
                className="favourite-item"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer' }}
                onClick={() => handleItemClick(item.genre)}
              >
                <div
                  style={{
                    width: '15px',
                    height: '15px',
                    backgroundColor: colors[index % colors.length],
                    borderRadius: '3px',
                    flexShrink: 0
                  }}
                />
                <p style={{ margin: 0 }}>
                  <span style={{ marginRight: '12px' }}>{index + 1}.</span>
                  <strong>{item.genre}</strong>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '60px' }}>
        <div className="loading-spinner" style={{ display: 'block' }}></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '60px', paddingBottom: '40px' }}>
      <div className="row" style={{ marginTop: '15px' }}>
        {/* Films Section */}
        <div className="col-lg-6 col-md-6 col-sm-12">
          <div className="container">
            {/* Favorite Films */}
            <div className="main-title">Favourites</div>
            <div className="profile-poster-container" data-id={user_id}>
              {lovedFilms.length > 0 || likedFilms.length > 0 ? (
                <>
                  {lovedFilms.map((film, index) => (
                    <figure
                      key={film.tconst}
                      className="poster-wrapper clickable"
                      data-id={film.tconst}
                      onClick={() => handleFilmClick(film, index, lovedFilms, true)}
                      style={{ cursor: 'pointer' }}
                    >
                      <figcaption className="caption">
                        <p>
                          Released: <strong>{film.startYear}</strong>
                        </p>
                        <p>
                          Genre: <strong>{film.genres}</strong>
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
                  {likedFilms.map((film, index) => (
                    <figure
                      key={film.tconst}
                      className="poster-wrapper clickable"
                      data-id={film.tconst}
                      onClick={() => handleFilmClick(film, index, likedFilms, false)}
                      style={{ cursor: 'pointer' }}
                    >
                      <figcaption className="caption">
                        <p>
                          Released: <strong>{film.startYear}</strong>
                        </p>
                        <p>
                          Genre: <strong>{film.genres}</strong>
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
                </>
              ) : (
                <img
                  className="notFound"
                  src="/images/NotFound_FlyingBirdWoman.png"
                  alt="No films found"
                />
              )}
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="col-lg-6 col-md-6 col-sm-12">
          <div className="main-title">Analytics</div>
          <div className="container d-flex flex-column">
            <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div className="secondary-title">Top actors</div>
                <div id="cast-box">
                  {stats.cast && stats.cast.length > 0 ? (
                    displayStats(stats.cast)
                  ) : (
                    <p></p>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '250px' }}>
                <div className="secondary-title">Top film-makers</div>
                <div id="crew-box">
                  {stats.crew && stats.crew.length > 0 ? (
                    displayStats(stats.crew)
                  ) : (
                    <p></p>
                  )}
                </div>
              </div>
            </div>

            <div className="secondary-title" style={{ marginTop: '20px', textAlign: 'center' }}>Top genres</div>
            <div id="genre-box">
              {stats.genre && (Array.isArray(stats.genre) ? stats.genre.length > 0 : Object.keys(stats.genre).length > 0) ? (
                displayGenreChart()
              ) : (
                <p></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

