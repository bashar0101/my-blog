/**
 * Reads one JSON content file out of a hydration batch. A file the repository
 * does not have yet reads as null, which is a normal answer — a brand-new
 * article has no meta.json — so the caller's fallback stands in.
 */
export function parseJsonFile<T>(
  files: Record<string, string | null>,
  path: string,
  fallback: T
): T {
  const text = files[path];
  if (text === null || text === undefined) return fallback;
  return JSON.parse(text) as T;
}
