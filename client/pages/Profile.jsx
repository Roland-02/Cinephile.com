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
  const [isFlipped, setIsFlipped] = useState(false);
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
    try {
        const [lovedRes, likedRes, statsRes] = await Promise.all([
          axios.get(`/api/get_loved_films?user_id=${user_id}`),
          axios.get(`/api/get_liked_films?user_id=${user_id}`),
          axios.get(`/api/get_profile_stats?user_id=${user_id}`),
        ]);

      const loved = lovedRes.data.films || [];
      const liked = likedRes.data.films || [];
      const profileStats = statsRes.data;

      setLovedFilms(loved);
      setLikedFilms(liked);
      setStats({
        cast: Array.isArray(profileStats.cast) ? profileStats.cast : [],
        crew: Array.isArray(profileStats.crew) ? profileStats.crew : [],
        genre: Array.isArray(profileStats.genre) ? profileStats.genre : (profileStats.genre || {}),
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilmClick = (film, filmIndex, filmList) => {
    localStorage.setItem('filmIndex', filmIndex.toString());
    localStorage.setItem('films-source', JSON.stringify(filmList));
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
            label: function(context) {
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
            const percentage = Math.round((item.count / total) * 100);
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
      <div className="row" style={{ margin: 0 }}>
        {/* Favourite film posters */}
        <div className="col-lg-6 col-md-6 col-sm-12">
          <div className="container">
            <div className="flip-card">
              <div
                className="flip-card-inner"
                id="flip-card-inner"
                style={{
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div className="flip-card-front">
                  <div
                    className="main-title"
                    id="loved"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    onMouseEnter={(e) => {
                      e.target.textContent = 'my likes';
                      e.target.style.color = 'orange';
                    }}
                    onMouseLeave={(e) => {
                      e.target.textContent = 'my favourites';
                      e.target.style.color = '';
                    }}
                  >
                    my favourites
                  </div>
                  <div className="poster-container" id="loved-films" data-id={user_id}>
                    {lovedFilms.length > 0 ? (
                      lovedFilms.map((film, index) => (
                        <figure
                          key={film.tconst}
                          className="poster-wrapper clickable"
                          data-id={film.tconst}
                          onClick={() => handleFilmClick(film, index, lovedFilms)}
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
                      ))
                    ) : (
                      <img
                        className="notFound"
                        src="/images/NotFound_FlyingBirdWoman.png"
                        alt="No films found"
                      />
                    )}
                  </div>
                </div>

                <div className="flip-card-back">
                  <div
                    className="main-title"
                    id="liked"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    onMouseEnter={(e) => {
                      e.target.textContent = 'my favourites';
                      e.target.style.color = 'orange';
                    }}
                    onMouseLeave={(e) => {
                      e.target.textContent = 'my likes';
                      e.target.style.color = '';
                    }}
                  >
                    my likes
                  </div>
                  <div className="poster-container" id="liked-films" data-id={user_id}>
                    {likedFilms.length > 0 ? (
                      likedFilms.map((film, index) => (
                        <figure
                          key={film.tconst}
                          className="poster-wrapper clickable"
                          data-id={film.tconst}
                          onClick={() => handleFilmClick(film, index, likedFilms)}
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
                      ))
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
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="col-lg-6 col-md-6 col-sm-12" id="analyticsContent">
          <div className="main-title">my analytics</div>
          <div className="container d-flex flex-column" style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
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

