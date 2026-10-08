"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";
import type { PassengerType, PaymentType } from "../../lib/types";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function BookPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [passengerType, setPassengerType] = useState<PassengerType>("ambulatory");
  const [paymentType, setPaymentType] = useState<PaymentType>("private_pay");
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (honeypot) return; // spam bots fill hidden fields; ignore silently
    if (!date || !time) {
      setError("Please choose a pickup date and time.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabase();
      const pickupDatetime = new Date(`${date}T${time}`).toISOString();

      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .insert({ name: name.trim(), phone: phone.trim() || null })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);

      const { error: tErr } = await supabase.from("trips").insert({
        customer_id: (customer as { id: string }).id,
        pickup_address: pickup.trim(),
        destination: destination.trim(),
        pickup_datetime: pickupDatetime,
        passenger_name: name.trim(),
        contact_phone: phone.trim() || null,
        passenger_type: passengerType,
        payment_type: paymentType,
        status: "pending",
        notes: notes.trim() || null,
      });
      if (tErr) throw new Error(tErr.message);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again or call us.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-bold">Request received</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thank you! Your ride request has been received. A member of the
            Alliance team will contact you to confirm availability and pricing.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Need us sooner? Call{" "}
            <a href="tel:+12404215810" className="font-semibold text-blue-600">
              (240) 421-5810
            </a>{" "}
            — we&apos;re open 24/7.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-lg rounded-lg bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-xl font-bold">Alliance Medical Transportation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Request a ride — we&apos;ll confirm availability and pricing.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* honeypot: hidden from humans, catches bots */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Passenger name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Full name" />
            </div>
            <div>
              <label className={labelCls}>Phone number</label>
              <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(240) 555-0100" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Pickup address</label>
            <input required value={pickup} onChange={(e) => setPickup(e.target.value)} className={inputCls} placeholder="Street, city, ZIP" />
          </div>
          <div>
            <label className={labelCls}>Destination</label>
            <input required value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} placeholder="Hospital, clinic, address" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Pickup date</label>
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pickup time</label>
              <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <span className={labelCls}>Passenger type</span>
            <div className="mt-1 flex gap-3">
              {(["ambulatory", "wheelchair"] as PassengerType[]).map((t) => (
                <label key={t} className={`flex-1 cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm font-medium ${passengerType === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600"}`}>
                  <input type="radio" name="ptype" className="hidden" checked={passengerType === t} onChange={() => setPassengerType(t)} />
                  {t === "ambulatory" ? "Ambulatory" : "Wheelchair"}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls}>Payment type</span>
            <div className="mt-1 flex gap-3">
              {(["private_pay", "medicaid", "insurance"] as PaymentType[]).map((t) => (
                <label key={t} className={`flex-1 cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm font-medium ${paymentType === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600"}`}>
                  <input type="radio" name="paytype" className="hidden" checked={paymentType === t} onChange={() => setPaymentType(t)} />
                  {t === "private_pay" ? "Private pay" : t === "medicaid" ? "Medicaid" : "Insurance"}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Anything we should know? (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Return trip needed, building entrance, etc." />
          </div>

          <button type="submit" disabled={busy} className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? "Sending…" : "Submit ride request"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Prefer to book by phone? Call{" "}
            <a href="tel:+12404215810" className="font-semibold text-blue-600">
              (240) 421-5810
            </a>{" "}
            — 24/7.
          </p>
        </form>
      </div>
    </div>
  );
}
