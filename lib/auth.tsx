"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "./supabase";
import type { Profile, Role } from "./types";

interface AuthContextValue {
  userId: string | null;
  email: string | null;
  role: Role | null;
  driverId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadProfile = async (uid: string) => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("role, driver_id")
      .eq("id", uid)
      .single();
    const profile = data as Pick<Profile, "role" | "driver_id"> | null;
    setRole(profile?.role ?? null);
    setDriverId(profile?.driver_id ?? null);
  };

  const refreshProfile = async () => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      setEmail(user.email ?? null);
      await loadProfile(user.id);
    }
  };

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setRole(null);
        setDriverId(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (emailInput: string, password: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password,
    });
    if (error) return error.message;
    await refreshProfile();
    router.push("/dashboard");
    return null;
  };

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUserId(null);
    setEmail(null);
    setRole(null);
    setDriverId(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        email,
        role,
        driverId,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
