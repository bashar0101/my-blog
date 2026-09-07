import type { ContentStore } from "./types";
import { LocalFsStore } from "./LocalFsStore";
import { GitHubStore, type GitHubConfig } from "./GitHubStore";

export type { ContentStore, StoredFile } from "./types";
export { ConflictError } from "./types";
export { GitHubStore } from "./GitHubStore";
export { LocalFsStore } from "./LocalFsStore";

export function githubConfigFromEnv(token: string): GitHubConfig {
  return {
    owner: import.meta.env.VITE_GITHUB_OWNER || "bashar0101",
    repo: import.meta.env.VITE_GITHUB_REPO || "my-blog",
    branch: import.meta.env.VITE_GITHUB_BRANCH || "main",
    token,
  };
}

let cached: { token: string | null; store: ContentStore } | null = null;

/**
 * In development the admin writes straight to disk and needs no token.
 * In production it commits to GitHub and requires one.
 *
 * The instance is memoized per token because GitHubStore records the branch
 * head it saw at load time and compares against it on every write. A fresh
 * instance per save would reset that memory and silently disable conflict
 * detection — the store would happily overwrite a commit made elsewhere.
 */
export function createStore(token: string | null): ContentStore {
  if (cached && cached.token === token) return cached.store;
  const store: ContentStore = import.meta.env.DEV
    ? new LocalFsStore()
    : (() => {
        if (!token) {
          throw new Error("A GitHub token is required to save from the deployed admin.");
        }
        return new GitHubStore(githubConfigFromEnv(token));
      })();
  cached = { token, store };
  return store;
}

/**
 * Records where the branch is now, so a later save can tell whether anyone
 * else moved it. Safe to call in development, where it does nothing.
 */
export async function primeStore(token: string | null): Promise<void> {
  const store = createStore(token);
  if (store instanceof GitHubStore) await store.loadBaseSha();
}
