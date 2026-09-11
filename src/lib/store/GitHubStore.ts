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

function fromBase64(value: string): string {
  // GitHub wraps the contents API payload at 60 columns; atob rejects newlines.
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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
      // GitHub answers GETs with `Cache-Control: public, max-age=60`, and the
      // browser honours it. Reading the branch ref from that cache hands back
      // the head as it was up to a minute ago, so the next commit is parented
      // on a superseded sha and the ref PATCH — which is fast-forward-only —
      // is rejected with "Update is not a fast forward". Two saves inside a
      // minute were enough to trigger it.
      cache: "no-store",
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

  /**
   * Reads each path at the branch head. A path that does not exist comes back
   * as null rather than throwing, so a caller can tell "no such file" apart
   * from "the request failed".
   */
  async read(paths: string[]): Promise<Record<string, string | null>> {
    const entries = await Promise.all(
      paths.map(async (path) => {
        const url = `${API}${this.repoPath}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(this.config.branch)}`;
        const response = await fetch(url, {
          cache: "no-store",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${this.config.token}`,
          },
        });
        if (response.status === 404) return [path, null] as const;
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
        const body = await response.json();
        if (body?.encoding !== "base64" || typeof body?.content !== "string") {
          throw new Error(`GitHub returned no readable content for ${path}.`);
        }
        return [path, fromBase64(body.content)] as const;
      })
    );
    return Object.fromEntries(entries);
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

    const blobs: { path: string; sha: string | null }[] = [];
    for (const file of files) {
      if (file.delete) {
        blobs.push({ path: file.path, sha: null });
        continue;
      }
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
