export type Theme = "light" | "dark";

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("doms-theme", theme);
  } catch {
    /* Storage is optional. */
  }
}

export function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncSystem = () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("doms-theme");
    } catch {
      /* Storage is optional. */
    }
    document.documentElement.dataset.theme =
      saved === "light" || saved === "dark"
        ? saved
        : media.matches
          ? "dark"
          : "light";
  };
  media.addEventListener("change", syncSystem);
  window.addEventListener("storage", syncSystem);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", syncSystem);
    window.removeEventListener("storage", syncSystem);
  };
}
