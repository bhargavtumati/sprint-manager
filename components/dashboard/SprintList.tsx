"use client";

import { useEffect, useState } from "react";

type Sprint = {
  id: number;
  name: string;
};

export const SprintList = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSprints = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/sprints/`,
          { credentials: "include" }
        );

        if (!res.ok) throw new Error("Failed to load sprints");

        const data = await res.json();
        setSprints(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();
  }, []);

  if (loading) return <p>Loading sprints...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!sprints.length) return <p>No sprints found</p>;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Sprints</h2>
      <ul className="space-y-2">
        {sprints.map((sprint) => (
          <li
            key={sprint.id}
            className="p-3 border rounded shadow-sm"
          >
            {sprint.name}
          </li>
        ))}
      </ul>
    </div>
  );
};
