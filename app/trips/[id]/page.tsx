"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import StatusBadge from "../../../components/StatusBadge";
import TripForm, { type TripFormValues } from "../../../components/TripForm";
import { getSupabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import type {
  ActivityLog,
  Customer,
  Driver,
  Trip,
  TripStatus,
  Vehicle,
} from "../../../lib/types";
import { TRIP_STATUSES } from "../../../lib/types";

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { email } = useAuth();
  const id = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [t, d, v, c, a] = await Promise.all([
      supabase.from("trips").select("*").eq("id", id).single(),
      supabase.from("drivers").select("*"),
      supabase.from("vehicles").select("*"),
      supabase.from("customers").select("*"),
      supabase
        .from("activity_log")
        .select("*")
        .eq("trip_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (t.error) {
      setError("Trip not found.");
    } else {
      setTrip(t.data as Trip);
    }
    setDrivers((d.data ?? []) as Driver[]);
    setVehicles((v.data ?? []) as Vehicle[]);
    setCustomers((c.data ?? []) as Customer[]);
    setActivity((a.data ?? []) as ActivityLog[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const logActivity = async (action: string) => {
    const supabase = getSupabase();
    await supabase.from("activity_log").insert({
      trip_id: id,
      actor: email ?? "dispatcher",
      action,
    });
  };

  const updateStatus = async (status: TripStatus) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("trips")
      .update({ status })
      .eq("id", id);
    if (!error) {
      await logActivity(`Status changed to ${status.replace("_", " ")}`);
      await load();
    }
  };

  const handleEdit = async (values: TripFormValues) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("trips")
      .update({
        customer_id: values.customer_id,
        pickup_address: values.pickup_address,
        destination: values.destination,
        pickup_datetime: values.pickup_datetime,
        passenger_name: values.passenger_name,
        passenger_type: values.passenger_type,
        payment_type: values.payment_type,
        status: values.status,
        driver_id: values.driver_id,
        vehicle_id: values.vehicle_id,
        fare: values.fare,
        notes: values.notes || null,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity("Trip details updated");
    setEditing(false);
    await load();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    const supabase = getSupabase();
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (!error) router.push("/trips");
  };

  const driverName = (did: string | null) =>
    drivers.find((d) => d.id === did)?.name ?? "Unassigned";
  const vehicleName = (vid: string | null) =>
    vehicles.find((v) => v.id === vid)?.name ?? "—";

  return (
    <AppShell>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error || !trip ? (
        <p className="text-sm text-red-600">{error ?? "Trip not found."}</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{trip.passenger_name}</h1>
              <p className="text-sm text-slate-500">
                {new Date(trip.pickup_datetime).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={trip.status} />
              <button
                onClick={() => setEditing((e) => !e)}
                className="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>

          {editing ? (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <TripForm
                initial={trip}
                drivers={drivers}
                vehicles={vehicles}
                customers={customers}
                submitLabel="Save changes"
                onSubmit={handleEdit}
              />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Trip details</h2>
                <dl className="space-y-3 text-sm">
                  {[
                    ["Pickup", trip.pickup_address],
                    ["Destination", trip.destination],
                    ["Passenger type", trip.passenger_type],
                    ["Payment type", trip.payment_type.replace("_", " ")],
                    ["Driver", driverName(trip.driver_id)],
                    ["Vehicle", vehicleName(trip.vehicle_id)],
                    ["Fare", `$${Number(trip.fare).toFixed(2)}`],
                    ["Notes", trip.notes ?? "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="font-medium text-slate-500">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <h3 className="mb-2 mt-6 text-sm font-semibold">Update status</h3>
                <div className="flex flex-wrap gap-2">
                  {TRIP_STATUSES.filter((s) => s !== trip.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200"
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Activity</h2>
                {activity.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {activity.map((a) => (
                      <li key={a.id} className="text-sm">
                        <p className="font-medium">{a.action}</p>
                        <p className="text-xs text-slate-500">
                          {a.actor ?? "system"} ·{" "}
                          {new Date(a.created_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
