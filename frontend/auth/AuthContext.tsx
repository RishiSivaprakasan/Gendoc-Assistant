import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../services/authApi';
import { loginApi, logoutApi, meApi, registerApi } from '../services/authApi';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  profile: { displayName: string; avatar: string };
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<{ displayName: string; avatar: string }>) => void;
};

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'gendoc_access_token';
const PROFILE_KEY = 'gendoc_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<{ displayName: string; avatar: string }>(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed.displayName === 'string' && typeof parsed.avatar === 'string') return parsed;
    } catch (e) {
    }
    return { displayName: 'User', avatar: 'A' };
  });

  const setSession = useCallback((nextToken: string | null, nextUser: AuthUser | null) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) window.localStorage.setItem(TOKEN_KEY, nextToken);
    else window.localStorage.removeItem(TOKEN_KEY);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
    }
  }, [profile]);

  const updateProfile = useCallback((patch: Partial<{ displayName: string; avatar: string }>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      const existing = window.localStorage.getItem(TOKEN_KEY);
      if (!existing) {
        if (!cancelled) {
          setSession(null, null);
          setLoading(false);
        }
        return;
      }

      try {
        const me = await meApi(existing);
        if (!cancelled) {
          setSession(existing, me.user);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setSession(null, null);
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await loginApi(email, password);
        setSession(res.accessToken, res.user);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Login failed');
        setSession(null, null);
      } finally {
        setLoading(false);
      }
    },
    [setSession]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await registerApi(email, password);
        setSession(res.accessToken, res.user);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Register failed');
        setSession(null, null);
      } finally {
        setLoading(false);
      }
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    if (!token) {
      setSession(null, null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await logoutApi(token);
    } catch (e) {
    } finally {
      setSession(null, null);
      setLoading(false);
    }
  }, [setSession, token]);

  const value = useMemo<AuthState>(
    () => ({ token, user, profile, loading, error, login, register, logout, updateProfile }),
    [token, user, profile, loading, error, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
