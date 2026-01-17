"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ProjectRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.ProjectId) {
      router.replace(`/projects/${params.ProjectId}/list`);
    }
  }, [params.ProjectId, router]);

  return (
    <div className="p-8 flex items-center justify-center">
      <p className="text-gray-500 font-medium animate-pulse">Redirecting to task list...</p>
    </div>
  );
}