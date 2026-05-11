import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';

const clerkAppearance = {
  variables: {
    spacingUnit: '0.7rem',
    borderRadius: '4px',
  },
  elements: {
    rootBox: 'auth-modal-clerk-root',
    cardBox: 'auth-modal-clerk-cardbox',
    card: 'auth-modal-clerk-card',
  },
};

const AuthModal = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isSignIn = location.pathname.startsWith('/login');
  const isSignUp = location.pathname.startsWith('/createAccount');
  if (!isSignIn && !isSignUp) return null;

  const close = () => navigate('/', { replace: true });

  return (
    <div className="auth-modal-overlay" onClick={close}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
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
        {isSignIn ? (
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/createAccount"
            afterSignInUrl="/"
            afterSignUpUrl="/"
            appearance={clerkAppearance}
          />
        ) : (
          <SignUp
            routing="path"
            path="/createAccount"
            signInUrl="/login"
            afterSignInUrl="/"
            afterSignUpUrl="/"
            appearance={clerkAppearance}
          />
        )}
      </div>
    </div>
  );
};

export default AuthModal;
