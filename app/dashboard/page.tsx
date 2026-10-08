"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { getSupabase } from "../../lib/supabase";
import type { Driver, Trip } from "../../lib/types";

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [upcoming, setUpcoming] = useState<Trip[]>([]);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { start, end } = dayBounds(new Date());

    const [tripsRes, driversRes] = await Promise.all([
      supabase
        .from("trips")
        .select("*")
        .gte("pickup_datetime", start)
        .lte("pickup_datetime", end)
        .order("pickup_datetime", { ascending: true }),
      supabase.from("drivers").select("*"),
    ]);

    const trips = (tripsRes.data ?? []) as Trip[];
    const driverList = (driversRes.data ?? []) as Driver[];
    setTodayTrips(trips);
    setDrivers(driverList);
    setActiveDrivers(driverList.filter((d) => d.status === "active").length);
    setRevenue(
      trips
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + Number(t.fare), 0)
    );

    const { data: upcomingData } = await supabase
      .from("trips")
      .select("*")
      .eq("status", "scheduled")
      .gte("pickup_datetime", new Date().toISOString())
      .order("pickup_datetime", { ascending: true })
      .limit(5);
    setUpcoming((upcomingData ?? []) as Trip[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = getSupabase();
    const channel = supabase
      .channel("dashboard-trips")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const driverName = (id: string | null) =>
    drivers.find((d) => d.id === id)?.name ?? "—";

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/trips/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New trip
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Trips today", value: todayTrips.length },
              { label: "Active drivers", value: activeDrivers },
              {
                label: "Revenue today",
                value: `$${revenue.toFixed(2)}`,
              },
              {
                label: "Completed today",
                value: todayTrips.filter((t) => t.status === "completed").length,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-1 text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Today&apos;s trips</h2>
              {todayTrips.length === 0 ? (
                <p className="text-sm text-slate-500">No trips scheduled today.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {todayTrips.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {fmtTime(t.pickup_datetime)} — {t.passenger_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.pickup_address} → {t.destination} ·{" "}
                          {driverName(t.driver_id)}
                        </p>
                      </div>
                      <StatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Upcoming pickups</h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing upcoming.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcoming.map((t) => (
                    <li key={t.id} className="py-3">
                      <Link
                        href={`/trips/${t.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {new Date(t.pickup_datetime).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        — {t.passenger_name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {t.pickup_address} → {t.destination}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
