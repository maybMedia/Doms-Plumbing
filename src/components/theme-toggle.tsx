"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { applyTheme, getTheme, subscribeTheme } from "@/lib/theme";
import { Icon } from "./icon";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light");
  const busy = useRef(false);
  const [switching, setSwitching] = useState(false);

  async function toggleTheme() {
    if (busy.current) return;
    const next = getTheme() === "dark" ? "light" : "dark";
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion || typeof document.startViewTransition !== "function") {
      applyTheme(next);
      return;
    }

    busy.current = true;
    setSwitching(true);
    const root = document.documentElement;
    root.dataset.themeTransition = "sweep";
    try {
      const transition = document.startViewTransition(() => applyTheme(next));
      await transition.ready;
      // Reveal the real new palette under a diagonal edge, rather than washing
      // an overlay over an otherwise unchanged page.
      await root.animate(
        {
          clipPath: [
            "polygon(100% 0, 100% 0, 100% 100%, 120% 100%)",
            "polygon(-20% 0, 100% 0, 100% 100%, 0 100%)",
          ],
        },
        {
          duration: 850,
          easing: "cubic-bezier(.65, 0, .2, 1)",
          pseudoElement: "::view-transition-new(root)",
          fill: "both",
        },
      ).finished;
      await transition.finished;
    } catch {
      // A skipped transition or an older engine still receives the new theme.
      applyTheme(next);
    } finally {
      delete root.dataset.themeTransition;
      busy.current = false;
      setSwitching(false);
    }
  }

  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      onClick={toggleTheme}
      disabled={switching}
      aria-busy={switching}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-pressed={theme === "dark"}
      title={`${theme === "dark" ? "Light" : "Dark"} mode`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}
