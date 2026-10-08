"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { getSupabase } from "../../lib/supabase";
import type { Driver, Trip } from "../../lib/types";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function SchedulePage() {
  const [date, setDate] = useState(toISODate(new Date()));
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    const start = new Date(date + "T00:00:00").toISOString();
    const end = new Date(date + "T23:59:59").toISOString();
    const [t, d] = await Promise.all([
      supabase
        .from("trips")
        .select("*")
        .gte("pickup_datetime", start)
        .lte("pickup_datetime", end)
        .order("pickup_datetime", { ascending: true }),
      supabase.from("drivers").select("*"),
    ]);
    setTrips((t.data ?? []) as Trip[]);
    setDrivers((d.data ?? []) as Driver[]);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const driverName = (id: string | null) =>
    drivers.find((d) => d.id === id)?.name ?? "Unassigned";

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Run board</h1>
        <input
          type="date"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : trips.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            No trips on{" "}
            {new Date(date + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => (
            <Link
              key={t.id}
              href={`/trips/${t.id}`}
              className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm hover:bg-slate-50"
            >
              <div className="w-20 shrink-0 text-center">
                <p className="text-lg font-bold">
                  {new Date(t.pickup_datetime).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {t.passenger_name} · {t.passenger_type}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {t.pickup_address} → {t.destination}
                </p>
                <p className="text-xs text-slate-500">
                  Driver: {driverName(t.driver_id)}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
