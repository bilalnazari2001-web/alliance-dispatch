"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { getSupabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import type { Trip, TripStatus } from "../../lib/types";

const NEXT_STEPS: Record<string, { label: string; to: TripStatus }[]> = {
  scheduled: [{ label: "Start trip (En Route)", to: "en_route" }],
  en_route: [{ label: "Picked Up", to: "picked_up" }],
  picked_up: [{ label: "Complete trip", to: "completed" }],
};

export default function MyTripsPage() {
  const { driverId, email } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("driver_id", driverId)
      .gte("pickup_datetime", start.toISOString())
      .neq("status", "cancelled")
      .order("pickup_datetime", { ascending: true })
      .limit(50);
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    load();
    const supabase = getSupabase();
    const channel = supabase
      .channel("my-trips")
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

  const updateStatus = async (trip: Trip, to: TripStatus) => {
    setUpdating(trip.id);
    const supabase = getSupabase();
    const { error } = await supabase
      .from("trips")
      .update({ status: to })
      .eq("id", trip.id);
    if (!error) {
      await supabase.from("activity_log").insert({
        trip_id: trip.id,
        actor: email ?? "driver",
        action: `Driver set status to ${to.replace("_", " ")}`,
      });
      await load();
    }
    setUpdating(null);
  };

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">My Trips</h1>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !driverId ? (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Your login isn&apos;t linked to a driver record yet. Ask your
            dispatcher to link your account in the Drivers section.
          </p>
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">No trips assigned today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((t) => (
            <div key={t.id} className="rounded-lg bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">
                    {new Date(t.pickup_datetime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    — {t.passenger_name}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-medium">Pickup:</span>{" "}
                    {t.pickup_address}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Drop-off:</span>{" "}
                    {t.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.passenger_type} · {t.payment_type.replace("_", " ")}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              {(NEXT_STEPS[t.status] ?? []).length > 0 && (
                <div className="mt-4 flex gap-2">
                  {(NEXT_STEPS[t.status] ?? []).map((step) => (
                    <button
                      key={step.to}
                      disabled={updating === t.id}
                      onClick={() => updateStatus(t, step.to)}
                      className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updating === t.id ? "Updating…" : step.label}
                    </button>
                  ))}
                </div>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  t.pickup_address
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-blue-600 hover:underline"
              >
                Open pickup in Maps
              </a>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
