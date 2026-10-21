import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderKanban, Pin } from "lucide-react";
import { useWorkspace } from "@/store/workspaceStore";
import { isOpenProject, projectProgress, searchText } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusPill } from "@/components/shared/StatusPill";
import { PriorityFlag } from "@/components/shared/PriorityFlag";
import { ProjectForm } from "./ProjectForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projects = useWorkspace((state) => state.projects);
  const tasks = useWorkspace((state) => state.tasks);
  const categories = useWorkspace((state) => state.categories);
  const togglePin = useWorkspace((state) => state.togglePin);
  const archiveProject = useWorkspace((state) => state.archiveProject);
  const duplicateProject = useWorkspace((state) => state.duplicateProject);
  const trashProject = useWorkspace((state) => state.trashProject);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("open");
  const [sort, setSort] = useState("updated");
  const [formOpen, setFormOpen] = useState(false);
  const categoryFilter = params.get("category");

  const list = useMemo(() => {
    let next = projects.filter((project) => !project.trashedAt);
    if (status === "open") next = next.filter(isOpenProject);
    else if (status === "archived") next = next.filter((project) => project.archivedAt);
    else next = next.filter((project) => !project.archivedAt && project.status === status);
    if (categoryFilter) next = next.filter((project) => project.categoryId === categoryFilter);
    if (query.trim()) {
      next = next.filter(
        (project) =>
          searchText(project.name, query) || searchText(project.description, query)
      );
    }
    next.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "due") return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      if (sort === "priority") {
        const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
        return rank[a.priority] - rank[b.priority];
      }
      if (sort === "progress") return projectProgress(tasks, b.id) - projectProgress(tasks, a.id);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return next;
  }, [projects, tasks, status, categoryFilter, query, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects"
          className="lg:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="due">Deadline</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setFormOpen(true)}>New project</Button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-8 border border-border">
          <EmptyState
            icon={FolderKanban}
            title="No projects in this view."
            description="Create a project to hold the work. Tasks without a home can wait in Inbox."
            actionLabel="Create project"
            onAction={() => setFormOpen(true)}
          />
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border border border-border bg-surface">
          {list.map((project) => {
            const progress = projectProgress(tasks, project.id);
            const category = categories.find((item) => item.id === project.categoryId);
            return (
              <div key={project.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-center gap-2">
                    {project.pinned ? <Pin className="h-3.5 w-3.5 text-accent" /> : null}
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: project.accentColor }}
                    />
                    <span className="truncate text-sm font-medium">{project.name}</span>
                    <PriorityFlag priority={project.priority} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                    <StatusPill status={project.status} />
                    {category ? <span>{category.name}</span> : <span>Uncategorized</span>}
                    {project.dueDate ? <span className="tabular">Due {formatDate(project.dueDate)}</span> : null}
                  </div>
                </button>
                <div className="flex items-center gap-4 sm:w-56">
                  <div className="flex-1">
                    <Progress value={progress} />
                    <p className="mt-1 text-[11px] text-muted tabular">{progress}%</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePin(project.id)}>
                        {project.pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateProject(project.id)}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveProject(project.id)}>Archive</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => trashProject(project.id)}>Move to trash</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ProjectForm open={formOpen} onOpenChange={setFormOpen} onCreated={(id) => navigate(`/projects/${id}`)} />
    </div>
  );
}
