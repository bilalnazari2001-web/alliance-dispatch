export type Role = "admin" | "driver";

export type TripStatus =
  | "scheduled"
  | "en_route"
  | "picked_up"
  | "completed"
  | "cancelled";

export type PassengerType = "wheelchair" | "ambulatory";
export type PaymentType = "private_pay" | "medicaid" | "insurance";

export interface Profile {
  id: string;
  role: Role;
  driver_id: string | null;
}

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  vehicle_id: string | null;
  status: "active" | "inactive";
}

export interface Vehicle {
  id: string;
  name: string;
  type: "wheelchair van" | "sedan";
  capacity: number;
  status: "available" | "in_service" | "maintenance";
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
}

export interface Trip {
  id: string;
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
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  trip_id: string | null;
  actor: string | null;
  action: string;
  created_at: string;
}

export const TRIP_STATUSES: TripStatus[] = [
  "scheduled",
  "en_route",
  "picked_up",
  "completed",
  "cancelled",
];
