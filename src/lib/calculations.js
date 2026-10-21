import { addDaysToKey, isBeforeToday, isToday, todayKey } from "./dates";

export const PRIORITIES = ["urgent", "high", "medium", "low"];
export const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };
export const PROJECT_STATUSES = ["planned", "active", "on_hold", "completed"];

export function isOpenProject(project) {
  return Boolean(project) && !project.archivedAt && !project.trashedAt;
}

export function projectTasks(tasks, projectId) {
  return tasks.filter((task) => task.projectId === projectId);
}

export function childTasks(tasks, parentTaskId) {
  return tasks
    .filter((task) => task.parentTaskId === parentTaskId)
    .sort((a, b) => a.order - b.order);
}

export function isDescendantOf(tasks, taskId, ancestorId) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  let current = byId.get(taskId);
  const seen = new Set();
  while (current?.parentTaskId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    if (current.parentTaskId === ancestorId) return true;
    current = byId.get(current.parentTaskId);
  }
  return false;
}

export function collectDescendantIds(tasks, parentId) {
  const ids = [];
  const walk = (id) => {
    for (const child of tasks.filter((task) => task.parentTaskId === id)) {
      ids.push(child.id);
      walk(child.id);
    }
  };
  walk(parentId);
  return ids;
}

export function taskDepth(tasks, taskId) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  let depth = 0;
  let current = byId.get(taskId);
  const seen = new Set();
  while (current?.parentTaskId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    depth += 1;
    current = byId.get(current.parentTaskId);
  }
  return depth;
}

/**
 * Progress is computed from leaf tasks only so parent rows are not
 * double-counted. A leaf is any task with no children in the same project.
 */
export function getLeafTasks(tasks, projectId) {
  const inProject = tasks.filter((task) => task.projectId === projectId);
  const parentIds = new Set(
    inProject.map((task) => task.parentTaskId).filter(Boolean)
  );
  return inProject.filter((task) => !parentIds.has(task.id));
}

export function projectProgress(tasks, projectId) {
  const leaves = getLeafTasks(tasks, projectId);
  if (leaves.length === 0) return 0;
  const completed = leaves.filter((task) => task.completed).length;
  return Math.round((completed / leaves.length) * 100);
}

export function hasIncompleteLeaves(tasks, projectId) {
  const leaves = getLeafTasks(tasks, projectId);
  return leaves.length > 0 && leaves.some((task) => !task.completed);
}

export function allLeavesComplete(tasks, projectId) {
  const leaves = getLeafTasks(tasks, projectId);
  return leaves.length > 0 && leaves.every((task) => task.completed);
}

export function childrenComplete(tasks, parentId) {
  const children = tasks.filter((task) => task.parentTaskId === parentId);
  if (children.length === 0) return false;
  return children.every((task) => task.completed);
}

/**
 * After a completion change, walk ancestors so parents reflect their children,
 * then return the updated task list.
 */
export function reconcileTaskTree(tasks, originId) {
  const next = tasks.map((task) => ({ ...task }));
  const byId = new Map(next.map((task) => [task.id, task]));
  const origin = byId.get(originId);
  if (!origin) return next;

  const now = new Date().toISOString();
  let cursor = origin;

  while (cursor?.parentTaskId) {
    const parent = byId.get(cursor.parentTaskId);
    if (!parent) break;
    const siblings = next.filter((task) => task.parentTaskId === parent.id);
    const allDone = siblings.length > 0 && siblings.every((task) => task.completed);
    if (allDone && !parent.completed) {
      parent.completed = true;
      parent.completedAt = now;
      parent.updatedAt = now;
    } else if (!allDone && parent.completed) {
      parent.completed = false;
      parent.completedAt = null;
      parent.updatedAt = now;
    }
    cursor = parent;
  }

  return next;
}

export function applyCompleteWithDescendants(tasks, taskId) {
  const now = new Date().toISOString();
  const ids = new Set([taskId, ...collectDescendantIds(tasks, taskId)]);
  const next = tasks.map((task) => {
    if (!ids.has(task.id) || task.completed) return task;
    return {
      ...task,
      completed: true,
      completedAt: now,
      updatedAt: now,
    };
  });
  return reconcileTaskTree(next, taskId);
}

export function applyUncompleteCascade(tasks, taskId) {
  const now = new Date().toISOString();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ids = new Set([taskId]);
  let current = byId.get(taskId);
  while (current?.parentTaskId) {
    ids.add(current.parentTaskId);
    current = byId.get(current.parentTaskId);
  }
  const next = tasks.map((task) => {
    if (!ids.has(task.id) || !task.completed) return task;
    return {
      ...task,
      completed: false,
      completedAt: null,
      updatedAt: now,
    };
  });
  return reconcileTaskTree(next, taskId);
}

