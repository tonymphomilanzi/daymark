import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage, PREFS_KEY } from "@/lib/storage";

const defaultPrefs = {
  displayName: "",
  theme: "dark",
  defaultPriority: "medium",
  weekStartsOn: 1,
  lastBackupAt: null,
  sidebarCollapsed: false,
};

export const usePrefs = create(
  persist(
    (set) => ({
      ...defaultPrefs,
      setDisplayName: (displayName) => set({ displayName }),
      setTheme: (theme) => set({ theme }),
      setDefaultPriority: (defaultPriority) => set({ defaultPriority }),
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      setLastBackupAt: (lastBackupAt) => set({ lastBackupAt }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      applyPreferences: (preferences) =>
        set({
          displayName: preferences.displayName ?? defaultPrefs.displayName,
          theme: preferences.theme ?? defaultPrefs.theme,
          defaultPriority: preferences.defaultPriority ?? defaultPrefs.defaultPriority,
          weekStartsOn: preferences.weekStartsOn ?? defaultPrefs.weekStartsOn,
          lastBackupAt: preferences.lastBackupAt ?? defaultPrefs.lastBackupAt,
          sidebarCollapsed: preferences.sidebarCollapsed ?? defaultPrefs.sidebarCollapsed,
        }),
      resetPreferences: () => set({ ...defaultPrefs }),
    }),
    {
      name: PREFS_KEY,
      storage: createJSONStorage(() => browserStorage),
      partialize: (state) => ({
        displayName: state.displayName,
        theme: state.theme,
        defaultPriority: state.defaultPriority,
        weekStartsOn: state.weekStartsOn,
        lastBackupAt: state.lastBackupAt,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

export function resolveTheme(theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return theme === "light" ? "light" : "dark";
}
