import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { renderGoogleButton, onAuthChange } from '../contexts/authClient';

const AuthModal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [error, setError] = useState('');

  const isSignIn = location.pathname.startsWith('/login');
  const isSignUp = location.pathname.startsWith('/createAccount');
  const open = isSignIn || isSignUp;

  const close = () => navigate('/', { replace: true });

  // Close as soon as the exchange for a session token succeeds.
  useEffect(() => {
    if (!open) return undefined;
    return onAuthChange((signedIn) => {
      if (signedIn) navigate('/', { replace: true });
    });
  }, [open, navigate]);

  // Google renders its own button; a custom one is not permitted for this flow.
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    setError('');
    renderGoogleButton(buttonRef.current, {
      onError: (err) => setError(err?.message || 'Sign-in failed. Please try again.'),
    }).catch((err) => setError(err?.message || 'Could not load Google Sign-In.'));
  }, [open]);

  if (!open) return null;

  return (
    <div className="auth-modal-overlay" onClick={close}>
      <div className="auth-modal-content auth-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={close}
          className="auth-modal-close"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <h2 className="auth-title">{isSignUp ? 'Create account' : 'Sign in'}</h2>

        <p className="auth-notice">
          Cinephile uses your Google account, so there is no extra password to
          remember.
        </p>

        <div className="auth-google-mount" ref={buttonRef} />

        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
};

export default AuthModal;
