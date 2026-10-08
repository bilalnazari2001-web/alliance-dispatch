"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { getSupabase } from "../../lib/supabase";
import type { PaymentType, Trip } from "../../lib/types";

function monthBounds(month: string) {
  const start = new Date(month + "-01T00:00:00");
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function BillingPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    const { start, end } = monthBounds(month);
    const { data } = await supabase
      .from("trips")
      .select("*")
      .gte("pickup_datetime", start)
      .lt("pickup_datetime", end)
      .order("pickup_datetime", { ascending: false });
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const completed = trips.filter((t) => t.status === "completed");
  const pending = trips.filter((t) =>
    ["scheduled", "en_route", "picked_up"].includes(t.status)
  );
  const totalRevenue = completed.reduce((s, t) => s + Number(t.fare), 0);
  const pendingValue = pending.reduce((s, t) => s + Number(t.fare), 0);

  const byPayment = (list: Trip[]) => {
    const out: Record<PaymentType, number> = {
      private_pay: 0,
      medicaid: 0,
      insurance: 0,
    };
    list.forEach((t) => {
      out[t.payment_type] += Number(t.fare);
    });
    return out;
  };

  const rev = byPayment(completed);
  const pend = byPayment(pending);

  const money = (n: number) => `$${n.toFixed(2)}`;

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        <input
          type="month"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Collected (completed)
              </p>
              <p className="mt-1 text-3xl font-bold text-green-700">
                {money(totalRevenue)}
              </p>
              <p className="text-xs text-slate-500">
                {completed.length} trips
              </p>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pending
              </p>
              <p className="mt-1 text-3xl font-bold text-amber-600">
                {money(pendingValue)}
              </p>
              <p className="text-xs text-slate-500">{pending.length} trips</p>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Collected by payment type
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Private pay</span>
                  <span className="font-semibold">{money(rev.private_pay)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Medicaid</span>
                  <span className="font-semibold">{money(rev.medicaid)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Insurance</span>
                  <span className="font-semibold">{money(rev.insurance)}</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pending by payment type
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Private pay</span>
                  <span className="font-semibold">{money(pend.private_pay)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Medicaid</span>
                  <span className="font-semibold">{money(pend.medicaid)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Insurance</span>
                  <span className="font-semibold">{money(pend.insurance)}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Passenger</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(t.pickup_datetime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{t.passenger_name}</td>
                    <td className="px-4 py-3">{t.status.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      {t.payment_type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {money(Number(t.fare))}
                    </td>
                  </tr>
                ))}
                {trips.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No trips this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
