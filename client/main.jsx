import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './styles/main.scss';

const API_TOKEN = import.meta.env.VITE_API_TOKEN;

// When set, API calls go to this backend (e.g. Render).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL);

axios.defaults.headers.common['X-API-KEY'] = API_TOKEN;

axios.defaults.baseURL = API_BASE_URL;


const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  let url = '';

  if (typeof input === 'string') {
    url = input;
  } else if (input && typeof input.url === 'string') {
    url = input.url;
  }

  const isApiCall = typeof url === 'string' && url.startsWith('/api/');

  let nextInput = input;
  if (API_BASE_URL && typeof input === 'string' && input.startsWith('/api/')) {
    nextInput = `${API_BASE_URL}${input}`;
  }
  
  if (!API_TOKEN || !isApiCall) {
    return originalFetch(nextInput, init);
  }

  const nextInit = init ? { ...init } : {};
  const headers = new Headers(nextInit.headers);

  if (!headers.get('X-API-KEY')) {
    headers.set('X-API-KEY', API_TOKEN);
  }

  nextInit.headers = headers;
  return originalFetch(nextInput, nextInit);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

