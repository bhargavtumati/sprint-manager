// app/layout.tsx
"use client";
import './globals.css';
import Navbar from "@/components/Navbar/Navbar";

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" >
      <head>
        <title>Sprint Manager</title>
      </head>
      <body>
       <AuthProvider>
  <Navbar />
  <div style={{ marginLeft: "220px" }}>
    {children}
  </div>
</AuthProvider>

      </body>
    </html>
  );
}
