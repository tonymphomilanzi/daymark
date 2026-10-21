/**
 * @author: @kokonutui
 * @description: Command palette with ⌘K, grouped results and keyboard navigation.
 * Animations rewritten with GSAP to match Daymark's motion system.
 * @website: https://kokonutui.com
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return { score: 0, ok: true };
  const at = t.indexOf(q);
  if (at >= 0) return { score: 100 - at, ok: true };
  let from = 0;
  for (const ch of q.replace(/\s+/g, "")) {
    const i = t.indexOf(ch, from);
    if (i < 0) return { score: 0, ok: false };
    from = i + 1;
  }
  return { score: 10, ok: true };
}

export default function ActionSearchBar({
  open,
  onOpenChange,
  items = [],
  placeholder = "Search or jump to…",
  onSelect,
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const rows = useMemo(() => {
    const scored = items
      .map((item) => {
        const hay = `${item.label} ${item.group || ""} ${(item.keywords || []).join(" ")}`;
        const hit = fuzzyMatch(hay, query);
        return hit.ok ? { ...item, score: hit.score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    return scored;
  }, [items, query]);

  const sections = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.group || "Results";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return [...map.entries()].map(([label, list]) => ({ label, list }));
  }, [rows]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  useGSAP(
    () => {
      if (!open || !panelRef.current) return;
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 8, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" }
      );
    },
    { dependencies: [open] }
  );

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange?.(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const choose = (item) => {
    onSelect?.(item);
    onOpenChange?.(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange?.(false);
      }}
    >
      <div className="absolute inset-0 bg-black/55" />
      <div
        ref={panelRef}
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-border bg-elevated shadow-2xl"
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onOpenChange?.(false);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(rows.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter" && rows[active]) {
                event.preventDefault();
                choose(rows[active]);
              }
            }}
            placeholder={placeholder}
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted focus-visible:outline-none"
            aria-autocomplete="list"
          />
          <kbd className="hidden sm:inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
            ESC
          </kbd>
        </div>
        <div className="max-h-[min(420px,55vh)] overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">No matching results.</p>
          ) : (
            sections.map((section) => (
              <div key={section.label} className="mb-1">
                <p className="px-2 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted">
                  {section.label}
                </p>
                {section.list.map((item) => {
                  const index = rows.findIndex((row) => row.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm",
                        index === active ? "bg-background" : "hover:bg-background/70"
                      )}
                    >
                      {item.icon ? <span className="text-muted">{item.icon}</span> : null}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint ? <span className="text-[11px] text-muted">{item.hint}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
