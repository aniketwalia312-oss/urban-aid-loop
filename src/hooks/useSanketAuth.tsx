import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "citizen" | "worker" | "official_admin";

type AuthValue = {
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  name: string | null;
  isWorker: boolean;
  isAdmin: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);

export function SanketAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [name, setName] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
    ]);
    setRoles(((roleRows ?? []).map((r) => r.role) as AppRole[]) ?? []);
    setName(profile?.name ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      if (next?.user) {
        setTimeout(() => void loadProfile(next.user.id), 0);
      } else {
        setRoles([]);
        setName(null);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) void loadProfile(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value: AuthValue = {
    session,
    loading,
    roles,
    name,
    isWorker: roles.includes("worker") || roles.includes("official_admin"),
    isAdmin: roles.includes("official_admin"),
    refreshRoles: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setRoles([]);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSanketAuth(): AuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSanketAuth must be used inside SanketAuthProvider");
  return ctx;
}
