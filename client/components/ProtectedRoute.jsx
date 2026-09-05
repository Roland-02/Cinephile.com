import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSignedIn as readSignedIn, onAuthChange } from '../contexts/authClient';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [auth, setAuth] = useState({ isLoaded: false, isSignedIn: false });

  useEffect(() => {
    let active = true;

    // The token is in localStorage, so this is synchronous -- no loading flash.
    setAuth({ isLoaded: true, isSignedIn: readSignedIn() });

    const unsubscribe = onAuthChange((signedIn) => {
      if (active) setAuth({ isLoaded: true, isSignedIn: signedIn });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (!auth.isLoaded) {
    return (
      <div className="container page-container">
        <div className="loading-spinner" style={{ display: 'block' }}></div>
      </div>
    );
  }

  if (!auth.isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
