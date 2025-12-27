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
      <body className="
    min-h-screen
    bg-gradient-to-br
    from-orange-100
    via-orange-50
    to-amber-100
    text-gray-800
  ">
        <AuthProvider>
          <LogoHeader />
          {children}
        </AuthProvider>


      </body>
    </html>
  );
}
