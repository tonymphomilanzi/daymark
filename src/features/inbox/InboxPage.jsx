import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox } from "lucide-react";
import { useWorkspace } from "@/store/workspaceStore";
import { matchesTaskFilter, sortTasks } from "@/lib/calculations";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskRow } from "@/features/tasks/TaskRow";
import { TaskPanel } from "@/features/tasks/TaskPanel";
import { InboxCapture } from "@/features/tasks/QuickAdd";
import { Button } from "@/components/ui/button";

const FILTERS = [
  ["all", "All"],
  ["active", "Active"],
  ["completed", "Completed"],
  ["overdue", "Overdue"],
  ["today", "Due today"],
  ["high", "High priority"],
];

export default function InboxPage() {
  const tasks = useWorkspace((state) => state.tasks);
  const [filter, setFilter] = useState("active");
  const [params] = useSearchParams();
  const [taskId, setTaskId] = useState(params.get("task"));
  const [confirm, setConfirm] = useState(false);

  const inbox = useMemo(() => {
    const list = tasks.filter((task) => task.projectId === null);
    const filtered = list.filter((task) => matchesTaskFilter(task, filter === "all" ? "all" : filter));
    return sortTasks(filtered, "created");
  }, [tasks, filter]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="mb-4 text-sm text-muted">
        Standalone tasks live here until they belong to a project. They still appear in My Day and search.
      </p>
      <InboxCapture />
      <div className="mt-6 flex flex-wrap gap-1">
        {FILTERS.map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "secondary" : "ghost"}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="mt-4 border border-border bg-surface">
        {inbox.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Inbox is empty."
            description="Capture a thought before it disappears. Assign it to a project when the shape is clear."
          />
        ) : (
          <div className="px-2 py-2">
            {inbox.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onOpen={(item, extra) => {
                  setTaskId(item.id);
                  setConfirm(Boolean(extra?.confirmComplete));
                }}
              />
            ))}
          </div>
        )}
      </div>
      <TaskPanel
        taskId={taskId}
        open={Boolean(taskId)}
        onOpenChange={(open) => !open && setTaskId(null)}
        confirmComplete={confirm}
        onConfirmHandled={() => setConfirm(false)}
      />
    </div>
  );
}
