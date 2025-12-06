"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";


type Sprint = {
  id: number;
  project_id?: number;
  start_date?: string;
  end_date?: string;
  status?: boolean;
};

export const SprintList = () => {
  const router = useRouter();
  // route param can be named `ProjectId` (folder [ProjectId]) or `projectId` depending on usage
  const params = useParams() as Record<string, string | undefined> | undefined;
  const projectId = params?.ProjectId ?? params?.projectId ?? Object.values(params || {})[0];
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Fetch sprints on mount
  useEffect(() => {
    const fetchSprints = async () => {
      try {
        const res = await fetch(`${API_URL}/sprints?project_id=${projectId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setSprints(data || []);
        setError("");
      } catch (err: any) {
        setError(err.message || "Failed to fetch sprints");
      } finally {
        setLoading(false);
      }
    };

    // If required config is missing, show an error and stop the loading state
    if (!API_URL || !projectId) {
      setError("API_URL or projectId not configured");
      setLoading(false);
      return;
    }

    fetchSprints();
  }, [API_URL, projectId]);

  // Create new sprint
  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();

    setCreating(true);
    setError("");

    try {
      if (!API_URL || !projectId) {
        throw new Error("API_URL or projectId not configured");
      }

      // ensure end_date is not null: default sprint length is 14 days
      const startDate = new Date();
      const start_date = startDate.toISOString().split("T")[0];
      const sprintLengthDays = 14;
      const endDate = new Date(startDate.getTime() + sprintLengthDays * 24 * 60 * 60 * 1000);
      const end_date = endDate.toISOString().split("T")[0];

      const res = await fetch(`${API_URL}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_id: Number.parseInt(projectId),
          start_date,
          end_date,
          status: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to create sprint");
      }

      const createdSprint: Sprint = await res.json();
      setSprints((prev) => [...prev, createdSprint]);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const getSprintLabel = (sprint: Sprint) => {
    if (sprint.start_date && sprint.end_date) {
      return `Sprint: ${sprint.start_date} — ${sprint.end_date}`;
    }
    if (sprint.start_date) {
      return `Sprint: ${sprint.start_date}`;
    }
    return `Sprint #${sprint.id}`;
  };

  if (loading) return <p>Loading sprints...</p>;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Sprints</h2>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Sprints List */}
      <ul className="space-y-2 mb-4">
  {sprints.map((sprint) => (
    <li key={sprint.id} className="p-3 border rounded shadow-sm">
      <button
        type="button"
        onClick={() => router.push(`/sprints/${sprint.id}`)}
        className="w-full text-left p-3 border rounded shadow-sm
                   hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {getSprintLabel(sprint)}
      </button>
    </li>
  ))}
</ul>

      {/* Create Sprint Button */}
      <form onSubmit={handleCreateSprint}>
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Sprint"}
        </button>
      </form>
    </div>
  );
};
