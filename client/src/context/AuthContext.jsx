import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

export const TOKEN_KEY = "token";

// Where each role lands after logging in
export const DASHBOARD_PATHS = {
  jobseeker: "/jobseeker",
  employer: "/employer",
  agent: "/agent",
  admin: "/admin",
  superadmin: "/admin",
};
export const dashboardPath = (role) => DASHBOARD_PATHS[role] || "/dashboard";

// Shared axios instance: attaches the token to every request
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getErrorMessage = (err, fallback = "Something went wrong") =>
  err?.response?.data?.message || fallback;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" if there is a saved token we still need to check
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const setSession = useCallback((token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
  }, []);

  // Re-fetch the current user from the server
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await api.get("users/me");
      setUser(data.user);
      return data.user;
    } catch (err) {
      // Only drop the session if the server says the token is bad (not on a network blip)
      if (err.response?.status === 401 || err.response?.status === 403) logout();
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post("/auth/login", { email, password });
      setSession(data.token, data.user);
      return data; // { token, user, redirectTo }
    },
    [setSession]
  );

  // Restore the session on first load
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Keep several open tabs in sync (log in / out in one tab, the others follow)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== TOKEN_KEY) return;
      if (e.newValue) refreshUser();
      else setUser(null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      setSession,
      updateUser: setUser,
      refreshUser,
    }),
    [user, loading, login, logout, setSession, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}