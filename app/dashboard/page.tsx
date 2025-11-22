"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Correct import relative to page.tsx
import { SprintList } from "./sprints/SprintList";

import { TaskBoard } from "./tasks/TaskBoard";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user]);

  if (!user) return null;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user}</h1>
      <SprintList />
      <TaskBoard />
    </div>
  );
}
