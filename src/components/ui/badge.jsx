import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-elevated text-muted",
        accent: "border-transparent bg-accent/15 text-accent-foreground dark:text-accent",
        outline: "border-border text-muted",
        urgent: "border-transparent bg-urgent/15 text-urgent",
        high: "border-transparent bg-high/15 text-high",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
