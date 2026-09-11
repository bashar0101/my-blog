import type { ContentStore, StoredFile } from "./types";
import { isWritablePath } from "./paths";

/**
 * Development store. Posts to a Vite dev-server middleware that writes the
 * files to disk. There is no token and no network call beyond localhost —
 * the middleware exists only while `vite` is serving.
 */
export class LocalFsStore implements ContentStore {
  /** Reads the files back off disk, so the admin edits what `vite` is serving. */
  async read(paths: string[]): Promise<Record<string, string | null>> {
    const response = await fetch("/__admin/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      throw new Error(`Read failed (${response.status}): ${await response.text()}`);
    }
    return (await response.json()) as Record<string, string | null>;
  }

  async write(files: StoredFile[], message: string): Promise<void> {
    const disallowed = files.filter((file) => !isWritablePath(file.path));
    if (disallowed.length > 0) {
      throw new Error(`Path is not writable: ${disallowed.map((f) => f.path).join(", ")}`);
    }

    const response = await fetch("/__admin/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files, message }),
    });

    if (!response.ok) {
      throw new Error(`Write failed (${response.status}): ${await response.text()}`);
    }
  }
}
