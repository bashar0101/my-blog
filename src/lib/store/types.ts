export interface StoredFile {
  path: string;
  content: string;
  encoding: "utf8" | "base64";
}

export interface ContentStore {
  write(files: StoredFile[], message: string): Promise<void>;
}

/** Thrown when the remote moved since this session loaded it. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
