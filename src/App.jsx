import React, { useEffect } from 'react';
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
  useEffect(() => {
    // Add Bootstrap CSS
    const bootstrapCSS = document.createElement('link');
    bootstrapCSS.rel = 'stylesheet';
    bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
    bootstrapCSS.integrity = 'sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH';
    bootstrapCSS.crossOrigin = 'anonymous';
    
    // Add MDB CSS
    const mdbCSS = document.createElement('link');
    mdbCSS.rel = 'stylesheet';
    mdbCSS.href = 'https://cdn.jsdelivr.net/npm/mdb-ui-kit@4.2.0/css/mdb.min.css';
    
    // Add Bootstrap JS Bundle
    const bootstrapJS = document.createElement('script');
    bootstrapJS.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js';
    bootstrapJS.integrity = 'sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz';
    bootstrapJS.crossOrigin = 'anonymous';
    
    // Add MDB JS
    const mdbJS = document.createElement('script');
    mdbJS.type = 'text/javascript';
    mdbJS.src = 'https://cdn.jsdelivr.net/npm/mdb-ui-kit@4.2.0/js/mdb.min.js';
    
    // Append to head
    document.head.appendChild(bootstrapCSS);
    document.head.appendChild(mdbCSS);
    document.head.appendChild(bootstrapJS);
    document.head.appendChild(mdbJS);
    
    // Cleanup function to remove scripts on unmount (optional, but good practice)
    return () => {
      // Note: We don't remove them on unmount as they're needed for the entire app
    };
  }, []);

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

