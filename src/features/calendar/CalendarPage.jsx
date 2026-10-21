import { useMemo, useState } from "react";
import { addMonths, format, isSameMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/store/workspaceStore";
import { usePrefs } from "@/store/prefsStore";
import { eachDayOfRange, localDateKey, monthGrid, parseLocalDate, weekRange } from "@/lib/dates";
import { isOpenProject } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskPanel } from "@/features/tasks/TaskPanel";

export default function CalendarPage() {
  const weekStartsOn = usePrefs((state) => state.weekStartsOn);
  const tasks = useWorkspace((state) => state.tasks);
  const projects = useWorkspace((state) => state.projects);
  const updateTask = useWorkspace((state) => state.updateTask);
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState("month");
  const [taskId, setTaskId] = useState(null);

  const days =
    view === "month"
      ? monthGrid(cursor, weekStartsOn)
      : eachDayOfRange(weekRange(cursor, weekStartsOn).start, weekRange(cursor, weekStartsOn).end);

  const itemsByDay = useMemo(() => {
    const map = new Map();
    const add = (key, item) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    };
    for (const task of tasks.filter((item) => !item.completed)) {
      add(task.plannedDate, { kind: "planned", task });
      if (task.dueDate && task.dueDate !== task.plannedDate) {
        add(task.dueDate, { kind: "deadline", task });
      }
    }
    for (const project of projects.filter(isOpenProject)) {
      add(project.dueDate, { kind: "project", project });
    }
    return map;
  }, [tasks, projects]);

  const weekdayLabels = days.slice(0, 7).map((day) => format(day, "EEE"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCursor(view === "month" ? subMonths(cursor, 1) : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7))}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCursor(view === "month" ? addMonths(cursor, 1) : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7))}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-medium tracking-tight">
            {format(cursor, view === "month" ? "MMMM yyyy" : "'Week of' d MMM")}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={view === "month" ? "secondary" : "ghost"} onClick={() => setView("month")}>
            Month
          </Button>
          <Button size="sm" variant={view === "week" ? "secondary" : "ghost"} onClick={() => setView("week")}>
            Week
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>
      </div>
      <div className="mb-3 flex gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" /> Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-urgent" /> Deadline
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Project due
        </span>
      </div>
      <div className="overflow-hidden border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-surface">
          {weekdayLabels.map((label) => (
            <div key={label} className="px-2 py-2 text-[11px] uppercase tracking-[0.12em] text-muted">
              {label}
            </div>
          ))}
        </div>
        <div className={cn("grid grid-cols-7", view === "week" ? "auto-rows-[220px]" : "auto-rows-[120px] sm:auto-rows-[140px]")}>
          {days.map((day) => {
            const key = localDateKey(day);
            const items = itemsByDay.get(key) || [];
            const muted = view === "month" && !isSameMonth(day, cursor);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-0 overflow-hidden border-b border-r border-border p-1.5",
                  muted && "bg-elevated/40"
                )}
              >
                <p className={cn("px-1 text-xs tabular", muted ? "text-muted" : "text-foreground")}>
                  {format(day, "d")}
                </p>
                <div className="mt-1 space-y-1 overflow-y-auto">
                  {items.slice(0, view === "week" ? 8 : 3).map((item, index) => {
                    if (item.kind === "project") {
                      return (
                        <button
                          key={`${item.project.id}-${index}`}
                          type="button"
                          onClick={() => navigate(`/projects/${item.project.id}`)}
                          className="block w-full truncate rounded-sm bg-accent/15 px-1.5 py-0.5 text-left text-[11px] text-foreground"
                        >
                          {item.project.name}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={`${item.task.id}-${item.kind}-${index}`}
                        type="button"
                        onClick={() => setTaskId(item.task.id)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          const next = window.prompt("Move planned date (YYYY-MM-DD)", item.task.plannedDate || key);
                          if (next && parseLocalDate(next)) updateTask(item.task.id, { plannedDate: next });
                        }}
                        className={cn(
                          "block w-full truncate rounded-sm px-1.5 py-0.5 text-left text-[11px]",
                          item.kind === "deadline"
                            ? "bg-urgent/10 text-urgent"
                            : "bg-elevated text-foreground"
                        )}
                      >
                        {item.task.title}
                      </button>
                    );
                  })}
                  {items.length > (view === "week" ? 8 : 3) ? (
                    <p className="px-1 text-[10px] text-muted">+{items.length - (view === "week" ? 8 : 3)}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Click an item to open it. Right-click a task to change its planned date.
      </p>
      <TaskPanel taskId={taskId} open={Boolean(taskId)} onOpenChange={(open) => !open && setTaskId(null)} />
    </div>
  );
}
