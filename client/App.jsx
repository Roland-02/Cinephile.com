import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Watchlist from './pages/Watchlist';
import Recommend from './pages/Recommend';
import About from './pages/About';
import { Login, CreateAccount } from './pages/Auth';
import { FilterProvider } from './components/NavbarFilter';
import { SessionProvider } from './contexts/SessionContext';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

function AppContent() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/index" element={<Index />} />
        <Route path="/discover" element={<Index />} />
        <Route path="/home" element={<Index />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/search" element={<Search />} />
        <Route
          path="/watchlist"
          element={
            <ProtectedRoute>
              <Watchlist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommend"
          element={
            <ProtectedRoute>
              <Recommend />
            </ProtectedRoute>
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/info" element={<Navigate to="/about" replace />} />
        <Route path="/login/*" element={<Login />} />
        <Route path="/createAccount/*" element={<CreateAccount />} />
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
      <SessionProvider>
        <FilterProvider>
          <AppContent />
        </FilterProvider>
      </SessionProvider>
    </ThemeContext.Provider>
  );
}

export default App;
