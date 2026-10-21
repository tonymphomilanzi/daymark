import { z } from "zod";
import { format } from "date-fns";
import { SCHEMA_VERSION } from "./storage";
import { createId } from "./ids";

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional().default("#D4F500"),
  order: z.number().optional().default(0),
  createdAt: z.string(),
});

const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  categoryId: z.string().nullable().optional().default(null),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional().default("medium"),
  status: z.enum(["planned", "active", "on_hold", "completed"]).optional().default("planned"),
  startDate: dateKey.default(null),
  dueDate: dateKey.default(null),
  expectedOutcome: z.string().optional().default(""),
  accentColor: z.string().optional().default("#D4F500"),
  pinned: z.boolean().optional().default(false),
  notes: z.string().optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().optional().default(null),
  archivedAt: z.string().nullable().optional().default(null),
  trashedAt: z.string().nullable().optional().default(null),
});

const taskSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().nullable().optional().default(null),
  parentTaskId: z.string().nullable().optional().default(null),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  completed: z.boolean().optional().default(false),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional().default("medium"),
  plannedDate: dateKey.default(null),
  dueDate: dateKey.default(null),
  estimatedMinutes: z.number().nullable().optional().default(null),
  notes: z.string().optional().default(""),
  order: z.number().optional().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().optional().default(null),
});

const journalSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  outcome: z.string().optional().default(""),
  accomplished: z.string().optional().default(""),
  lessons: z.string().optional().default(""),
  completedAt: z.string(),
  externalUrl: z.string().optional().default(""),
  githubUrl: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const activitySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().nullable().optional().default(null),
  type: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  createdAt: z.string(),
});

const prefsSchema = z
  .object({
    displayName: z.string().optional().default(""),
    theme: z.enum(["dark", "light", "system"]).optional().default("dark"),
    defaultPriority: z.enum(["urgent", "high", "medium", "low"]).optional().default("medium"),
    weekStartsOn: z.number().optional().default(1),
    lastBackupAt: z.string().nullable().optional().default(null),
    sidebarCollapsed: z.boolean().optional().default(false),
  })
  .passthrough();

export const backupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  categories: z.array(categorySchema),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  journal: z.array(journalSchema),
  activities: z.array(activitySchema),
  preferences: prefsSchema.optional(),
});

export function buildBackupPayload(workspace, preferences) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    categories: workspace.categories,
    projects: workspace.projects,
    tasks: workspace.tasks,
    journal: workspace.journal,
    activities: workspace.activities,
    preferences: {
      displayName: preferences.displayName,
      theme: preferences.theme,
      defaultPriority: preferences.defaultPriority,
      weekStartsOn: preferences.weekStartsOn,
      lastBackupAt: preferences.lastBackupAt,
      sidebarCollapsed: preferences.sidebarCollapsed,
    },
  };
}

export function backupFilename(date = new Date()) {
  return `daymark-backup-${format(date, "yyyy-MM-dd")}.json`;
}

export function parseBackup(raw) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!data || typeof data !== "object") {
    throw new Error("Backup file is empty or unreadable.");
  }
  if (typeof data.schemaVersion !== "number") {
    throw new Error("Missing schema version. This does not look like a Daymark backup.");
  }
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `This backup uses schema v${data.schemaVersion}, which is newer than this app (v${SCHEMA_VERSION}).`
    );
  }
  const result = backupSchema.safeParse({
    schemaVersion: data.schemaVersion,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    categories: data.categories ?? [],
    projects: data.projects ?? [],
    tasks: data.tasks ?? data.inbox ?? [],
    journal: data.journal ?? data.journalEntries ?? [],
    activities: data.activities ?? data.activity ?? [],
    preferences: data.preferences,
  });
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path?.join(".") || "file";
    throw new Error(`Invalid backup at ${path}: ${first?.message ?? "malformed data"}.`);
  }
  return result.data;
}

function mergeById(existing, incoming, preferIncoming = false) {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
      continue;
    }
    if (preferIncoming) {
      map.set(item.id, item);
      continue;
    }
    const current = map.get(item.id);
    const currentStamp = current.updatedAt || current.createdAt || "";
    const nextStamp = item.updatedAt || item.createdAt || "";
    if (nextStamp > currentStamp) map.set(item.id, item);
  }
  return [...map.values()];
}

/**
 * Duplicate IDs that would collide with unrelated records are remapped.
 * Incoming records that share an ID keep that ID when merging by recency.
 */
export function mergeWorkspaces(current, incoming) {
  const usedTaskIds = new Set(current.tasks.map((task) => task.id));
  const usedProjectIds = new Set(current.projects.map((project) => project.id));
  const usedCategoryIds = new Set(current.categories.map((category) => category.id));
  const usedJournalIds = new Set(current.journal.map((entry) => entry.id));
  const usedActivityIds = new Set(current.activities.map((event) => event.id));

  const categoryIdMap = new Map();
  const projectIdMap = new Map();
  const taskIdMap = new Map();

  const categories = incoming.categories.map((category) => {
    if (!usedCategoryIds.has(category.id)) {
      categoryIdMap.set(category.id, category.id);
      return category;
    }
    const existing = current.categories.find((item) => item.id === category.id);
    if (existing && existing.name === category.name) {
      categoryIdMap.set(category.id, category.id);
      return category;
    }
    const nextId = createId();
    categoryIdMap.set(category.id, nextId);
    return { ...category, id: nextId };
  });

  const projects = incoming.projects.map((project) => {
    let id = project.id;
    if (usedProjectIds.has(id)) {
      const existing = current.projects.find((item) => item.id === id);
      if (!existing || existing.name !== project.name) {
        id = createId();
      }
    }
    projectIdMap.set(project.id, id);
    const categoryId = project.categoryId
      ? categoryIdMap.get(project.categoryId) ??
        (usedCategoryIds.has(project.categoryId) ? project.categoryId : null)
      : null;
    return { ...project, id, categoryId };
  });

  const tasks = incoming.tasks.map((task) => {
    let id = task.id;
    if (usedTaskIds.has(id)) {
      id = createId();
    }
    taskIdMap.set(task.id, id);
    const projectId = task.projectId ? projectIdMap.get(task.projectId) ?? task.projectId : null;
    return { ...task, id, projectId };
  });

  const remappedTasks = tasks.map((task) => ({
    ...task,
    parentTaskId: task.parentTaskId ? taskIdMap.get(task.parentTaskId) ?? null : null,
  }));

  const knownProjectIds = new Set([
    ...current.projects.map((project) => project.id),
    ...projects.map((project) => project.id),
  ]);
  const safeTasks = remappedTasks.map((task) =>
    task.projectId && !knownProjectIds.has(task.projectId)
      ? { ...task, projectId: null, parentTaskId: null }
      : task
  );

  const journal = incoming.journal.map((entry) => {
    let id = entry.id;
    if (usedJournalIds.has(id)) id = createId();
    return {
      ...entry,
      id,
      projectId: projectIdMap.get(entry.projectId) ?? entry.projectId,
    };
  });

  const activities = incoming.activities.map((event) => {
    let id = event.id;
    if (usedActivityIds.has(id)) id = createId();
    return {
      ...event,
      id,
      projectId: event.projectId ? projectIdMap.get(event.projectId) ?? event.projectId : null,
    };
  });

  return {
    categories: mergeById(current.categories, categories),
    projects: mergeById(current.projects, projects),
    tasks: mergeById(current.tasks, safeTasks),
    journal: mergeById(current.journal, journal),
    activities: [...current.activities, ...activities].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    ),
  };
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
