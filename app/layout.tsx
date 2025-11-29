// src/app/layout.tsx
"use client";
import './globals.css';


import { AuthProvider } from "@/context/AuthContext";
import "./styles/globals.css";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <title>Sprint Manager</title>
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
