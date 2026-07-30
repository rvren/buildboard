import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact, collision-resistant id for nodes/screens/projects. */
export function uid(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${rand}`;
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60_000,
    hour = 3_600_000,
    day = 86_400_000;
  if (diff < min) return "just now";
  if (diff < hour) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
