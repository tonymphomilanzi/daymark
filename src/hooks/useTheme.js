import { useEffect } from "react";
import { resolveTheme, usePrefs } from "@/store/prefsStore";

export function useTheme() {
  const theme = usePrefs((state) => state.theme);
  const setTheme = usePrefs((state) => state.setTheme);

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(theme);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    if (theme !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return { theme, setTheme };
}
