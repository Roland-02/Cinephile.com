import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { isSignedIn as readSignedIn, onAuthChange } from './authClient';

// Exported so other components can read the same cache without duplicating
// the key; a rename here must not silently strand a reader.
export const CACHE_KEY = 'cinephile_session_cache';

const SessionContext = createContext(null);

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.userId) {
      return parsed;
    }
  } catch {
  }
  return null;
};

const writeCache = (session) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(session));
  } catch {
  }
};

const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
  }
};

const EMPTY = { id: null, email: null, role: null, userId: null, loading: false };

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    const cached = readCache();
    return cached ? { ...cached, loading: true } : { ...EMPTY, loading: true };
  });

  const refresh = useCallback(async () => {
    try {
      const res = await axios.get('/api/account/me');
      const next = {
        id: res.data.id,
        email: res.data.email,
        role: res.data.role,
        userId: res.data.userId,
        loading: false,
      };
      setSession(next);
      writeCache({ id: next.id, email: next.email, role: next.role, userId: next.userId });
      return next;
    } catch {
      return null;
    }
  }, []);

  // Reconcile the cache with whether a session token is present, then
  // revalidate against the server. Runs on load and on every auth change.
  //
  // The server is the authority on identity: /api/account/me returns the
  // canonical login row, so a stale cache is corrected within one request
  // rather than trusted. That also covers the case where a different Google
  // account signs in -- refresh() overwrites the cache with the new user.
  useEffect(() => {
    let active = true;

    const reconcile = (signedIn) => {
      if (!active) return;

      if (!signedIn) {
        clearCache();
        setSession({ ...EMPTY, loading: false });
        return;
      }

      const cached = readCache();
      if (cached) {
        setSession({ ...cached, loading: false });
      } else {
        setSession((prev) => ({ ...prev, loading: true }));
      }

      refresh().then((next) => {
        // The token names a different user than the cache did: drop what was
        // shown and keep only what the server just confirmed.
        if (active && next && cached && next.userId !== cached.userId) {
          setSession(next);
        }
      });
    };

    reconcile(readSignedIn());

    const unsubscribe = onAuthChange(reconcile);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ session, refresh }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx.session;
};

export const useSessionActions = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSessionActions must be used inside <SessionProvider>');
  }
  return { refresh: ctx.refresh };
};
