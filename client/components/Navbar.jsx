import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, signOut } from '../utils/auth';

const Navbar = ({ onLoginClick }) => {
  const [session, setSession] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setSession(getSession());
  }, []);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  const handleMenuLinkClick = () => {
    closeMenu();
  };
  
  const handleHomeClick = () => {
    localStorage.setItem('shouldShuffle', 'true');
    closeMenu();
    navigate('/');
  };

  const handleSignOut = async (e) => {
    e.preventDefault();
    localStorage.clear();
    await signOut();
    setSession(null);
  };

  const handleTitleClick = () => {
    localStorage.setItem('shouldShuffle', 'true');
    navigate('/');
  };

  const handleLoginIconClick = (e) => {
    e.preventDefault();
    if (onLoginClick) {
      onLoginClick();
    } else {
      navigate('/login');
    }
  };

  const isAuthenticated = session && session.email && session.id;

  return (
    <>
      <div className="nav-container">
        <div className="nav-bar py-1 bg-white border-bottom">
          {/* Left elements - hidden on mobile when authenticated */}
          <div className="nav-left">
            {isAuthenticated ? (
              <form onSubmit={handleSignOut} className="d-inline-block desktop-only">
                <button type="submit" className="nav-link d-inline-block" style={{ border: 'none', padding: '5px', background: 'none' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="black" className="bi bi-box-arrow-left" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0z" />
                    <path fillRule="evenodd" d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708z" />
                  </svg>
                </button>
              </form>
            ) : (
              <button 
                onClick={handleLoginIconClick}
                className="nav-link d-inline-block" 
                style={{ border: 'none', padding: '5px', background: 'none', cursor: 'pointer' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="50"
                  height="50"
                  fill="black"
                  className="bi bi-box-arrow-in-right"
                  viewBox="0 0 16 16"
                  style={{ cursor: 'pointer' }}
                >
                  <path fillRule="evenodd" strokeWidth="1.5" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0v-2z" />
                  <path fillRule="evenodd" strokeWidth="1.5" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z" />
                </svg>
              </button>
            )}
          </div>

          {/* Centered title */}
          <div className="nav-center" id="page_title" style={{ cursor: 'pointer' }} onClick={handleTitleClick}>
            <h1>C I N E P H I L E</h1>
          </div>

          {/* Right elements - hidden on mobile */}
          <div className="nav-right desktop-only">
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
                  <p className="mb-0">Profile</p>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button - on the right */}
          {isAuthenticated && (
            <button 
              className="mobile-menu-btn"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                fill="black"
                viewBox="0 0 16 16"
              >
                {isMenuOpen ? (
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                ) : (
                  <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile slide-out menu */}
      {isAuthenticated && (
        <>
          {/* Overlay */}
          <div 
            className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}
            onClick={closeMenu}
          />
          
          {/* Slide-out menu */}
          <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
            <div className="mobile-menu-header">
              <h2>Menu</h2>
            </div>
            <div className="mobile-menu-items">
              <Link
                to="/"
                className={`mobile-menu-item ${window.location.pathname === '/' ? 'active' : ''}`}
                onClick={handleHomeClick}
              >
                Home
              </Link>
              <Link
                to="/search"
                className={`mobile-menu-item ${window.location.pathname === '/search' ? 'active' : ''}`}
                onClick={handleMenuLinkClick}
              >
                Search
              </Link>
              <Link
                to="/recommend"
                className={`mobile-menu-item ${window.location.pathname === '/recommend' ? 'active' : ''}`}
                onClick={handleMenuLinkClick}
              >
                Recommend
              </Link>
              <Link
                to="/watchlist"
                className={`mobile-menu-item ${window.location.pathname === '/watchlist' ? 'active' : ''}`}
                onClick={handleMenuLinkClick}
              >
                Watchlist
              </Link>
              <Link
                to="/profile"
                className={`mobile-menu-item ${window.location.pathname === '/profile' ? 'active' : ''}`}
                onClick={handleMenuLinkClick}
              >
                Profile
              </Link>
              <form onSubmit={handleSignOut} className="mobile-menu-item-form">
                <button type="submit" className="mobile-menu-item mobile-menu-item-button">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;

