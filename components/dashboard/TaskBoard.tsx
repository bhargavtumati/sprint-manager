"use client";

import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useSearch } from "@/context/SearchContext";

/* ===================== CONFIG ===================== */
const Workflow = {
    "To Do": "To Do",
    "In Progress": "In Progress",
    "In Review": "In Review",
    "Done": "Done",
} as const;

type Workflow = typeof Workflow[keyof typeof Workflow];

type Task = {
    id: number;
    title: string;
    work_flow: Workflow;
    user_name?: string | null;
    priority: string;
};

type User = {
    id: number;
    full_name: string;
};

const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) throw new Error(`API Error ${res.status}`);
    return res.json();
};

export const TaskBoard = () => {
    const params = useParams();
    const projectId = params.ProjectId || params.projectId;
    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const { searchQuery, filters } = useSearch();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const buildQuery = useCallback((baseUrl: string) => {
        const url = new URL(baseUrl);
        if (filters.work_type) url.searchParams.append("work_type", filters.work_type);
        if (filters.work_flow) url.searchParams.append("work_flow", filters.work_flow);
        if (filters.priority) url.searchParams.append("priority", filters.priority);
        return url.toString();
    }, [filters]);

    const fetchTasks = useCallback(async () => {
        if (!API_URL || !projectId) return;
        setLoading(true);
        try {
            // Fetch tasks
            let url = `${API_URL}/tasks/all/${projectId}`;
            if (searchQuery) {
                url = `${API_URL}/tasks/search/ByTitle?project_id=${projectId}&q=${encodeURIComponent(searchQuery)}`;
            }
            const tasksData = await apiFetch(url);
            setTasks(Array.isArray(tasksData) ? tasksData : []);

            // Fetch users
            const usersData = await apiFetch(`${API_URL}/users/project/${projectId}`);
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [API_URL, projectId, searchQuery, filters]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const columns = Object.values(Workflow);

    const tasksByColumn = useMemo(() => {
        const map: Record<string, Task[]> = {};
        columns.forEach(col => map[col] = []);
        tasks.forEach(task => {
            if (map[task.work_flow]) {
                map[task.work_flow].push(task);
            } else {
                map["To Do"].push(task); // fallback
            }
        });
        return map;
    }, [tasks, columns]);



    // Calculate task count per user
    const userTaskCounts = useMemo(() => {
        // Initialize counts for all users with 0
        const counts: Record<string, number> = {};
        users.forEach(u => counts[u.full_name] = 0);

        // Add Unassigned if not present
        if (!counts['Unassigned']) counts['Unassigned'] = 0;

        // Count tasks
        tasks.forEach(task => {
            const userName = task.user_name || 'Unassigned';
            // If user is not in the list, track them too
            if (counts[userName] === undefined) {
                counts[userName] = 0;
            }
            counts[userName]++;
        });

        const result = Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .map(([name, count]) => ({ name, count }));

        console.log('[TaskBoard] Tasks:', tasks.length);
        console.log('[TaskBoard] Users:', users.length);
        console.log('[TaskBoard] User Counts:', result);
        return result;
    }, [tasks, users]);


    if (loading) return <div className="p-8">Loading Board...</div>;

    return (
        <div className="flex flex-col gap-4 p-6 bg-gray-50">
            {/* User Statistics Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Task Assignment</h3>
                <div className="flex flex-wrap gap-3">
                    {userTaskCounts.map(({ name, count }) => (
                        <div
                            key={name}
                            className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                {count}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{name}</span>
                        </div>
                    ))}
                    {userTaskCounts.length === 0 && (
                        <p className="text-gray-400 text-sm italic">No tasks to display</p>
                    )}
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto min-h-[calc(100vh-220px)]">
                {columns.map(column => (
                    <div key={column} className="flex-1 min-w-[300px] bg-gray-100 rounded-lg p-4 flex flex-col shadow-inner">
                        <h3 className="font-bold text-gray-700 mb-4 flex justify-between items-center">
                            {column}
                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                {tasksByColumn[column].length}
                            </span>
                        </h3>
                        <div className="space-y-3 flex-1">
                            {tasksByColumn[column].map(task => (
                                <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-default">
                                    <div className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider">#{task.id}</div>
                                    <div className="font-medium text-gray-800 mb-2">{task.title}</div>
                                    <div className="flex justify-between items-center mt-3">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${task.priority === 'High' ? 'bg-red-100 text-red-600' :
                                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-green-100 text-green-600'
                                            }`}>
                                            {task.priority}
                                        </span>
                                        <div className="text-xs text-gray-500 font-medium">{task.user_name || 'Unassigned'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
