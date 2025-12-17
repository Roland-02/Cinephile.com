import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Index from './pages/Index';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Watchlist from './pages/Watchlist';
import Recommend from './pages/Recommend';
import About from './pages/About';
import { FilterProvider } from './components/NavbarFilter';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleOpenAuth = () => {
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    window.location.reload();
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <FilterProvider>
        <Router>
          <div className="App">
            <Navbar onLoginClick={handleOpenAuth} />
            <AuthModal 
              isOpen={authModalOpen} 
              onClose={handleCloseAuth}
              onSuccess={handleAuthSuccess}
            />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/index" element={<Index />} />
              <Route path="/discover" element={<Index />} />
              <Route path="/home" element={<Index />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/search" element={<Search />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/recommend" element={<Recommend />} />
              <Route path="/about" element={<About />} />
              <Route path="/info" element={<Navigate to="/about" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </FilterProvider>
    </ThemeContext.Provider>
  );
}

export default App;

