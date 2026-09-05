import axios from 'axios';

// Google is the identity provider. The browser gets a Google ID token from
// Google Identity Services, posts it once to /api/auth/google, and receives an
// app session token which is what every later request carries. No password
// ever reaches this application.

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const TOKEN_KEY = 'cinephile_token';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

if (!GOOGLE_CLIENT_ID) {
  throw new Error('Missing VITE_GOOGLE_CLIENT_ID');
}

// --- session token -------------------------------------------------------

const decodeExp = (token) => {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
};

const readToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const exp = decodeExp(token);
    // Treat a token within 60s of expiry as already gone, so a request cannot
    // set off mid-flight.
    if (exp && exp * 1000 <= Date.now() + 60_000) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

const writeToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
  }
};

const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
};

// --- auth state notifications -------------------------------------------

// Replaces Supabase's onAuthStateChange. Components subscribe and are told
// when the session appears or disappears.
const listeners = new Set();

const notify = () => {
  const signedIn = !!readToken();
  listeners.forEach((fn) => {
    try {
      fn(signedIn);
    } catch {
    }
  });
};

export const onAuthChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const isSignedIn = () => !!readToken();

// The seam the rest of the app uses: axios and the fetch wrapper in main.jsx
// call this to attach `Authorization: Bearer`. Signature unchanged from the
// Supabase version so callers did not have to move.
export const getAccessToken = async () => readToken();

// --- Google Identity Services -------------------------------------------

let gsiPromise = null;

const loadGsi = () => {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Could not load Google Sign-In'));
    document.head.appendChild(script);
  });
  return gsiPromise;
};

// Trades the Google credential for our own session token.
const exchangeCredential = async (credential) => {
  const res = await axios.post('/api/auth/google', { credential });
  const token = res?.data?.token;
  if (!token) throw new Error('Sign-in failed');
  writeToken(token);
  notify();
  return res.data.user;
};

/**
 * Render Google's official sign-in button into `element`.
 * Google requires its own button; a custom one needs a different flow.
 */
export const renderGoogleButton = async (element, { onError } = {}) => {
  const google = await loadGsi();
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response) => {
      try {
        await exchangeCredential(response.credential);
      } catch (err) {
        onError?.(err);
      }
    },
  });
  google.accounts.id.renderButton(element, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: 280,
  });
};

export const signOut = async () => {
  clearToken();
  try {
    const google = await loadGsi();
    // Stops Google from immediately re-offering the same account.
    google.accounts.id.disableAutoSelect();
  } catch {
  }
  notify();
};
