import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.BASE_URL;

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [message, setMessage] = useState('');
  
  // Create account state
  const [confPassword, setConfPassword] = useState('');
  const [confPasswordError, setConfPasswordError] = useState(false);

  const validateEmail = (email) => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
  };

  const validatePassword = (password) => {
    if (isSignUp) {
      const regex = /^(?=.*[A-Z]).{6,}$/;
      return regex.test(password);
    }
    return password && password.trim().length !== 0;
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfPassword('');
    setEmailError(false);
    setPasswordError(false);
    setConfPasswordError(false);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setEmailError(false);
    setPasswordError(false);
    setConfPasswordError(false);
    setMessage('');

    // Frontend validation
    if (!validateEmail(email)) {
      setEmailError(true);
      return;
    }

    if (!validatePassword(password)) {
      setPasswordError(true);
      return;
    }

    if (isSignUp) {
      if (password !== confPassword) {
        setConfPasswordError(true);
        return;
      }
    }

    try {
      const endpoint = isSignUp ? '/api/createAccount' : '/api/login';
      const payload = isSignUp 
        ? { email, password, confPassword }
        : { email, password };

      const response = await axios.post(endpoint, payload, {
        withCredentials: true,
      });

      if (response.data.success) {
        // Close modal and reload to get updated session
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(error.response.data.message || (isSignUp ? 'Account creation failed' : 'Login failed'));
      } else {
        setMessage('An error occurred. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="auth-modal-overlay" 
      onClick={onClose}
    >
      <div 
        className="auth-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: 'relative', marginBottom: '15px' }}>
          <h2 style={{ textAlign: 'center', margin: 0, textDecoration: 'underline' }}>{isSignUp ? 'Create account' : 'Log in'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="auth-modal-close"
            style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              border: 'none',
              background: 'var(--bg-color)',
              color: 'var(--text-color)',
              cursor: 'pointer',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontSize: '20px',
              lineHeight: '1',
            }}
          >
            ×
          </button>
        </div>

        {message && (
          <p className="error-label" style={{ textAlign: 'center', fontSize: '16px', marginBottom: '15px' }}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email input */}
          <div className="auth-form-group mb-4">
            <label className="auth-form-label" htmlFor="email">
              Email address
            </label>
            <input
              type="email"
              className="form-control border"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailError && (
              <div className="error-label" style={{ marginTop: '5px' }}>
                * email invalid
              </div>
            )}
          </div>

          {/* Password input */}
          <div className="auth-form-group mb-4">
            <label className="auth-form-label" htmlFor="password">
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control border"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passwordError && (
              <div className="error-label" style={{ marginTop: '5px' }}>
                * {isSignUp ? 'password must be 6 characters with 1 uppercase' : 'password invalid'}
              </div>
            )}
          </div>

          {/* Confirm password input (only for Create account) */}
          {isSignUp && (
            <div className="auth-form-group mb-4">
              <label className="auth-form-label" htmlFor="confPassword">
                Confirm password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control border"
                id="confPassword"
                name="confPassword"
                value={confPassword}
                onChange={(e) => setConfPassword(e.target.value)}
                required
              />
              {confPasswordError && (
                <div className="error-label" style={{ marginTop: '5px' }}>
                  * passwords must match
                </div>
              )}
            </div>
          )}

          {/* Show password checkbox */}
          <div className="row mb-4">
            <div className="col d-flex justify-content-center">
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span>show password</span>
              </label>
            </div>
          </div>

          {/* Submit button */}
          <div className="d-flex justify-content-center mb-4">
            <button type="submit" className="btn btn-primary auth-submit-btn" style={{ width: '260px', fontSize: '18px', padding: '10px 20px' }}>
              {isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </div>

          {/* Divider */}
          <div className="auth-divider" style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--text-color)', opacity: 0.3 }}></div>
            <span style={{ padding: '0 15px', fontSize: '14px', opacity: 0.7 }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--text-color)', opacity: 0.3 }}></div>
          </div>

          {/* Social login buttons */}
          <div className="d-flex flex-column align-items-center gap-3 mb-4">
            <button
              type="button"
              className="btn auth-social-btn"
              style={{
                width: '260px',
                fontSize: '16px',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: '#fff',
                color: '#333',
                border: '1px solid #ddd',
              }}
              onClick={() => window.location.href = `${API_BASE_URL}/auth/google`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              className="btn auth-social-btn"
              style={{
                width: '260px',
                fontSize: '16px',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: '#1877F2',
                color: '#fff',
                border: 'none',
              }}
              onClick={() => window.location.href = `${API_BASE_URL}/auth/facebook`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>
          </div>

          {/* Switch mode button */}
          <div className="text-center">
            <p className="mb-1">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              type="button"
              onClick={switchMode}
              className="btn btn-outline-primary auth-switch-btn"
              style={{ width: '260px', fontSize: '18px', padding: '10px 20px' }}
            >
              {isSignUp ? 'Sign in' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;

