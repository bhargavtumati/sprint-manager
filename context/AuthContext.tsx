// src/app/context/AuthContext.tsx
"use client";

import { createContext, useContext, ReactNode, useState } from "react";

interface User {
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {
    throw new Error("login not implemented");
  },
  signup: async () => {
    throw new Error("signup not implemented");
  },
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const login = async (email: string, password: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Invalid credentials");

    const data = await res.json();
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) throw new Error("Signup failed");

    const data = await res.json();
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
