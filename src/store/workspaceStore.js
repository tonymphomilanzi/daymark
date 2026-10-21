import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage, WORKSPACE_KEY } from "@/lib/storage";
import { createId } from "@/lib/ids";
import { todayKey } from "@/lib/dates";
import {
  allLeavesComplete,
  applyCompleteWithDescendants,
  applyUncompleteCascade,
  collectDescendantIds,
  nextOrder,
  reconcileTaskTree,
} from "@/lib/calculations";

function nowIso() {
  return new Date().toISOString();
}

function activity(projectId, type, message, metadata = {}) {
  return {
    id: createId(),
    projectId,
    type,
    message,
    metadata,
    createdAt: nowIso(),
  };
}

function emptyWorkspace() {
  return {
    categories: [],
    projects: [],
    tasks: [],
    journal: [],
    activities: [],
  };
}

function ensureProjectStatus(projects, tasks, journal, activities, projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project || project.trashedAt || project.archivedAt) {
    return { projects, journal, activities };
  }

  const complete = allLeavesComplete(tasks, projectId);
  const stamp = nowIso();

  if (complete && project.status !== "completed") {
    const nextProjects = projects.map((item) =>
      item.id === projectId
        ? { ...item, status: "completed", completedAt: stamp, updatedAt: stamp }
        : item
    );
    const hasJournal = journal.some((entry) => entry.projectId === projectId);
    const nextJournal = hasJournal
      ? journal.map((entry) =>
          entry.projectId === projectId
            ? { ...entry, completedAt: stamp, updatedAt: stamp }
            : entry
        )
      : [
          ...journal,
          {
            id: createId(),
            projectId,
            outcome: project.expectedOutcome || "",
            accomplished: "",
            lessons: "",
            completedAt: stamp,
            externalUrl: "",
            githubUrl: "",
            notes: "",
            createdAt: stamp,
            updatedAt: stamp,
          },
        ];
    return {
      projects: nextProjects,
      journal: nextJournal,
      activities: [
        ...activities,
        activity(projectId, "project_completed", `Completed “${project.name}”.`),
      ],
    };
  }

  if (!complete && project.status === "completed") {
    const nextProjects = projects.map((item) =>
      item.id === projectId
        ? { ...item, status: "active", updatedAt: stamp }
        : item
    );
    return {
      projects: nextProjects,
      journal,
      activities: [
        ...activities,
        activity(projectId, "project_reopened", `Reopened “${project.name}”.`),
      ],
    };
  }

  return { projects, journal, activities };
}

