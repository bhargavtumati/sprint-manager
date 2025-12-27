// app/layout.tsx
"use client";
import './globals.css';
import { AuthProvider } from "@/context/AuthContext";
import LogoHeader from "@/components/LogoHeader/LogoHeader";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" >
      <head>
        <title>Sprint Manager</title>
      </head>
      <body>
        <AuthProvider>
          <LogoHeader />
          {children}
        </AuthProvider>


      </body>
    </html>
  );
}
