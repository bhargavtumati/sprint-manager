"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

/* ===================== BACKEND ENUM MIRRORS ===================== */

const WorkType = {
  BUG: "Bug",
  TASK: "Task",
  STORY: "Story",
  REVIEW: "Review",
} as const;

const Workflow = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  DONE: "Done",
} as const;

const Priority = {
  BLOCKER: "Blocker",
  CRITICAL: "Critical",
  MAJOR: "Major",
  MEDIUM: "Medium",
  MINOR: "Minor",
  TRIVIAL: "Trivial",
} as const;

type WorkType = typeof WorkType[keyof typeof WorkType];
type Workflow = typeof Workflow[keyof typeof Workflow];
type Priority = typeof Priority[keyof typeof Priority];

/* ===================== TYPES ===================== */

type Task = {
  id: number;
  title: string;
  work_type: WorkType;
  work_flow: Workflow;
  priority: Priority;
  sprint_id?: number;
};

type TaskUpdate = Omit<Task, "id" | "sprint_id">;

/* ===================== HELPERS ===================== */

const apiFetch = async (url: string, options: RequestInit = {}) => {
  console.log(`[API] ${options.method || "GET"} ${url}`);
  
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[API Error] ${res.status}: ${errText}`);
    throw new Error(`API Error ${res.status}: ${errText || res.statusText}`);
  }
  
  const data = await res.json();
  console.log(`[API Response]`, data);
  return data;
};

const enumValues = <T extends Record<string, string>>(obj: T) =>
  Object.values(obj);

/* ===================== COMPONENT ===================== */

export const TaskList = () => {
  const params = useParams();
  const projectId =
    params?.projectId ?? params?.ProjectId ?? Object.values(params ?? {})[0];

  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  /* ===================== STATE ===================== */

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSprintId, setActiveSprintId] = useState<number | null>(null);

  // Create task
  const [title, setTitle] = useState("");
  const [workType, setWorkType] = useState<WorkType>("Task");
  const [workflow, setWorkflow] = useState<Workflow>("To Do");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* ===================== FETCH DATA ===================== */

  const fetchTasks = useCallback(async () => {
    if (!API_URL || !projectId) return;

    setLoading(true);
    setError("");

    try {
      const data = await apiFetch(
        `${API_URL}/tasks?project_id=${projectId}`
      );
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL, projectId]);

  const fetchActiveSprint = useCallback(async () => {
    if (!API_URL || !projectId) return;

    try {
      const data = await apiFetch(
        `${API_URL}/sprints?project_id=${projectId}`
      );
      setActiveSprintId(data?.[0]?.id ?? null);
    } catch {
      setActiveSprintId(null);
    }
  }, [API_URL, projectId]);

  useEffect(() => {
    fetchTasks();
    fetchActiveSprint();
  }, [fetchTasks, fetchActiveSprint]);

  /* ===================== UPDATE TASK ===================== */

  const handleTaskUpdate = async (
    taskId: number,
    field: keyof TaskUpdate,
    value: string
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !API_URL) return;

    try {
      const updatedTask: Task = await apiFetch(
        `${API_URL}/tasks/${taskId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...task,
            [field]: value,
          }),
        }
      );

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
    } catch {
      alert("Failed to update task");
    }
  };

  /* ===================== CREATE TASK ===================== */

  const handleCreateTask = async () => {
    if (!title.trim() || !API_URL || !projectId) return;

    if (!activeSprintId) {
      setCreateError("Create a sprint first");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const createdTask: Task = await apiFetch(`${API_URL}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title,
          work_type: workType,
          work_flow: workflow,
          priority,
          project_id: Number(projectId),
          sprint_id: activeSprintId,
        }),
      });

      setTasks((prev) => [...prev, createdTask]);
      setTitle("");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create task"
      );
    } finally {
      setCreating(false);
    }
  };

  /* ===================== RENDER ===================== */

  if (loading) return <p>Loading tasks...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Tasks</h1>

      {/* CREATE TASK */}
      <div className="border p-4 rounded bg-white">
        <div className="flex gap-3 flex-wrap">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="border px-3 py-2 rounded flex-1"
          />

          <select
            value={workType}
            onChange={(e) =>
              setWorkType(e.target.value as WorkType)
            }
            className="border px-2 py-2 rounded"
          >
            {enumValues(WorkType).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            value={workflow}
            onChange={(e) =>
              setWorkflow(e.target.value as Workflow)
            }
            className="border px-2 py-2 rounded"
          >
            {enumValues(Workflow).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as Priority)
            }
            className="border px-2 py-2 rounded"
          >
            {enumValues(Priority).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <button
            onClick={handleCreateTask}
            disabled={creating}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {creating ? "Creating..." : "Add Task"}
          </button>
        </div>

        {createError && (
          <p className="text-red-500 mt-2">{createError}</p>
        )}
      </div>

      {/* TASK LIST */}
      <div className="space-y-6">
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="border p-3 rounded bg-white"
            >
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  defaultValue={task.title}
                  onBlur={(e) =>
                    handleTaskUpdate(
                      task.id,
                      "title",
                      e.target.value
                    )
                  }
                  className="font-semibold flex-1 min-w-[200px] border px-2 py-1 rounded"
                />

                <select
                  value={task.work_type}
                  onChange={(e) =>
                    handleTaskUpdate(
                      task.id,
                      "work_type",
                      e.target.value
                    )
                  }
                  className="border px-2 py-1 rounded text-sm"
                >
                  {enumValues(WorkType).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>

                <select
                  value={task.work_flow}
                  onChange={(e) =>
                    handleTaskUpdate(
                      task.id,
                      "work_flow",
                      e.target.value
                    )
                  }
                  className="border px-2 py-1 rounded text-sm"
                >
                  {enumValues(Workflow).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>

                <select
                  value={task.priority}
                  onChange={(e) =>
                    handleTaskUpdate(
                      task.id,
                      "priority",
                      e.target.value
                    )
                  }
                  className="border px-2 py-1 rounded text-sm"
                >
                  {enumValues(Priority).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
