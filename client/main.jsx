import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './styles/main.scss';

const API_TOKEN = import.meta.env.VITE_API_TOKEN;

if (API_TOKEN) {
  axios.defaults.headers.common['X-API-KEY'] = API_TOKEN;
}

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  let url = '';

  if (typeof input === 'string') {
    url = input;
  } else if (input && typeof input.url === 'string') {
    url = input.url;
  }

  const isApiCall = typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/'));
  if (!API_TOKEN || !isApiCall) {
    return originalFetch(input, init);
  }

  const nextInit = init ? { ...init } : {};
  const headers = new Headers(nextInit.headers || (input && input.headers ? input.headers : undefined));

  if (!headers.get('X-API-KEY')) {
    headers.set('X-API-KEY', API_TOKEN);
  }

  nextInit.headers = headers;
  return originalFetch(input, nextInit);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

