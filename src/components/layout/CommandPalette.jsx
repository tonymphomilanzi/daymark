import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  BookOpen,
  CalendarDays,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Settings,
  Sun,
  BarChart3,
  CheckSquare,
} from "lucide-react";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import { useWorkspace } from "@/store/workspaceStore";
import { isOpenProject } from "@/lib/calculations";

export function CommandPalette({ open, onOpenChange, onCreateProject, onCreateTask }) {
  const navigate = useNavigate();
  const projects = useWorkspace((state) => state.projects);
  const tasks = useWorkspace((state) => state.tasks);

  const items = useMemo(() => {
    const pages = [
      { id: "go-overview", label: "Overview", group: "Navigate", icon: <LayoutDashboard className="h-4 w-4" />, run: () => navigate("/") },
      { id: "go-today", label: "My Day", group: "Navigate", icon: <Sun className="h-4 w-4" />, run: () => navigate("/today") },
      { id: "go-inbox", label: "Inbox", group: "Navigate", icon: <Inbox className="h-4 w-4" />, run: () => navigate("/inbox") },
      { id: "go-projects", label: "Projects", group: "Navigate", icon: <FolderKanban className="h-4 w-4" />, run: () => navigate("/projects") },
      { id: "go-calendar", label: "Calendar", group: "Navigate", icon: <CalendarDays className="h-4 w-4" />, run: () => navigate("/calendar") },
      { id: "go-analytics", label: "Analytics", group: "Navigate", icon: <BarChart3 className="h-4 w-4" />, run: () => navigate("/analytics") },
      { id: "go-journal", label: "Journal", group: "Navigate", icon: <BookOpen className="h-4 w-4" />, run: () => navigate("/journal") },
      { id: "go-archive", label: "Archive", group: "Navigate", icon: <Archive className="h-4 w-4" />, run: () => navigate("/archive") },
      { id: "go-settings", label: "Settings", group: "Navigate", icon: <Settings className="h-4 w-4" />, run: () => navigate("/settings") },
      { id: "new-project", label: "Create project", group: "Actions", keywords: ["new"], run: onCreateProject },
      { id: "new-task", label: "Quick capture to Inbox", group: "Actions", keywords: ["task", "inbox"], run: () => { onCreateTask?.(); navigate("/inbox"); } },
    ];
    const projectItems = projects.filter(isOpenProject).map((project) => ({
      id: `p-${project.id}`,
      label: project.name,
      group: "Projects",
      hint: "Project",
      icon: <FolderKanban className="h-4 w-4" />,
      run: () => navigate(`/projects/${project.id}`),
    }));
    const taskItems = tasks
      .filter((task) => !task.completed)
      .slice(0, 40)
      .map((task) => ({
        id: `t-${task.id}`,
        label: task.title,
        group: "Tasks",
        hint: task.projectId ? "Task" : "Inbox",
        icon: <CheckSquare className="h-4 w-4" />,
        run: () =>
          navigate(task.projectId ? `/projects/${task.projectId}?task=${task.id}` : `/inbox?task=${task.id}`),
      }));
    return [...pages, ...projectItems, ...taskItems];
  }, [navigate, onCreateProject, onCreateTask, projects, tasks]);

  return (
    <ActionSearchBar
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      onSelect={(item) => item.run?.()}
    />
  );
}
