import type { Lang } from "../types";
import { isLang } from "../lib/localize";

export const STORAGE_KEY = "portfolio:lang";

export function readStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage denied (sandboxed iframe, blocked site data). The choice simply
    // does not persist across visits; everything else keeps working.
  }
}

export function negotiateLang(
  preferred: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages ?? []
): Lang {
  const stored = readStoredLang();
  if (stored) return stored;
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}
