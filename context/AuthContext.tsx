"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from "react";

interface User {
  id: number;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // On page load: check localStorage for existing user session
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Login: call backend POST /users/valid
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/users/valid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Login failed");
      }

      const data = await res.json();
      setUser(data); // data should be the user object from FastAPI
      localStorage.setItem("user", JSON.stringify(data));
    },
    [API_URL]
  );

  const signup = useCallback(
  async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/users/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Signup failed");
    }

    const data = await res.json();
    setUser(data); // data should be the user object from FastAPI
    localStorage.setItem("user", JSON.stringify(data));
  },
  [API_URL]
);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
  }, []);


  const contextValue = useMemo(() => ({ user, loading, login, logout, signup }), [user, loading, login, logout, signup]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
