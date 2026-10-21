import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, CheckCircle2, ListTodo, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { format } from "date-fns";
import { useWorkspace } from "@/store/workspaceStore";
import { usePrefs } from "@/store/prefsStore";
import { VoiceReactor } from "@/components/holo/VoiceReactor";
import {
  buildMyDay,
  isOpenProject,
  outstandingTasks,
  overallProgress,
  projectProgress,
} from "@/lib/calculations";
import { completedOnKey } from "@/lib/calculations";
import { formatDate, greetingForHour, motivationalMessage, todayKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusPill } from "@/components/shared/StatusPill";
import { TaskRow } from "@/features/tasks/TaskRow";
import { TaskPanel } from "@/features/tasks/TaskPanel";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { QuickAdd } from "@/features/tasks/QuickAdd";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(useGSAP);

function asList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.tasks)) return value.tasks;
  if (value && typeof value === "object") {
    return Object.values(value).filter((item) => item && typeof item === "object");
  }
  return [];
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function Stat({ label, value, hint }) {
  return (
    <div className="border border-border bg-surface px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-medium tracking-tight tabular">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const root = useRef(null);
  const displayName = usePrefs((state) => state.displayName);
  const rawProjects = useWorkspace((state) => state.projects);
  const rawTasks = useWorkspace((state) => state.tasks);
  const [taskId, setTaskId] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const projects = useMemo(() => asList(rawProjects), [rawProjects]);
  const tasks = useMemo(() => asList(rawTasks), [rawTasks]);

  const greeting = greetingForHour();
  const openProjects = projects.filter(isOpenProject);
  const active = openProjects.filter((project) => project.status === "active" || project.status === "planned");
  const outstanding = outstandingTasks(tasks, projects);
  const completedToday = tasks.filter(
    (task) => task.completed && task.completedAt && completedOnKey(task.completedAt) === todayKey()
  ).length;
  const progress = overallProgress(openProjects, tasks);
  const myDay = useMemo(() => {
    const built = buildMyDay(tasks) ?? {};
    return {
      overdue: asList(built.overdue),
      today: asList(built.today),
      suggestions: asList(built.suggestions),
    };
  }, [tasks]);
  const committed = uniqueById([...myDay.overdue, ...myDay.today]).slice(0, 8);
  const upcomingDeadlines = openProjects
    .filter((project) => project.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 5);
  const recentProjects = uniqueById(
    [...openProjects].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))
  ).slice(0, 4);
  const recentDone = uniqueById(
    tasks
      .filter((task) => task.completed && task.completedAt)
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
  ).slice(0, 5);
  const empty = projects.length === 0 && tasks.length === 0;

  useGSAP(
    () => {
      if (reduced || !root.current) return;
      gsap.from(root.current.querySelectorAll("[data-enter]"), {
        opacity: 0,
        y: 10,
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out",
      });
    },
    { scope: root }
  );

  return (
    
    <div ref={root} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div data-enter className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <div className="flex items-center gap-4">
   <VoiceReactor size={168} label="KELLY" />
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted tabular">
        {format(new Date(), "EEEE d MMMM yyyy")}
      </p>
      <h2 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
        {greeting.title}
        {displayName ? ` ${displayName.split(" ")[0]}.` : ""}
      </h2>
      <p className="mt-2 text-sm text-muted">{greeting.subtitle}</p>
    </div>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => navigate("/today")}>
      Open My Day
    </Button>
    <Button onClick={() => setProjectOpen(true)}>Create project</Button>
  </div>
</div>

      {empty ? (
        <div data-enter className="mt-10 border border-border bg-surface">
          <EmptyState
            icon={FolderKanban}
            title="Your workspace is clear."
            description="Create a project, capture a thought in Inbox, or let My Day assemble itself once work has dates."
            actionLabel="Create your first project"
            onAction={() => setProjectOpen(true)}
          />
        </div>
      ) : (
        <>
          <div data-enter className="mt-8 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Active projects" value={active.length} hint={`${openProjects.length} open`} />
            <Stat label="Outstanding tasks" value={outstanding.length} hint="Across open work" />
            <Stat label="Completed today" value={completedToday} hint="Local calendar day" />
            <div className="border-0 bg-surface px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Overall progress</p>
              <p className="mt-3 text-3xl font-medium tracking-tight tabular">{progress}%</p>
              <Progress value={progress} className="mt-3" />
            </div>
          </div>

          <p data-enter className="mt-8 max-w-xl text-sm text-muted">
            {motivationalMessage()}
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <section data-enter className="border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-medium">Today’s list</h3>
                <button
                  type="button"
                  className="text-xs text-muted hover:text-foreground"
                  onClick={() => navigate("/today")}
                >
                  Full planner
                </button>
              </div>
              <div className="p-3">
                <QuickAdd plannedDate={todayKey()} placeholder="Add something for today" />
              </div>
              {committed.length === 0 ? (
                <p className="px-4 pb-6 text-sm text-muted">
                  Nothing is committed for today. Plan a date, or add a task here.
                </p>
              ) : (
                <div className="px-2 pb-3">
                  {committed.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      showProject
                      projectName={projects.find((project) => project.id === task.projectId)?.name}
                      onOpen={(item, extra) => {
                        setTaskId(item.id);
                        setConfirm(Boolean(extra?.confirmComplete));
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="space-y-6">
              <section data-enter className="border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-medium">Upcoming deadlines</h3>
                </div>
                {upcomingDeadlines.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted">No project deadlines set.</p>
                ) : (
                  <ul>
                    {upcomingDeadlines.map((project) => (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-elevated"
                        >
                          <span className="truncate text-sm">{project.name}</span>
                          <span className="tabular text-xs text-muted">{formatDate(project.dueDate)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section data-enter className="border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-medium">Recently completed</h3>
                </div>
                {recentDone.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted">Finish a task to start the record.</p>
                ) : (
                  <ul className="px-4 py-2">
                    {recentDone.map((task) => (
                      <li key={task.id} className="flex items-center gap-2 py-1.5 text-sm text-muted">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="truncate text-foreground">{task.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <section data-enter className="mt-6 border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium">Recently active projects</h3>
              <button type="button" className="text-xs text-muted hover:text-foreground" onClick={() => navigate("/projects")}>
                All projects
              </button>
            </div>
            {recentProjects.length === 0 ? (
              <EmptyState icon={ListTodo} title="No projects yet" description="Start with one clear outcome." />
            ) : (
              <div className="grid sm:grid-cols-2">
                {recentProjects.map((project) => {
                  const value = projectProgress(tasks, project.id);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="flex flex-col gap-3 border-b border-border px-4 py-4 text-left last:border-b-0 sm:border-r sm:odd:border-r sm:even:border-r-0 hover:bg-elevated"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project.name}</p>
                          <StatusPill status={project.status} className="mt-1" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted" />
                      </div>
                      <Progress value={value} />
                      <p className="text-xs text-muted tabular">{value}% complete</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <TaskPanel
        taskId={taskId}
        open={Boolean(taskId)}
        onOpenChange={(open) => !open && setTaskId(null)}
        confirmComplete={confirm}
        onConfirmHandled={() => setConfirm(false)}
      />
      <ProjectForm open={projectOpen} onOpenChange={setProjectOpen} onCreated={(id) => navigate(`/projects/${id}`)} />
    </div>
  );
}