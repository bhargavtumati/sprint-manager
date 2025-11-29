"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


type Project = {
  id: number;
  title: string;
};

export const ProjectList = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_URL}/projects/`, {
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
  }, [API_URL]);

  // Create new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/projects/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newProjectName }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to create project");
      }

      const createdProject: Project = await res.json();
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
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Projects</h2>

      

      {/* Projects List */}


      <ul className="space-y-2">
  {projects.map((project) => (
    <li key={project.id}className="p-3 border rounded shadow-sm">
            
      <button
        type="button"
        onClick={() => router.push(`/projects/${project.id}`)}
        className="w-full text-left p-3 border rounded shadow-sm
                   hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {project.title}
      </button>
    </li>
  ))}
</ul>

      {/* Create Project Form */}
      <form onSubmit={handleCreateProject} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
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
