import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, useClerk, useAuth } from '@clerk/clerk-react';
import { useTheme } from '../App';
import { useFilter } from './NavbarFilter';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isFilterOpen, toggleFilter, closeFilter } = useFilter();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();

  const toggleMenu = () => {
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);

    if (newMenuState && window.innerWidth <= 991) {
      closeFilter();
    }
  };

  const handleToggleFilter = () => {
    toggleFilter();

    if (!isFilterOpen && window.innerWidth <= 991) {
      setIsMenuOpen(false);
    }
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
    await signOut({ redirectUrl: '/' });
  };

  const handleTitleClick = () => {
    localStorage.setItem('shouldShuffle', 'true');
    navigate('/');
  };

  const handleAboutClick = () => {
    closeMenu();
    navigate('/about');
  };

  return (
    <>
      <div className="nav-container">
        <div className="nav-bar py-1 border-bottom">
          {/* Left elements - hidden on mobile when authenticated */}
          <div className="nav-left">
            <SignedIn>
              <form onSubmit={handleSignOut} className="d-inline-block desktop-only">
                <button type="submit" className="nav-link d-inline-block" style={{ border: 'none', padding: '5px', background: 'none' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" className="bi bi-box-arrow-left" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0z" />
                    <path fillRule="evenodd" d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708z" />
                  </svg>
                </button>
              </form>
              <button
                onClick={handleAboutClick}
                className={`nav-link d-inline-block about-btn desktop-only ${window.location.pathname === '/about' ? 'active' : ''}`}
                style={{ border: 'none', padding: '5px', background: 'none', cursor: 'pointer', marginLeft: '25px' }}
                aria-label="About"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-info-circle-fill" viewBox="0 0 16 16">
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2" />
                </svg>
              </button>
              <button
                onClick={toggleTheme}
                className="nav-link theme-toggle-btn desktop-only"
                style={{ border: 'none', padding: '5px', background: 'none', cursor: 'pointer', marginLeft: '15px' }}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-moon-fill" viewBox="0 0 16 16">
                    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-brightness-high-fill" viewBox="0 0 16 16">
                    <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708" />
                  </svg>
                )}
              </button>
            </SignedIn>

            <SignedOut>
              <Link
                to="/login"
                className="nav-link d-inline-block desktop-only"
                style={{ padding: '5px', cursor: 'pointer' }}
                aria-label="Log in"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="50"
                  height="50"
                  fill="currentColor"
                  className="bi bi-box-arrow-in-right"
                  viewBox="0 0 16 16"
                  style={{ cursor: 'pointer' }}
                >
                  <path fillRule="evenodd" strokeWidth="1.5" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0v-2z" />
                  <path fillRule="evenodd" strokeWidth="1.5" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z" />
                </svg>
              </Link>

              <button
                onClick={handleAboutClick}
                className={`nav-link d-inline-block about-btn desktop-only ${window.location.pathname === '/about' ? 'active' : ''}`}
                style={{ border: 'none', padding: '5px', background: 'none', cursor: 'pointer', marginLeft: '15px' }}
                aria-label="About"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-info-circle-fill" viewBox="0 0 16 16">
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2" />
                </svg>
              </button>

              <button
                onClick={toggleTheme}
                className="nav-link theme-toggle-btn desktop-only"
                style={{ border: 'none', padding: '5px', background: 'none', cursor: 'pointer', marginLeft: '15px' }}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-moon-fill" viewBox="0 0 16 16">
                    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-brightness-high-fill" viewBox="0 0 16 16">
                    <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708" />
                  </svg>
                )}
              </button>
            </SignedOut>
          </div>

          {/* Centered title */}
          <div className="nav-center" id="page_title" style={{ cursor: 'pointer' }} onClick={handleTitleClick}>
            <h1>C I N E P H I L E</h1>
          </div>

          {/* Right elements - hidden on mobile */}
          <div className="nav-right desktop-only">
            <SignedIn>
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
            </SignedIn>
            <SignedOut>
              <Link
                to="/search"
                className={`menu-btn ${window.location.pathname === '/search' ? 'active' : ''}`}
              >
                <p className="mb-0">Search</p>
              </Link>
            </SignedOut>
          </div>

          {/* Mobile filter button - on the left */}
          {isSignedIn && (window.location.pathname === '/' || window.location.pathname === '/recommend') && (
            <button
              className="mobile-filter-btn"
              onClick={handleToggleFilter}
              aria-label="Toggle filter"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                {isFilterOpen ? (
                  <>
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16M3.5 5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1 0-1M5 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m2 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5" />
                  </>
                ) : (
                  <>
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                    <path d="M7 11.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5" />
                  </>
                )}
              </svg>
            </button>
          )}

          {/* Mobile menu button - on the right */}
          <button
            className="mobile-menu-btn"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              {isMenuOpen ? (
                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
              ) : (
                <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      {isMenuOpen && (
        <>
          <div
            className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}
            onClick={closeMenu}
          />

          <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
            <div className="mobile-menu-header">
              <h2>Menu</h2>
              <button onClick={closeMenu} className="mobile-menu-close">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                </svg>
              </button>
            </div>
            <div className="mobile-menu-items">
              <SignedIn>
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
                <Link
                  to="/about"
                  className={`mobile-menu-item ${window.location.pathname === '/about' ? 'active' : ''}`}
                  onClick={handleMenuLinkClick}
                >
                  About
                </Link>
              </SignedIn>
              <SignedOut>
                <Link
                  to="/search"
                  className={`mobile-menu-item ${window.location.pathname === '/search' ? 'active' : ''}`}
                  onClick={handleMenuLinkClick}
                >
                  Search
                </Link>
                <Link
                  to="/about"
                  className={`mobile-menu-item ${window.location.pathname === '/about' ? 'active' : ''}`}
                  onClick={handleMenuLinkClick}
                >
                  About
                </Link>
              </SignedOut>
              <div className="mobile-menu-bottom-actions">
                <button
                  onClick={() => {
                    toggleTheme();
                    closeMenu();
                  }}
                  className="mobile-menu-item mobile-menu-item-button mobile-theme-toggle"
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {theme === 'light' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-moon-fill" viewBox="0 0 16 16">
                        <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-brightness-high-fill" viewBox="0 0 16 16">
                        <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
                      </svg>
                    )}
                    <span style={{ fontSize: '14px' }}>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                  </span>
                </button>

                <SignedIn>
                  <form onSubmit={handleSignOut} className="mobile-menu-item-form">
                    <button type="submit" className="mobile-menu-item mobile-menu-item-button">
                      Sign Out
                    </button>
                  </form>
                </SignedIn>
                <SignedOut>
                  <Link
                    to="/login"
                    className="mobile-menu-item mobile-menu-item-button"
                    onClick={closeMenu}
                  >
                    Sign In
                  </Link>
                </SignedOut>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
