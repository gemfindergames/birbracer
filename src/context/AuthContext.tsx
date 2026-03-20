"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { UserPublic } from "@/types";

interface AuthContextType {
  user: UserPublic | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  signup: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateAvatar: (emoji?: string, image?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({}),
  signup: async () => ({}),
  logout: async () => {},
  refreshUser: async () => {},
  updateAvatar: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (
      username: string,
      password: string
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          return {};
        }
        return { error: data.error || "Login failed" };
      } catch {
        return { error: "Network error" };
      }
    },
    []
  );

  const signup = useCallback(
    async (
      username: string,
      password: string
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          return {};
        }
        return { error: data.error || "Signup failed" };
      } catch {
        return { error: "Network error" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const updateAvatar = useCallback(
    async (emoji?: string, image?: string) => {
      try {
        const res = await fetch("/api/auth/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji, image }),
        });
        if (res.ok) {
          await refreshUser();
        }
      } catch {
        // ignore
      }
    },
    [refreshUser]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refreshUser, updateAvatar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
