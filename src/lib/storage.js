/**
 * Persistence adapter.
 * Today this is LocalStorage. The same shape can later wrap IndexedDB
 * or a remote API without rewriting the Zustand stores.
 */
export const browserStorage = {
  getItem(name) {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Quota or private-mode failures should not crash the app.
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const WORKSPACE_KEY = "daymark-workspace";
export const PREFS_KEY = "daymark-prefs";
export const SCHEMA_VERSION = 1;
