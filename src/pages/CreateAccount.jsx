import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateAccount = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confPassword, setConfPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [confPasswordError, setConfPasswordError] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password) => {
    const regex = /^(?=.*[A-Z]).{6,}$/;
    return regex.test(password);
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
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

    if (password !== confPassword) {
      setConfPasswordError(true);
      return;
    }

    try {
      const response = await axios.post('/api/createAccount', {
        email,
        password,
        confPassword,
      }, {
        withCredentials: true,
      });

      if (response.data.success) {
        // Reload to get updated session cookies
        window.location.href = '/';
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(error.response.data.message || 'Account creation failed');
      } else {
        setMessage('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div>
      <h1 className="text-center mt-5">Create account</h1>

      {message && (
        <p className="error-label" style={{ textAlign: 'center', fontSize: '18px' }}>
          {message}
        </p>
      )}

      <form id="createAccount-form" onSubmit={handleSubmit}>
        <div className="container mt-3">
          <div className="row justify-content-center">
            <div className="col-lg-4">
              <div className="border rounded p-4">
                {/* Email input */}
                <div className="form-outline mb-4">
                  <input
                    type="email"
                    className="form-control border"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <label className="form-label" htmlFor="email">
                    Email address
                  </label>
                  {emailError && (
                    <label className="error-label" htmlFor="email">
                      * email invalid
                    </label>
                  )}
                </div>

                {/* Password input */}
                <div className="form-outline mb-4">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border"
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                  {passwordError && (
                    <label className="error-label" htmlFor="password">
                      * password must be 6 characters with 1 uppercase
                    </label>
                  )}
                </div>

                {/* Confirm password input */}
                <div className="form-outline mb-4">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border"
                    id="confPassword"
                    name="confPassword"
                    value={confPassword}
                    onChange={(e) => setConfPassword(e.target.value)}
                    required
                  />
                  <label className="form-label" htmlFor="confPassword">
                    Confirm password
                  </label>
                  {confPasswordError && (
                    <label className="error-label" htmlFor="confPassword">
                      * passwords must match
                    </label>
                  )}
                </div>

                {/* Show password checkbox */}
                <div className="row mb-4">
                  <div className="col d-flex justify-content-center">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showPassword"
                        checked={showPassword}
                        onChange={togglePassword}
                      />
                      <label className="form-check-label" htmlFor="showPassword">
                        show password
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button type="submit" className="btn btn-primary btn-block mb-4">
                  Sign up
                </button>

                {/* Log in link */}
                <div className="text-center">
                  <p>
                    Already have an account? <a href="/login">Sign in</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateAccount;

