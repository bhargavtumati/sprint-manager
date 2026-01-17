"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { TaskList } from "@/components/dashboard/TaskList";

export default function ProjectListPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [loading, user, router]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!user) return null;

    return (
        <div className="p-4">
            <TaskList />
        </div>
    );
}
