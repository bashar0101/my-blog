import type { ContentStore, StoredFile } from "./types";
import { ConflictError } from "./types";
import { isWritablePath } from "./paths";

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

const API = "https://api.github.com";

function toBase64(value: string): string {
  // btoa mangles multi-byte characters; the site's content is Turkish and
  // Arabic, so encode via UTF-8 bytes first.
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Production store. Commits through the Git Data API so a multi-file save
 * is one atomic commit rather than several partial ones.
 */
export class GitHubStore implements ContentStore {
  private baseSha: string | null = null;

  constructor(private readonly config: GitHubConfig) {}

  private async call(path: string, init?: RequestInit): Promise<any> {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      let detail = `${response.status}`;
      try {
        const body = await response.json();
        if (body?.message) detail = body.message;
      } catch {
        // Non-JSON error body; the status alone is the detail.
      }
      throw new Error(`GitHub request failed: ${detail}`);
    }
    return response.json();
  }

  private get repoPath(): string {
    return `/repos/${this.config.owner}/${this.config.repo}`;
  }

  private async headSha(): Promise<string> {
    const ref = await this.call(`${this.repoPath}/git/ref/heads/${this.config.branch}`);
    return ref.object.sha as string;
  }

  /** Records where the branch was when the admin loaded, for conflict detection. */
  async loadBaseSha(): Promise<string> {
    this.baseSha = await this.headSha();
    return this.baseSha;
  }

  async write(files: StoredFile[], message: string): Promise<void> {
    const disallowed = files.filter((file) => !isWritablePath(file.path));
    if (disallowed.length > 0) {
      throw new Error(`Path is not writable: ${disallowed.map((f) => f.path).join(", ")}`);
    }

    const head = await this.headSha();
    if (this.baseSha && this.baseSha !== head) {
      throw new ConflictError(
        "The repository changed since this page loaded. Reload before saving, or your edits would overwrite someone else's."
      );
    }

    const headCommit = await this.call(`${this.repoPath}/git/commits/${head}`);

    const blobs: { path: string; sha: string }[] = [];
    for (const file of files) {
      const blob = await this.call(`${this.repoPath}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: file.encoding === "base64" ? file.content : toBase64(file.content),
          encoding: "base64",
        }),
      });
      blobs.push({ path: file.path, sha: blob.sha });
    }

    const tree = await this.call(`${this.repoPath}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: headCommit.tree.sha,
        tree: blobs.map((blob) => ({
          path: blob.path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        })),
      }),
    });

    const commit = await this.call(`${this.repoPath}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
    });

    await this.call(`${this.repoPath}/git/refs/heads/${this.config.branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha }),
    });

    this.baseSha = commit.sha;
  }
}
