"use client";

import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ===================== CONFIG ===================== */

const WorkType = {
  Task: "Task",
  Story: "Story",
  Bug: "Bug",
} as const;

const Workflow = {
  "To Do": "To Do",
  "In Progress": "In Progress",
  "In Review": "In Review",
  Done: "Done",
} as const;

const Priority = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Critical: "Critical",
} as const;

type WorkType = typeof WorkType[keyof typeof WorkType];
type Workflow = typeof Workflow[keyof typeof Workflow];
type Priority = typeof Priority[keyof typeof Priority];

/* ===================== TYPES ===================== */

type Task = {
  id: number;
  code?: number | null;
  title: string;
  description?: string | null;
  work_type: WorkType;
  work_flow: Workflow;
  priority: Priority;
  story_points?: number | null;
  sprint_id?: number | null;
  user_id?: number | null;
  user_name?: string | null;
  start_date?: string;
  end_date?: string;
  project_id: number;
  parent_task?: number | null;
};

type User = {
  id: number;
  full_name: string;
};

type Sprint = {
  id: number;
  start_date: string;
  end_date: string;
  status: boolean;
};

type TaskUpdate = Omit<Task, "id"> & {
  user_id?: string | number | null;
  sprint_id?: number | null
};

/* ===================== HELPERS ===================== */

