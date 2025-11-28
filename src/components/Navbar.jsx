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
              <button type="submit" id="signoutBtn" className="border rounded nav-link d-inline-block">
                <p className="btn mb-0">Sign out</p>
              </button>
            </form>
          ) : (
            <>
              <Link to="/createAccount" className="border rounded nav-link d-inline-block">
                <p className="btn d-md-block mb-0">Sign up</p>
              </Link>
              <Link to="/login" className="border rounded nav-link d-inline-block">
                <p className="btn d-md-block mb-0">Sign in</p>
              </Link>
            </>
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
                className={`border rounded nav-link d-inline-block menu-btn ${window.location.pathname === '/search' ? 'active' : ''}`}
                style={window.location.pathname === '/search' ? { backgroundColor: 'orange' } : {}}
              >
                <p className="btn btn-sm d-md-block mb-0">Search</p>
              </Link>
              <Link
                to="/recommend"
                className={`border rounded nav-link d-inline-block menu-btn ${window.location.pathname === '/recommend' ? 'active' : ''}`}
                style={window.location.pathname === '/recommend' ? { backgroundColor: 'orange' } : {}}
              >
                <p className="btn btn-sm d-md-block mb-0">Recommend</p>
              </Link>
              <Link
                to="/watchlist"
                className={`border rounded nav-link d-inline-block menu-btn ${window.location.pathname === '/watchlist' ? 'active' : ''}`}
                style={window.location.pathname === '/watchlist' ? { backgroundColor: 'orange' } : {}}
              >
                <p className="btn btn-sm d-md-block mb-0">Watchlist</p>
              </Link>
              <Link
                to="/profile"
                className={`border rounded nav-link d-inline-block menu-btn ${window.location.pathname === '/profile' ? 'active' : ''}`}
                style={window.location.pathname === '/profile' ? { backgroundColor: 'orange' } : {}}
              >
                <p className="btn btn-sm d-md-block mb-0">My films</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;

