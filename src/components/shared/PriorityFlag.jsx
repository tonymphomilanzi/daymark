import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  urgent: "text-urgent",
  high: "text-high",
  medium: "text-muted",
  low: "text-muted/70",
};

export function PriorityFlag({ priority = "medium", className }) {
  return <Flag className={cn("h-3.5 w-3.5", styles[priority] || styles.medium, className)} />;
}

export function priorityLabel(priority) {
  return { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" }[priority] || "Medium";
}
