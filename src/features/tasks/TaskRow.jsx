import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, GripVertical, MoreHorizontal } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityFlag } from "@/components/shared/PriorityFlag";
import { formatDate, isBeforeToday, isToday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspaceStore";

gsap.registerPlugin(useGSAP);

export function TaskRow({
  task,
  depth = 0,
  onOpen,
  dragHandleProps,
  showProject = false,
  projectName,
}) {
  const navigate = useNavigate();
  const toggleTask = useWorkspace((state) => state.toggleTask);
  const deleteTask = useWorkspace((state) => state.deleteTask);
  const duplicateTask = useWorkspace((state) => state.duplicateTask);
  const addToMyDay = useWorkspace((state) => state.addToMyDay);
  const deferTask = useWorkspace((state) => state.deferTask);
  const rowRef = useRef(null);

  useGSAP(() => {}, { scope: rowRef });

  const overdue = task.dueDate && !task.completed && isBeforeToday(task.dueDate);
  const dueToday = task.dueDate && isToday(task.dueDate);

  const onToggle = () => {
    const result = toggleTask(task.id);
    if (result.needsConfirm) {
      onOpen?.(task, { confirmComplete: true });
      return;
    }
    if (!task.completed && rowRef.current) {
      gsap.fromTo(
        rowRef.current,
        { backgroundColor: "color-mix(in srgb, var(--accent) 18%, transparent)" },
        { backgroundColor: "transparent", duration: 0.45, ease: "power1.out" }
      );
    }
  };

  return (
    <div
      ref={rowRef}
      className={cn(
        "group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-elevated/80",
        task.completed && "opacity-60"
      )}
      style={{ paddingLeft: 8 + depth * 18 }}
    >
      {dragHandleProps ? (
        <button
          type="button"
          className="mt-1 cursor-grab text-muted opacity-0 group-hover:opacity-100"
          aria-label="Reorder"
          {...dragHandleProps}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="w-0 sm:w-3.5" />
      )}
      <Checkbox
        checked={task.completed}
        onCheckedChange={onToggle}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className="mt-0.5"
      />
      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm",
              task.completed && "line-through text-muted"
            )}
          >
            {task.title}
          </span>
          <PriorityFlag priority={task.priority} className="opacity-70" />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
          {showProject && projectName ? (
            <button
              type="button"
              className="hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/projects/${task.projectId}`);
              }}
            >
              {projectName}
            </button>
          ) : null}
          {task.plannedDate ? (
            <span className="inline-flex items-center gap-1 tabular">
              <CalendarClock className="h-3 w-3" />
              {formatDate(task.plannedDate)}
            </span>
          ) : null}
          {task.dueDate ? (
            <span
              className={cn(
                "tabular",
                overdue && "text-urgent",
                dueToday && !overdue && "text-high"
              )}
            >
              Due {formatDate(task.dueDate)}
            </span>
          ) : null}
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            aria-label="Task actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpen?.(task)}>Open</DropdownMenuItem>
          <DropdownMenuItem onClick={() => addToMyDay(task.id)}>Add to My Day</DropdownMenuItem>
          <DropdownMenuItem onClick={() => deferTask(task.id, 1)}>Defer one day</DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicateTask(task.id)}>Duplicate</DropdownMenuItem>
          {task.projectId ? (
            <DropdownMenuItem onClick={() => navigate(`/projects/${task.projectId}`)}>
              Open project
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
