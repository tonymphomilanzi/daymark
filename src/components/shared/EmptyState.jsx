import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16",
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface text-muted">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <h3 className="text-[15px] font-medium tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted leading-relaxed">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