const apiFetch = async (url: string, options: RequestInit = {}) => {
  console.log(`[API] ${options.method || "GET"} ${url}`);
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[API Error] ${res.status}: ${errText}`);
    throw new Error(`API Error ${res.status}: ${errText || res.statusText}`);
  }

  return res.json();
};

const enumValues = (enumObj: object) => Object.values(enumObj);

/* ===================== COMPONENT ===================== */

export const TaskList = () => {
  const params = useParams();
  const projectId =
    typeof params.ProjectId === "string"
      ? params.ProjectId
      : typeof params.projectId === "string"
        ? params.projectId
        : null;
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projectUsers, setProjectUsers] = useState<User[]>([]);
  const [project, setProject] = useState<{ title: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create task
  const [title, setTitle] = useState("");
  const [assigneeUser, setAssigneeUser] = useState<User | null>(null);
  const [workType, setWorkType] = useState<WorkType>("Task");
  const [workflow, setWorkflow] = useState<Workflow>("To Do");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [createSprintId, setCreateSprintId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sprintFilters, setSprintFilters] = useState<Record<number, number | null>>({});
  const [backlogFilterUserId, setBacklogFilterUserId] = useState<number | null>(null);
  const [showInactiveSprints, setShowInactiveSprints] = useState(false);

  /* ===================== MEMOIZED UNIQUE DATA ===================== */

  const uniqueSprints = useMemo(() => {
    const map = new Map();
    sprints.forEach((s: Sprint) => {
      if (s.id) map.set(String(s.id), s);
    });
    return Array.from(map.values()) as Sprint[];
  }, [sprints]);

  const uniqueTasks = useMemo(() => {
    const map = new Map();
    tasks.forEach((t: Task) => {
      if (t.id) map.set(String(t.id), t);
    });
    return Array.from(map.values()) as Task[];
  }, [tasks]);

  const uniqueProjectUsers = useMemo(() => {
    const map = new Map();
    projectUsers.forEach((u: User) => {
      if (u.id) map.set(String(u.id), u);
    });
    return Array.from(map.values()) as User[];
  }, [projectUsers]);

  /* ===================== FETCH DATA ===================== */

  const fetchBoardData = useCallback(async () => {
    if (!API_URL || !projectId) return;

    setLoading(true);
    setError("");

    try {
      console.log("Fetching board data for project:", projectId);
      // 1. Fetch Sprints
      const sprintsData = await apiFetch(`${API_URL}/sprints/${projectId}`);
      const loadedSprints = Array.isArray(sprintsData) ? sprintsData : [];
      let uniqueSprints: Sprint[] = [];
      if (Array.isArray(loadedSprints)) {
        uniqueSprints = Array.from(
          new Map(loadedSprints.map((s: Sprint) => [String(s.id), s])).values()
        );
      }

      // 2. Fetch Unassigned Tasks (Backlog)
      const backlogUrl = backlogFilterUserId
        ? `${API_URL}/tasks/user/${backlogFilterUserId}`
        : `${API_URL}/tasks/unassigned/${projectId}`;
      const backlogData = await apiFetch(backlogUrl);
      const backlogTasks = Array.isArray(backlogData)
        ? backlogData.map((t: any) => ({ ...t, sprint_id: null }))
        : [];

      // 3. Fetch Tasks for each Sprint
      const sprintTasksPromises = uniqueSprints.map(async (sprint) => {
        const url = `${API_URL}/tasks/sprint/${sprint.id}`;
        try {
          console.log(`[DEBUG] Fetching tasks for sprint ${sprint.id} from: ${url}`);
          const tData = await apiFetch(url);
          console.log(`[DEBUG] Received ${Array.isArray(tData) ? tData.length : "NOT AN ARRAY"} tasks for sprint ${sprint.id}`);
          return Array.isArray(tData) ? tData.map((t: any) => ({ ...t, sprint_id: sprint.id })) : [];
        } catch (e) {
          console.error(`[DEBUG] Failed to load tasks for sprint ${sprint.id} at ${url}`, e);
          return [];
        }
      });

      const sprintTasksResults = await Promise.all(sprintTasksPromises);
      const allSprintTasks = sprintTasksResults.flat();

      // 4. Update State
      setSprints(uniqueSprints);

      // Combine all tasks
      const allTasks = [...backlogTasks, ...allSprintTasks];
      const uniqueAllTasks = Array.from(
        new Map(allTasks.map((task) => [String(task.id), task])).values()
      );

      setTasks(uniqueAllTasks);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board data");
    } finally {
      setLoading(false);
    }
  }, [API_URL, projectId, backlogFilterUserId]);

  const fetchProjectUsers = useCallback(async () => {
    if (!API_URL || !projectId) return;

    try {
      const data = await apiFetch(`${API_URL}/users/project/${projectId}`);
      setProjectUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch project users", err);
    }
  }, [API_URL, projectId]);

  const fetchSprintTasks = async (sprintId: number, uId: number | null) => {
    if (!API_URL) return;
    try {
      const url = uId
        ? `${API_URL}/tasks/${sprintId}/user/${uId}`
        : `${API_URL}/tasks/sprint/${sprintId}`;
      const data: Task[] = await apiFetch(url);
      setTasks(prev => {
        const otherTasks = prev.filter(t => t.sprint_id !== sprintId);
        return [...otherTasks, ...data.map(t => ({ ...t, sprint_id: sprintId }))];
      });
    } catch (err) {
      console.error(`Failed to fetch tasks for sprint ${sprintId}`, err);
    }
  };

  const fetchProjectDetails = useCallback(async () => {
    if (!API_URL || !projectId) return;
    try {
      const data = await apiFetch(`${API_URL}/projects/${projectId}`);
      setProject(data);
    } catch (err) {
      console.error("Failed to fetch project details", err);
    }
  }, [API_URL, projectId]);

  useEffect(() => {
    fetchBoardData();
    fetchProjectUsers();
    fetchProjectDetails();
  }, [fetchBoardData, fetchProjectUsers, fetchProjectDetails]);

  /* ===================== UPDATE TASK ===================== */

  const handleTaskUpdate = async (
    taskId: number,
    field: keyof TaskUpdate,
    value: string | number | null
  ) => {
    if (!taskId) {
      console.error("Invalid taskId:", taskId);
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task || !API_URL) return;

    try {
      console.log(`[DEBUG] PATCH Task ${taskId} with:`, { [field]: value });
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
      console.log(`[DEBUG] PATCH Task ${taskId} Success:`, updatedTask);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
    } catch (err) {
      console.error(`[DEBUG] PATCH Task ${taskId} Failed:`, err);
      alert("Failed to update task");
    }
  };

  /* ===================== CREATE TASK ===================== */

  const handleCreateTask = async () => {
    if (!title.trim() || !API_URL || !projectId) return;

    setCreating(true);
    setCreateError("");

    try {
      const payload = {
        title,
        work_type: workType,
        work_flow: workflow,
        priority,
        project_id: Number(projectId),
        sprint_id: createSprintId,
        user_name: assigneeUser ? assigneeUser.full_name : null,
        user_id: assigneeUser ? assigneeUser.id : null,
      };
      console.log("[DEBUG] Creating task with payload:", payload);
      const createdTask: Task = await apiFetch(`${API_URL}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log("[DEBUG] Task created successfully:", createdTask);
      setTasks((prev) => [...prev, createdTask]);
      setTitle("");
      setAssigneeUser(null);
      setCreateError("");
      fetchBoardData();
    } catch (err) {
      console.error("Create task failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to create task";
      setCreateError(msg);
      alert(`Failed to create task: ${msg}`);
    } finally {
      setCreating(false);
    }
  };

  /* ===================== CREATE SPRINT ===================== */

  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creatingSprint, setCreatingSprint] = useState(false);

  const handleCreateSprint = async () => {
    console.log("[DEBUG] handleCreateSprint called", { startDate, endDate, projectId });
    if (!startDate || !endDate || !projectId) {
      console.warn("[DEBUG] Missing required fields for sprint creation");
      return;
    }

    setCreatingSprint(true);
    try {
      console.log("Creating sprint with pattern:", { startDate, endDate, projectId });
      await apiFetch(`${API_URL}/sprints/`, {
        method: "POST",
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          project_id: Number(projectId),
          status: true
        })
      });
      setShowCreateSprint(false);
      setStartDate("");
      setEndDate("");
      fetchBoardData(); // Refresh board
    } catch (err) {
      console.error("Create sprint failed:", err);
      alert(`Failed to create sprint: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleEndSprint = async (sprintId: number) => {
    if (!confirm("Are you sure you want to end this sprint? All tasks details might be lost or need to be moved.")) return;

    try {
      await apiFetch(`${API_URL}/sprints/${sprintId}`, {
        method: "PATCH",
      });
      // Refresh board
      fetchBoardData();
    } catch (err) {
      alert("Failed to end sprint");
    }
  };


  /* ===================== RENDER HELPERS ===================== */

  const renderTaskItem = (task: Task) => (
    <div
      key={`task-${task.id}`}
      className="border-2 border-blue-500 p-3 rounded bg-white mb-2"
    >
      <div className="flex gap-2 items-center flex-wrap">
        <div
          onClick={() => setSelectedTask(task)}
          className="font-semibold flex-1 min-w-[200px] border-2 border-blue-500 px-2 py-1 rounded cursor-pointer hover:bg-blue-50"
        >
          {task.title}
        </div>

        <select
          value={task.sprint_id || ""}
          onChange={(e) => {
            const val = e.target.value;
            handleTaskUpdate(task.id, "sprint_id", val === "" ? null : Number(val));
          }}
          className="border-2 border-purple-500 px-2 py-1 rounded text-sm w-32"
        >
          <option value="">Backlog</option>
          {uniqueSprints.map(s => (
            <option key={s.id} value={s.id}>{`Sprint ${s.id}`}</option>
          ))}
        </select>

        <select
          value={task.user_id || ""}
          onChange={(e) => {
            const val = e.target.value;
            handleTaskUpdate(task.id, "user_id", val === "" ? null : Number(val));
          }}
          className="border-2 border-blue-500 px-2 py-1 rounded text-sm w-32"
        >
          <option value="">Unassigned</option>
          {projectUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name}
            </option>
          ))}
        </select>

        <select
          value={task.work_type}
          onChange={(e) =>
            handleTaskUpdate(
              task.id,
              "work_type",
              e.target.value
            )
          }
          className="border-2 border-blue-500 px-2 py-1 rounded text-sm"
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
          className="border-2 border-blue-500 px-2 py-1 rounded text-sm"
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
          className="border-2 border-blue-500 px-2 py-1 rounded text-sm"
        >
          {enumValues(Priority).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
    </div>
  );

  /* ===================== RENDER ===================== */

  console.log("TaskList Render:", { loading, error, projectId, sprintsCount: uniqueSprints.length, tasksCount: uniqueTasks.length });

  if (loading) return <p className="p-6 text-white font-bold">Loading tasks for project {projectId}...</p>;
  if (error) return <p className="text-red-500 p-6">{error}</p>;

  // Group tasks
  const backlogTasks = uniqueTasks.filter(t => !t.sprint_id);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {project ? `${project.title} Board` : "Tasks Board"}
        </h1>
        <div className="space-x-2">
          <button
            onClick={() => setShowCreateSprint(!showCreateSprint)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            {showCreateSprint ? "Cancel" : "Create Sprint"}
          </button>
        </div>
      </div>

      {/* CREATE SPRINT FORM */}
      {showCreateSprint && (
        <div className="border-2 border-green-500 p-4 rounded bg-green-50">
          <h3 className="font-bold mb-3">New Sprint</h3>
          <div className="flex gap-4 flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border p-2 rounded"
            />
            <button
              onClick={handleCreateSprint}
              disabled={creatingSprint}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {creatingSprint ? "Creating..." : "Start Sprint"}
            </button>
          </div>
        </div>
      )}

      {/* CREATE TASK FORM */}
      <div className="border-2 border-blue-500 p-4 rounded bg-white">
        <h3 className="font-bold mb-3 text-blue-700">Create Task</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="border-2 border-blue-500 px-3 py-2 rounded flex-1"
          />

          <select
            value={createSprintId || ""}
            onChange={(e) => setCreateSprintId(e.target.value ? Number(e.target.value) : null)}
            className="border-2 border-purple-500 px-3 py-2 rounded w-40"
          >
            <option value="">Backlog</option>
            {uniqueSprints.map((s: Sprint) => (
              <option key={`opt-sprint-${s.id}`} value={s.id}>{`Sprint ${s.id}`}</option>
            ))}
          </select>

          <select
            value={assigneeUser?.id || ""}
            onChange={(e) => {
              const selectedId = Number(e.target.value);
              const user = uniqueProjectUsers.find((u) => u.id === selectedId) || null;
              setAssigneeUser(user);
            }}
            className="border-2 border-blue-500 px-3 py-2 rounded w-48"
          >
            <option value="">Unassigned</option>
            {uniqueProjectUsers.map((user) => (
              <option key={`opt-user-${user.id}`} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>

          <select
            value={workType}
            onChange={(e) =>
              setWorkType(e.target.value as WorkType)
            }
            className="border-2 border-blue-500 px-2 py-1 rounded"
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
            className="border-2 border-blue-500 px-2 py-2 rounded"
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
            className="border-2 border-blue-500 px-2 py-2 rounded"
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

      {/* ACTIVE SPRINTS */}
      <div className="space-y-8">
        {uniqueSprints
          .filter(sprint => sprint.status)
          .map((sprint: Sprint) => {
            const sprintTasks = uniqueTasks.filter((t: Task) => t.sprint_id === sprint.id);
            return (
              <div key={`sprint-cont-${sprint.id}`} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold">
                      {`Sprint ${sprint.id}`}
                      <span className="text-sm font-medium text-gray-700 ml-3">
                        {sprint.start_date && sprint.end_date ? (
                          `(${new Date(sprint.start_date).toLocaleDateString()} - ${new Date(sprint.end_date).toLocaleDateString()})`
                        ) : ""}
                      </span>
                    </h2>

                    <div className="flex items-center gap-2 ml-4 border-l pl-4">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filter:</label>
                      <select
                        value={sprintFilters[sprint.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          setSprintFilters(prev => ({ ...prev, [sprint.id]: val }));
                          fetchSprintTasks(sprint.id, val);
                        }}
                        className="border rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">All Assignees</option>
                        {projectUsers.map(u => (
                          <option key={`filter-user-${sprint.id}-${u.id}`} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEndSprint(sprint.id)}
                    className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200"
                  >
                    End Sprint
                  </button>
                </div>
                {sprintTasks.length === 0 ? (
                  <p className="text-gray-400 italic">No tasks in this sprint</p>
                ) : (
                  sprintTasks.map(renderTaskItem)
                )}
              </div>
            );
          })}
      </div>

      {/* BACKLOG */}
      <div className="bg-gray-100 p-4 rounded-xl border border-gray-300 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-700">Backlog</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Filter:</label>
            <select
              value={backlogFilterUserId || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : Number(e.target.value);
                setBacklogFilterUserId(val);
                // fetchBoardData is triggered by useEffect on state change
              }}
              className="border rounded px-2 py-1 text-xs bg-white"
            >
              <option value="">All Assignees</option>
              {projectUsers.map(u => (
                <option key={`filter-user-backlog-${u.id}`} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
        </div>
        {backlogTasks.length === 0 ? (
          <p className="text-gray-500">No tasks in backlog</p>
        ) : (
          backlogTasks.map(renderTaskItem)
        )}
      </div>


      {/* FINISHED SPRINTS TOGGLE */}
      {uniqueSprints.some(s => !s.status) && (
        <div className="flex justify-center my-4">
          <button
            onClick={() => setShowInactiveSprints(!showInactiveSprints)}
            className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium border border-gray-300"
          >
            {showInactiveSprints ? "Hide Finished Sprints" : "Show Finished Sprints"}
          </button>
        </div>
      )}

      {/* INACTIVE SPRINTS */}
      {showInactiveSprints && (
        <div className="space-y-8 mt-4 border-t pt-8">
          <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest text-center">Finished Sprints</h2>
          {uniqueSprints
            .filter(sprint => !sprint.status)
            .map((sprint: Sprint) => {
              const sprintTasks = uniqueTasks.filter((t: Task) => t.sprint_id === sprint.id);
              return (
                <div key={`sprint-cont-${sprint.id}`} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 grayscale-[0.5] opacity-80">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-gray-500">
                        {`Sprint ${sprint.id}`}
                        <span className="text-sm font-medium text-gray-400 ml-3">
                          {sprint.start_date && sprint.end_date ? (
                            `(${new Date(sprint.start_date).toLocaleDateString()} - ${new Date(sprint.end_date).toLocaleDateString()})`
                          ) : ""}
                        </span>
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded uppercase">Finished</span>
                  </div>
                  {sprintTasks.length === 0 ? (
                    <p className="text-gray-400 italic">No tasks in this sprint</p>
                  ) : (
                    sprintTasks.map(renderTaskItem)
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* TASK DETAIL SIDEBAR */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedTask(null)} />
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
              <h2 className="text-xl font-bold">Task Details</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-2xl hover:text-gray-200"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="flex gap-4">
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Code</label>
                  <input
                    type="number"
                    value={selectedTask.code || ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Number(e.target.value);
                      setSelectedTask(prev => prev ? { ...prev, code: val } : null);
                      handleTaskUpdate(selectedTask.id, "code", val);
                    }}
                    className="w-full border-2 border-gray-200 p-2 rounded text-gray-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setSelectedTask(prev => prev ? { ...prev, title: newTitle } : null);
                      handleTaskUpdate(selectedTask.id, "title", newTitle);
                    }}
                    className="w-full border-2 border-blue-500 p-2 rounded font-bold text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  value={selectedTask.description || ""}
                  rows={8}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTask(prev => prev ? { ...prev, description: val } : null);
                    handleTaskUpdate(selectedTask.id, "description", val);
                  }}
                  className="w-full border-2 border-gray-200 p-3 rounded font-sans text-sm resize-none focus:border-blue-500 transition-colors"
                  placeholder="Add a detailed description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Assignee</label>
                  <select
                    value={selectedTask.user_id || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const uId = val === "" ? null : Number(val);
                      setSelectedTask(prev => prev ? { ...prev, user_id: uId } : null);
                      handleTaskUpdate(selectedTask.id, "user_id", uId);
                    }}
                    className="w-full border-2 border-blue-300 p-2 rounded"
                  >
                    <option value="">Unassigned</option>
                    {uniqueProjectUsers.map((u: User) => (
                      <option key={`side-user-${u.id}`} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Sprint</label>
                  <select
                    value={selectedTask.sprint_id || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const sId = val === "" ? null : Number(val);
                      setSelectedTask(prev => prev ? { ...prev, sprint_id: sId } : null);
                      handleTaskUpdate(selectedTask.id, "sprint_id", sId);
                    }}
                    className="w-full border-2 border-purple-300 p-2 rounded"
                  >
                    <option value="">Backlog</option>
                    {uniqueSprints.map((s: Sprint) => (
                      <option key={`side-sprint-${s.id}`} value={s.id}>{`Sprint ${s.id}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
                  <select
                    value={selectedTask.work_type}
                    onChange={(e) => {
                      const val = e.target.value as WorkType;
                      setSelectedTask(prev => prev ? { ...prev, work_type: val } : null);
                      handleTaskUpdate(selectedTask.id, "work_type", val);
                    }}
                    className="w-full border p-2 rounded"
                  >
                    {enumValues(WorkType).map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Story Points</label>
                  <input
                    type="number"
                    value={selectedTask.story_points || ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Number(e.target.value);
                      setSelectedTask(prev => prev ? { ...prev, story_points: val } : null);
                      handleTaskUpdate(selectedTask.id, "story_points", val);
                    }}
                    className="w-full border p-2 rounded"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Workflow</label>
                  <select
                    value={selectedTask.work_flow}
                    onChange={(e) => {
                      const val = e.target.value as Workflow;
                      setSelectedTask(prev => prev ? { ...prev, work_flow: val } : null);
                      handleTaskUpdate(selectedTask.id, "work_flow", val);
                    }}
                    className="w-full border p-2 rounded"
                  >
                    {enumValues(Workflow).map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => {
                      const val = e.target.value as Priority;
                      setSelectedTask(prev => prev ? { ...prev, priority: val } : null);
                      handleTaskUpdate(selectedTask.id, "priority", val);
                    }}
                    className="w-full border p-2 rounded"
                  >
                    {enumValues(Priority).map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t space-y-1">
                <p className="text-xs text-gray-400">Task ID: {selectedTask.id}</p>
                <p className="text-xs text-gray-400">Project ID: {selectedTask.project_id}</p>
                {selectedTask.parent_task && (
                  <p className="text-xs text-gray-400">Parent Task: {selectedTask.parent_task}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
