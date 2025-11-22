"use client";

export const TaskBoard = () => {
  const tasks = [
    { title: "Setup Repo", status: "To Do" },
    { title: "Design UI", status: "In Progress" },
    { title: "Deploy App", status: "Done" },
  ];

  return (
    <div className="mt-6 grid grid-cols-3 gap-4">
      {["To Do", "In Progress", "Done"].map((status) => (
        <div key={status} className="p-2 border rounded">
          <h3 className="font-semibold mb-2">{status}</h3>
          {tasks
            .filter((t) => t.status === status)
            .map((t) => (
              <div key={t.title} className="p-1 mb-1 bg-gray-100 rounded">{t.title}</div>
            ))}
        </div>
      ))}
    </div>
  );
};
