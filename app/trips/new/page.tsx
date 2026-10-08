"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import TripForm, { type TripFormValues } from "../../../components/TripForm";
import { getSupabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import type { Customer, Driver, Vehicle } from "../../../lib/types";

export default function NewTripPage() {
  const router = useRouter();
  const { email } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase();
      const [d, v, c] = await Promise.all([
        supabase.from("drivers").select("*").eq("status", "active"),
        supabase.from("vehicles").select("*"),
        supabase.from("customers").select("*").order("name"),
      ]);
      setDrivers((d.data ?? []) as Driver[]);
      setVehicles((v.data ?? []) as Vehicle[]);
      setCustomers((c.data ?? []) as Customer[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async (values: TripFormValues) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("trips")
      .insert({
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
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("activity_log").insert({
      trip_id: (data as { id: string }).id,
      actor: email ?? "dispatcher",
      action: "Trip created",
    });
    router.push("/trips");
  };

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">New trip</h1>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <TripForm
            drivers={drivers}
            vehicles={vehicles}
            customers={customers}
            submitLabel="Create trip"
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </AppShell>
  );
}
