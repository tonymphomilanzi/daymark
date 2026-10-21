import { Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/store/workspaceStore";
import { formatTimestamp } from "@/lib/dates";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/StatusPill";

export default function ArchivePage() {
  const projects = useWorkspace((state) => state.projects);
  const unarchiveProject = useWorkspace((state) => state.unarchiveProject);
  const navigate = useNavigate();
  const archived = projects.filter((project) => project.archivedAt && !project.trashedAt);

  if (archived.length === 0) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          icon={Archive}
          title="Archive is empty."
          description="Archiving hides a project from the active workspace without erasing its completion history."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="divide-y divide-border border border-border bg-surface">
        {archived.map((project) => (
          <div key={project.id} className="flex items-center justify-between gap-4 px-4 py-4">
            <div>
              <button type="button" className="text-sm font-medium" onClick={() => navigate(`/projects/${project.id}`)}>
                {project.name}
              </button>
              <div className="mt-1 flex gap-3 text-[11px] text-muted">
                <StatusPill status={project.status} />
                <span className="tabular">Archived {formatTimestamp(project.archivedAt)}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => unarchiveProject(project.id)}>
              Restore
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
