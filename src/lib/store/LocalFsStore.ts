import type { ContentStore, StoredFile } from "./types";
import { isWritablePath } from "./paths";

/**
 * Development store. Posts to a Vite dev-server middleware that writes the
 * files to disk. There is no token and no network call beyond localhost —
 * the middleware exists only while `vite` is serving.
 */
export class LocalFsStore implements ContentStore {
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
