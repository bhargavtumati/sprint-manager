"use client";

import { useEffect, useState } from "react";
import { Task } from "./types";

interface TaskDetailProps {
    taskId: number;
    onClose: () => void;
}

export const TaskDetail = ({ taskId, onClose }: TaskDetailProps) => {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const res = await fetch(`${API_URL}/tasks/${taskId}`, {
                    credentials: "include",
                });

                if (!res.ok) {
                    throw new Error("Failed to fetch task details");
                }

                const data = await res.json();
                setTask(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error loading task");
            } finally {
                setLoading(false);
            }
        };

        if (taskId && API_URL) {
            fetchTask();
        }
    }, [taskId, API_URL]);

    if (!taskId) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>

                {loading && <p>Loading details...</p>}
                {error && <p className="text-red-500">{error}</p>}

                {task && !loading && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">{task.title}</h2>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                                <span className="font-semibold block">Status:</span>
                                {task.work_flow}
                            </div>
                            <div>
                                <span className="font-semibold block">Type:</span>
                                {task.work_type}
                            </div>
                            <div>
                                <span className="font-semibold block">Priority:</span>
                                {task.priority}
                            </div>
                            <div>
                                <span className="font-semibold block">Assignee ID:</span>
                                {task.user_id || "Unassigned"}
                            </div>
                            <div>
                                <span className="font-semibold block">Spring ID:</span>
                                {task.sprint_id || "Backlog"}
                            </div>
                            <div>
                                <span className="font-semibold block">Task Code:</span>
                                {task.code || "N/A"}
                            </div>
                        </div>

                        <div className="mt-4">
                            <span className="font-semibold block text-gray-700">Description:</span>
                            <p className="bg-gray-50 p-3 rounded mt-1 border">
                                {task.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
