"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { getSupabase } from "../../lib/supabase";
import type { Driver, Trip, TripStatus } from "../../lib/types";
import { TRIP_STATUSES } from "../../lib/types";

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase();
      const [tripsRes, driversRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*")
          .order("pickup_datetime", { ascending: false })
          .limit(500),
        supabase.from("drivers").select("*"),
      ]);
      setTrips((tripsRes.data ?? []) as Trip[]);
      setDrivers((driversRes.data ?? []) as Driver[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return trips.filter((t) => {
      if (statusFilter !== "all" && t.status !== (statusFilter as TripStatus))
        return false;
      if (driverFilter !== "all" && t.driver_id !== driverFilter) return false;
      if (dateFilter) {
        const day = new Date(t.pickup_datetime).toISOString().slice(0, 10);
        if (day !== dateFilter) return false;
      }
      if (
        q &&
        !`${t.passenger_name} ${t.pickup_address} ${t.destination}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [trips, search, statusFilter, driverFilter, dateFilter]);

  const driverName = (id: string | null) =>
    drivers.find((d) => d.id === id)?.name ?? "Unassigned";

  const input =
    "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trips</h1>
        <Link
          href="/trips/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New trip
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Search passenger or address…"
          className={`${input} w-64`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={input}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {TRIP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className={input}
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
        >
          <option value="all">All drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={input}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        {(search || statusFilter !== "all" || driverFilter !== "all" || dateFilter) && (
          <button
            className="rounded-md bg-slate-200 px-3 py-2 text-sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setDriverFilter("all");
              setDateFilter("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    {new Date(t.pickup_datetime).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/trips/${t.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {t.passenger_name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {t.passenger_type} · {t.payment_type.replace("_", " ")}
                    </p>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-600">
                    {t.pickup_address} → {t.destination}
                  </td>
                  <td className="px-4 py-3">{driverName(t.driver_id)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">${Number(t.fare).toFixed(2)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No trips match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
