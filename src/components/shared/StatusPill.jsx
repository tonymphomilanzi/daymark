import { cn } from "@/lib/utils";

const map = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

export function StatusPill({ status, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "active" && "bg-accent",
          status === "completed" && "bg-foreground/70",
          status === "planned" && "bg-muted",
          status === "on_hold" && "bg-high"
        )}
      />
      {map[status] || status}
    </span>
  );
}
