import { useEffect } from "react";

export function useHotkeys(combo, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event) => {
      const key = combo.key.toLowerCase();
      if (event.key.toLowerCase() !== key) return;
      const meta = combo.meta ? event.metaKey || event.ctrlKey : true;
      const shift = combo.shift ? event.shiftKey : !event.shiftKey;
      if (!meta || !shift) return;
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing && !combo.allowInInputs) return;
      event.preventDefault();
      handler(event);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, handler, enabled]);
}
