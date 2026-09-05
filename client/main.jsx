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

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const isApiCall = url.startsWith('/api/');
  const nextInput = API_BASE_URL && typeof input === 'string' && url.startsWith('/api/')
    ? `${API_BASE_URL}${input}`
    : input;

  if (!isApiCall) return originalFetch(nextInput, init);

  const nextInit = init ? { ...init } : {};
  const headers = new Headers(nextInit.headers);
  if (APP_API_KEY && !headers.get('X-App-Api-Key')) headers.set('X-App-Api-Key', APP_API_KEY);
  const token = await getAccessToken();
  if (token && !headers.get('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  nextInit.headers = headers;

  return originalFetch(nextInput, nextInit);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
