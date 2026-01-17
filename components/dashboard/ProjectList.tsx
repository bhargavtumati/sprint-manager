"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Project = {
  id: number;
  title: string;
  users: User[];
  manager_id: number;
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
  const [userCounts, setUserCounts] = useState<Record<number, number>>({});
  const [managerNames, setManagerNames] = useState<Record<number, string>>({});
  const { user } = useAuth();

  /* ===================== ASSIGN PROJECT STATE ===================== */
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalMode, setModalMode] = useState<'assign' | 'unassign'>('assign');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [modalUsers, setModalUsers] = useState<User[]>([]);
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
          // Fetch user counts for each project
          const counts: Record<number, number> = {};
          await Promise.all(data.map(async (p: Project) => {
            try {
              const users = await apiFetch(`${API_URL}/users/project/${p.id}`);
              counts[p.id] = Array.isArray(users) ? users.length : 0;
            } catch (err) {
              console.error(`Failed to fetch users for project ${p.id}`, err);
              counts[p.id] = 0;
            }
          }));
          setUserCounts(counts);

          // Fetch manager names for each project
          const names: Record<number, string> = {};
          await Promise.all(data.map(async (p: Project) => {
            if (p.manager_id) {
              try {
                const u = await apiFetch(`${API_URL}/users/${p.manager_id}`);
                names[p.manager_id] = u.full_name;
              } catch (err) {
                console.error(`Failed to fetch manager ${p.manager_id}`, err);
              }
            }
          }));
          setManagerNames(prev => ({ ...prev, ...names }));
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
          manager_id: userId,
        }),
      });
      setProjects((prev) => [...prev, newProject]);
      setNewProjectName("");
      // Add manager name to state (current user is the manager)
      if (user?.full_name) {
        setManagerNames(prev => ({ ...prev, [newProject.manager_id]: user.full_name || "Unknown" }));
      } else {
        try {
          const u = await apiFetch(`${API_URL}/users/${newProject.manager_id}`);
          setManagerNames(prev => ({ ...prev, [newProject.manager_id]: u.full_name || "Unknown" }));
        } catch (err) {
          console.error("Failed to fetch manager name for new project", err);
        }
      }
      // Fetch count for the new project
      try {
        const users = await apiFetch(`${API_URL}/users/project/${newProject.id}`);
        setUserCounts(prev => ({ ...prev, [newProject.id]: Array.isArray(users) ? users.length : 0 }));
      } catch (err) {
        console.error("Failed to fetch initial user count for new project", err);
      }
    } catch (err) {
      alert("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p>Loading projects...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const fetchModalUsers = async (projId: number, mode: 'assign' | 'unassign') => {
    if (!API_URL || !userId) return;
    setUsersLoading(true);
    try {
      // 1. Get current user's organization
      const profile = await apiFetch(`${API_URL}/users/${userId}`);
      const userOrg = profile.organisation || "Symphonize"; // fallback

      // 2. Fetch users based on mode
      // URL format: /users/{action}/{organisation}?project_id={id}
      const action = mode === 'assign' ? 'assignproject' : 'unassignproject';
      const url = `${API_URL}/users/${action}/${encodeURIComponent(userOrg)}?project_id=${projId}`;

      console.log(`[DEBUG] Fetching users for ${mode}: ${url}`);
      const data = await apiFetch(url);
      setModalUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(`Failed to fetch users for ${mode}`, e);
      setModalUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const openModal = (projectId: number, mode: 'assign' | 'unassign') => {
    setSelectedProjectId(projectId);
    setModalMode(mode);
    setShowAssignModal(true);
    fetchModalUsers(projectId, mode);
  };

  const handleUserAction = async (targetUser: User) => {
    if (!selectedProjectId) return;
    setAssigningLoading(true);
    try {
      const endpoint = modalMode === 'assign'
        ? `${API_URL}/projects/add-users/${selectedProjectId}`
        : `${API_URL}/projects/remove-users/${selectedProjectId}`;

      await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          user_ids: [targetUser.id]
        })
      });

      const actionText = modalMode === 'assign' ? 'Assigned' : 'Unassigned';
      alert(`${actionText} ${targetUser.full_name}`);

      setShowAssignModal(false);
      // Refresh user count for this project
      try {
        const users = await apiFetch(`${API_URL}/users/project/${selectedProjectId}`);
        setUserCounts(prev => ({ ...prev, [selectedProjectId]: Array.isArray(users) ? users.length : 0 }));
      } catch (err) {
        console.error(`Failed to refresh user count for project ${selectedProjectId}`, err);
      }
    } catch (err) {
      alert(`Failed to ${modalMode} user`);
    } finally {
      setAssigningLoading(false);
    }
  };

  return (
    <div className="mb-6 bg-slate-50 p-6 rounded-xl shadow-sm relative">
      {/* ASSIGN/UNASSIGN MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {modalMode === 'assign' ? 'Assign User to Project' : 'Unassign User from Project'}
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {usersLoading && <p>Loading users...</p>}
              {!usersLoading && modalUsers
                .filter(u => u.full_name)
                .map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleUserAction(u)}
                    className={`w-full text-left p-2 rounded border transition-colors ${modalMode === 'assign'
                      ? 'hover:bg-blue-50 border-blue-100'
                      : 'hover:bg-red-50 border-red-100'
                      }`}
                    disabled={assigningLoading}
                  >
                    <div className="flex justify-between items-center">
                      <span>{u.full_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${modalMode === 'assign' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {modalMode === 'assign' ? 'Add' : 'Remove'}
                      </span>
                    </div>
                  </button>
                ))}
              {!usersLoading && modalUsers.length === 0 && (
                <p className="text-gray-500 italic text-center py-4">
                  {modalMode === 'assign' ? 'No users available to assign' : 'No users to unassign'}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowAssignModal(false)}
              className="mt-4 text-gray-500 w-full text-center hover:text-gray-700 underline text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Projects</h2>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1.5fr_140px_110px] gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs font-black uppercase tracking-wider text-gray-500">
          <div>Project Name</div>
          <div>Project Manager</div>
          <div className="text-center">Team size</div>
          <div className="text-right">Action</div>
        </div>

        {/* Table Body */}
        <ul className="divide-y divide-gray-100 m-0 p-0">
          {projects.map((project) => (
            <li
              key={project.id}
              className="grid grid-cols-[2fr_1.5fr_140px_110px] gap-4 p-4 items-center hover:bg-blue-50/50 transition-colors group cursor-pointer"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <div className="font-bold text-gray-900 truncate">
                {project.title}
              </div>

              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-lg grayscale group-hover:grayscale-0 transition-all shrink-0">👔</span>
                <span className="text-sm font-medium text-gray-600 truncate">
                  {managerNames[project.manager_id] || "Pending..."}
                </span>
              </div>

              <div className="flex justify-center flex-col items-center gap-1">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-tighter shrink-0 border border-slate-200">
                  {userCounts[project.id] || 0} Members
                </span>
              </div>

              <div className="flex flex-col justify-end gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(project.id, 'assign');
                  }}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 shrink-0"
                >
                  Assign
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(project.id, 'unassign');
                  }}
                  className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0"
                >
                  Unassign
                </button>
              </div>
            </li>
          ))}
          {projects.length === 0 && (
            <div className="p-8 text-center text-gray-400 font-medium italic">
              No projects found. Create one above to get started.
            </div>
          )}
        </ul>
      </div>

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
