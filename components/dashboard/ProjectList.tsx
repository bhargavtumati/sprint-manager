"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type User = {
  id: number;
  full_name: string;
};
type Project = {
  id: number;
  title: string;
  users: User[];
};


export const ProjectList = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const userId = user?.id;

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      if (!userId) return; // Wait for user to be loaded

      try {
        const res = await fetch(`${API_URL}/projects/user/${userId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setProjects(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [API_URL, userId]);

  // Create new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = newProjectName.trim();

    // ❌ Empty check
    if (!name) {
      setError("Project name is required");
      return;
    }

    // ❌ Min length
    if (name.length < 3) {
      setError("Project name must be at least 3 characters");
      return;
    }

    // ❌ Max length
    if (name.length > 50) {
      setError("Project name must be less than 50 characters");
      return;
    }

    // ❌ Only special characters
    if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
      setError("Project name can contain only letters, numbers, and spaces");
      return;
    }

    // ❌ Duplicate project name (optional)
    const alreadyExists = Array.isArray(projects) && projects.some(
      (p) => p.title.toLowerCase() === name.toLowerCase()
    );
    if (alreadyExists) {
      setError("Project with this name already exists");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/projects/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProjectName,
          users: user?.id ? [user.id] : []
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to create project");
      }

      const createdProject: Project = await res.json();

      if (!createdProject.users || !Array.isArray(createdProject.users)) {
        createdProject.users = [];
      }

      // Ensure current user is in the list (for UI consistency)
      if (user && !createdProject.users?.some(u => u.id === user.id)) {
        const projectUser: User = {
          id: user.id,
          full_name: user.name || user.email // Map AuthContext user to ProjectList user
        };
        createdProject.users = [...createdProject.users, projectUser];
      }

      setProjects((prev) => [...prev, createdProject]);
      setNewProjectName(""); // clear input
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p>Loading projects...</p>;
  if (error) return <p className="text-red-500">{error}</p>;


  return (
    <div className="mb-6 bg-slate-50 p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Projects</h2>




      <ul className="space-y-2 mb-4">
        {projects.map((project) => (
          <li key={project.id} className="rounded-2xl">

            <button
              type="button"
              onClick={() => router.push(`/projects/${project.id}`)}
              className="w-full text-left p-3 border-2 border-blue-500 rounded shadow-sm
                   hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="font-medium text-black-700">
                {project.title}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Create Project Form */}
      <form onSubmit={handleCreateProject} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => {
            setNewProjectName(e.target.value);
            setError("");
          }}
          placeholder="New project name"
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
};
