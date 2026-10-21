import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/shared/DateField";
import { useWorkspace } from "@/store/workspaceStore";
import { usePrefs } from "@/store/prefsStore";

const COLORS = ["#D4F500", "#7DD3FC", "#F9A8D4", "#FDBA74", "#C4B5FD", "#6EE7B7", "#FCA5A5", "#FDE68A"];

export function ProjectForm({ open, onOpenChange, project, onCreated }) {
  const categories = useWorkspace((state) => state.categories);
  const addProject = useWorkspace((state) => state.addProject);
  const updateProject = useWorkspace((state) => state.updateProject);
  const defaultPriority = usePrefs((state) => state.defaultPriority);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    priority: defaultPriority,
    status: "planned",
    startDate: "",
    dueDate: "",
    expectedOutcome: "",
    accentColor: COLORS[0],
  });

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: project?.name || "",
      description: project?.description || "",
      categoryId: project?.categoryId || "",
      priority: project?.priority || defaultPriority,
      status: project?.status || "planned",
      startDate: project?.startDate || "",
      dueDate: project?.dueDate || "",
      expectedOutcome: project?.expectedOutcome || "",
      accentColor: project?.accentColor || COLORS[0],
    });
  }, [open, project, defaultPriority]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("A project needs a name.");
      return;
    }
    const payload = {
      ...form,
      categoryId: form.categoryId || null,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
    };
    if (project) {
      updateProject(project.id, payload);
      onOpenChange(false);
    } else {
      const id = addProject(payload);
      onOpenChange(false);
      onCreated?.(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="pname">Name</Label>
            <Input
              id="pname"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="What are we shipping?"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdesc">Description</Label>
            <Textarea
              id="pdesc"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="Scope, constraints, intent."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pout">Expected outcome</Label>
            <Textarea
              id="pout"
              value={form.expectedOutcome}
              onChange={(event) => set("expectedOutcome", event.target.value)}
              placeholder="What does finished look like?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(value) => set("priority", value)}>
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
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => set("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.categoryId || "none"}
              onValueChange={(value) => set("categoryId", value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Uncategorized" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateField
              id="start"
              label="Start"
              value={form.startDate}
              onChange={(value) => set("startDate", value || "")}
            />
            <DateField
              id="due"
              label="Deadline"
              value={form.dueDate}
              onChange={(value) => set("dueDate", value || "")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Accent</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set("accentColor", color)}
                  className="h-6 w-6 rounded-full border border-border"
                  style={{
                    background: color,
                    outline: form.accentColor === color ? "2px solid var(--foreground)" : "none",
                    outlineOffset: 2,
                  }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{project ? "Save" : "Create project"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
