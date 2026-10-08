"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { getSupabase } from "../../lib/supabase";
import type { Driver, Vehicle } from "../../lib/types";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicle_id: "",
    status: "active",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = getSupabase();
    const [d, v] = await Promise.all([
      supabase.from("drivers").select("*").order("name"),
      supabase.from("vehicles").select("*"),
    ]);
    setDrivers((d.data ?? []) as Driver[]);
    setVehicles((v.data ?? []) as Vehicle[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm({ name: "", phone: "", vehicle_id: "", status: "active" });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = getSupabase();
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      vehicle_id: form.vehicle_id || null,
      status: form.status as Driver["status"],
    };
    const { error } = editingId
      ? await supabase.from("drivers").update(payload).eq("id", editingId)
      : await supabase.from("drivers").insert(payload);
    setSaving(false);
    if (!error) {
      reset();
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this driver?")) return;
    const supabase = getSupabase();
    await supabase.from("drivers").delete().eq("id", id);
    await load();
  };

  const vehicleName = (id: string | null) =>
    vehicles.find((v) => v.id === id)?.name ?? "—";

  const input =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">Drivers</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? "Edit driver" : "Add driver"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className={input}
              placeholder="Full name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={input}
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <select
              className={input}
              value={form.vehicle_id}
              onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
            >
              <option value="">— No vehicle —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              className={input}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
          <p className="mt-4 text-xs text-slate-500">
            To give a driver app access: create their login in Supabase →
            Authentication → Users, then set their <code>driver_id</code> in the{" "}
            <code>profiles</code> table to the driver record above.
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Roster</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3">{d.phone ?? "—"}</td>
                    <td className="px-4 py-3">{vehicleName(d.vehicle_id)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          d.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="mr-2 text-sm text-blue-600 hover:underline"
                        onClick={() => {
                          setEditingId(d.id);
                          setForm({
                            name: d.name,
                            phone: d.phone ?? "",
                            vehicle_id: d.vehicle_id ?? "",
                            status: d.status,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => handleDelete(d.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
