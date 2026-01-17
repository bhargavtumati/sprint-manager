"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ProjectsNavbar.module.css";

export default function ProjectsNavbar() {
    const pathname = usePathname();
    const isAuthPage = pathname === "/login" || pathname === "/signup";

    if (isAuthPage) return null;

    // Extract project ID if we are in a project page
    const projectMatch = pathname.match(/\/projects\/(\d+)/);
    const projectId = projectMatch ? projectMatch[1] : null;

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link
                    href="/dashboard"
                    className={`${styles.navLink} ${pathname === "/dashboard" ? styles.active : ""}`}
                >
                    All Projects
                </Link>
                {projectId && (
                    <>
                        <Link
                            href={`/projects/${projectId}/list`}
                            className={`${styles.navLink} ${pathname.includes("/list") ? styles.active : ""}`}
                        >
                            Task List
                        </Link>
                        <Link
                            href={`/projects/${projectId}/board`}
                            className={`${styles.navLink} ${pathname.includes("/board") ? styles.active : ""}`}
                        >
                            Task Board
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
