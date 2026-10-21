import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { useTheme } from "@/hooks/useTheme";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useNavigate } from "react-router-dom";

gsap.registerPlugin(useGSAP);

const TITLES = {
  "/": ["Overview", "A precise read of the work in motion."],
  "/today": ["My Day", "Automatically assembled from planned work and deadlines."],
  "/inbox": ["Inbox", "Capture first. Assign later."],
  "/projects": ["Projects", "Intentions, structured."],
  "/calendar": ["Calendar", "Planned work and hard deadlines."],
  "/analytics": ["Analytics", "Derived from completion timestamps — never estimates."],
  "/journal": ["Journal", "A private archive of finished work."],
  "/archive": ["Archive", "Closed chapters, still recoverable."],
  "/settings": ["Settings", "Workspace, appearance, backup."],
};

export function AppShell() {
  useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const mainRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const path = location.pathname;
  const meta =
    TITLES[path] ||
    (path.startsWith("/projects/")
      ? ["Project", "Tasks, notes and activity."]
      : ["Daymark", ""]);

  useGSAP(
    () => {
      if (reduced || !mainRef.current) return;
      gsap.fromTo(
        mainRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" }
      );
    },
    { dependencies: [location.pathname] }
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={meta[0]}
          description={meta[1]}
          onMenu={() => setMobileOpen(true)}
          onSearch={() => setSearchOpen(true)}
          onQuickAdd={() => setProjectOpen(true)}
        />
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onCreateProject={() => setProjectOpen(true)}
        onCreateTask={() => navigate("/inbox")}
      />
      <ProjectForm
        open={projectOpen}
        onOpenChange={setProjectOpen}
        onCreated={(id) => navigate(`/projects/${id}`)}
      />
    </div>
  );
}
