"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "../lib/auth";

const DRIVER_ONLY = ["/my-trips"];
const ADMIN_ONLY = [
  "/dashboard",
  "/trips",
  "/schedule",
  "/drivers",
  "/vehicles",
  "/customers",
  "/billing",
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { userId, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      router.push("/login");
      return;
    }
    if (role === "driver" && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
      router.push("/my-trips");
    } else if (role === "admin" && DRIVER_ONLY.some((p) => pathname.startsWith(p))) {
      router.push("/dashboard");
    }
  }, [loading, userId, role, pathname, router]);

  if (loading || !userId || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
