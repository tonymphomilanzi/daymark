import { useMemo, useState } from "react";
import { Sun } from "lucide-react";
import { useWorkspace } from "@/store/workspaceStore";
import { buildMyDay } from "@/lib/calculations";
import { formatDateLong, todayKey } from "@/lib/dates";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskRow } from "@/features/tasks/TaskRow";
import { TaskPanel } from "@/features/tasks/TaskPanel";
import { MyDayCapture } from "@/features/tasks/QuickAdd";
import { Button } from "@/components/ui/button";

function asTaskList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.tasks)) return value.tasks;
  if (value && typeof value === "object") {
    return Object.values(value).filter(
      (item) => item && typeof item === "object" && "id" in item
    );
  }
  return [];
}

function Group({ title, hint, tasks, projects, onOpen, empty }) {
  const list = asTaskList(tasks);

  return (
    <section className="border border-border bg-surface">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-[11px] text-muted">{hint}</p>
      </div>
      {list.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">{empty}</p>
      ) : (
        <div className="px-2 py-2">
          {list.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              showProject
              projectName={
                projects.find((project) => project.id === task.projectId)?.name ||
                "Inbox"
              }
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function MyDayPage() {
  const rawTasks = useWorkspace((state) => state.tasks);
  const projects = useWorkspace((state) => state.projects);
  const tasks = useMemo(() => asTaskList(rawTasks), [rawTasks]);
  const plan = useMemo(() => {
    const built = buildMyDay(tasks) ?? {};
    return {
      overdue: asTaskList(built.overdue),
      today: asTaskList(built.today),
      suggestions: asTaskList(built.suggestions),
      yesterdayUnfinished: asTaskList(built.yesterdayUnfinished),
      tomorrowScheduled: asTaskList(built.tomorrowScheduled),
    };
  }, [tasks]);
  const [taskId, setTaskId] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [showSide, setShowSide] = useState(false);

  const onOpen = (task, extra) => {
    setTaskId(task.id);
    setConfirm(Boolean(extra?.confirmComplete));
  };

  const committedEmpty = plan.overdue.length === 0 && plan.today.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted tabular">
          {formatDateLong(todayKey())}
        </p>
        <p className="mt-2 text-sm text-muted">
          Overdue and dated work is included automatically. Suggestions stay separate from today’s committed list.
        </p>
      </div>
      <div className="mb-6">
        <MyDayCapture />
        <p className="mt-2 text-[11px] text-muted">
          Manual additions set planned date to today. Deadlines are left untouched.
        </p>
      </div>

      {committedEmpty ? (
        <div className="mb-6 border border-border">
          <EmptyState
            icon={Sun}
            title="Nothing committed for today."
            description="Give tasks a planned date or deadline and they will appear here. High-priority upcoming work stays in suggestions."
          />
        </div>
      ) : null}

      <div className="space-y-5">
        <Group
          title="Overdue"
          hint={`${plan.overdue.length}`}
          empty="No overdue work. Keep it that way."
          tasks={plan.overdue}
          projects={projects}
          onOpen={onOpen}
        />
        <Group
          title="Today"
          hint={`${plan.today.length}`}
          empty="No tasks planned or due today."
          tasks={plan.today}
          projects={projects}
          onOpen={onOpen}
        />
        <Group
          title="Upcoming suggestions"
          hint="High priority, next 7 days"
          empty="No high-priority work in the next week."
          tasks={plan.suggestions}
          projects={projects}
          onOpen={onOpen}
        />
      </div>

      <div className="mt-6">
        <Button variant="ghost" size="sm" onClick={() => setShowSide((value) => !value)}>
          {showSide ? "Hide" : "Show"} yesterday & tomorrow
        </Button>
      </div>
      {showSide ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Group
            title="Yesterday, unfinished"
            hint="Not marked failed"
            empty="Yesterday is clear."
            tasks={plan.yesterdayUnfinished}
            projects={projects}
            onOpen={onOpen}
          />
          <Group
            title="Tomorrow"
            hint="Scheduled"
            empty="Nothing parked for tomorrow."
            tasks={plan.tomorrowScheduled}
            projects={projects}
            onOpen={onOpen}
          />
        </div>
      ) : null}

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