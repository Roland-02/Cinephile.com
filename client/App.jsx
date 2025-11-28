import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Index from './pages/Index';
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Watchlist from './pages/Watchlist';
import Recommend from './pages/Recommend';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/index" element={<Index />} />
          <Route path="/discover" element={<Index />} />
          <Route path="/home" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signin" element={<Login />} />
          <Route path="/createAccount" element={<CreateAccount />} />
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

