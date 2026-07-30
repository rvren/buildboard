import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

// Theme is persisted in the local SQLite DB (via the desktop bridge), read
// synchronously at boot by the no-flash script in index.html.
function initialTheme(): Theme {
  try {
    return window.api.getThemeSync().mode === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export const useTheme = create<ThemeState>()((set, get) => ({
  theme: initialTheme(),
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    apply(next);
    set({ theme: next });
    void window.api.setTheme(next);
  },
  setTheme: (t) => {
    apply(t);
    set({ theme: t });
    void window.api.setTheme(t);
  },
}));

// Ensure the class matches the persisted value once the module loads.
apply(useTheme.getState().theme);
