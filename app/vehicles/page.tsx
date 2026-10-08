"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { getSupabase } from "../../lib/supabase";
import type { Vehicle } from "../../lib/types";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    type: "wheelchair van",
    capacity: 4,
    status: "available",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from("vehicles").select("*").order("name");
    setVehicles((data ?? []) as Vehicle[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm({ name: "", type: "wheelchair van", capacity: 4, status: "available" });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = getSupabase();
    const payload = {
      name: form.name.trim(),
      type: form.type as Vehicle["type"],
      capacity: Number(form.capacity),
      status: form.status as Vehicle["status"],
    };
    const { error } = editingId
      ? await supabase.from("vehicles").update(payload).eq("id", editingId)
      : await supabase.from("vehicles").insert(payload);
    setSaving(false);
    if (!error) {
      reset();
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    const supabase = getSupabase();
    await supabase.from("vehicles").delete().eq("id", id);
    await load();
  };

  const input =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  const statusColor = (s: Vehicle["status"]) =>
    s === "available"
      ? "bg-green-100 text-green-800"
      : s === "in_service"
        ? "bg-blue-100 text-blue-800"
        : "bg-amber-100 text-amber-800";

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">Vehicles</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? "Edit vehicle" : "Add vehicle"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className={input}
              placeholder="Vehicle name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className={input}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="wheelchair van">Wheelchair van</option>
              <option value="sedan">Sedan</option>
            </select>
            <input
              type="number"
              min={1}
              className={input}
              placeholder="Capacity"
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: Number(e.target.value) })
              }
            />
            <select
              className={input}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="in_service">In service</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save" : "Add"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md bg-slate-200 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Fleet</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {vehicles.map((v) => (
                <div key={v.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{v.name}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(v.status)}`}
                    >
                      {v.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {v.type} · capacity {v.capacity}
                  </p>
                  <div className="mt-3 flex gap-3">
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => {
                        setEditingId(v.id);
                        setForm({
                          name: v.name,
                          type: v.type,
                          capacity: v.capacity,
                          status: v.status,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => handleDelete(v.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {vehicles.length === 0 && (
                <p className="text-sm text-slate-500">No vehicles yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
