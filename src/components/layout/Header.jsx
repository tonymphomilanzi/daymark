import { Menu, Plus, Search, SunMedium, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/store/prefsStore";
import { resolveTheme } from "@/store/prefsStore";

export function Header({ title, description, onMenu, onSearch, onQuickAdd }) {
  const theme = usePrefs((state) => state.theme);
  const setTheme = usePrefs((state) => state.setTheme);
  const resolved = typeof window === "undefined" ? "dark" : resolveTheme(theme);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:px-6">
      <Button size="icon" variant="ghost" className="md:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-medium tracking-tight">{title}</h1>
        {description ? <p className="truncate text-xs text-muted">{description}</p> : null}
      </div>
      <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={onSearch}>
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd className="ml-2 hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted lg:inline">
          ⌘K
        </kbd>
      </Button>
      <Button size="icon" variant="ghost" className="sm:hidden" onClick={onSearch} aria-label="Search">
        <Search className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {resolved === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      {onQuickAdd ? (
        <Button size="sm" onClick={onQuickAdd}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New</span>
        </Button>
      ) : null}
    </header>
  );
}
