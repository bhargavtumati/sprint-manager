// app/layout.tsx
"use client";
import './globals.css';
import { AuthProvider } from "@/context/AuthContext";
import ProjectsNavbar from "@/components/Navbar/ProjectsNavbar";
import LogoHeader from "@/components/LogoHeader/LogoHeader";
import { SearchProvider } from "@/context/SearchContext";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <html lang="en" >
      <head>
        <title>Sprint Manager</title>
      </head>
      <body>
        <AuthProvider>
          <SearchProvider>
            <LogoHeader />
            {!isAuthPage && <ProjectsNavbar />}
            <main style={{
              minHeight: 'calc(100vh - 64px)',
              backgroundColor: '#fff',
              width: '100%'
            }}>
              {children}
            </main>
          </SearchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
