import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationsQuery } from "@/lib/innovation.queries";
import { markNotificationsRead } from "@/lib/innovation.functions";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export function NotificationBell() {
  const { session } = useSanketAuth();
  const userId = session?.user.id;
  const { data: items = [] } = useQuery(notificationsQuery(userId));
  const markRead = useServerFn(markNotificationsRead);
  const queryClient = useQueryClient();
  const unread = items.filter((n) => !n.read).length;

  if (!userId) return null;

  return (
    <Popover
      onOpenChange={(open) => {
        if (open && unread > 0) {
          void markRead({}).then(() =>
            queryClient.invalidateQueries({ queryKey: ["notifications"] }),
          );
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b px-3 py-2 text-sm font-medium">Notifications</p>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
          )}
          {items.map((n) => (
            <div key={n.id} className="border-b px-3 py-2 last:border-0">
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              {n.link?.startsWith("/challenges/") && (
                <Link
                  to="/challenges/$id"
                  params={{ id: n.link.replace("/challenges/", "") }}
                  className="text-xs text-accent underline"
                >
                  Open challenge
                </Link>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
