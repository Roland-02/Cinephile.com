import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';

const clerkAppearance = {
  variables: {
    spacingUnit: '0.7rem',
    borderRadius: '4px',
  },
};

const AuthModal = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (!location.pathname.startsWith('/login')) return null;

  const close = () => navigate('/', { replace: true });

  return (
    <div className="auth-modal-overlay" onClick={close}>
      <div
        className="auth-modal-clerk-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <SignIn
          routing="path"
          path="/login"
          afterSignInUrl="/"
          appearance={clerkAppearance}
        />
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
      </div>
    </div>
  );
};

export default AuthModal;
