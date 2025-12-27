"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("")
  const [organisation, setOrganisation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/users/${user.id}`);
        if (!res.ok) throw new Error("Failed to fetch profile");

        const data = await res.json();

        setName(data.full_name ?? "");
        setEmail(data.email ?? "");
        setMobile(data.mobile ?? "");
        setRole(data.role ?? "");
        setLocation(data.location ?? "");
        setOrganisation(data.organisation ?? "");
      } catch (err) {
        console.error(err);
        setError("Failed to load profile");
      }
    };

    fetchProfile();
  }, [loading, user, router]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;
    setSaving(true);

    const toNull = (val: string) => (val.trim() === "" ? null : val.trim());

    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(), // Name is required, but we trim it
          email: email.trim(),     // Email is required
          mobile: toNull(mobile),
          role: toNull(role),
          location: toNull(location),
          organisation: toNull(organisation),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update profile");
      }

      const updated = await res.json();
      // Update localStorage so app sees new user data (AuthProvider reads from localStorage on load)
      localStorage.setItem("user", JSON.stringify(updated));

      // Navigate back to dashboard (or wherever appropriate)
      router.back();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Edit Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        {error ? (
          <div className="text-sm text-red-700 bg-red-100 p-2 rounded">{error}</div>
        ) : null}

        <div>
          <label className="block text-sm font-semibold mb-1 text-indigo-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Your name"
            required
          />
        </div>


        <div>
          <label className="block text-sm font-semibold mb-1 text-indigo-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-indigo-700">Mobile</label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="90XXXXXXXX"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-indigo-700">Role</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Developer"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-indigo-700">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Vijayawada,AP"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-indigo-700">Organisation</label>
          <input
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            className="w-full border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Your Organisation"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ml-auto"
          >
            Logout
          </button>
        </div>
      </form>
    </div>
  );
}
