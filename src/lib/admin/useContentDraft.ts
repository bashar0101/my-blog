import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredFile } from "../store";
import { ConflictError, createStore } from "../store";
import { readToken } from "../store/token";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * How an editor rebuilds its draft from the files as they exist right now.
 *
 * Seeding from the imported content modules alone is not safe: those are frozen
 * at build time, so between two deploys an editor would show the last-built
 * snapshot, and saving it would revert every content commit made since. The
 * draft therefore starts from the bundled value only so the form has a shape to
 * render, and is replaced by the real files before anything can be saved.
 */
export interface Hydration<T> {
  paths: string[];
  parse: (files: Record<string, string | null>) => T;
}

const STALE =
  "Could not read the current content, so saving is disabled — saving the page as it stands would overwrite anything committed since the last deploy. Reload once the cause below is fixed.";

export function useContentDraft<T>(initial: T, hydration?: Hydration<T>) {
  const [draft, setDraft] = useState<T>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(!hydration);

  // Held in a ref so the effect can run exactly once. Callers build the
  // hydration object inline, so it is a new object on every render and would
  // re-trigger the effect forever as a dependency.
  const hydrationRef = useRef(hydration);

  useEffect(() => {
    const config = hydrationRef.current;
    if (!config) return;
    let cancelled = false;

    void (async () => {
      try {
        const files = await createStore(readToken()).read(config.paths);
        if (cancelled) return;
        setDraft(config.parse(files));
        setReady(true);
      } catch (cause) {
        if (cancelled) return;
        setStatus("error");
        setError(`${STALE} ${cause instanceof Error ? cause.message : "Read failed."}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (files: StoredFile[], message: string): Promise<boolean> => {
    if (!ready) {
      setStatus("error");
      setError(STALE);
      return false;
    }
    setStatus("saving");
    setError("");
    try {
      await createStore(readToken()).write(files, message);
      setStatus("saved");
      return true;
    } catch (cause) {
      setStatus("error");
      setError(
        cause instanceof ConflictError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "Save failed."
      );
      return false;
    }
  }, [ready]);

  return { draft, setDraft, status, error, save, ready };
}
