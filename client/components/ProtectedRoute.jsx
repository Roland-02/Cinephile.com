import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../contexts/supabaseClient';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [auth, setAuth] = useState({ isLoaded: false, isSignedIn: false });

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuth({ isLoaded: true, isSignedIn: !!data.session });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuth({ isLoaded: true, isSignedIn: !!session });
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
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
