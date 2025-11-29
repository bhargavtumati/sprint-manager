"use client";

import { useEffect, useState } from "react";

type Task = {
  id: number;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
};

export const TaskBoard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For creating new task
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load tasks");

      const data = await res.json();
      setTasks(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return; // don't allow empty titles
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ title: newTitle, status: "TODO" }),
      });

      if (!res.ok) throw new Error("Failed to create task");

      const createdTask: Task = await res.json();
      setTasks((prev) => [...prev, createdTask]); // add new task to list
      setNewTitle(""); // clear input
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p>Loading tasks...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const grouped = {
    TODO: tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
    DONE: tasks.filter((t) => t.status === "DONE"),
  };

  return (
    <div>
      {/* Create Task */}
      <div className="mb-4 flex gap-2 items-center">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task title"
          className="border rounded px-3 py-2 flex-1"
        />
        <button
          onClick={handleCreateTask}
          disabled={creating}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Add Task"}
        </button>
      </div>
      {createError && <p className="text-red-500 mb-2">{createError}</p>}

      {/* Task Board */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(grouped).map(([status, list]) => (
          <div key={status} className="border rounded p-3">
            <h3 className="font-semibold mb-2">{status}</h3>
            <ul className="space-y-2">
              {list.map((task) => (
                <li key={task.id} className="p-2 border rounded bg-gray-50">
                  {task.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
