import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";

/**
 * Store calendar dates as local YYYY-MM-DD strings.
 * Never use toISOString().slice(0, 10) — that converts to UTC and
 * rolls the date over near midnight in western timezones.
 */
export function localDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(key) {
  if (!key || typeof key !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isValidDateKey(key) {
  return Boolean(parseLocalDate(key));
}

export function todayKey() {
  return localDateKey(new Date());
}

export function isToday(key) {
  return Boolean(key) && key === todayKey();
}

export function isBeforeToday(key) {
  return Boolean(key) && key < todayKey();
}

export function isAfterToday(key) {
  return Boolean(key) && key > todayKey();
}

export function addDaysToKey(key, amount) {
  const date = parseLocalDate(key) ?? new Date();
  return localDateKey(addDays(date, amount));
}

export function daysUntil(key) {
  const date = parseLocalDate(key);
  if (!date) return null;
  return differenceInCalendarDays(date, parseLocalDate(todayKey()));
}

export function formatDate(key, pattern = "MMM d") {
  const date = parseLocalDate(key);
  if (!date) return "";
  return format(date, pattern);
}

export function formatDateLong(key) {
  const date = parseLocalDate(key);
  if (!date) return "";
  return format(date, "EEEE, d MMMM yyyy");
}

export function formatTimestamp(iso, pattern = "MMM d, yyyy") {
  if (!iso) return "";
  try {
    const date = typeof iso === "string" ? parseISO(iso) : iso;
    return format(date, pattern);
  } catch {
    return "";
  }
}

export function formatTime(iso) {
  if (!iso) return "";
  try {
    const date = typeof iso === "string" ? parseISO(iso) : iso;
    return format(date, "h:mm a");
  } catch {
    return "";
  }
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) {
    return {
      title: "Good morning.",
      subtitle: "What are we building today?",
      period: "morning",
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      title: "Good afternoon.",
      subtitle: "Let's keep things moving.",
      period: "afternoon",
    };
  }
  if (hour >= 17 && hour < 22) {
    return {
      title: "Good evening.",
      subtitle: "How's the progress?",
      period: "evening",
    };
  }
  return {
    title: "Still creating?",
    subtitle: "Remember to get some rest.",
    period: "night",
  };
}

export function weekRange(date = new Date(), weekStartsOn = 1) {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  return { start, end, startKey: localDateKey(start), endKey: localDateKey(end) };
}

export function eachDayOfRange(start, end) {
  const days = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function isSameLocalDay(a, b) {
  if (!a || !b) return false;
  const da = a instanceof Date ? a : parseLocalDate(a);
  const db = b instanceof Date ? b : parseLocalDate(b);
  if (!da || !db) return false;
  return isSameDay(da, db);
}

export function monthGrid(date, weekStartsOn = 1) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const start = startOfWeek(first, { weekStartsOn });
  const last = new Date(year, month + 1, 0);
  const end = endOfWeek(last, { weekStartsOn });
  return eachDayOfRange(start, end);
}

export const MOTIVATIONAL_LINES = [
  "Finish the next small thing. Momentum compounds.",
  "One focused hour is worth a day of half-attention.",
  "Clarity first. Then the work becomes obvious.",
  "Protect the work that actually ships.",
  "Done is a better teacher than perfect.",
  "Make today count for something you can point to.",
  "Reduce the surface area. Then execute.",
  "The list is not the work. Crossing it off is.",
];

export function motivationalMessage(date = new Date()) {
  const index = Number(localDateKey(date).replaceAll("-", "")) % MOTIVATIONAL_LINES.length;
  return MOTIVATIONAL_LINES[index];
}
