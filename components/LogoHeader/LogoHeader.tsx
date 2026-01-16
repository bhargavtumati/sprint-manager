"use client";

import Link from "next/link";
import styles from "./LogoHeader.module.css";
import { usePathname } from "next/navigation";
import { useSearch } from "@/context/SearchContext";


export default function LogoHeader() {
    const pathname = usePathname();
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    const { searchQuery, setSearchQuery } = useSearch();

    return (
        <header className={styles.header}>
            <Link href="/dashboard" className="no-underline">
                <h1 className={styles.title}>Sprint Manager</h1>
            </Link>
            {!isAuthPage && pathname.startsWith("/projects") && (
  <input
    type="text"
    placeholder="Search tasks..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="px-3 py-1 border rounded w-309"
  />
)}


            {!isAuthPage && (
                <Link href="/edit-profile" className={styles.profileLink} aria-label="Profile">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </Link>
            )}
        </header>
    );
}
