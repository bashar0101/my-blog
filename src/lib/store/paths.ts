export const WRITABLE_PREFIXES = [
  "src/content/",
  "content/articles/",
  "public/img/",
  "public/cv/",
] as const;

export function isWritablePath(path: string): boolean {
  if (!path) return false;
  // Backslashes normalize differently across platforms, so a path containing
  // one is rejected rather than guessed at.
  if (path.includes("\\")) return false;
  if (path.startsWith("/")) return false;
  if (/^[A-Za-z]:/.test(path)) return false;
  if (path.split("/").includes("..")) return false;

  return WRITABLE_PREFIXES.some(
    (prefix) => path.startsWith(prefix) && path.length > prefix.length
  );
}
