import React, { useState } from 'react';
import axios from 'axios';

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [message, setMessage] = useState('');
  
  // Sign up state
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
              background: 'white',
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

          {/* Confirm password input (only for sign up) */}
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
              {isSignUp ? 'Sign up' : 'Sign in'}
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
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;

