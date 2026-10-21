import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import DashboardPage from "@/features/dashboard/DashboardPage";
import MyDayPage from "@/features/planner/MyDayPage";
import InboxPage from "@/features/inbox/InboxPage";
import ProjectsPage from "@/features/projects/ProjectsPage";
import ProjectDetail from "@/features/projects/ProjectDetail";
import CalendarPage from "@/features/calendar/CalendarPage";
import AnalyticsPage from "@/features/analytics/AnalyticsPage";
import JournalPage from "@/features/journal/JournalPage";
import ArchivePage from "@/features/archive/ArchivePage";
import SettingsPage from "@/features/settings/SettingsPage";

export default function AppRoot() {
  return (
    <TooltipProvider delayDuration={250}>
      <HashRouter>
        
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="today" element={<MyDayPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="archive" element={<ArchivePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </TooltipProvider>
  );
}
