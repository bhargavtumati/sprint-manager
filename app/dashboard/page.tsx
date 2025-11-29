"use client"; // MUST be first line to indicate this is a client component

import { useAuth } from "@/context/AuthContext"; // import custom AuthContext hook
import { useRouter } from "next/navigation"; // import Next.js router for client-side navigation
import { useEffect } from "react"; // import React hook to run side effects
import { SprintList } from "@/components/dashboard/SprintList"; // import SprintList component
import { TaskBoard } from "@/components/dashboard/TaskBoard"; // import TaskBoard component
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
    <div className="p-4"> {/* container with padding */}
      <h1 className="text-2xl font-bold">Welcome</h1> {/* heading */}
      <ProjectList/>
     {/* task board component */}
    </div>
  );
}

