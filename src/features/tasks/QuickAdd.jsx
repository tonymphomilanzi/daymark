import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/store/workspaceStore";
import { usePrefs } from "@/store/prefsStore";
import { todayKey } from "@/lib/dates";

export function QuickAdd({
  projectId = null,
  parentTaskId = null,
  plannedDate = null,
  placeholder = "Add a task",
  onCreated,
}) {
  const [title, setTitle] = useState("");
  const addTask = useWorkspace((state) => state.addTask);
  const defaultPriority = usePrefs((state) => state.defaultPriority);

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    const id = addTask({
      title,
      projectId,
      parentTaskId,
      plannedDate,
      priority: defaultPriority,
    });
    setTitle("");
    onCreated?.(id);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={placeholder}
      />
      <Button type="submit" variant="secondary" aria-label="Add task">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}

export function InboxCapture() {
  return <QuickAdd placeholder="Capture something…" />;
}

export function MyDayCapture() {
  return <QuickAdd plannedDate={todayKey()} placeholder="Add to today" />;
}
