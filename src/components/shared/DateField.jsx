import { formatDate } from "@/lib/dates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function DateField({ id, label, value, onChange, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Input
        id={id}
        type="date"
        value={value || ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="tabular"
      />
      {value ? (
        <p className="text-[11px] text-muted tabular">{formatDate(value, "EEE, d MMM yyyy")}</p>
      ) : null}
    </div>
  );
}