export function nextOrder(tasks, projectId, parentTaskId) {
  const siblings = tasks.filter(
    (task) => task.projectId === projectId && task.parentTaskId === parentTaskId
  );
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((task) => task.order ?? 0)) + 1;
}

export function isTaskOverdue(task) {
  return Boolean(task?.dueDate) && !task.completed && isBeforeToday(task.dueDate);
}

export function isTaskDueToday(task) {
  if (task.completed) return false;
  return isToday(task.dueDate) || isToday(task.plannedDate);
}

export function matchesTaskFilter(task, filter) {
  switch (filter) {
    case "active":
      return !task.completed;
    case "completed":
      return task.completed;
    case "overdue":
      return isTaskOverdue(task);
    case "today":
      return isTaskDueToday(task);
    case "upcoming":
      return (
        !task.completed &&
        Boolean(task.dueDate) &&
        task.dueDate > todayKey()
      );
    case "high":
      return task.priority === "high" || task.priority === "urgent";
    default:
      return true;
  }
}

/**
 * Automatic daily planner rules.
 * A task can appear in multiple views but always points at one record.
 */
export function buildMyDay(tasks, options = {}) {
  const today = todayKey();
  const horizon = addDaysToKey(today, 7);
  const incomplete = tasks.filter((task) => !task.completed);

  const overdue = [];
  const todayList = [];
  const seen = new Set();

  for (const task of incomplete) {
    const plannedPastOrToday =
      Boolean(task.plannedDate) && task.plannedDate <= today;
    const duePastOrToday = Boolean(task.dueDate) && task.dueDate <= today;

    if (!plannedPastOrToday && !duePastOrToday) continue;
    if (seen.has(task.id)) continue;
    seen.add(task.id);

    const overdueByDeadline = Boolean(task.dueDate) && task.dueDate < today;
    if (overdueByDeadline) overdue.push(task);
    else todayList.push(task);
  }

  const suggestions = incomplete.filter((task) => {
    if (seen.has(task.id)) return false;
    const high = task.priority === "high" || task.priority === "urgent";
    if (!high) return false;
    if (!task.dueDate) return false;
    return task.dueDate > today && task.dueDate <= horizon;
  });

  const yesterday = addDaysToKey(today, -1);
  const yesterdayUnfinished = incomplete.filter(
    (task) => task.plannedDate === yesterday || task.dueDate === yesterday
  );

  const tomorrow = addDaysToKey(today, 1);
  const tomorrowScheduled = incomplete.filter(
    (task) => task.plannedDate === tomorrow || task.dueDate === tomorrow
  );

  const sortFn = (a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    const dueA = a.dueDate || "9999-99-99";
    const dueB = b.dueDate || "9999-99-99";
    if (dueA !== dueB) return dueA.localeCompare(dueB);
    return a.title.localeCompare(b.title);
  };

  return {
    overdue: overdue.sort(sortFn),
    today: todayList.sort(sortFn),
    suggestions: suggestions.sort(sortFn),
    yesterdayUnfinished: yesterdayUnfinished.sort(sortFn),
    tomorrowScheduled: tomorrowScheduled.sort(sortFn),
    committedIds: seen,
    today,
    weekStartsOn: options.weekStartsOn ?? 1,
  };
}

export function countCompletedOn(tasks, dateKey) {
  return tasks.filter((task) => {
    if (!task.completed || !task.completedAt) return false;
    return task.completedAt.slice(0, 10) === dateKey
      ? true
      : localCompletedKey(task.completedAt) === dateKey;
  }).length;
}

function localCompletedKey(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function completedOnKey(iso) {
  return localCompletedKey(iso);
}

export function outstandingTasks(tasks, projects) {
  const openIds = new Set(
    projects.filter(isOpenProject).map((project) => project.id)
  );
  return tasks.filter(
    (task) =>
      !task.completed &&
      (task.projectId === null || openIds.has(task.projectId))
  );
}

export function sortTasks(tasks, sortBy = "order") {
  const copy = [...tasks];
  switch (sortBy) {
    case "priority":
      return copy.sort(
        (a, b) =>
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          a.order - b.order
      );
    case "due":
      return copy.sort((a, b) => {
        const da = a.dueDate || "9999-99-99";
        const db = b.dueDate || "9999-99-99";
        return da.localeCompare(db) || a.order - b.order;
      });
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "created":
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return copy.sort((a, b) => a.order - b.order);
  }
}

export function searchText(haystack, query) {
  if (!query?.trim()) return true;
  return String(haystack || "")
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}

export function overallProgress(projects, tasks) {
  const open = projects.filter(
    (project) => isOpenProject(project) && project.status !== "on_hold"
  );
  if (open.length === 0) return 0;
  const scores = open.map((project) => projectProgress(tasks, project.id));
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}
