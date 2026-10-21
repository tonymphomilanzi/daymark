import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useWorkspace } from "@/store/workspaceStore";
import { projectProgress, projectTasks } from "@/lib/calculations";
import { formatDate, formatTimestamp } from "@/lib/dates";
import { renderMarkdown } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TaskTree } from "@/features/tasks/TaskTree";
import { TaskPanel } from "@/features/tasks/TaskPanel";
import { QuickAdd } from "@/features/tasks/QuickAdd";
import { ProjectForm } from "./ProjectForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListTodo } from "lucide-react";

gsap.registerPlugin(useGSAP);

export default function ProjectDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const projects = useWorkspace((state) => state.projects);
  const tasks = useWorkspace((state) => state.tasks);
  const activities = useWorkspace((state) => state.activities);
  const categories = useWorkspace((state) => state.categories);
  const reorderTasks = useWorkspace((state) => state.reorderTasks);
  const setProjectNotes = useWorkspace((state) => state.setProjectNotes);
  const archiveProject = useWorkspace((state) => state.archiveProject);
  const unarchiveProject = useWorkspace((state) => state.unarchiveProject);
  const duplicateProject = useWorkspace((state) => state.duplicateProject);
  const trashProject = useWorkspace((state) => state.trashProject);
  const togglePin = useWorkspace((state) => state.togglePin);
  const project = projects.find((item) => item.id === id);
  const [taskId, setTaskId] = useState(params.get("task"));
  const [confirm, setConfirm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("order");
  const [notes, setNotes] = useState(project?.notes || "");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setNotes(project?.notes || "");
    setPreview(false);
  }, [project?.id, project?.notes]);
  const celebrate = useRef(null);
  const lastStatus = useRef(project?.status);

  useGSAP(
    () => {
      if (!project || lastStatus.current === project.status) return;
      if (project.status === "completed" && celebrate.current) {
        gsap.fromTo(
          celebrate.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
        );
      }
      lastStatus.current = project.status;
    },
    { dependencies: [project?.status] }
  );

  const progress = project ? projectProgress(tasks, project.id) : 0;
  const list = project ? projectTasks(tasks, project.id) : [];
  const category = categories.find((item) => item.id === project?.categoryId);
  const timeline = useMemo(
    () =>
      activities
        .filter((event) => event.projectId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activities, id]
  );

  if (!project || project.trashedAt) {
    return (
      <div className="px-6 py-16">
        <EmptyState
          title="Project not found"
          description="It may have been deleted."
          actionLabel="Back to projects"
          onAction={() => navigate("/projects")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => navigate("/projects")}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </button>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: project.accentColor }} />
            <h2 className="truncate text-2xl font-medium tracking-tight">{project.name}</h2>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <StatusPill status={project.status} />
            <span>{category?.name || "Uncategorized"}</span>
            {project.dueDate ? <span className="tabular">Due {formatDate(project.dueDate)}</span> : null}
          </div>
          {project.description ? (
            <p className="mt-3 max-w-2xl text-sm text-muted">{project.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => togglePin(project.id)}>
                {project.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const copy = duplicateProject(project.id);
                  if (copy) navigate(`/projects/${copy}`);
                }}
              >
                Duplicate
              </DropdownMenuItem>
              {project.archivedAt ? (
                <DropdownMenuItem onClick={() => unarchiveProject(project.id)}>Restore</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => archiveProject(project.id)}>Archive</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTrashOpen(true)}>Move to trash</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <Progress value={progress} className="max-w-sm" />
        <span className="text-sm tabular text-muted">{progress}%</span>
      </div>
      {project.status === "completed" ? (
        <p ref={celebrate} className="mt-3 text-sm text-muted">
          This project is complete. The journal entry is waiting for your notes.
        </p>
      ) : null}

      <Tabs defaultValue="tasks" className="mt-8">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <QuickAdd projectId={project.id} placeholder="Add a task to this project" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="high">High priority</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Manual</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due">Deadline</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {list.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet."
              description="Break the outcome into the next physical action."
            />
          ) : (
            <div className="border border-border bg-surface py-2">
              <TaskTree
                tasks={tasks}
                projectId={project.id}
                filter={filter}
                sortBy={sortBy}
                onReorder={reorderTasks}
                onOpen={(task, extra) => {
                  setTaskId(task.id);
                  setConfirm(Boolean(extra?.confirmComplete));
                }}
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="notes">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant={preview ? "ghost" : "secondary"} onClick={() => setPreview(false)}>
              Edit
            </Button>
            <Button size="sm" variant={preview ? "secondary" : "ghost"} onClick={() => setPreview(true)}>
              Preview
            </Button>
            <Button
              size="sm"
              onClick={() => setProjectNotes(project.id, notes)}
            >
              Save notes
            </Button>
          </div>
          {preview ? (
            <div
              className="markdown-body mt-4 min-h-[240px] border border-border bg-surface px-5 py-4"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(notes) || "<p>Nothing to preview.</p>",
              }}
            />
          ) : (
            <Textarea
              className="mt-4 min-h-[280px] font-mono text-[13px]"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Lightweight Markdown. Headings, lists, links, emphasis."
            />
          )}
        </TabsContent>
        <TabsContent value="activity">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">No activity recorded yet.</p>
          ) : (
            <ol className="space-y-4 border-l border-border pl-4">
              {timeline.map((event) => (
                <li key={event.id}>
                  <p className="text-sm">{event.message}</p>
                  <p className="text-[11px] text-muted tabular">
                    {formatTimestamp(event.createdAt, "d MMM yyyy, h:mm a")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>

      <TaskPanel
        taskId={taskId}
        open={Boolean(taskId)}
        onOpenChange={(open) => !open && setTaskId(null)}
        confirmComplete={confirm}
        onConfirmHandled={() => setConfirm(false)}
      />
      <ProjectForm open={editOpen} onOpenChange={setEditOpen} project={project} />
      <ConfirmDialog
        open={trashOpen}
        onOpenChange={setTrashOpen}
        title="Move project to trash?"
        description="You can restore it from Settings. Tasks travel with the project."
        confirmLabel="Move to trash"
        destructive
        onConfirm={() => {
          trashProject(project.id);
          navigate("/projects");
        }}
      />
    </div>
  );
}
