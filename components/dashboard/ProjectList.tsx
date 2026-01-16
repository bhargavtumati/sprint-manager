"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Project = {
  id: number;
  title: string;
  users: User[];
};

type User = {
  id: number;
  full_name: string;
  organisation?: string;
};

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error ${res.status}: ${errText || res.statusText}`);
  }
  return res.json();
};

export const ProjectList = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();

  /* ===================== ASSIGN PROJECT STATE ===================== */
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const userId = user?.id;

  useEffect(() => {
    if (!API_URL || !userId) return;

    const fetchProjects = async () => {
      try {
        const data = await apiFetch(`${API_URL}/projects/user/${userId}`);
        if (Array.isArray(data)) {
          setProjects(data);
        } else {
          setProjects([]);
        }
      } catch (err) {
        setError("Failed to fetch projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [API_URL, userId]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !userId) return;
    setCreating(true);

    try {
      const newProject = await apiFetch(`${API_URL}/projects/`, {
        method: "POST",
        body: JSON.stringify({
          title: newProjectName,
          users: [userId],
        }),
      });
      setProjects((prev) => [...prev, newProject]);
      setNewProjectName("");
    } catch (err) {
      alert("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p>Loading projects...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const fetchOrgUsers = async () => {
    if (!API_URL || !userId) return;
    setUsersLoading(true);
    try {
      // 1. Get current user's organization
      const profile = await apiFetch(`${API_URL}/users/${userId}`);
      const userOrg = profile.organisation || "Symphonize"; // fallback
      console.log(`[DEBUG] Fetching users for organization: ${userOrg}`);

      // 2. Get users in that organization
      const data = await apiFetch(`${API_URL}/users/organisation/${userOrg}`);
      setOrgUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch org users", e);
      setOrgUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const openAssignModal = (projectId: number) => {
    setSelectedProjectId(projectId);
    setShowAssignModal(true);
    fetchOrgUsers();
  };

  const handleAssignUser = async (userToAssign: User) => {
    if (!selectedProjectId) return;
    setAssigningLoading(true);
    try {
      // Assuming /projects/assign endpoint based on plan
      await apiFetch(`${API_URL}/projects/add-users/${selectedProjectId}`, {
        method: "POST",
        body: JSON.stringify({
          user_ids: [userToAssign.id]
        })
      });

      alert(`Assigned to ${userToAssign.full_name}`);
      setShowAssignModal(false);
    } catch (err) {
      alert("Failed to assign user");
    } finally {
      setAssigningLoading(false);
    }
  };

  return (
    <div className="mb-6 bg-slate-50 p-6 rounded-xl shadow-sm relative">
      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Assign Project</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {usersLoading && <p>Loading users...</p>}
              {!usersLoading && orgUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleAssignUser(u)}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded border"
                  disabled={assigningLoading}
                >
                  {u.full_name}
                </button>
              ))}
              {!usersLoading && orgUsers.length === 0 && <p>No users found</p>}
            </div>
            <button
              onClick={() => setShowAssignModal(false)}
              className="mt-4 text-red-500 w-full text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Projects</h2>

      <ul className="space-y-2 mb-4">
        {projects.map((project) => (
          <li key={project.id} className="rounded-2xl flex gap-2">
            <button
              type="button"
              onClick={() => router.push(`/projects/${project.id}`)}
              className="flex-1 text-left p-3 border-2 border-gray-300 rounded shadow-sm
                   hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300" //existing projects
            >
              <span className="font-medium text-gray-900">
                {project.title}
              </span>
            </button>
            <button
              onClick={() => openAssignModal(project.id)}
              className="bg-purple-500 text-white px-3 rounded hover:bg-purple-600"
            >
              Assign
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="New project name"
          className="border border-gray-300 rounded px-3 py-2 flex-1 focus:ring-2 focus:ring-blue-500" //new project
        />
        <button
          onClick={handleCreateProject}
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {creating ? "Creating..." : "Create Project"}
        </button>
      </div>
    </div>
  );
};
