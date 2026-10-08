import type { TripStatus } from "../lib/types";

const COLORS: Record<TripStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  en_route: "bg-amber-100 text-amber-800",
  picked_up: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const LABELS: Record<TripStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En Route",
  picked_up: "Picked Up",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }: { status: TripStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
