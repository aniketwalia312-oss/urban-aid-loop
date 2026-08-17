import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { elevateRole } from "@/lib/civic.functions";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Sanket — Civic Grievance Platform" },
      {
        name: "description",
        content:
          "Sign in or register on Sanket to report civic issues, track resolution and audit municipal repair work.",
      },
      { property: "og:title", content: "Sign in to Sanket" },
      { property: "og:description", content: "Citizen, field worker and municipal admin access to Sanket." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, isAdmin, isWorker, refreshRoles } = useSanketAuth();
  const elevate = useServerFn(elevateRole);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [passkey, setPasskey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session && !passkey) {
      void navigate({
        to: isAdmin ? "/admin/dashboard" : isWorker ? "/worker/dashboard" : "/dashboard/citizen",
        replace: true,
      });
    }
  }, [session, isAdmin, isWorker, navigate, passkey]);

  const applyPasskey = async () => {
    if (!passkey) return;
    try {
      const { role } = await elevate({ data: { passkey } });
      await refreshRoles();
      toast.success(role === "official_admin" ? "Admin access granted" : "Field worker access granted");
      void navigate({ to: role === "official_admin" ? "/admin/dashboard" : "/worker/dashboard", replace: true });
    } catch {
      toast.error("Invalid access passkey");
      void navigate({ to: "/dashboard/citizen", replace: true });
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshRoles();
    await applyPasskey();
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { name } },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Check your email to confirm your account");
      return;
    }
    await refreshRoles();
    await applyPasskey();
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    await refreshRoles();
    await applyPasskey();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Radar className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Sanket access</h1>
          <p className="text-sm text-muted-foreground">
            Citizens sign in freely. Field workers and officials add their passkey.
          </p>
        </div>

        <div className="panel p-5">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 pt-3">
                <Field id="email" label="Email" type="email" value={email} onChange={setEmail} />
                <Field id="password" label="Password" type="password" value={password} onChange={setPassword} />
                <PasskeyField value={passkey} onChange={setPasskey} />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={signUp} className="space-y-3 pt-3">
                <Field id="name" label="Full name" value={name} onChange={setName} />
                <Field id="remail" label="Email" type="email" value={email} onChange={setEmail} />
                <Field id="rpassword" label="Password" type="password" value={password} onChange={setPassword} />
                <PasskeyField value={passkey} onChange={setPasskey} />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create citizen account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={() => void google()}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} required onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PasskeyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="passkey" className="flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5" /> Role passkey (optional)
      </Label>
      <Input
        id="passkey"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Field worker or official passkey"
      />
    </div>
  );
}
