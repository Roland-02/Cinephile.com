import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import axios from 'axios';
import App from './App';
import './styles/main.scss';

const API_TOKEN = import.meta.env.VITE_API_TOKEN;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
if (API_TOKEN) axios.defaults.headers.common['X-API-KEY'] = API_TOKEN;

const getClerkToken = async () => {
  try {
    const clerk = typeof window !== 'undefined' ? window.Clerk : null;
    return clerk?.session ? await clerk.session.getToken() : null;
  } catch {
    return null;
  }
};

axios.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
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
  if (API_TOKEN && !headers.get('X-API-KEY')) headers.set('X-API-KEY', API_TOKEN);
  const token = await getClerkToken();
  if (token && !headers.get('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  nextInit.headers = headers;

  return originalFetch(nextInput, nextInit);
};

const ClerkWithRouter = ({ children }) => {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkWithRouter>
        <App />
      </ClerkWithRouter>
    </BrowserRouter>
  </React.StrictMode>
);
