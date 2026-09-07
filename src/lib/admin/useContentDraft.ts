import { useCallback, useState } from "react";
import type { StoredFile } from "../store";
import { ConflictError, createStore } from "../store";
import { readToken } from "../store/token";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useContentDraft<T>(initial: T) {
  const [draft, setDraft] = useState<T>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");

  const save = useCallback(async (files: StoredFile[], message: string) => {
    setStatus("saving");
    setError("");
    try {
      await createStore(readToken()).write(files, message);
      setStatus("saved");
    } catch (cause) {
      setStatus("error");
      setError(
        cause instanceof ConflictError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "Save failed."
      );
    }
  }, []);

  return { draft, setDraft, status, error, save };
}
