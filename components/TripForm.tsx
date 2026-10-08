"use client";

import { useState } from "react";
import type {
  Customer,
  Driver,
  PassengerType,
  PaymentType,
  Trip,
  TripStatus,
  Vehicle,
} from "../lib/types";
import { TRIP_STATUSES } from "../lib/types";

export interface TripFormValues {
  customer_id: string | null;
  pickup_address: string;
  destination: string;
  pickup_datetime: string;
  passenger_name: string;
  passenger_type: PassengerType;
  payment_type: PaymentType;
  status: TripStatus;
  driver_id: string | null;
  vehicle_id: string | null;
  fare: number;
  notes: string;
}

interface Props {
  initial?: Partial<Trip>;
  drivers: Driver[];
  vehicles: Vehicle[];
  customers: Customer[];
  submitLabel: string;
  onSubmit: (values: TripFormValues) => Promise<void>;
}

function toDateTimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function TripForm({
  initial,
  drivers,
  vehicles,
  customers,
  submitLabel,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<TripFormValues>({
    customer_id: initial?.customer_id ?? null,
    pickup_address: initial?.pickup_address ?? "",
    destination: initial?.destination ?? "",
    pickup_datetime: toDateTimeLocal(initial?.pickup_datetime),
    passenger_name: initial?.passenger_name ?? "",
    passenger_type: initial?.passenger_type ?? "ambulatory",
    payment_type: initial?.payment_type ?? "private_pay",
    status: initial?.status ?? "scheduled",
    driver_id: initial?.driver_id ?? null,
    vehicle_id: initial?.vehicle_id ?? null,
    fare: initial?.fare ?? 0,
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof TripFormValues>(key: K, value: TripFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.pickup_address || !values.destination || !values.pickup_datetime || !values.passenger_name) {
      setError("Pickup address, destination, date/time, and passenger name are required.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...values,
        pickup_datetime: new Date(values.pickup_datetime).toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save trip.");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Customer</label>
          <select
            className={input}
            value={values.customer_id ?? ""}
            onChange={(e) => set("customer_id", e.target.value || null)}
          >
            <option value="">— None —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Passenger name *</label>
          <input
            className={input}
            value={values.passenger_name}
            onChange={(e) => set("passenger_name", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={label}>Pickup address *</label>
        <input
          className={input}
          value={values.pickup_address}
          onChange={(e) => set("pickup_address", e.target.value)}
        />
      </div>

      <div>
        <label className={label}>Destination *</label>
        <input
          className={input}
          value={values.destination}
          onChange={(e) => set("destination", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Pickup date &amp; time *</label>
          <input
            type="datetime-local"
            className={input}
            value={values.pickup_datetime}
            onChange={(e) => set("pickup_datetime", e.target.value)}
          />
        </div>
        <div>
          <label className={label}>Status</label>
          <select
            className={input}
            value={values.status}
            onChange={(e) => set("status", e.target.value as TripStatus)}
          >
            {TRIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Passenger type</label>
          <select
            className={input}
            value={values.passenger_type}
            onChange={(e) => set("passenger_type", e.target.value as PassengerType)}
          >
            <option value="ambulatory">Ambulatory</option>
            <option value="wheelchair">Wheelchair</option>
          </select>
        </div>
        <div>
          <label className={label}>Payment type</label>
          <select
            className={input}
            value={values.payment_type}
            onChange={(e) => set("payment_type", e.target.value as PaymentType)}
          >
            <option value="private_pay">Private pay</option>
            <option value="medicaid">Medicaid</option>
            <option value="insurance">Insurance</option>
          </select>
        </div>
        <div>
          <label className={label}>Fare ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={input}
            value={values.fare}
            onChange={(e) => set("fare", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Driver</label>
          <select
            className={input}
            value={values.driver_id ?? ""}
            onChange={(e) => set("driver_id", e.target.value || null)}
          >
            <option value="">— Unassigned —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Vehicle</label>
          <select
            className={input}
            value={values.vehicle_id ?? ""}
            onChange={(e) => set("vehicle_id", e.target.value || null)}
          >
            <option value="">— None —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea
          className={input}
          rows={3}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
