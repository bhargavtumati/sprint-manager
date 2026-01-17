"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from "react";

interface User {
  id: number;
  email: string;
  full_name?: string;
  organisation?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string) => Promise<User>;
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
      return data;
    },
    [API_URL]
  );

  const signup = useCallback(
    async (email: string, password: string): Promise<User> => {
      const res = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      // Handle backend-specific error responses that might have status 200
      if (data.error) {
        throw new Error(data.error);
      }

      // Handle the case where the response is a single-element set/list with an error string
      if (Array.isArray(data) && typeof data[0] === "string" && data[0].includes("already registered")) {
        throw new Error(data[0]);
      }

      // Extract user object from successful response: {"User created successfully": new_user}
      const userData = data["User created successfully"] || data;

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
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
