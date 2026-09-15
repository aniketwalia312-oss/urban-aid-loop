import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSanketAuth } from "@/hooks/useSanketAuth";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/components/sanket/NotificationBell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, name, isWorker, isAdmin, isUniversity, isIndustry, isGovernment, signOut } = useSanketAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Radar className="h-5 w-5 text-accent" />
            <span className="tracking-tight">Sanket</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Link to="/dashboard/citizen" className="rounded-md px-3 py-1.5 hover:bg-secondary">
              Citizen
            </Link>
            <Link to="/challenges" className="rounded-md px-3 py-1.5 hover:bg-secondary">
              Challenges
            </Link>
            {isUniversity && (
              <Link to="/university/dashboard" className="rounded-md px-3 py-1.5 hover:bg-secondary">
                University
              </Link>
            )}
            {isIndustry && (
              <Link to="/industry/dashboard" className="rounded-md px-3 py-1.5 hover:bg-secondary">
                Industry
              </Link>
            )}
            {isGovernment && (
              <Link to="/government/dashboard" className="rounded-md px-3 py-1.5 hover:bg-secondary">
                Analytics
              </Link>
            )}
            {isWorker && (
              <Link to="/worker/dashboard" className="rounded-md px-3 py-1.5 hover:bg-secondary">
                Field worker
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin/dashboard" className="rounded-md px-3 py-1.5 hover:bg-secondary">
                Command centre
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <>
                <NotificationBell />
                <span className="hidden text-sm text-muted-foreground sm:inline">{name ?? "Citizen"}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Sign out</span>
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Sanket · auditable civic grievance resolution
      </footer>
    </div>
  );
}
