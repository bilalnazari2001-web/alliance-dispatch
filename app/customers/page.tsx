"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { getSupabase } from "../../lib/supabase";
import type { Customer } from "../../lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("name");
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm({ name: "", phone: "", notes: "" });
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
      notes: form.notes.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("customers").update(payload).eq("id", editingId)
      : await supabase.from("customers").insert(payload);
    setSaving(false);
    if (!error) {
      reset();
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer? Trips will keep their other details.")) return;
    const supabase = getSupabase();
    await supabase.from("customers").delete().eq("id", id);
    await load();
  };

  const input =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">Customers</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? "Edit customer" : "Add customer"}
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
            <textarea
              className={input}
              rows={3}
              placeholder="Notes (mobility needs, regular appointments…)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
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
          <h2 className="mb-4 text-lg font-semibold">Passenger list</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.phone ?? "—"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                      {c.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="mr-2 text-sm text-blue-600 hover:underline"
                        onClick={() => {
                          setEditingId(c.id);
                          setForm({
                            name: c.name,
                            phone: c.phone ?? "",
                            notes: c.notes ?? "",
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No customers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
