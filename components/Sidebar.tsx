"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trips", label: "Trips" },
  { href: "/schedule", label: "Schedule" },
  { href: "/drivers", label: "Drivers" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/customers", label: "Customers" },
  { href: "/billing", label: "Billing" },
];

const DRIVER_LINKS = [{ href: "/my-trips", label: "My Trips" }];

export default function Sidebar() {
  const pathname = usePathname();
  const { role, email, signOut } = useAuth();
  const links = role === "admin" ? ADMIN_LINKS : DRIVER_LINKS;

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 px-4 py-5">
        <p className="text-sm font-bold leading-tight">
          Alliance Medical
          <br />
          Transportation
        </p>
        <p className="mt-1 text-xs text-slate-400">Dispatch Platform</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-700 p-3">
        <p className="truncate px-1 text-xs text-slate-400">{email}</p>
        <button
          onClick={signOut}
          className="mt-2 w-full rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
