"use client"; // MUST be first line to indicate this is a client component

import { useAuth } from "@/context/AuthContext"; // import custom AuthContext hook
import { useRouter } from "next/navigation"; // import Next.js router for client-side navigation
import { useEffect } from "react"; // import React hook to run side effects
import { SprintList } from "@/components/dashboard/SprintList"; // import SprintList component
import { TaskList } from "@/components/dashboard/TaskList"; // import TaskBoard component
import { ProjectList } from "@/components/dashboard/ProjectList";

export default function DashboardPage() { // Dashboard page component
  const { user, loading } = useAuth(); // get current user and loading state from context
  const router = useRouter(); // initialize Next.js router

  useEffect(() => { // runs after component mounts or when dependencies change
    if (!loading && !user) { // check if not loading and user is not logged in
      router.replace("/login"); // redirect to login page safely inside effect
    }
  }, [loading, user, router]); // dependencies: run effect when these values change

  if (loading) return <div>Loading...</div>; // show loading UI while checking auth state
  if (!user) return null; // prevent rendering dashboard if user is not logged in (redirect pending)

 return (
  <div className="relative min-h-screen p-4">
    {/* Profile Icon — TOP RIGHT */}
    <button
      type="button"
      onClick={() => router.push("/edit-profile")}
      aria-label="Edit profile"
      dir="ltr"
      className="fixed top-4 right-4 left-auto w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 z-50"
      style={{ left: "auto", right: "1rem" }}
    >
      <span className="font-semibold">
        {user?.name?.[0]?.toUpperCase() || "U"}
      </span>
    </button>

    {/* Page content */}
    <div className="mt-12">
      <ProjectList />
    </div>
  </div>
);}