"use client";

export const SprintList = () => {
  const sprints = ["Sprint 1", "Sprint 2", "Sprint 3"];
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Sprints</h2>
      <ul>
        {sprints.map((s) => (
          <li key={s} className="p-2 border rounded mb-1">{s}</li>
        ))}
      </ul>
    </div>
  );
};
