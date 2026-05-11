import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import axios from 'axios';

const CACHE_KEY = 'cinephile_session_cache';

const SessionContext = createContext(null);

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.clerkUserId) {
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

export const SessionProvider = ({ children }) => {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  const [session, setSession] = useState(() => {
    const cached = readCache();
    return cached ? { ...cached, loading: !authLoaded } : { id: null, email: null, role: null, clerkUserId: null, loading: true };
  });

  const refresh = useCallback(async () => {
    try {
      const res = await axios.get('/api/account/me');
      const next = {
        id: res.data.id,
        email: res.data.email,
        role: res.data.role,
        clerkUserId: res.data.clerkId,
        loading: false,
      };
      setSession(next);
      writeCache({ id: next.id, email: next.email, role: next.role, clerkUserId: next.clerkUserId });
      return next;
    } catch {
      return null;
    }
  }, []);

  // Reconcile cache with Clerk's current user; revalidate against the server.
  useEffect(() => {
    if (!authLoaded) return;

    if (!isSignedIn) {
      clearCache();
      setSession({ id: null, email: null, role: null, clerkUserId: null, loading: false });
      return;
    }

    const clerkId = user?.id || null;
    const cached = readCache();

    if (cached && clerkId && cached.clerkUserId !== clerkId) {
      clearCache();
      setSession({ id: null, email: null, role: null, clerkUserId: null, loading: true });
    } else if (cached) {
      setSession({ ...cached, loading: false });
    } else {
      setSession((prev) => ({ ...prev, loading: true }));
    }

    refresh();
  }, [authLoaded, isSignedIn, user?.id, refresh]);

  // Clerk fires this on sign-out — wipe local cache so a different user
  // signing in next can't read stale data.
  useEffect(() => {
    if (!clerk) return;
    const unsubscribe = clerk.addListener(({ user: u }) => {
      if (!u) clearCache();
    });
    return () => {
      try { unsubscribe?.(); } catch {}
    };
  }, [clerk]);

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