export const useWorkspace = create(
  persist(
    (set, get) => ({
      ...emptyWorkspace(),

      addCategory: ({ name, color = "#7DD3FC" }) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const category = {
          id: createId(),
          name: trimmed,
          color,
          order: get().categories.length,
          createdAt: nowIso(),
        };
        set((state) => ({ categories: [...state.categories, category] }));
        return category.id;
      },

      updateCategory: (id, patch) => {
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === id ? { ...category, ...patch } : category
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
          projects: state.projects.map((project) =>
            project.categoryId === id
              ? { ...project, categoryId: null, updatedAt: nowIso() }
              : project
          ),
        }));
      },

      addProject: (input) => {
        const stamp = nowIso();
        const project = {
          id: createId(),
          name: input.name.trim(),
          description: input.description?.trim() || "",
          categoryId: input.categoryId || null,
          priority: input.priority || "medium",
          status: input.status || "planned",
          startDate: input.startDate || todayKey(),
          dueDate: input.dueDate || null,
          expectedOutcome: input.expectedOutcome?.trim() || "",
          accentColor: input.accentColor || "#D4F500",
          pinned: Boolean(input.pinned),
          notes: "",
          createdAt: stamp,
          updatedAt: stamp,
          completedAt: null,
          archivedAt: null,
          trashedAt: null,
        };
        if (!project.name) return null;
        set((state) => ({
          projects: [...state.projects, project],
          activities: [
            ...state.activities,
            activity(project.id, "project_created", `Created “${project.name}”.`),
          ],
        }));
        return project.id;
      },

      updateProject: (id, patch) => {
        const current = get().projects.find((project) => project.id === id);
        if (!current) return;
        const stamp = nowIso();
        const events = [];
        if (patch.dueDate !== undefined && patch.dueDate !== current.dueDate) {
          events.push(
            activity(
              id,
              "deadline_changed",
              patch.dueDate
                ? `Deadline moved to ${patch.dueDate}.`
                : "Deadline cleared."
            )
          );
        }
        if (patch.name && patch.name !== current.name) {
          events.push(activity(id, "project_updated", `Renamed to “${patch.name}”.`));
        }
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...patch, updatedAt: stamp } : project
          ),
          activities: events.length ? [...state.activities, ...events] : state.activities,
        }));
      },

      trashProject: (id) => {
        const stamp = nowIso();
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, trashedAt: stamp, updatedAt: stamp } : project
          ),
        }));
      },

      restoreProject: (id) => {
        const stamp = nowIso();
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, trashedAt: null, updatedAt: stamp } : project
          ),
        }));
      },

      permanentlyDeleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          tasks: state.tasks.filter((task) => task.projectId !== id),
          journal: state.journal.filter((entry) => entry.projectId !== id),
          activities: state.activities.filter((event) => event.projectId !== id),
        }));
      },

      duplicateProject: (id) => {
        const state = get();
        const source = state.projects.find((project) => project.id === id);
        if (!source) return null;
        const stamp = nowIso();
        const newProjectId = createId();
        const project = {
          ...source,
          id: newProjectId,
          name: `${source.name} copy`,
          status: source.status === "completed" ? "active" : source.status,
          pinned: false,
          createdAt: stamp,
          updatedAt: stamp,
          completedAt: null,
          archivedAt: null,
          trashedAt: null,
        };
        const idMap = new Map();
        const sourceTasks = state.tasks
          .filter((task) => task.projectId === id)
          .sort((a, b) => a.order - b.order);
        for (const task of sourceTasks) {
          idMap.set(task.id, createId());
        }
        const tasks = sourceTasks.map((task) => ({
          ...task,
          id: idMap.get(task.id),
          projectId: newProjectId,
          parentTaskId: task.parentTaskId ? idMap.get(task.parentTaskId) || null : null,
          completed: false,
          completedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        }));
        set((current) => ({
          projects: [...current.projects, project],
          tasks: [...current.tasks, ...tasks],
          activities: [
            ...current.activities,
            activity(newProjectId, "project_created", `Duplicated “${source.name}”.`),
          ],
        }));
        return newProjectId;
      },

      archiveProject: (id) => {
        const project = get().projects.find((item) => item.id === id);
        if (!project) return;
        const stamp = nowIso();
        set((state) => ({
          projects: state.projects.map((item) =>
            item.id === id ? { ...item, archivedAt: stamp, updatedAt: stamp } : item
          ),
          activities: [
            ...state.activities,
            activity(id, "project_archived", `Archived “${project.name}”.`),
          ],
        }));
      },

      unarchiveProject: (id) => {
        const project = get().projects.find((item) => item.id === id);
        if (!project) return;
        const stamp = nowIso();
        set((state) => ({
          projects: state.projects.map((item) =>
            item.id === id ? { ...item, archivedAt: null, updatedAt: stamp } : item
          ),
          activities: [
            ...state.activities,
            activity(id, "project_restored", `Restored “${project.name}” from archive.`),
          ],
        }));
      },

      togglePin: (id) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, pinned: !project.pinned, updatedAt: nowIso() }
              : project
          ),
        }));
      },

      setProjectNotes: (id, notes) => {
        const stamp = nowIso();
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, notes, updatedAt: stamp } : project
          ),
          activities: [
            ...state.activities,
            activity(id, "notes_updated", "Updated project notes."),
          ],
        }));
      },

      addTask: (input) => {
        const title = input.title?.trim();
        if (!title) return null;
        const stamp = nowIso();
        const projectId = input.projectId ?? null;
        const parentTaskId = input.parentTaskId ?? null;
        const task = {
          id: createId(),
          projectId,
          parentTaskId,
          title,
          description: input.description?.trim() || "",
          completed: false,
          priority: input.priority || "medium",
          plannedDate: input.plannedDate || null,
          dueDate: input.dueDate || null,
          estimatedMinutes:
            typeof input.estimatedMinutes === "number" ? input.estimatedMinutes : null,
          notes: input.notes || "",
          order: nextOrder(get().tasks, projectId, parentTaskId),
          createdAt: stamp,
          updatedAt: stamp,
          completedAt: null,
        };
        set((state) => {
          let tasks = [...state.tasks, task];
          if (parentTaskId) {
            tasks = applyUncompleteCascade(tasks, parentTaskId);
          }
          let { projects, journal, activities } = state;
          if (projectId) {
            const synced = ensureProjectStatus(
              projects,
              tasks,
              journal,
              activities,
              projectId
            );
            projects = synced.projects;
            journal = synced.journal;
            activities = synced.activities;
          }
          return { tasks, projects, journal, activities };
        });
        return task.id;
      },

      updateTask: (id, patch) => {
        const current = get().tasks.find((task) => task.id === id);
        if (!current) return;
        const stamp = nowIso();
        const events = [];
        if (patch.dueDate !== undefined && patch.dueDate !== current.dueDate && current.projectId) {
          events.push(
            activity(
              current.projectId,
              "deadline_changed",
              patch.dueDate
                ? `“${current.title}” deadline set to ${patch.dueDate}.`
                : `“${current.title}” deadline cleared.`
            )
          );
        }
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...patch, updatedAt: stamp } : task
          ),
          activities: events.length ? [...state.activities, ...events] : state.activities,
        }));
      },

      deleteTask: (id) => {
        const ids = new Set([id, ...collectDescendantIds(get().tasks, id)]);
        const task = get().tasks.find((item) => item.id === id);
        set((state) => {
          const tasks = state.tasks.filter((item) => !ids.has(item.id));
          let { projects, journal, activities } = state;
          if (task?.projectId) {
            const synced = ensureProjectStatus(
              projects,
              tasks,
              journal,
              activities,
              task.projectId
            );
            projects = synced.projects;
            journal = synced.journal;
            activities = synced.activities;
          }
          return { tasks, projects, journal, activities };
        });
      },

      duplicateTask: (id) => {
        const source = get().tasks.find((task) => task.id === id);
        if (!source) return null;
        const stamp = nowIso();
        const descendants = collectDescendantIds(get().tasks, id);
        const idMap = new Map([[id, createId()]]);
        for (const childId of descendants) idMap.set(childId, createId());
        const originals = get().tasks.filter((task) => idMap.has(task.id));
        const copies = originals.map((task) => ({
          ...task,
          id: idMap.get(task.id),
          parentTaskId: task.id === id ? source.parentTaskId : idMap.get(task.parentTaskId) || null,
          title: task.id === id ? `${task.title} copy` : task.title,
          completed: false,
          completedAt: null,
          order: task.id === id ? source.order + 0.5 : task.order,
          createdAt: stamp,
          updatedAt: stamp,
        }));
        set((state) => ({ tasks: [...state.tasks, ...copies] }));
        return idMap.get(id);
      },

      toggleTask: (id) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return { needsConfirm: false };
        const children = get().tasks.filter((item) => item.parentTaskId === id);
        if (!task.completed && children.some((child) => !child.completed)) {
          return { needsConfirm: true, task };
        }
        set((state) => {
          const stamp = nowIso();
          let tasks;
          if (task.completed) {
            tasks = applyUncompleteCascade(state.tasks, id);
          } else {
            tasks = state.tasks.map((item) =>
              item.id === id
                ? { ...item, completed: true, completedAt: stamp, updatedAt: stamp }
                : item
            );
            tasks = reconcileTaskTree(tasks, id);
          }
          const nextTask = tasks.find((item) => item.id === id);
          let activities = state.activities;
          if (task.projectId) {
            activities = [
              ...activities,
              activity(
                task.projectId,
                nextTask.completed ? "task_completed" : "task_uncompleted",
                nextTask.completed
                  ? `Completed “${task.title}”.`
                  : `Reopened “${task.title}”.`
              ),
            ];
          }
          let { projects, journal } = state;
          if (task.projectId) {
            const synced = ensureProjectStatus(
              projects,
              tasks,
              journal,
              activities,
              task.projectId
            );
            projects = synced.projects;
            journal = synced.journal;
            activities = synced.activities;
          }
          return { tasks, projects, journal, activities };
        });
        return { needsConfirm: false };
      },

      completeTaskTree: (id) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return;
        set((state) => {
          let tasks = applyCompleteWithDescendants(state.tasks, id);
          let activities = [
            ...state.activities,
            ...(task.projectId
              ? [activity(task.projectId, "task_completed", `Completed “${task.title}” and nested work.`)]
              : []),
          ];
          let { projects, journal } = state;
          if (task.projectId) {
            const synced = ensureProjectStatus(
              projects,
              tasks,
              journal,
              activities,
              task.projectId
            );
            projects = synced.projects;
            journal = synced.journal;
            activities = synced.activities;
          }
          return { tasks, projects, journal, activities };
        });
      },

      reorderTasks: (projectId, parentTaskId, orderedIds) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.projectId !== projectId || task.parentTaskId !== parentTaskId) {
              return task;
            }
            const index = orderedIds.indexOf(task.id);
            if (index === -1) return task;
            return { ...task, order: index, updatedAt: nowIso() };
          }),
        }));
      },

      moveTask: (id, { projectId, parentTaskId = null }) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return;
        if (parentTaskId && (parentTaskId === id || collectDescendantIds(get().tasks, id).includes(parentTaskId))) {
          return;
        }
        const descendantIds = collectDescendantIds(get().tasks, id);
        const stamp = nowIso();
        set((state) => {
          let tasks = state.tasks.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                projectId,
                parentTaskId,
                order: nextOrder(state.tasks, projectId, parentTaskId),
                updatedAt: stamp,
              };
            }
            if (descendantIds.includes(item.id)) {
              return { ...item, projectId, updatedAt: stamp };
            }
            return item;
          });
          let { projects, journal, activities } = state;
          const projectIds = [task.projectId, projectId].filter(Boolean);
          for (const pid of new Set(projectIds)) {
            const synced = ensureProjectStatus(projects, tasks, journal, activities, pid);
            projects = synced.projects;
            journal = synced.journal;
            activities = synced.activities;
          }
          return { tasks, projects, journal, activities };
        });
      },

      addToMyDay: (id) => {
        get().updateTask(id, { plannedDate: todayKey() });
      },

      deferTask: (id, days = 1) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return;
        const from = task.plannedDate && task.plannedDate > todayKey() ? task.plannedDate : todayKey();
        const [y, m, d] = from.split("-").map(Number);
        const date = new Date(y, m - 1, d + days);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        get().updateTask(id, { plannedDate: key });
      },

      updateJournal: (id, patch) => {
        set((state) => ({
          journal: state.journal.map((entry) =>
            entry.id === id ? { ...entry, ...patch, updatedAt: nowIso() } : entry
          ),
        }));
      },

      replaceWorkspace: (payload) => {
        set({
          categories: payload.categories,
          projects: payload.projects,
          tasks: payload.tasks,
          journal: payload.journal,
          activities: payload.activities,
        });
      },

      resetWorkspace: () => set(emptyWorkspace()),
    }),
    {
      name: WORKSPACE_KEY,
      storage: createJSONStorage(() => browserStorage),
      partialize: (state) => ({
        categories: state.categories,
        projects: state.projects,
        tasks: state.tasks,
        journal: state.journal,
        activities: state.activities,
      }),
    }
  )
);
