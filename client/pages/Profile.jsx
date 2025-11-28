import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSession } from '../utils/auth';

const baseImagePath = 'https://image.tmdb.org/t/p/w500';

const Profile = () => {
  const [lovedFilms, setLovedFilms] = useState([]);
  const [likedFilms, setLikedFilms] = useState([]);
  const [stats, setStats] = useState({ cast: [], crew: [], genre: {} });
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

      if (profileStats.message) {
        setStats({
          cast: profileStats.cast || [],
          crew: profileStats.crew || [],
          genre: profileStats.genre || {},
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilmClick = (film, filmIndex, filmList) => {
    const page = Math.floor(filmIndex / 100) + 1;
    const startIndex = (page - 1) * 100;
    const currentIndex = filmIndex - startIndex;
    const counter = filmIndex;

    localStorage.setItem('counter', counter);
    localStorage.setItem('currentIndex', currentIndex);
    localStorage.setItem('films-source', JSON.stringify(filmList));
    navigate('/index');
  };

  const displayStats = (items) => {
    if (!items || items.length === 0) return <p></p>;

    return (
      <div>
        {items.slice(0, 10).map((item, index) => (
          <div key={index} className="favourite-item">
            <p>
              <strong>{item.name}</strong> - {item.count} films
            </p>
          </div>
        ))}
      </div>
    );
  };

  const displayGenreChart = () => {
    if (!stats.genre || Object.keys(stats.genre).length === 0) return null;

    const genreEntries = Object.entries(stats.genre).sort((a, b) => b[1] - a[1]);
    const total = genreEntries.reduce((sum, [, count]) => sum + count, 0);

    return (
      <div>
        {genreEntries.map(([genre, count]) => (
          <div key={genre} className="favourite-item">
            <p>
              <strong>{genre}</strong> - {count} films ({Math.round((count / total) * 100)}%)
            </p>
          </div>
        ))}
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
    <div className="container" style={{ paddingTop: '60px' }}>
      <div className="row">
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
          <div className="container d-flex flex-column m-15 p-10">
            {/* Top actors */}
            <div className="secondary-title">Top actors</div>
            <div id="cast-box" className="favourite-item">
              {stats.cast && stats.cast.length > 0 ? (
                displayStats(stats.cast)
              ) : (
                <p></p>
              )}
            </div>

            {/* Top film-makers */}
            <div className="secondary-title">Top film-makers</div>
            <div id="crew-box" className="favourite-item">
              {stats.crew && stats.crew.length > 0 ? (
                displayStats(stats.crew)
              ) : (
                <p></p>
              )}
            </div>

            {/* Top genres */}
            <div className="secondary-title">Top genres</div>
            <div id="genre-box" className="favourite-item">
              {stats.genre && Object.keys(stats.genre).length > 0 ? (
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

