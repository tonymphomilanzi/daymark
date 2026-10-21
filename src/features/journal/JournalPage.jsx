import { useRef, useState } from "react";
import { BookOpen, ExternalLink, GitBranch } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(useGSAP, ScrollTrigger);
import { useWorkspace } from "@/store/workspaceStore";
import { formatTimestamp } from "@/lib/dates";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

export default function JournalPage() {
  const journal = useWorkspace((state) => state.journal);
  const projects = useWorkspace((state) => state.projects);
  const updateJournal = useWorkspace((state) => state.updateJournal);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const entries = [...journal].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const listRef = useRef(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !listRef.current) return;
      const items = listRef.current.querySelectorAll("[data-journal]");
      items.forEach((item) => {
        gsap.from(item, {
          opacity: 0,
          y: 14,
          duration: 0.35,
          ease: "power2.out",
          scrollTrigger: {
            trigger: item,
            start: "top 88%",
            once: true,
          },
        });
      });
    },
    { dependencies: [entries.length, reduced], scope: listRef }
  );

  const openEdit = (entry) => {
    setEditing(entry);
    setForm({
      outcome: entry.outcome,
      accomplished: entry.accomplished,
      lessons: entry.lessons,
      externalUrl: entry.externalUrl,
      githubUrl: entry.githubUrl,
      notes: entry.notes,
      completedAt: entry.completedAt.slice(0, 10),
    });
  };

  const save = () => {
    if (!editing) return;
    const completedAt = form.completedAt
      ? new Date(`${form.completedAt}T12:00:00`).toISOString()
      : editing.completedAt;
    updateJournal(editing.id, { ...form, completedAt });
    setEditing(null);
  };

  if (entries.length === 0) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          icon={BookOpen}
          title="No finished work yet."
          description="When a project reaches completion, a journal record is created automatically. You can then write the outcome, lessons and links."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="mb-8 text-sm text-muted">
        A private archive of things that actually shipped. Entries are never duplicated if a project is reopened.
      </p>
      <div ref={listRef} className="relative space-y-0 border-l border-border pl-6">
        {entries.map((entry) => {
          const project = projects.find((item) => item.id === entry.projectId);
          return (
            <article key={entry.id} data-journal className="relative pb-10">
              <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border border-border bg-accent" />
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted tabular">
                {formatTimestamp(entry.completedAt, "d MMMM yyyy")}
              </p>
              <h3 className="mt-1 text-lg font-medium tracking-tight">
                {project?.name || "Untitled project"}
              </h3>
              {entry.outcome ? <p className="mt-2 text-sm text-muted">{entry.outcome}</p> : (
                <p className="mt-2 text-sm text-muted">Add the outcome while it is still clear.</p>
              )}
              {entry.accomplished ? (
                <p className="mt-3 text-sm"><span className="text-muted">Accomplished. </span>{entry.accomplished}</p>
              ) : null}
              {entry.lessons ? (
                <p className="mt-2 text-sm"><span className="text-muted">Lessons. </span>{entry.lessons}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {entry.externalUrl ? (
                  <a href={entry.externalUrl} className="inline-flex items-center gap-1 text-muted hover:text-foreground" target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Project
                  </a>
                ) : null}
                {entry.githubUrl ? (
                  <a href={entry.githubUrl} className="inline-flex items-center gap-1 text-muted hover:text-foreground" target="_blank" rel="noreferrer">
                    <GitBranch className="h-3.5 w-3.5" /> GitHub
                  </a>
                ) : null}
                {project ? (
                  <button type="button" className="text-muted hover:text-foreground" onClick={() => navigate(`/projects/${project.id}`)}>
                    Open project
                  </button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}>
                  Edit entry
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit journal entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Textarea value={form.outcome || ""} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>What was accomplished</Label>
              <Textarea value={form.accomplished || ""} onChange={(e) => setForm({ ...form, accomplished: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Lessons learned</Label>
              <Textarea value={form.lessons || ""} onChange={(e) => setForm({ ...form, lessons: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Completion date</Label>
              <Input type="date" value={form.completedAt || ""} onChange={(e) => setForm({ ...form, completedAt: e.target.value })} className="tabular" />
            </div>
            <div className="space-y-1.5">
              <Label>External URL</Label>
              <Input value={form.externalUrl || ""} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>GitHub URL</Label>
              <Input value={form.githubUrl || ""} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
