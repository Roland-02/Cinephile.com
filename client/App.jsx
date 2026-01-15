import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
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

function AppContent() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const authSuccess = searchParams.get('auth_success');
    const authError = searchParams.get('auth_error');
    
    if (authSuccess === 'true') {
      navigate('/', { replace: true });
      window.location.reload();
    }
    
    if (authError) {
      console.error('OAuth error:', authError);
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    window.location.reload();
  };

  return (
    <div className="App">
      <Navbar onLoginClick={() => setAuthModalOpen(true)} />
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
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
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <FilterProvider>
        <Router>
          <AppContent />
        </Router>
      </FilterProvider>
    </ThemeContext.Provider>
  );
}

export default App;
