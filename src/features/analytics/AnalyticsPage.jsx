import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, format } from "date-fns";
import { useWorkspace } from "@/store/workspaceStore";
import {
  completedOnKey,
  isOpenProject,
  isTaskOverdue,
  overallProgress,
  projectProgress,
} from "@/lib/calculations";
import { localDateKey, todayKey } from "@/lib/dates";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarChart3 } from "lucide-react";

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function AnalyticsPage() {
  const tasks = useWorkspace((state) => state.tasks);
  const projects = useWorkspace((state) => state.projects);
  const today = todayKey();
  const now = new Date();
  const weekAgo = localDateKey(addDays(now, -6));
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const completed = tasks.filter((task) => task.completed && task.completedAt);
  const todayCount = completed.filter((task) => completedOnKey(task.completedAt) === today).length;
  const weekCount = completed.filter((task) => completedOnKey(task.completedAt) >= weekAgo).length;
  const monthCount = completed.filter((task) => completedOnKey(task.completedAt) >= monthStart).length;
  const completedProjects = projects.filter((project) => project.status === "completed" && !project.trashedAt).length;
  const activeProjects = projects.filter((project) => isOpenProject(project) && project.status !== "completed").length;
  const overdue = tasks.filter((task) => isTaskOverdue(task) && (!task.projectId || isOpenProject(projects.find((p) => p.id === task.projectId)))).length;
  const rate = tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100);

  const weekly = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = addDays(startOfLocalDay(now), -i);
      const key = localDateKey(date);
      days.push({
        name: format(date, "EEE"),
        completed: completed.filter((task) => completedOnKey(task.completedAt) === key).length,
        planned: tasks.filter((task) => task.plannedDate === key).length,
      });
    }
    return days;
  }, [completed, tasks, now]);

  const breakdown = projects
    .filter(isOpenProject)
    .map((project) => ({
      id: project.id,
      name: project.name,
      progress: projectProgress(tasks, project.id),
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 8);

  const empty = tasks.length === 0 && projects.length === 0;

  if (empty) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          icon={BarChart3}
          title="No history yet."
          description="Analytics are calculated from real completion timestamps. They stay accurate when you open Daymark tomorrow."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Completed today", todayCount],
          ["Completed this week", weekCount],
          ["Completed this month", monthCount],
          ["Completed projects", completedProjects],
          ["Active projects", activeProjects],
          ["Overdue tasks", overdue],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-2 text-3xl font-medium tabular">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-border bg-surface p-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-sm font-medium">Weekly completions</h3>
            <p className="text-[11px] text-muted">Planned vs completed</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--elevated)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="planned" fill="var(--border)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="completed" fill="var(--accent)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="border border-border bg-surface p-4">
          <h3 className="text-sm font-medium">Project progress</h3>
          <p className="mt-1 text-[11px] text-muted">
            Overall {overallProgress(projects.filter(isOpenProject), tasks)}% across open work
          </p>
          <div className="mt-4 space-y-3">
            {breakdown.length === 0 ? (
              <p className="text-sm text-muted">No open projects.</p>
            ) : (
              breakdown.map((item) => (
                <div key={item.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="truncate pr-3">{item.name}</span>
                    <span className="tabular text-muted">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 border border-border bg-surface px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Task completion rate</p>
        <p className="mt-2 text-3xl font-medium tabular">{rate}%</p>
        <p className="mt-1 text-sm text-muted">
          {completed.length} of {tasks.length} tasks have a recorded completion time.
        </p>
      </section>
    </div>
  );
}
