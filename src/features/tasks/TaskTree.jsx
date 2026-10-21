import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { childTasks, matchesTaskFilter, sortTasks } from "@/lib/calculations";
import { TaskRow } from "./TaskRow";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

function SortableTask({ task, depth, childrenRows, onOpen, showProject, projectName }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow
        task={task}
        depth={depth}
        onOpen={onOpen}
        dragHandleProps={{ ...attributes, ...listeners }}
        showProject={showProject}
        projectName={projectName}
      />
      {childrenRows}
    </div>
  );
}

function TaskBranch({
  tasks,
  parentId,
  projectId,
  depth,
  filter,
  sortBy,
  collapsed,
  setCollapsed,
  onOpen,
  projectName,
  showProject,
}) {
  const siblings = useMemo(() => {
    const list = childTasks(tasks, parentId).filter((task) => task.projectId === projectId);
    const filtered =
      filter === "all"
        ? list
        : list.filter(
            (task) =>
              matchesTaskFilter(task, filter) ||
              childTasks(tasks, task.id).length > 0
          );
    return sortTasks(filtered, sortBy);
  }, [tasks, parentId, projectId, filter, sortBy]);

  return (
    <SortableContext items={siblings.map((task) => task.id)} strategy={verticalListSortingStrategy}>
      {siblings.map((task) => {
        const kids = childTasks(tasks, task.id);
        const isCollapsed = collapsed.has(task.id);
        return (
          <SortableTask
            key={task.id}
            task={task}
            depth={depth}
            onOpen={onOpen}
            showProject={showProject}
            projectName={projectName}
            childrenRows={
              kids.length > 0 ? (
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-8 h-6 px-1 text-[11px] text-muted"
                    onClick={() =>
                      setCollapsed((set) => {
                        const next = new Set(set);
                        if (next.has(task.id)) next.delete(task.id);
                        else next.add(task.id);
                        return next;
                      })
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {kids.length} nested
                  </Button>
                  {!isCollapsed ? (
                    <TaskBranch
                      tasks={tasks}
                      parentId={task.id}
                      projectId={projectId}
                      depth={depth + 1}
                      filter={filter}
                      sortBy={sortBy}
                      collapsed={collapsed}
                      setCollapsed={setCollapsed}
                      onOpen={onOpen}
                      projectName={projectName}
                      showProject={showProject}
                    />
                  ) : null}
                </div>
              ) : null
            }
          />
        );
      })}
    </SortableContext>
  );
}

export function TaskTree({
  tasks,
  projectId,
  parentId = null,
  filter = "all",
  sortBy = "order",
  onOpen,
  onReorder,
  projectName,
  showProject = false,
}) {
  const [collapsed, setCollapsed] = useState(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find((task) => task.id === active.id);
    const overTask = tasks.find((task) => task.id === over.id);
    if (!activeTask || !overTask) return;
    if (activeTask.projectId !== overTask.projectId) return;
    if (activeTask.parentTaskId !== overTask.parentTaskId) return;
    const groupParent = activeTask.parentTaskId;
    const siblings = childTasks(tasks, groupParent).filter(
      (task) => task.projectId === activeTask.projectId
    );
    const oldIndex = siblings.findIndex((task) => task.id === active.id);
    const newIndex = siblings.findIndex((task) => task.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const ordered = arrayMove(siblings, oldIndex, newIndex).map((task) => task.id);
    onReorder?.(activeTask.projectId, groupParent, ordered);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <TaskBranch
        tasks={tasks}
        parentId={parentId}
        projectId={projectId}
        depth={0}
        filter={filter}
        sortBy={sortBy}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onOpen={onOpen}
        projectName={projectName}
        showProject={showProject}
      />
    </DndContext>
  );
}
