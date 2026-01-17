"use client";

import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "@/context/SearchContext";

/* ===================== CONFIG ===================== */

const WorkType = {
  Task: "Task",
  Story: "Story",
  Bug: "Bug",
  "Review": "Review",
  "Closed": "Closed - Won't Do",

} as const;

const Workflow = {
  Backlog: "Backlog",
  "To Do": "To Do",
  "In Progress": "In Progress",
  "On Hold": "On Hold",
  "QA": "QA",
  Done: "Done",
  "Review": "Review",
  "Closed": "Closed - Won't Do",
} as const;

const Priority = {
  Blocker: "Blocker",
  Critical: "Critical",
  Major: "Major",
  Medium: "Medium",
  Minor: "Minor",
  Trivial: "Trivial",
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
  const { searchQuery, filters, setFilters } = useSearch();
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

  const buildQuery = useCallback((baseUrl: string) => {
    try {
      const url = new URL(baseUrl, window.location.origin);
      if (filters.work_type) url.searchParams.append("work_type", filters.work_type);
      if (filters.work_flow) url.searchParams.append("work_flow", filters.work_flow);
      if (filters.priority) url.searchParams.append("priority", filters.priority);
      return url.toString();
    } catch (e) {
      console.error("Error building query URL:", e, baseUrl);
      return baseUrl;
    }
  }, [filters]);

  // Create task
  const [title, setTitle] = useState("");
  const [assigneeUser, setAssigneeUser] = useState<User | null>(null);
  const [workType, setWorkType] = useState<WorkType>("Task");
  const [workflow, setWorkflow] = useState<Workflow>("To Do");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [createSprintId, setCreateSprintId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [activeCreateSprintId, setActiveCreateSprintId] = useState<number | "backlog" | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSidebarFull, setIsSidebarFull] = useState(false);
  const [sprintFilters, setSprintFilters] = useState<Record<number, number | null>>({});
  const sprintFiltersRef = useRef(sprintFilters);

  useEffect(() => {
    sprintFiltersRef.current = sprintFilters;
  }, [sprintFilters]);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize description textarea
  useEffect(() => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const resizeTextArea = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(100, textarea.scrollHeight + 20)}px`;
    };

    // Initial call
    resizeTextArea();

    const observer = new ResizeObserver(resizeTextArea);
    observer.observe(textarea);

    return () => {
      observer.disconnect();
    };
  }, [selectedTask?.id, selectedTask?.description]);
  useEffect(() => {
    if (selectedTask) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [selectedTask]);

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
  const isSearching = !!searchQuery && searchQuery.trim().length > 0;
  const fetchBoardData = useCallback(async () => {
    if (!API_URL || !projectId) return;

    console.log('[FETCH] fetchBoardData called with filters:', JSON.stringify(filters));
    console.log('[FETCH] Current state:', {
      hasFilters: Object.keys(filters).length > 0,
      work_type: filters.work_type,
      work_flow: filters.work_flow,
      priority: filters.priority
    });

    setLoading(true);
    setError("");

    // 🔍 SEARCH MODE — STOP NORMAL BOARD FLOW
    if (searchQuery && searchQuery.trim()) {
      const searchUrl = `${API_URL}/tasks/search/ByTitle?project_id=${projectId}&q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
      const searchData = await apiFetch(searchUrl);
      setTasks(Array.isArray(searchData) ? searchData : []);
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching board data for project:", projectId);
      // 1. Fetch Sprints
      const sprintsData = await apiFetch(`${API_URL}/sprints/${projectId}`);
      const loadedSprints = Array.isArray(sprintsData) ? sprintsData : [];
      const uniqueSprints = Array.from(
        new Map(loadedSprints.map((s: Sprint) => [String(s.id), s])).values()
      );

      // 2. Fetch Unassigned Tasks (Backlog)
      const backlogBaseUrl = `${API_URL}/tasks/unassigned?project_ids=${projectId}`;
      let backlogUrl: string;
      if (backlogFilterUserId === -1) {
        backlogUrl = `${backlogBaseUrl}&backlog=true`;
      } else if (backlogFilterUserId) {
        backlogUrl = `${backlogBaseUrl}&user_ids=${backlogFilterUserId}`;
      } else {
        // Default to pure backlog (no user, no sprint)
        backlogUrl = `${backlogBaseUrl}&backlog=true`;
      }

      // Apply global filters to backlog as well
      console.log('[BACKLOG] URL before buildQuery:', backlogUrl);
      backlogUrl = buildQuery(backlogUrl);
      console.log('[BACKLOG] URL after buildQuery:', backlogUrl);

      const backlogData = await apiFetch(backlogUrl);
      let backlogTasks = Array.isArray(backlogData)
        ? backlogData.map((t: any) => ({ ...t, sprint_id: t.sprint_id || null }))
        : [];



      console.log('[BACKLOG] Returned:', {
        count: backlogTasks.length,
        tasks: backlogTasks.map(t => ({
          id: t.id,
          title: t.title,
          work_type: t.work_type,
          work_flow: t.work_flow
        }))
      });

      // 3. Fetch Tasks for each Sprint
      const sprintTasksPromises = uniqueSprints.map(async (sprint) => {
        const uId = sprintFiltersRef.current[sprint.id];


        let url = uId === -1
          ? `${API_URL}/tasks/unassigned?project_ids=${projectId}&sprint_ids=${sprint.id}`
          : uId
            ? `${API_URL}/tasks/all?project_ids=${projectId}&sprint_ids=${sprint.id}&user_ids=${uId}`
            : `${API_URL}/tasks/all?project_ids=${projectId}&sprint_ids=${sprint.id}`;

        if (sprint.status) {
          url = buildQuery(url);
        }

        try {
          const tData = await apiFetch(url);
          return Array.isArray(tData) ? tData.map((t: any) => ({ ...t, sprint_id: sprint.id })) : [];
        } catch (e) {
          console.error(`Failed to load tasks for sprint ${sprint.id}`, e);
          return [];
        }
      });

      const sprintTasksResults = await Promise.all(sprintTasksPromises);
      const allSprintTasks = sprintTasksResults.flat();

      setSprints(uniqueSprints);
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
  }, [API_URL, projectId, backlogFilterUserId, searchQuery, filters, buildQuery]);

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
    if (!API_URL || !projectId) return;
    try {
      let url = uId === -1
        ? `${API_URL}/tasks/unassigned?project_ids=${projectId}&sprint_ids=${sprintId}`
        : uId
          ? `${API_URL}/tasks/all?project_ids=${projectId}&sprint_ids=${sprintId}&user_ids=${uId}`
          : `${API_URL}/tasks/all?project_ids=${projectId}&sprint_ids=${sprintId}`;

      // Since fetchSprintTasks is used when global filters or assignee change for a sprint
      url = buildQuery(url);
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
      // Refresh board data after successful update
      fetchBoardData();
    } catch (err) {
      console.error(`[DEBUG] PATCH Task ${taskId} Failed:`, err);
      alert("Failed to update task");
    }
  };

  /* ===================== CREATE TASK ===================== */

  const handleCreateTask = async (sprintId: number | null) => {
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
        sprint_id: sprintId,
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
      setActiveCreateSprintId(null);
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

  const renderCreateTaskForm = (sprintId: number | null) => {
    const isBacklog = sprintId === null;
    const isActive = activeCreateSprintId === (isBacklog ? "backlog" : sprintId);

    if (!isActive) {
      return (
        <button
          onClick={() => {
            setActiveCreateSprintId(isBacklog ? "backlog" : sprintId);
            setCreateSprintId(sprintId);
          }}
          className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 mt-2"
        >
          <span className="text-xl">+</span> Add Task
        </button>
      );
    }

    return (
      <div className="border-2 border-blue-400 p-4 rounded-xl bg-white shadow-md mt-2 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-gray-800">New Task in {isBacklog ? "Backlog" : `Sprint ${sprintId}`}</h4>
          <button
            onClick={() => setActiveCreateSprintId(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="border border-gray-300 px-4 py-2 rounded-lg flex-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTask(sprintId);
              if (e.key === "Escape") setActiveCreateSprintId(null);
            }}
          />

          <select
            value={assigneeUser?.id || ""}
            onChange={(e) => {
              const selectedId = Number(e.target.value);
              const user = uniqueProjectUsers.find((u) => u.id === selectedId) || null;
              setAssigneeUser(user);
            }}
            className="border border-gray-300 px-3 py-2 rounded-lg w-48 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            onChange={(e) => setWorkType(e.target.value as WorkType)}
            className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {enumValues(WorkType).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {enumValues(Priority).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <button
            onClick={() => handleCreateTask(sprintId)}
            disabled={creating || !title.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            {creating ? "Creating..." : "Add"}
          </button>
        </div>

        {createError && <p className="text-red-500 text-sm">{createError}</p>}
      </div>
    );
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
      className="border border-gray-200 p-3 rounded-lg bg-white mb-2 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex gap-2 items-center flex-wrap">
        <div
          onClick={() => {
            setSelectedTask(task);
            setIsSidebarFull(false);
          }}
          onDoubleClick={() => {
            setSelectedTask(task);
            setIsSidebarFull(true);
          }}
          className="font-semibold flex-1 min-w-[200px] border border-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-blue-50"
        >
          {task.title}
        </div>

        <select
          value={task.sprint_id || ""}
          onChange={(e) => {
            const val = e.target.value;
            handleTaskUpdate(task.id, "sprint_id", val === "" ? null : Number(val));
          }}
          className="border border-gray-300 px-2 py-1 rounded text-sm w-32 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
          className="border border-gray-300 px-2 py-1 rounded text-sm w-32 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
          className="border border-gray-300 px-2 py-1 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
          className="border border-gray-300 px-2 py-1 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
          className="border border-gray-300 px-2 py-1 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider text-nowrap">Filters:</label>
                      <select
                        value={sprintFilters[sprint.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          console.log(`[FILTER] Changing assignee for sprint ${sprint.id} to:`, val);
                          setSprintFilters(prev => ({ ...prev, [sprint.id]: val }));
                          // fetchSprintTasks(sprint.id, val); // Let's rely on the effect first, or debug why manual call fails?
                          // The user earlier said UI didn't update on empty array. Explicit call *should* fix that.
                          // But user says "filter not working". Maybe race condition?
                          // Let's keep explicit call but log it.
                          fetchSprintTasks(sprint.id, val);
                        }}
                        className="border rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400 min-w-[120px]"
                      >
                        <option value="">All Assignees</option>
                        {projectUsers.map(u => (
                          <option key={`filter-user-${sprint.id}-${u.id}`} value={u.id}>{u.full_name}</option>
                        ))}
                        <option value="-1">Unassigned</option>
                      </select>

                      <select
                        value={filters.work_type || ""}
                        onChange={(e) => {
                          console.log('[FILTER] work_type changed to:', e.target.value);
                          setFilters(prev => ({ ...prev, work_type: e.target.value || undefined }));
                        }}
                        className="px-2 py-1 border rounded text-xs bg-white text-gray-600 focus:ring-1 focus:ring-blue-400 cursor-pointer"
                      >
                        <option value="">All Types</option>
                        <option value="Task">Task</option>
                        <option value="Story">Story</option>
                        <option value="Bug">Bug</option>
                        <option value="Review">Review</option>
                        <option value="Closed - Won't Do">Closed - Won't Do</option>
                      </select>

                      <select
                        value={filters.work_flow || ""}
                        onChange={(e) => {
                          console.log('[FILTER] work_flow changed to:', e.target.value);
                          setFilters(prev => ({ ...prev, work_flow: e.target.value || undefined }));
                        }}
                        className="px-2 py-1 border rounded text-xs bg-white text-gray-600 focus:ring-1 focus:ring-blue-400 cursor-pointer"
                      >
                        <option value="">All Status</option>
                        <option value="Backlog">Backlog</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="QA">QA</option>
                        <option value="Done">Done</option>
                        <option value="Review">Review</option>
                        <option value="Closed - Won't Do">Closed - Won't Do</option>
                      </select>

                      <select
                        value={filters.priority || ""}
                        onChange={(e) => {
                          console.log('[FILTER] priority changed to:', e.target.value);
                          setFilters(prev => ({ ...prev, priority: e.target.value || undefined }));
                        }}
                        className="px-2 py-1 border rounded text-xs bg-white text-gray-600 focus:ring-1 focus:ring-blue-400 cursor-pointer"
                      >
                        <option value="">All Priority</option>
                        <option value="Blocker">Blocker</option>
                        <option value="Critical">Critical</option>
                        <option value="Major">Major</option>
                        <option value="Medium">Medium</option>
                        <option value="Minor">Minor</option>
                        <option value="Trivial">Trivial</option>
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
                {renderCreateTaskForm(sprint.id)}
              </div>
            );
          })}
      </div>

      {/* BACKLOG */}
      <div className="bg-gray-100 p-4 rounded-xl border border-gray-300 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-700">Backlog</h2>
          {/* <div className="flex items-center gap-2">
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
              <option value="">All Items</option>
              {projectUsers.map(u => (
                <option key={`filter-user-backlog-${u.id}`} value={u.id}>{u.full_name}</option>
              ))}
              <option value="-1">Unassigned</option>
            </select>
          </div> */}
        </div>
        {backlogTasks.length === 0 ? (
          <p className="text-gray-500">No tasks in backlog</p>
        ) : (
          backlogTasks.map(renderTaskItem)
        )}
        {renderCreateTaskForm(null)}
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
                    {/* <div className="flex items-center gap-2 ml-4 border-l pl-4">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filter:</label>
                      <select
                        value={sprintFilters[sprint.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          setSprintFilters(prev => ({ ...prev, [sprint.id]: val }));
                        }}
                        className="border rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">All Items</option>
                        {projectUsers.map(u => (
                          <option key={`filter-user-${sprint.id}-${u.id}`} value={u.id}>{u.full_name}</option>
                        ))}
                        <option value="-1">Unassigned</option>
                      </select>
                    </div> */}

                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded uppercase">Finished</span>
                  </div>

                  {sprintTasks.length === 0 ? (
                    <p className="text-gray-400 italic">No tasks in this sprint</p>
                  ) : (
                    sprintTasks.map(renderTaskItem)
                  )}
                  {renderCreateTaskForm(sprint.id)}
                </div>
              );
            })}
        </div>
      )}

      {/* TASK DETAIL SIDEBAR */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <button type="button" aria-label="Close task details" className="absolute inset-0 bg-black/30 cursor-default focus:outline-none" onClick={() => { setSelectedTask(null); setIsSidebarFull(false); }} tabIndex={-1} // Keeps it out of the tab order since the "X" button exists
          />

          <div className={`absolute inset-y-0 right-0 ${isSidebarFull ? 'w-full' : 'max-w-md w-full'} bg-white shadow-2xl flex flex-col animate-slide-in overflow-hidden`}>

            <div className="p-6 border-b flex justify-between items-center bg-white border-gray-100">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold"> ℹ️ Task Details</h2>
                <button
                  onClick={() => setIsSidebarFull(!isSidebarFull)}
                  className="text-sm border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-50 text-gray-500"
                  title={isSidebarFull ? "Collapse" : "Expand"}
                >
                  {isSidebarFull ? "↙️ Collapse" : "↗️ Expand"}
                </button>
              </div>
              <button
                onClick={() => { setSelectedTask(null); setIsSidebarFull(false); }}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto [direction:rtl]">
              <div className="p-6 space-y-6 [direction:ltr]">
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
                      }}
                      onBlur={(e) => {
                        handleTaskUpdate(selectedTask.id, "title", e.target.value);
                      }}
                      className="w-full border border-gray-300 p-2 rounded-lg font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                  <textarea
                    ref={descriptionRef}
                    value={selectedTask.description || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTask(prev => prev ? { ...prev, description: val } : null);
                    }}
                    onBlur={(e) => {
                      handleTaskUpdate(selectedTask.id, "description", e.target.value);
                    }}
                    className="w-full border border-gray-200 p-3 rounded-lg font-sans text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none overflow-hidden"
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
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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

                  {selectedTask.parent_task && (
                    <p className="text-xs text-gray-400">Parent Task: {selectedTask.parent_task}</p>
                  )}
                </div>
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
