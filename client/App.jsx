import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Index from './pages/Index';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Watchlist from './pages/Watchlist';
import Recommend from './pages/Recommend';

function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

