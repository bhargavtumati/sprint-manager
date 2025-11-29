"use client";

import { useParams } from "next/navigation";

export default function TaskBoard() {
  const { projectId } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">
        Task Board – Project {projectId}
      </h1>

      {/* Task UI goes here */}
    </div>
  );
}
