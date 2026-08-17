import { STATUS_LABEL, STATUS_TONE, type IssueStatus } from "@/lib/sanket";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  info: "bg-info/15 text-info border-info/30",
  warning: "bg-warning/20 text-warning-foreground border-warning/40",
  success: "bg-success/15 text-success border-success/30",
  destructive: "bg-destructive/12 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: IssueStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[STATUS_TONE[status]],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE_CLASS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
