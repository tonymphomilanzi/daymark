import { useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePrefs } from "@/store/prefsStore";
import { useWorkspace } from "@/store/workspaceStore";
import { formatTimestamp } from "@/lib/dates";
import {
  backupFilename,
  buildBackupPayload,
  downloadJson,
  mergeWorkspaces,
  parseBackup,
} from "@/lib/backup";

export default function SettingsPage() {
  const displayName = usePrefs((state) => state.displayName);
  const setDisplayName = usePrefs((state) => state.setDisplayName);
  const theme = usePrefs((state) => state.theme);
  const setTheme = usePrefs((state) => state.setTheme);
  const defaultPriority = usePrefs((state) => state.defaultPriority);
  const setDefaultPriority = usePrefs((state) => state.setDefaultPriority);
  const weekStartsOn = usePrefs((state) => state.weekStartsOn);
  const setWeekStartsOn = usePrefs((state) => state.setWeekStartsOn);
  const lastBackupAt = usePrefs((state) => state.lastBackupAt);
  const setLastBackupAt = usePrefs((state) => state.setLastBackupAt);
  const resetPreferences = usePrefs((state) => state.resetPreferences);
  const applyPreferences = usePrefs((state) => state.applyPreferences);

  const workspace = useWorkspace();
  const replaceWorkspace = useWorkspace((state) => state.replaceWorkspace);
  const resetWorkspace = useWorkspace((state) => state.resetWorkspace);
  const restoreProject = useWorkspace((state) => state.restoreProject);
  const permanentlyDeleteProject = useWorkspace((state) => state.permanentlyDeleteProject);

  const fileRef = useRef(null);
  const [importMode, setImportMode] = useState("merge");
  const [pendingImport, setPendingImport] = useState(null);
  const [importError, setImportError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);

  const trash = workspace.projects.filter((project) => project.trashedAt);

  const exportWorkspace = () => {
    const payload = buildBackupPayload(workspace, {
      displayName,
      theme,
      defaultPriority,
      weekStartsOn,
      lastBackupAt,
      sidebarCollapsed: usePrefs.getState().sidebarCollapsed,
    });
    downloadJson(backupFilename(), payload);
    setLastBackupAt(new Date().toISOString());
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError("");
    setImportNotice("");
    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      if (importMode === "replace") {
        setPendingImport(parsed);
        setReplaceOpen(true);
      } else {
        const merged = mergeWorkspaces(
          {
            categories: workspace.categories,
            projects: workspace.projects,
            tasks: workspace.tasks,
            journal: workspace.journal,
            activities: workspace.activities,
          },
          parsed
        );
        replaceWorkspace(merged);
        if (parsed.preferences) applyPreferences(parsed.preferences);
        setLastBackupAt(new Date().toISOString());
        setImportNotice("Workspace merged from backup.");
      }
    } catch (error) {
      setImportError(error.message || "Could not import that file.");
    }
  };

  const applyReplace = () => {
    if (!pendingImport) return;
    replaceWorkspace({
      categories: pendingImport.categories,
      projects: pendingImport.projects,
      tasks: pendingImport.tasks,
      journal: pendingImport.journal,
      activities: pendingImport.activities,
    });
    if (pendingImport.preferences) applyPreferences(pendingImport.preferences);
    setLastBackupAt(new Date().toISOString());
    setPendingImport(null);
    setImportNotice("Workspace replaced from backup.");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-10">
      <section>
        <h3 className="text-sm font-medium">Profile</h3>
        <p className="mt-1 text-sm text-muted">Used in the morning greeting.</p>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium">Appearance</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Week starts on</Label>
            <Select value={String(weekStartsOn)} onValueChange={(value) => setWeekStartsOn(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="0">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium">Defaults</h3>
        <div className="mt-4 space-y-1.5 max-w-xs">
          <Label>Default project priority</Label>
          <Select value={defaultPriority} onValueChange={setDefaultPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium">Backup</h3>
        <p className="mt-1 text-sm text-muted">
          Daymark stores everything in this browser. Clearing site data will erase the workspace. Export regularly.
        </p>
        <p className="mt-2 text-xs text-muted tabular">
          Last backup: {lastBackupAt ? formatTimestamp(lastBackupAt, "d MMM yyyy, h:mm a") : "Never"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={exportWorkspace}>Export workspace</Button>
          <Select value={importMode} onValueChange={setImportMode}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merge">Merge import</SelectItem>
              <SelectItem value="replace">Replace import</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFile}
          />
        </div>
        {importError ? <p className="mt-3 text-sm text-destructive">{importError}</p> : null}
        {importNotice ? <p className="mt-3 text-sm text-muted">{importNotice}</p> : null}
      </section>

      <section>
        <h3 className="text-sm font-medium">Trash</h3>
        <p className="mt-1 text-sm text-muted">Deleted projects land here until permanently removed.</p>
        <div className="mt-4 divide-y divide-border border border-border bg-surface">
          {trash.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Trash is empty.</p>
          ) : (
            trash.map((project) => (
              <div key={project.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm">{project.name}</p>
                  <p className="text-[11px] text-muted tabular">
                    {format(new Date(project.trashedAt), "d MMM yyyy")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => restoreProject(project.id)}>
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => permanentlyDeleteProject(project.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium">Reset</h3>
        <p className="mt-1 text-sm text-muted">This erases the local workspace and preferences in this browser.</p>
        <Button className="mt-4" variant="outline" onClick={() => setResetOpen(true)}>
          Reset workspace
        </Button>
      </section>

      <ConfirmDialog
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        title="Replace current workspace?"
        description="This will overwrite every project, task, journal entry and activity record currently stored in this browser."
        confirmLabel="Replace"
        destructive
        onConfirm={applyReplace}
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset Daymark?"
        description="All local data will be removed. Export a backup first if you might need it."
        confirmLabel="Reset"
        destructive
        onConfirm={() => {
          resetWorkspace();
          resetPreferences();
        }}
      />
    </div>
  );
}
