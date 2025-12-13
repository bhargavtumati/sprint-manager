"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";
import { usePathname } from "next/navigation";


export default function Navbar() {
    const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      {/* Title */}
      <h1 className={styles.title}>Sprint Manager</h1>

      {/* Navigation Links */}
      <div className={styles.navLinks}>
        <Link href="/dashboard" className={`${styles.link} ${
    pathname === "/dashboard" ? styles.active : ""
  }`}>
          Dashboard
        </Link>

        <Link href="/projectList" className={`${styles.link} ${
    pathname === "/projectList" ? styles.active : ""
  }`}>
          Projects
        </Link>

        <Link href="/edit-profile" className={`${styles.link} ${
    pathname === "/edit-profile" ? styles.active : ""
  }`}>
          Profile
        </Link>
      </div>
    </nav>
  );
}
