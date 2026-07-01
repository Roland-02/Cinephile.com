import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { supabase } from './supabaseClient';

const CACHE_KEY = 'cinephile_session_cache';

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

  // Reconcile cache with Supabase's current user, then revalidate against the
  // server. Fires on initial load and on every Supabase auth state change
  // (sign-in, sign-out, token refresh).
  useEffect(() => {
    let active = true;

    const reconcile = (supabaseUser) => {
      if (!active) return;

      if (!supabaseUser) {
        clearCache();
        setSession({ ...EMPTY, loading: false });
        return;
      }

      const userId = supabaseUser.id || null;
      const cached = readCache();

      if (cached && userId && cached.userId !== userId) {
        // A different user signed in — drop stale data and re-fetch.
        clearCache();
        setSession({ ...EMPTY, loading: true });
      } else if (cached) {
        setSession({ ...cached, loading: false });
      } else {
        setSession((prev) => ({ ...prev, loading: true }));
      }

      refresh();
    };

    supabase.auth.getSession().then(({ data }) => reconcile(data.session?.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      reconcile(supaSession?.user ?? null);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
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
