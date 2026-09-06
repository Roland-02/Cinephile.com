import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import { getAccessToken } from './contexts/authClient';
import './styles/main.scss';

const APP_API_KEY = import.meta.env.VITE_APP_API_KEY;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
if (APP_API_KEY) axios.defaults.headers.common['X-App-Api-Key'] = APP_API_KEY;

axios.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
