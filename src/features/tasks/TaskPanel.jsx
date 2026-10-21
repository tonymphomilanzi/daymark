import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/shared/DateField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useWorkspace } from "@/store/workspaceStore";
import { isOpenProject } from "@/lib/calculations";
import { taskDepth } from "@/lib/calculations";

export function TaskPanel({ taskId, open, onOpenChange, confirmComplete, onConfirmHandled }) {
  const tasks = useWorkspace((state) => state.tasks);
  const projects = useWorkspace((state) => state.projects);
  const updateTask = useWorkspace((state) => state.updateTask);
  const addTask = useWorkspace((state) => state.addTask);
  const moveTask = useWorkspace((state) => state.moveTask);
  const completeTaskTree = useWorkspace((state) => state.completeTaskTree);
  const deleteTask = useWorkspace((state) => state.deleteTask);
  const task = tasks.find((item) => item.id === taskId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [subtask, setSubtask] = useState("");

  useEffect(() => {
    if (confirmComplete) setConfirmOpen(true);
  }, [confirmComplete, taskId]);

  if (!task) return null;

  const depth = taskDepth(tasks, task.id);
  const openProjects = projects.filter(isOpenProject);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col overflow-y-auto">
          <SheetHeader className="pr-8">
            <SheetTitle className="sr-only">Task details</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-5 px-5 pb-8 pt-4">
            <Input
              value={task.title}
              onChange={(event) => updateTask(task.id, { title: event.target.value })}
              className="h-11 border-0 bg-transparent px-0 text-lg font-medium tracking-tight"
            />
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={task.description}
                onChange={(event) => updateTask(task.id, { description: event.target.value })}
                placeholder="What does done look like?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={task.priority}
                  onValueChange={(value) => updateTask(task.id, { priority: value })}
                >
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
                <Label>Estimate (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={task.estimatedMinutes ?? ""}
                  onChange={(event) =>
                    updateTask(task.id, {
                      estimatedMinutes: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  className="tabular"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateField
                id="planned"
                label="Planned"
                value={task.plannedDate}
                onChange={(value) => updateTask(task.id, { plannedDate: value })}
              />
              <DateField
                id="due"
                label="Deadline"
                value={task.dueDate}
                onChange={(value) => updateTask(task.id, { dueDate: value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select
                value={task.projectId || "inbox"}
                onValueChange={(value) =>
                  moveTask(task.id, {
                    projectId: value === "inbox" ? null : value,
                    parentTaskId: null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Inbox" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">Inbox</SelectItem>
                  {openProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={task.notes}
                onChange={(event) => updateTask(task.id, { notes: event.target.value })}
                placeholder="Context, links, decisions…"
              />
            </div>
            {depth < 2 ? (
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!subtask.trim()) return;
                  addTask({
                    title: subtask,
                    projectId: task.projectId,
                    parentTaskId: task.id,
                    priority: task.priority,
                  });
                  setSubtask("");
                }}
              >
                <Label>Add subtask</Label>
                <div className="flex gap-2">
                  <Input
                    value={subtask}
                    onChange={(event) => setSubtask(event.target.value)}
                    placeholder="Nested work"
                  />
                  <Button type="submit" variant="secondary">
                    Add
                  </Button>
                </div>
                <p className="text-[11px] text-muted">Up to three levels of nesting.</p>
              </form>
            ) : null}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => deleteTask(task.id) || onOpenChange(false)}>
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(value) => {
          setConfirmOpen(value);
          if (!value) onConfirmHandled?.();
        }}
        title="Complete nested work?"
        description="This task still has unfinished subtasks. Completing it will also complete every descendant."
        confirmLabel="Complete all"
        onConfirm={() => {
          completeTaskTree(task.id);
          setConfirmOpen(false);
          onConfirmHandled?.();
        }}
      />
    </>
  );
}
