import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Plus,
  Settings,
  Sun,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspace } from "@/store/workspaceStore";
import { usePrefs } from "@/store/prefsStore";
import { isOpenProject } from "@/lib/calculations";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/today", label: "My Day", icon: Sun },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/archive", label: "Archive", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function LogoMark({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M6 12.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {!collapsed ? (
        <div>
          <p className="text-[13px] font-medium tracking-tight">Daymark</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Execute</p>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({ mobile = false, onNavigate }) {
  const collapsed = usePrefs((state) => state.sidebarCollapsed) && !mobile;
  const toggleSidebar = usePrefs((state) => state.toggleSidebar);
  const categories = useWorkspace((state) => state.categories);
  const projects = useWorkspace((state) => state.projects);
  const addCategory = useWorkspace((state) => state.addCategory);
  const deleteCategory = useWorkspace((state) => state.deleteCategory);
  const tasks = useWorkspace((state) => state.tasks);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const inboxCount = tasks.filter((task) => !task.projectId && !task.completed).length;

  const linkClass = ({ isActive }) =>
    cn(
      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
      isActive
        ? "bg-elevated text-foreground"
        : "text-muted hover:bg-elevated hover:text-foreground",
      collapsed && "justify-center px-0"
    );

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-background transition-[width] duration-200 ease-out",
        mobile ? "w-72" : collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center justify-between">
        <LogoMark collapsed={collapsed} />
        {!mobile ? (
          <Button
            size="icon"
            variant="ghost"
            className="mr-2 h-7 w-7"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        ) : null}
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={linkClass}
            onClick={onNavigate}
            title={item.label}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed ? (
              <span className="flex-1">{item.label}</span>
            ) : null}
            {!collapsed && item.to === "/inbox" && inboxCount > 0 ? (
              <span className="tabular text-[11px] text-muted">{inboxCount}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>
      {!collapsed ? (
        <div className="mt-6 flex min-h-0 flex-1 flex-col px-2">
          <div className="mb-1 flex items-center justify-between px-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Categories</p>
            <button
              type="button"
              className="text-muted hover:text-foreground"
              onClick={() => setCreating(true)}
              aria-label="Add category"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 pb-6">
              {creating ? (
                <form
                  className="px-1 py-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (name.trim()) addCategory({ name });
                    setName("");
                    setCreating(false);
                  }}
                >
                  <Input
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() => {
                      if (name.trim()) addCategory({ name });
                      setCreating(false);
                      setName("");
                    }}
                    placeholder="Category name"
                    className="h-8"
                  />
                </form>
              ) : null}
              {categories.length === 0 && !creating ? (
                <p className="px-2 py-2 text-[12px] text-muted">Group projects by craft or client.</p>
              ) : null}
              {categories.map((category) => {
                const count = projects.filter(
                  (project) => isOpenProject(project) && project.categoryId === category.id
                ).length;
                return (
                  <div
                    key={category.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted hover:bg-elevated hover:text-foreground"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => {
                        navigate(`/projects?category=${category.id}`);
                        onNavigate?.();
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: category.color }}
                      />
                      <span className="truncate">{category.name}</span>
                      <span className="ml-auto tabular text-[11px]">{count}</span>
                    </button>
                    <button
                      type="button"
                      className="hidden text-[11px] group-hover:inline hover:text-destructive"
                      onClick={() => deleteCategory(category.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </aside>
  );
}
