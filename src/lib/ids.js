export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
