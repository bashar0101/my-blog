export interface StoredFile {
  path: string;
  content: string;
  encoding: "utf8" | "base64";
  /** Deletes this already-known content file when true. */
  delete?: boolean;
}

export interface ContentStore {
  write(files: StoredFile[], message: string): Promise<void>;
  /**
   * Current content of each path, straight from the source of truth, with null
   * for one that does not exist.
   *
   * The admin cannot seed its forms from the imported content modules: those
   * are frozen at build time, so between two deploys every save would write the
   * last-built snapshot plus one edit and silently revert everything committed
   * in between. Editors hydrate from here before they let anything be saved.
   */
  read(paths: string[]): Promise<Record<string, string | null>>;
}

/** Thrown when the remote moved since this session loaded it. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
