import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
  };

  const validatePassword = (password) => {
    return password && password.trim().length !== 0;
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setEmailError(false);
    setPasswordError(false);
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

    try {
      const response = await axios.post('/api/login', {
        email,
        password,
      }, {
        withCredentials: true,
      });

      if (response.data.success) {
        // Reload to get updated session cookies
        window.location.href = '/';
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(error.response.data.message || 'Login failed');
      } else {
        setMessage('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div>
      <h1 className="text-center mt-5">Log in</h1>

      {message && (
        <p className="error-label" style={{ textAlign: 'center', fontSize: '18px' }}>
          {message}
        </p>
      )}

      <form id="login-form" onSubmit={handleSubmit}>
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
                      * password invalid
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
                  Sign in
                </button>

                {/* Create account link */}
                <div className="text-center">
                  <p>
                    New user? <a href="/createAccount">Create account</a>
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

export default Login;

