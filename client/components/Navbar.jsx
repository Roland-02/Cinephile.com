import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, signOut } from '../utils/auth';

const Navbar = () => {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setSession(getSession());
  }, []);

  const handleSignOut = async (e) => {
    e.preventDefault();
    await signOut();
    setSession(null);
  };

  const handleTitleClick = () => {
    navigate('/');
  };

  const isAuthenticated = session && session.email && session.id;

  return (
    <div className="nav-container">
      <div className="nav-bar py-1 bg-white border-bottom">
        {/* Left elements */}
        <div className="nav-left">
          {isAuthenticated ? (
            <form onSubmit={handleSignOut}>
              <button type="submit" id="signoutBtn" className="nav-link d-inline-block">
                <p className="mb-0">Sign out</p>
              </button>
            </form>
          ) : (
            <Link to="/login" className="nav-link d-inline-block" style={{ border: 'none', padding: '5px' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="50"
                fill="black"
                className="bi bi-box-arrow-in-right"
                viewBox="0 0 16 16"
                style={{ cursor: 'pointer' }}
              >
                <path fillRule="evenodd" strokeWidth="1.5" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0v-2z"/>
                <path fillRule="evenodd" strokeWidth="1.5" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
              </svg>
            </Link>
          )}
        </div>

        {/* Centered title */}
        <div className="nav-center" id="page_title" style={{ cursor: 'pointer' }} onClick={handleTitleClick}>
          <h1>C I N E P H I L E</h1>
        </div>

        {/* Right elements */}
        <div className="nav-right">
          {isAuthenticated && (
            <>
              <Link
                to="/search"
                className={`menu-btn ${window.location.pathname === '/search' ? 'active' : ''}`}
              >
                <p className="mb-0">Search</p>
              </Link>
              <Link
                to="/recommend"
                className={`menu-btn ${window.location.pathname === '/recommend' ? 'active' : ''}`}
              >
                <p className="mb-0">Recommend</p>
              </Link>
              <Link
                to="/watchlist"
                className={`menu-btn ${window.location.pathname === '/watchlist' ? 'active' : ''}`}
              >
                <p className="mb-0">Watchlist</p>
              </Link>
              <Link
                to="/profile"
                className={`menu-btn ${window.location.pathname === '/profile' ? 'active' : ''}`}
              >
                <p className="mb-0">My films</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;

