# Portfolio Admin and Deploy Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site correctly deployable, then give its owner forms to edit every piece of content without touching a file.

**Architecture:** Task 1 fixes deployability — today every URL except `/` 404s on a static host. Tasks 2–3 build a `ContentStore` with two adapters: development writes straight to disk through a Vite dev-server middleware, production commits to GitHub through the Git Data API. Tasks 4–8 build the admin UI on that interface, so the editor components never know which adapter is under them. Task 9 adds prerendering so each article ships as real HTML.

**Tech Stack:** Vite, React 19, React Router 7, TypeScript, Vitest + React Testing Library (jsdom), GitHub Git Data API, `react-dom/server`, jsdom (already a devDependency).

**Spec:** `docs/superpowers/specs/2026-09-06-react-portfolio-migration-design.md` (phases 3–4)

**Prior plan:** `docs/superpowers/plans/2026-09-06-react-portfolio-site.md` (phases 1–2, complete — 102 tests, merged to `main`)

**Stopping points:** After Task 1 the site is correctly deployed and every URL works. After Task 8 the owner can edit all content through forms. Task 9 is an SEO improvement on a already-working site. Each is a legitimate place to stop.

## Global Constraints

- Languages are exactly `en`, `tr`, `ar`. `en` is required on every localized value and is the per-key fallback for the other two.
- Fallback is **per key**, never whole-dictionary.
- `public/ds/industry.css` is never edited. CSS additions go in `public/ds/rtl.css`, appended.
- No physical auto margins for edge-pinning — `margin-inline-start` / `margin-inline-end` only. (`margin: 0 auto` for centering is fine.) `src/rtl.test.ts` fails the build on any violation under `src/`.
- Every `localStorage` access is wrapped in `try`/`catch` and returns a default on failure.
- `localStorage` keys are namespaced with the `portfolio:` prefix. Existing key: `portfolio:lang`. This plan adds `portfolio:ghToken`.
- No `MutationObserver`. React is the single writer of the DOM.
- Every form input is associated with its label by `for`/`id`.
- The repository is `bashar0101/my-blog`, default branch `main`.
- A GitHub token is a credential. It is never committed, never logged, never sent anywhere but `api.github.com`, and never included in a report or error message.
- The admin must not be indexable: `/admin` carries `robots: noindex` and is disallowed in `robots.txt`.
- Content writes are restricted to three prefixes: `src/content/`, `content/articles/`, `public/img/`. Nothing else is writable by any store.

---

### Task 1: Make the site deployable

Today `npm run build` produces a `dist/` whose only working URL is `/`. A static host serves `dist/index.html` at the root and 404s everything else, so `/en`, `/en/projects` and every article link — the shareable URLs the whole routing design exists to produce — fail on a cold load or refresh. `npm run preview` hides this completely, because Vite's preview server enables SPA fallback by default.

**Files:**
- Create: `vercel.json`, `public/robots.txt`
- Test: `src/deploy.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a `vercel.json` whose rewrite makes client routing work on a static host, and a `robots.txt` that disallows `/admin` before the admin exists.

- [ ] **Step 1: Write the failing test**

`src/deploy.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("vercel.json", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));

  it("rewrites unmatched paths to the SPA entry", () => {
    expect(config.rewrites).toHaveLength(1);
    expect(config.rewrites[0].destination).toBe("/index.html");
  });

  it("does not swallow requests for real files", () => {
    // A rewrite that catches everything would serve index.html for
    // /cv-en.pdf and /img/portrait.jpg, so a missing asset would download
    // an HTML page under the asset's name instead of returning 404.
    const source = new RegExp(config.rewrites[0].source);
    expect(source.test("/en/projects")).toBe(true);
    expect(source.test("/en/articles/2026-01-15-example-article")).toBe(true);
    expect(source.test("/cv-en.pdf")).toBe(false);
    expect(source.test("/img/portrait.jpg")).toBe(false);
    expect(source.test("/ds/industry.css")).toBe(false);
    expect(source.test("/assets/index-abc123.js")).toBe(false);
  });

  it("declares the build output directory", () => {
    expect(config.outputDirectory).toBe("dist");
  });
});

describe("robots.txt", () => {
  const robots = readFileSync("public/robots.txt", "utf8");

  it("disallows the admin route", () => {
    expect(robots).toMatch(/Disallow:\s*\/admin/);
  });

  it("allows everything else", () => {
    expect(robots).toMatch(/User-agent:\s*\*/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/deploy.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open 'vercel.json'`.

- [ ] **Step 3: Write the config**

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/((?!assets/|img/|ds/|.*\\..*).*)",
      "destination": "/index.html"
    }
  ]
}
```

The negative lookahead is what stops the rewrite from swallowing real files: anything under `assets/`, `img/` or `ds/`, and anything containing a dot (so every file with an extension), falls through to normal static serving and returns a genuine 404 when absent.

`public/robots.txt`:

```
User-agent: *
Disallow: /admin
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/deploy.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Verify the built output serves correctly**

Run `npm run build`, then serve `dist/` with a server that has **no** SPA fallback, so you are testing the config rather than a dev convenience:

```bash
npx --yes serve@14 dist --no-clipboard --single=false
```

Visit `/en`, `/en/projects`, `/en/articles/2026-01-15-example-article` directly. Without `vercel.json` these 404 — that server does not read it, which is the point: confirm the 404s, then rely on the test above for the config itself and on the real deploy for the end-to-end behaviour. Report what you saw.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test` — expected PASS.
Run: `npm run build` — expected exit 0.

- [ ] **Step 7: Commit**

```bash
git add vercel.json public/robots.txt src/deploy.test.ts
git commit -m "fix: add SPA rewrite so every route works on a static host"
```

---

### Task 2: `ContentStore` interface, path guard, and the development store

**Files:**
- Create: `src/lib/store/types.ts`, `src/lib/store/paths.ts`, `src/lib/store/LocalFsStore.ts`, `vite-plugin-admin-write.ts`
- Modify: `vite.config.ts`
- Test: `src/lib/store/paths.test.ts`, `src/lib/store/LocalFsStore.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `src/lib/store/types.ts` — `StoredFile` (`{ path: string; content: string; encoding: "utf8" | "base64" }`), `ContentStore` (`{ write(files: StoredFile[], message: string): Promise<void> }`), and `class ConflictError extends Error`.
  - `src/lib/store/paths.ts` — `WRITABLE_PREFIXES: readonly string[]`, `isWritablePath(path: string): boolean`.
  - `src/lib/store/LocalFsStore.ts` — `class LocalFsStore implements ContentStore`.
  - `vite-plugin-admin-write.ts` — `adminWritePlugin(): Plugin`, registered only when `command === "serve"`.

- [ ] **Step 1: Write the failing path-guard test**

`src/lib/store/paths.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isWritablePath, WRITABLE_PREFIXES } from "./paths";

describe("WRITABLE_PREFIXES", () => {
  it("is exactly the three content locations", () => {
    expect(WRITABLE_PREFIXES).toEqual(["src/content/", "content/articles/", "public/img/"]);
  });
});

describe("isWritablePath", () => {
  it("accepts paths under each writable prefix", () => {
    expect(isWritablePath("src/content/profile.json")).toBe(true);
    expect(isWritablePath("content/articles/a-slug/meta.json")).toBe(true);
    expect(isWritablePath("content/articles/a-slug/en.md")).toBe(true);
    expect(isWritablePath("public/img/portrait.jpg")).toBe(true);
  });

  it("rejects paths outside them", () => {
    expect(isWritablePath("package.json")).toBe(false);
    expect(isWritablePath("src/App.tsx")).toBe(false);
    expect(isWritablePath("public/ds/industry.css")).toBe(false);
    expect(isWritablePath(".env")).toBe(false);
  });

  it("rejects traversal even when it starts inside a writable prefix", () => {
    expect(isWritablePath("src/content/../../package.json")).toBe(false);
    expect(isWritablePath("content/articles/../../.env")).toBe(false);
    expect(isWritablePath("public/img/../../../etc/passwd")).toBe(false);
  });

  it("rejects absolute paths", () => {
    expect(isWritablePath("/etc/passwd")).toBe(false);
    expect(isWritablePath("C:/Windows/system.ini")).toBe(false);
  });

  it("rejects backslash separators, which normalize differently across platforms", () => {
    expect(isWritablePath("src\\content\\profile.json")).toBe(false);
    expect(isWritablePath("src/content/..\\..\\package.json")).toBe(false);
  });

  it("rejects an empty path and a bare prefix", () => {
    expect(isWritablePath("")).toBe(false);
    expect(isWritablePath("src/content/")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/store/paths.test.ts`
Expected: FAIL — cannot resolve `./paths`.

- [ ] **Step 3: Implement the types and the guard**

`src/lib/store/types.ts`:

```ts
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
```

`src/lib/store/paths.ts`:

```ts
export const WRITABLE_PREFIXES = [
  "src/content/",
  "content/articles/",
  "public/img/",
] as const;

export function isWritablePath(path: string): boolean {
  if (!path) return false;
  // Backslashes normalize differently across platforms, so a path containing
  // one is rejected rather than guessed at.
  if (path.includes("\\")) return false;
  if (path.startsWith("/")) return false;
  if (/^[A-Za-z]:/.test(path)) return false;
  if (path.split("/").includes("..")) return false;

  return WRITABLE_PREFIXES.some(
    (prefix) => path.startsWith(prefix) && path.length > prefix.length
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/store/paths.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Write the failing store test**

`src/lib/store/LocalFsStore.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalFsStore } from "./LocalFsStore";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LocalFsStore", () => {
  it("posts the files to the dev-server write endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    await new LocalFsStore().write(
      [{ path: "src/content/profile.json", content: "{}", encoding: "utf8" }],
      "update profile"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/__admin/write");
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.message).toBe("update profile");
    expect(body.files).toEqual([
      { path: "src/content/profile.json", content: "{}", encoding: "utf8" },
    ]);
  });

  it("rejects a write outside the writable prefixes before any request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new LocalFsStore().write(
        [{ path: "package.json", content: "{}", encoding: "utf8" }],
        "nope"
      )
    ).rejects.toThrow(/not writable/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects the whole batch if any single path is disallowed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new LocalFsStore().write(
        [
          { path: "src/content/profile.json", content: "{}", encoding: "utf8" },
          { path: "../secrets", content: "x", encoding: "utf8" },
        ],
        "mixed"
      )
    ).rejects.toThrow(/not writable/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the server's message when the write fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "disk full" })
    );

    await expect(
      new LocalFsStore().write(
        [{ path: "src/content/profile.json", content: "{}", encoding: "utf8" }],
        "update"
      )
    ).rejects.toThrow(/disk full/);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/lib/store/LocalFsStore.test.ts`
Expected: FAIL — cannot resolve `./LocalFsStore`.

- [ ] **Step 7: Implement `LocalFsStore`**

`src/lib/store/LocalFsStore.ts`:

```ts
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
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run src/lib/store/LocalFsStore.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 9: Write the dev-server middleware**

`vite-plugin-admin-write.ts` at the repo root:

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";

const WRITABLE_PREFIXES = ["src/content/", "content/articles/", "public/img/"];

function isWritablePath(path: string): boolean {
  if (!path) return false;
  if (path.includes("\\")) return false;
  if (path.startsWith("/")) return false;
  if (/^[A-Za-z]:/.test(path)) return false;
  if (path.split("/").includes("..")) return false;
  return WRITABLE_PREFIXES.some((p) => path.startsWith(p) && path.length > p.length);
}

/**
 * Serves POST /__admin/write during `vite` only. It is registered with
 * apply: "serve", so it cannot exist in a production build — there is no
 * code path that ships this endpoint.
 */
export function adminWritePlugin(): Plugin {
  return {
    name: "admin-write",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__admin/write", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }

        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", () => {
          try {
            const { files } = JSON.parse(raw) as {
              files: { path: string; content: string; encoding: "utf8" | "base64" }[];
            };

            const root = server.config.root;
            for (const file of files) {
              if (!isWritablePath(file.path)) {
                res.statusCode = 403;
                res.end(`Path is not writable: ${file.path}`);
                return;
              }
              // Resolve and re-check: a path that passes the string guard but
              // escapes the root once resolved is rejected here.
              const target = resolve(root, file.path);
              if (!target.startsWith(resolve(root) + require("node:path").sep)) {
                res.statusCode = 403;
                res.end(`Path escapes the project root: ${file.path}`);
                return;
              }
              mkdirSync(dirname(target), { recursive: true });
              writeFileSync(
                target,
                file.encoding === "base64"
                  ? Buffer.from(file.content, "base64")
                  : file.content,
                file.encoding === "base64" ? undefined : "utf8"
              );
            }

            res.statusCode = 200;
            res.end("ok");
          } catch (cause) {
            res.statusCode = 500;
            res.end(cause instanceof Error ? cause.message : "Write failed");
          }
        });
      });
    },
  };
}
```

Replace the `require("node:path").sep` call with a top-level import — add `sep` to the existing `node:path` import so the file uses ESM throughout:

```ts
import { dirname, resolve, sep } from "node:path";
```

and use `resolve(root) + sep` in the check.

- [ ] **Step 10: Register the plugin**

In `vite.config.ts`, import and add it. The `test` block stays exactly as it is:

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { adminWritePlugin } from "./vite-plugin-admin-write";

export default defineConfig({
  plugins: [react(), adminWritePlugin()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 11: Verify the middleware writes, and refuses to escape**

Start `npm run dev`, then from another shell:

```bash
curl -s -X POST http://localhost:5173/__admin/write \
  -H 'Content-Type: application/json' \
  -d '{"message":"probe","files":[{"path":"src/content/__probe.json","content":"{\"ok\":true}","encoding":"utf8"}]}'
```

Expected `ok`, and `src/content/__probe.json` exists. Delete it. Then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:5173/__admin/write \
  -H 'Content-Type: application/json' \
  -d '{"message":"probe","files":[{"path":"package.json","content":"x","encoding":"utf8"}]}'
```

Expected `403`, and `package.json` unchanged (`git status` clean). Report both results.

- [ ] **Step 12: Run the full suite and build**

Run: `npm test` and `npm run build` — both expected to pass. Confirm `git status` is clean apart from the new files (the probe file must be gone).

- [ ] **Step 13: Commit**

```bash
git add src/lib/store vite-plugin-admin-write.ts vite.config.ts
git commit -m "feat: content store interface, path guard, and dev filesystem store"
```

---

### Task 3: `GitHubStore` — the production adapter

Saves from the deployed admin become one commit on `main`, which triggers a Vercel rebuild. Writing several files as one commit matters: an article's body, its metadata and its cover image must land together or not at all.

**Files:**
- Create: `src/lib/store/GitHubStore.ts`, `src/lib/store/index.ts`
- Test: `src/lib/store/GitHubStore.test.ts`

**Interfaces:**
- Consumes: `ContentStore`, `StoredFile`, `ConflictError` from `./types`; `isWritablePath` from `./paths`.
- Produces:
  - `class GitHubStore implements ContentStore` with constructor `(config: GitHubConfig)` where `GitHubConfig` is `{ owner: string; repo: string; branch: string; token: string }`, plus `async loadBaseSha(): Promise<string>`.
  - `src/lib/store/index.ts` — `createStore(token: string | null): ContentStore`, `githubConfigFromEnv(token: string): GitHubConfig`.

- [ ] **Step 1: Write the failing test**

`src/lib/store/GitHubStore.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubStore } from "./GitHubStore";
import { ConflictError } from "./types";

const config = { owner: "bashar0101", repo: "my-blog", branch: "main", token: "ghp_test" };

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
}

/** The six calls a successful write makes, in order. */
function happyPathFetch() {
  return vi
    .fn()
    // 1. read the branch ref
    .mockResolvedValueOnce(jsonResponse({ object: { sha: "head-sha" } }))
    // 2. read the head commit (for its tree)
    .mockResolvedValueOnce(jsonResponse({ tree: { sha: "base-tree-sha" } }))
    // 3. create the blob
    .mockResolvedValueOnce(jsonResponse({ sha: "blob-sha" }))
    // 4. create the tree
    .mockResolvedValueOnce(jsonResponse({ sha: "new-tree-sha" }))
    // 5. create the commit
    .mockResolvedValueOnce(jsonResponse({ sha: "new-commit-sha" }))
    // 6. move the ref
    .mockResolvedValueOnce(jsonResponse({}));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("GitHubStore.loadBaseSha", () => {
  it("returns the branch head sha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ object: { sha: "abc123" } })));
    expect(await new GitHubStore(config).loadBaseSha()).toBe("abc123");
  });
});

describe("GitHubStore.write", () => {
  it("creates blob, tree, commit, then moves the ref", async () => {
    const fetchMock = happyPathFetch();
    vi.stubGlobal("fetch", fetchMock);

    const store = new GitHubStore(config);
    await store.loadBaseSha();
    // loadBaseSha consumed call 1; re-arm so write() sees the full sequence.
    vi.stubGlobal("fetch", happyPathFetch());

    await new GitHubStore({ ...config }).write(
      [{ path: "src/content/profile.json", content: "{}", encoding: "utf8" }],
      "update profile"
    );

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(6);
    expect(calls[2]![0]).toContain("/git/blobs");
    expect(calls[3]![0]).toContain("/git/trees");
    expect(calls[4]![0]).toContain("/git/commits");
    expect(calls[5]![0]).toContain("/git/refs/heads/main");
    expect((calls[5]![1] as RequestInit).method).toBe("PATCH");
  });

  it("sends the token as a bearer credential and never in the URL", async () => {
    vi.stubGlobal("fetch", happyPathFetch());
    await new GitHubStore(config).write(
      [{ path: "src/content/profile.json", content: "{}", encoding: "utf8" }],
      "m"
    );
    for (const [url, init] of (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls) {
      expect(String(url)).not.toContain("ghp_test");
      expect((init as RequestInit).headers).toMatchObject({
        Authorization: "Bearer ghp_test",
      });
    }
  });

  it("base64-encodes utf8 content for the blob and marks the encoding", async () => {
    vi.stubGlobal("fetch", happyPathFetch());
    await new GitHubStore(config).write(
      [{ path: "src/content/profile.json", content: "hello", encoding: "utf8" }],
      "m"
    );
    const blobBody = JSON.parse(
      ((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[2]![1] as RequestInit)
        .body as string
    );
    expect(blobBody.encoding).toBe("base64");
    expect(atob(blobBody.content)).toBe("hello");
  });

  it("passes base64 content through unchanged", async () => {
    vi.stubGlobal("fetch", happyPathFetch());
    await new GitHubStore(config).write(
      [{ path: "public/img/x.png", content: "aGVsbG8=", encoding: "base64" }],
      "m"
    );
    const blobBody = JSON.parse(
      ((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[2]![1] as RequestInit)
        .body as string
    );
    expect(blobBody.content).toBe("aGVsbG8=");
  });

  it("refuses to write when the branch moved since loadBaseSha", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "sha-at-load" } }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "sha-moved" } }));
    vi.stubGlobal("fetch", fetchMock);

    const store = new GitHubStore(config);
    await store.loadBaseSha();

    await expect(
      store.write([{ path: "src/content/profile.json", content: "{}", encoding: "utf8" }], "m")
    ).rejects.toBeInstanceOf(ConflictError);

    // Nothing was created: only the two ref reads happened.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a path outside the writable prefixes before any request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new GitHubStore(config).write([{ path: ".env", content: "x", encoding: "utf8" }], "m")
    ).rejects.toThrow(/not writable/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces GitHub's error message without leaking the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: "Resource not accessible by personal access token" }),
        text: async () => "Resource not accessible by personal access token",
      })
    );
    await expect(
      new GitHubStore(config).write(
        [{ path: "src/content/profile.json", content: "{}", encoding: "utf8" }],
        "m"
      )
    ).rejects.toThrow(/not accessible by personal access token/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/store/GitHubStore.test.ts`
Expected: FAIL — cannot resolve `./GitHubStore`.

- [ ] **Step 3: Implement `GitHubStore`**

`src/lib/store/GitHubStore.ts`:

```ts
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/store/GitHubStore.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Add the store factory**

`src/lib/store/index.ts`:

```ts
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
```

- [ ] **Step 5b: Pin the memoization, because losing it silently disables conflict detection**

Append to `src/lib/store/GitHubStore.test.ts`:

```ts
import { createStore } from "./index";

describe("createStore", () => {
  it("returns the same instance for the same token", () => {
    // GitHubStore remembers the branch head it saw at load time. A fresh
    // instance per save would reset that memory, and every write would
    // pass the conflict check no matter who else had committed.
    expect(createStore("ghp_same")).toBe(createStore("ghp_same"));
  });
});
```

Run: `npx vitest run src/lib/store/GitHubStore.test.ts`
Expected: PASS — 9 tests. Then delete the `cached` short-circuit in `createStore`, re-run, and confirm this test **fails**; restore it. Report the failure output.

- [ ] **Step 6: Document the environment variables**

Append to `.env.example`:

```bash
# GitHub repository the deployed admin commits to. Defaults match this repo.
VITE_GITHUB_OWNER=bashar0101
VITE_GITHUB_REPO=my-blog
VITE_GITHUB_BRANCH=main
```

- [ ] **Step 7: Run the full suite and build**

Run: `npm test` and `npm run build` — both expected to pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/store .env.example
git commit -m "feat: GitHub content store with atomic commits and conflict detection"
```

---

### Task 4: Admin shell, token gate, and route

**Files:**
- Create: `src/lib/store/token.ts`, `src/routes/admin/AdminLayout.tsx`, `src/routes/admin/TokenGate.tsx`, `src/routes/admin/AdminHome.tsx`
- Modify: `src/App.tsx`, `public/ds/rtl.css`
- Test: `src/lib/store/token.test.ts`, `src/routes/admin/admin.test.tsx`

**Interfaces:**
- Consumes: `createStore`, `githubConfigFromEnv`, `GitHubStore` from `src/lib/store`.
- Produces:
  - `src/lib/store/token.ts` — `TOKEN_KEY` (`"portfolio:ghToken"`), `readToken(): string | null`, `storeToken(token: string): void`, `clearToken(): void`.
  - `src/routes/admin/AdminLayout.tsx` — default export, renders the admin chrome and an `<Outlet />`, gated by `TokenGate` in production.
  - `src/routes/admin/AdminHome.tsx` — default export, the section index.
  - Route `/admin` with nested `profile`, `projects`, `videos`, `articles`, `strings` (added by Tasks 5–7; the layout and index land here).

- [ ] **Step 1: Write the failing token test**

`src/lib/store/token.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToken, readToken, storeToken, TOKEN_KEY } from "./token";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("TOKEN_KEY", () => {
  it("is namespaced", () => {
    expect(TOKEN_KEY).toBe("portfolio:ghToken");
  });
});

describe("readToken", () => {
  it("returns a stored token", () => {
    localStorage.setItem(TOKEN_KEY, "ghp_abc");
    expect(readToken()).toBe("ghp_abc");
  });

  it("returns null when absent", () => {
    expect(readToken()).toBeNull();
  });

  it("returns null rather than throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readToken()).toBeNull();
  });
});

describe("storeToken", () => {
  it("persists the token", () => {
    storeToken("ghp_abc");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("ghp_abc");
  });

  it("swallows a storage failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => storeToken("ghp_abc")).not.toThrow();
  });
});

describe("clearToken", () => {
  it("removes the token", () => {
    storeToken("ghp_abc");
    clearToken();
    expect(readToken()).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/store/token.test.ts`
Expected: FAIL — cannot resolve `./token`.

- [ ] **Step 3: Implement token storage**

`src/lib/store/token.ts`:

```ts
export const TOKEN_KEY = "portfolio:ghToken";

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage denied. The token simply does not persist across reloads;
    // the current session still works.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do — the token was never persisted.
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/store/token.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Write the failing admin-route test**

`src/routes/admin/admin.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  localStorage.clear();
  document.head.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove());
});

describe("admin route", () => {
  it("renders the admin index at /admin", async () => {
    renderAt("/admin");
    expect(await screen.findByRole("heading", { name: /content admin/i })).toBeInTheDocument();
  });

  it("is not language-prefixed", async () => {
    renderAt("/admin");
    expect(await screen.findByRole("heading", { name: /content admin/i })).toBeInTheDocument();
    expect(screen.queryByTestId("not-found")).not.toBeInTheDocument();
  });

  it("marks itself noindex so it cannot be indexed", async () => {
    renderAt("/admin");
    await screen.findByRole("heading", { name: /content admin/i });
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots).not.toBeNull();
    expect(robots!.getAttribute("content")).toContain("noindex");
  });

  it("links to every editor section", async () => {
    renderAt("/admin");
    await screen.findByRole("heading", { name: /content admin/i });
    for (const name of [/profile/i, /projects/i, /videos/i, /articles/i, /interface strings/i]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("does not render the public site chrome", async () => {
    renderAt("/admin");
    await screen.findByRole("heading", { name: /content admin/i });
    // The public Nav renders a language switcher; the admin must not.
    expect(screen.queryByRole("link", { name: "TR" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/routes/admin/admin.test.tsx`
Expected: FAIL — `/admin` currently matches the catch-all and renders NotFound.

- [ ] **Step 7: Implement the token gate**

`src/routes/admin/TokenGate.tsx`:

```tsx
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { readToken, storeToken } from "../../lib/store/token";

/**
 * Production-only gate. The deployed admin commits to GitHub, which needs a
 * token; development writes to disk and needs none, so this renders nothing
 * in dev. This is a convenience gate, not a security boundary: the page is
 * public and the token is the only real credential.
 */
export default function TokenGate({ children }: { children: ReactNode }) {
  const inputId = useId();
  const [token, setToken] = useState(() => readToken());
  const [draft, setDraft] = useState("");

  if (import.meta.env.DEV || token) return <>{children}</>;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    storeToken(draft.trim());
    setToken(draft.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "60ch" }}
    >
      <div className="field">
        <label htmlFor={inputId}>GitHub personal access token</label>
        <input
          id={inputId}
          className="input"
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-700)" }}>
        Use a fine-grained token scoped to this repository only, with Contents set to Read
        and write. It is stored in this browser and sent only to api.github.com. Anyone with
        access to this browser profile can use it.
      </p>
      <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>
        Save token
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Implement the layout and index**

`src/routes/admin/AdminLayout.tsx`:

```tsx
import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import TokenGate from "./TokenGate";
import { primeStore } from "../../lib/store";
import { readToken } from "../../lib/store/token";

const SECTIONS = [
  { to: "/admin/profile", label: "Profile" },
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/videos", label: "Videos" },
  { to: "/admin/articles", label: "Articles" },
  { to: "/admin/strings", label: "Interface strings" },
] as const;

export default function AdminLayout() {
  useEffect(() => {
    // Record the branch head now, so a save later can detect that someone
    // else moved it. Failure here is not fatal: the save itself re-reads the
    // head and simply loses the "changed since you loaded" comparison.
    primeStore(readToken()).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <div
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
        minHeight: "100%",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-6)",
          padding: "var(--space-4) var(--space-8)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <Link
          to="/admin"
          style={{
            fontFamily: "var(--font-heading)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontSize: 18,
            color: "var(--color-text)",
          }}
        >
          Content admin
        </Link>
        <nav style={{ display: "flex", gap: "var(--space-4)", fontSize: 14 }}>
          {SECTIONS.map((section) => (
            <Link key={section.to} to={section.to}>
              {section.label}
            </Link>
          ))}
        </nav>
        <Link to="/en" style={{ marginInlineStart: "auto", fontSize: 14 }}>
          View site →
        </Link>
      </header>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-8)" }}>
        <TokenGate>
          <Outlet />
        </TokenGate>
      </main>
    </div>
  );
}
```

`src/routes/admin/AdminHome.tsx`:

```tsx
import { Link } from "react-router-dom";

const SECTIONS = [
  { to: "/admin/profile", label: "Profile", blurb: "Your name, bio, skills, socials and CV link." },
  { to: "/admin/projects", label: "Projects", blurb: "The project cards and which are featured." },
  { to: "/admin/videos", label: "Videos", blurb: "YouTube embeds and their captions." },
  { to: "/admin/articles", label: "Articles", blurb: "Write, edit and publish articles." },
  { to: "/admin/strings", label: "Interface strings", blurb: "Nav labels, headings and buttons." },
] as const;

export default function AdminHome() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Content admin</h1>
      <p style={{ margin: 0, color: "var(--color-neutral-700)" }}>
        {import.meta.env.DEV
          ? "Development mode: changes are written straight to your files."
          : "Changes are committed to GitHub and go live in about a minute."}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-3)" }}>
        {SECTIONS.map((section) => (
          <li key={section.to}>
            <Link to={section.to} style={{ fontSize: 18 }}>
              {section.label}
            </Link>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-700)" }}>
              {section.blurb}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 9: Wire the route**

In `src/App.tsx`, add the imports and the `/admin` route **above** the top-level catch-all so it is matched first:

Add `lazy` and `Suspense` to the React import at the top of the file (the file currently imports nothing from `react`, so this is a new line), and declare the two lazy components below the existing route imports:

```tsx
import { lazy, Suspense } from "react";
```

```tsx
const AdminLayout = lazy(() => import("./routes/admin/AdminLayout"));
const AdminHome = lazy(() => import("./routes/admin/AdminHome"));
```

and inside `<Routes>`, before the final catch-all:

```tsx
<Route
  path="/admin"
  element={
    <Suspense fallback={<p style={{ padding: "var(--space-8)" }}>Loading…</p>}>
      <AdminLayout />
    </Suspense>
  }
>
  <Route index element={<AdminHome />} />
</Route>
```

Lazy-loading keeps the admin out of the bundle every visitor downloads.

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx vitest run src/routes/admin/admin.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 11: Run the full suite and build**

Run: `npm test` and `npm run build` — both expected to pass. Confirm the build output shows the admin in a **separate chunk** from the main bundle.

- [ ] **Step 12: Commit**

```bash
git add src/routes/admin src/lib/store/token.ts src/lib/store/token.test.ts src/App.tsx
git commit -m "feat: admin shell, token gate, and lazy-loaded /admin route"
```

---

### Task 5: Localized field editor and the Profile screen

**Files:**
- Create: `src/components/admin/LocalizedField.tsx`, `src/components/admin/SaveBar.tsx`, `src/lib/admin/useContentDraft.ts`, `src/routes/admin/ProfileEditor.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/admin/LocalizedField.test.tsx`, `src/routes/admin/ProfileEditor.test.tsx`

**Interfaces:**
- Consumes: `LocalizedString`, `Profile` from `src/types`; `profile` from `src/lib/content`; `createStore` from `src/lib/store`.
- Produces:
  - `LocalizedField` — props `{ label: string; value: LocalizedString; onChange: (next: LocalizedString) => void; multiline?: boolean }`.
  - `SaveBar` — props `{ status: SaveStatus; error: string; onSave: () => void }` where `type SaveStatus = "idle" | "saving" | "saved" | "error"`.
  - `useContentDraft<T>(initial: T)` returning `{ draft, setDraft, status, error, save }` where `save(files, message)` takes `StoredFile[]`.

- [ ] **Step 1: Write the failing `LocalizedField` test**

`src/components/admin/LocalizedField.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LocalizedField from "./LocalizedField";

describe("LocalizedField", () => {
  it("shows the English value first", () => {
    render(
      <LocalizedField
        label="Headline"
        value={{ en: "Hello", tr: "Merhaba", ar: "مرحبا" }}
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText("Headline")).toHaveValue("Hello");
  });

  it("switches to another language without losing the others", async () => {
    render(
      <LocalizedField
        label="Headline"
        value={{ en: "Hello", tr: "Merhaba", ar: "مرحبا" }}
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("tab", { name: "TR" }));
    expect(screen.getByLabelText("Headline")).toHaveValue("Merhaba");
    await userEvent.click(screen.getByRole("tab", { name: "AR" }));
    expect(screen.getByLabelText("Headline")).toHaveValue("مرحبا");
  });

  it("reports an edit for the active language only", async () => {
    const onChange = vi.fn();
    render(
      <LocalizedField label="Headline" value={{ en: "Hello" }} onChange={onChange} />
    );
    await userEvent.type(screen.getByLabelText("Headline"), "!");
    expect(onChange).toHaveBeenLastCalledWith({ en: "Hello!" });
  });

  it("marks exactly one tab as selected", async () => {
    render(<LocalizedField label="Headline" value={{ en: "Hello" }} onChange={() => {}} />);
    const selected = screen.getAllByRole("tab").filter(
      (tab) => tab.getAttribute("aria-selected") === "true"
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("EN");
  });

  it("shows which languages are still empty", () => {
    render(<LocalizedField label="Headline" value={{ en: "Hello" }} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "TR" })).toHaveAttribute("data-empty", "true");
    expect(screen.getByRole("tab", { name: "EN" })).toHaveAttribute("data-empty", "false");
  });

  it("renders a textarea when multiline", () => {
    render(
      <LocalizedField label="About" value={{ en: "x" }} onChange={() => {}} multiline />
    );
    expect(screen.getByLabelText("About").tagName).toBe("TEXTAREA");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/admin/LocalizedField.test.tsx`
Expected: FAIL — cannot resolve `./LocalizedField`.

- [ ] **Step 3: Implement `LocalizedField`**

`src/components/admin/LocalizedField.tsx`:

```tsx
import { useId, useState } from "react";
import type { Lang, LocalizedString } from "../../types";
import { LANGS } from "../../lib/localize";

export default function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: LocalizedString;
  onChange: (next: LocalizedString) => void;
  multiline?: boolean;
}) {
  const inputId = useId();
  const [active, setActive] = useState<Lang>("en");

  const current = value[active] ?? "";

  function update(next: string) {
    onChange({ ...value, [active]: next });
  }

  return (
    <div className="field" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <label htmlFor={inputId}>{label}</label>
      <div role="tablist" aria-label={`${label} language`} style={{ display: "flex", gap: "var(--space-2)" }}>
        {LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={lang === active}
            data-empty={String(!value[lang])}
            onClick={() => setActive(lang)}
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "2px 8px" }}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
      {multiline ? (
        <textarea
          id={inputId}
          className="input"
          rows={5}
          value={current}
          dir={active === "ar" ? "rtl" : "ltr"}
          onChange={(event) => update(event.target.value)}
        />
      ) : (
        <input
          id={inputId}
          className="input"
          value={current}
          dir={active === "ar" ? "rtl" : "ltr"}
          onChange={(event) => update(event.target.value)}
        />
      )}
    </div>
  );
}
```

Append to `public/ds/rtl.css` so empty translations are visible at a glance:

```css
/* Admin: a language tab whose translation is still empty. */
[role="tab"][data-empty="true"] {
  opacity: 0.55;
}
[role="tab"][aria-selected="true"] {
  border-color: var(--color-accent-700);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/components/admin/LocalizedField.test.tsx`
Expected: PASS — 6 tests.

- [ ] **Step 5: Implement the draft hook and save bar**

`src/lib/admin/useContentDraft.ts`:

```ts
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
```

`src/components/admin/SaveBar.tsx`:

```tsx
import type { SaveStatus } from "../../lib/admin/useContentDraft";

export default function SaveBar({
  status,
  error,
  onSave,
}: {
  status: SaveStatus;
  error: string;
  onSave: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        borderTop: "1px solid var(--color-divider)",
        paddingTop: "var(--space-4)",
        marginTop: "var(--space-6)",
      }}
    >
      <button
        className="btn btn-primary"
        type="button"
        onClick={onSave}
        disabled={status === "saving"}
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      {status === "saved" && (
        <p role="status" style={{ margin: 0, fontSize: 14 }}>
          {import.meta.env.DEV ? "Written to your files." : "Committed. Live in about a minute."}
        </p>
      )}
      {status === "error" && (
        <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write the failing Profile editor test**

`src/routes/admin/ProfileEditor.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

function renderAdmin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProfileEditor", () => {
  it("loads the current profile into the form", async () => {
    renderAdmin("/admin/profile");
    expect(await screen.findByLabelText("Headline")).toHaveValue("Your name goes here");
    expect(screen.getByLabelText("Email")).toHaveValue("your.email@example.com");
  });

  it("writes the edited profile to src/content/profile.json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin("/admin/profile");
    const headline = await screen.findByLabelText("Headline");
    await userEvent.clear(headline);
    await userEvent.type(headline, "Bashar Khoujah");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.files).toHaveLength(1);
    expect(body.files[0].path).toBe("src/content/profile.json");
    const written = JSON.parse(body.files[0].content);
    expect(written.headline.en).toBe("Bashar Khoujah");
    // Everything else survives the round trip.
    expect(written.email).toBe("your.email@example.com");
    expect(written.skills).toHaveLength(3);
  });

  it("reports a failed save without losing the edit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "disk full" })
    );

    renderAdmin("/admin/profile");
    const headline = await screen.findByLabelText("Headline");
    await userEvent.clear(headline);
    await userEvent.type(headline, "Bashar");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/disk full/);
    expect(screen.getByLabelText("Headline")).toHaveValue("Bashar");
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run src/routes/admin/ProfileEditor.test.tsx`
Expected: FAIL — `/admin/profile` has no route.

- [ ] **Step 8: Implement the Profile editor**

`src/routes/admin/ProfileEditor.tsx`:

```tsx
import type { Profile } from "../../types";
import { profile as currentProfile } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";

export default function ProfileEditor() {
  const { draft, setDraft, status, error, save } = useContentDraft<Profile>(currentProfile);

  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Profile</h1>

      <LocalizedField label="Name" value={draft.name} onChange={(v) => field("name", v)} />
      <LocalizedField label="Kicker" value={draft.kicker} onChange={(v) => field("kicker", v)} />
      <LocalizedField label="Headline" value={draft.headline} onChange={(v) => field("headline", v)} />
      <LocalizedField label="Intro" value={draft.intro} onChange={(v) => field("intro", v)} multiline />
      <LocalizedField label="About" value={draft.about} onChange={(v) => field("about", v)} multiline />
      <LocalizedField label="CV link" value={draft.cv} onChange={(v) => field("cv", v)} />

      <div className="field">
        <label htmlFor="profile-email">Email</label>
        <input
          id="profile-email"
          className="input"
          type="email"
          value={draft.email}
          onChange={(event) => field("email", event.target.value)}
        />
      </div>

      <fieldset style={{ border: "1px solid var(--color-divider)", padding: "var(--space-4)" }}>
        <legend>Social links</legend>
        {draft.socials.map((social, index) => (
          <div key={index} style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor={`social-label-${index}`}>Label</label>
              <input
                id={`social-label-${index}`}
                className="input"
                value={social.label}
                onChange={(event) => {
                  const socials = [...draft.socials];
                  socials[index] = { ...social, label: event.target.value };
                  field("socials", socials);
                }}
              />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor={`social-url-${index}`}>URL</label>
              <input
                id={`social-url-${index}`}
                className="input"
                value={social.url}
                onChange={(event) => {
                  const socials = [...draft.socials];
                  socials[index] = { ...social, url: event.target.value };
                  field("socials", socials);
                }}
              />
            </div>
          </div>
        ))}
      </fieldset>

      <SaveBar
        status={status}
        error={error}
        onSave={() =>
          save(
            [
              {
                path: "src/content/profile.json",
                content: JSON.stringify(draft, null, 2) + "\n",
                encoding: "utf8",
              },
            ],
            "content: update profile"
          )
        }
      />
    </div>
  );
}
```

- [ ] **Step 9: Wire the route**

In `src/App.tsx`, add the lazy import and the nested route inside `/admin`:

```tsx
const ProfileEditor = lazy(() => import("./routes/admin/ProfileEditor"));
```

```tsx
<Route path="profile" element={<ProfileEditor />} />
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx vitest run src/routes/admin/ProfileEditor.test.tsx src/components/admin/LocalizedField.test.tsx`
Expected: PASS — 9 tests.

- [ ] **Step 11: Run the full suite and build**

Run: `npm test` and `npm run build` — both expected to pass.

- [ ] **Step 12: Commit**

```bash
git add src/components/admin src/lib/admin src/routes/admin/ProfileEditor.tsx src/routes/admin/ProfileEditor.test.tsx src/App.tsx public/ds/rtl.css
git commit -m "feat: localized field editor and profile admin screen"
```

---

### Task 6: Projects, Videos and UI-strings screens

**Files:**
- Create: `src/routes/admin/ProjectsEditor.tsx`, `src/routes/admin/VideosEditor.tsx`, `src/routes/admin/StringsEditor.tsx`
- Modify: `src/App.tsx`
- Test: `src/routes/admin/ProjectsEditor.test.tsx`, `src/routes/admin/VideosEditor.test.tsx`, `src/routes/admin/StringsEditor.test.tsx`

**Interfaces:**
- Consumes: `LocalizedField`, `SaveBar`, `useContentDraft`; `allProjects`, `allVideos`, `ui` from `src/lib/content`; `Project`, `Video`, `UiDict` from `src/types`.
- Produces: three default-export route components. No new shared interfaces.

- [ ] **Step 1: Write the failing tests**

`src/routes/admin/ProjectsEditor.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { allProjects } from "../../lib/content";

function renderAdmin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProjectsEditor", () => {
  it("lists every project", async () => {
    renderAdmin("/admin/projects");
    await screen.findByRole("heading", { name: "Projects" });
    expect(screen.getAllByTestId("project-editor")).toHaveLength(allProjects().length);
  });

  it("adds a project with a unique id", async () => {
    renderAdmin("/admin/projects");
    await screen.findByRole("heading", { name: "Projects" });
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    expect(screen.getAllByTestId("project-editor")).toHaveLength(allProjects().length + 1);
  });

  it("removes a project", async () => {
    renderAdmin("/admin/projects");
    await screen.findByRole("heading", { name: "Projects" });
    await userEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]!);
    expect(screen.getAllByTestId("project-editor")).toHaveLength(allProjects().length - 1);
  });

  it("writes the whole array to src/content/projects.json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin("/admin/projects");
    await screen.findByRole("heading", { name: "Projects" });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.files[0].path).toBe("src/content/projects.json");
    expect(JSON.parse(body.files[0].content)).toHaveLength(allProjects().length);
  });
});
```

`src/routes/admin/VideosEditor.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { allVideos } from "../../lib/content";

function renderAdmin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("VideosEditor", () => {
  it("lists every video", async () => {
    renderAdmin("/admin/videos");
    await screen.findByRole("heading", { name: "Videos" });
    expect(screen.getAllByTestId("video-editor")).toHaveLength(allVideos().length);
  });

  it("normalizes a pasted YouTube URL to a bare id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin("/admin/videos");
    await screen.findByRole("heading", { name: "Videos" });
    const idInput = screen.getAllByLabelText("YouTube video ID or URL")[0]!;
    await userEvent.clear(idInput);
    await userEvent.type(idInput, "https://www.youtube.com/watch?v=abc123XYZ_-");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(JSON.parse(body.files[0].content)[0].youtubeId).toBe("abc123XYZ_-");
  });

  it("normalizes a youtu.be short link", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin("/admin/videos");
    await screen.findByRole("heading", { name: "Videos" });
    const idInput = screen.getAllByLabelText("YouTube video ID or URL")[0]!;
    await userEvent.clear(idInput);
    await userEvent.type(idInput, "https://youtu.be/shortid1234");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(JSON.parse(body.files[0].content)[0].youtubeId).toBe("shortid1234");
  });
});
```

`src/routes/admin/StringsEditor.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { ui } from "../../lib/content";

function renderAdmin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("StringsEditor", () => {
  it("renders one editor per dictionary key", async () => {
    renderAdmin("/admin/strings");
    await screen.findByRole("heading", { name: "Interface strings" });
    expect(screen.getAllByTestId("string-editor")).toHaveLength(Object.keys(ui).length);
  });

  it("writes the dictionary back with every key intact", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin("/admin/strings");
    await screen.findByRole("heading", { name: "Interface strings" });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.files[0].path).toBe("src/content/ui.json");
    const written = JSON.parse(body.files[0].content);
    expect(Object.keys(written)).toHaveLength(Object.keys(ui).length);
    expect(written["nav.home"].tr).toBe("Ana Sayfa");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/routes/admin/ProjectsEditor.test.tsx src/routes/admin/VideosEditor.test.tsx src/routes/admin/StringsEditor.test.tsx`
Expected: FAIL — none of the three routes exist.

- [ ] **Step 3: Implement the Projects editor**

`src/routes/admin/ProjectsEditor.tsx`:

```tsx
import type { Project } from "../../types";
import { allProjects } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";

function blankProject(order: number): Project {
  return {
    id: `project-${Date.now()}`,
    title: { en: "New project" },
    kicker: { en: "" },
    summary: { en: "" },
    tags: [],
    image: { src: "/img/placeholder.jpg", alt: { en: "" } },
    url: null,
    featured: false,
    order,
  };
}

export default function ProjectsEditor() {
  const { draft, setDraft, status, error, save } = useContentDraft<Project[]>(allProjects());

  function update(index: number, next: Project) {
    const projects = [...draft];
    projects[index] = next;
    setDraft(projects);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Projects</h1>

      {draft.map((project, index) => (
        <fieldset
          key={project.id}
          data-testid="project-editor"
          style={{ border: "1px solid var(--color-divider)", padding: "var(--space-4)" }}
        >
          <legend>{project.title.en || project.id}</legend>
          <LocalizedField
            label={`Title ${index + 1}`}
            value={project.title}
            onChange={(title) => update(index, { ...project, title })}
          />
          <LocalizedField
            label={`Kicker ${index + 1}`}
            value={project.kicker}
            onChange={(kicker) => update(index, { ...project, kicker })}
          />
          <LocalizedField
            label={`Summary ${index + 1}`}
            value={project.summary}
            onChange={(summary) => update(index, { ...project, summary })}
            multiline
          />
          <div className="field">
            <label htmlFor={`project-url-${index}`}>Case-study URL (optional)</label>
            <input
              id={`project-url-${index}`}
              className="input"
              value={project.url ?? ""}
              onChange={(event) =>
                update(index, { ...project, url: event.target.value || null })
              }
            />
          </div>
          <div className="field">
            <label htmlFor={`project-image-${index}`}>Image path</label>
            <input
              id={`project-image-${index}`}
              className="input"
              value={project.image.src}
              onChange={(event) =>
                update(index, { ...project, image: { ...project.image, src: event.target.value } })
              }
            />
          </div>
          <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={project.featured}
              onChange={(event) => update(index, { ...project, featured: event.target.checked })}
            />
            Featured on the home page
          </label>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setDraft(draft.filter((_, i) => i !== index))}
            style={{ marginTop: "var(--space-3)" }}
          >
            Remove project {index + 1}
          </button>
        </fieldset>
      ))}

      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => setDraft([...draft, blankProject(draft.length + 1)])}
        style={{ alignSelf: "flex-start" }}
      >
        Add project
      </button>

      <SaveBar
        status={status}
        error={error}
        onSave={() =>
          save(
            [
              {
                path: "src/content/projects.json",
                content: JSON.stringify(draft, null, 2) + "\n",
                encoding: "utf8",
              },
            ],
            "content: update projects"
          )
        }
      />
    </div>
  );
}
```

- [ ] **Step 4: Implement the Videos editor**

`src/routes/admin/VideosEditor.tsx`:

```tsx
import type { Video } from "../../types";
import { allVideos } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";

/**
 * Accepts a bare id or any common YouTube URL and returns the id. The
 * component builds the embed URL, so storing a full URL would produce a
 * broken iframe src.
 */
export function normalizeYouTubeId(input: string): string {
  const trimmed = input.trim();
  const watch = /[?&]v=([A-Za-z0-9_-]+)/.exec(trimmed);
  if (watch) return watch[1]!;
  const short = /youtu\.be\/([A-Za-z0-9_-]+)/.exec(trimmed);
  if (short) return short[1]!;
  const embed = /\/embed\/([A-Za-z0-9_-]+)/.exec(trimmed);
  if (embed) return embed[1]!;
  return trimmed;
}

function blankVideo(order: number): Video {
  return {
    id: `video-${Date.now()}`,
    title: { en: "New video" },
    youtubeId: "",
    description: { en: "" },
    featured: false,
    order,
  };
}

export default function VideosEditor() {
  const { draft, setDraft, status, error, save } = useContentDraft<Video[]>(allVideos());

  function update(index: number, next: Video) {
    const videos = [...draft];
    videos[index] = next;
    setDraft(videos);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Videos</h1>

      {draft.map((video, index) => (
        <fieldset
          key={video.id}
          data-testid="video-editor"
          style={{ border: "1px solid var(--color-divider)", padding: "var(--space-4)" }}
        >
          <legend>{video.title.en || video.id}</legend>
          <LocalizedField
            label={`Video title ${index + 1}`}
            value={video.title}
            onChange={(title) => update(index, { ...video, title })}
          />
          <LocalizedField
            label={`Video description ${index + 1}`}
            value={video.description ?? { en: "" }}
            onChange={(description) => update(index, { ...video, description })}
            multiline
          />
          <div className="field">
            <label htmlFor={`video-id-${index}`}>YouTube video ID or URL</label>
            <input
              id={`video-id-${index}`}
              className="input"
              value={video.youtubeId}
              onChange={(event) => update(index, { ...video, youtubeId: event.target.value })}
            />
          </div>
          <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={video.featured}
              onChange={(event) => update(index, { ...video, featured: event.target.checked })}
            />
            Featured on the home page
          </label>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setDraft(draft.filter((_, i) => i !== index))}
            style={{ marginTop: "var(--space-3)" }}
          >
            Remove video {index + 1}
          </button>
        </fieldset>
      ))}

      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => setDraft([...draft, blankVideo(draft.length + 1)])}
        style={{ alignSelf: "flex-start" }}
      >
        Add video
      </button>

      <SaveBar
        status={status}
        error={error}
        onSave={() =>
          save(
            [
              {
                path: "src/content/videos.json",
                content:
                  JSON.stringify(
                    draft.map((video) => ({
                      ...video,
                      youtubeId: normalizeYouTubeId(video.youtubeId),
                    })),
                    null,
                    2
                  ) + "\n",
                encoding: "utf8",
              },
            ],
            "content: update videos"
          )
        }
      />
    </div>
  );
}
```

- [ ] **Step 5: Implement the Strings editor**

`src/routes/admin/StringsEditor.tsx`:

```tsx
import type { UiDict } from "../../types";
import { ui as currentUi } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";

export default function StringsEditor() {
  const { draft, setDraft, status, error, save } = useContentDraft<UiDict>(currentUi);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Interface strings</h1>
      <p style={{ margin: 0, color: "var(--color-neutral-700)" }}>
        Navigation labels, section headings and button text. Every key needs all three
        languages — a missing one falls back to English.
      </p>

      {Object.keys(draft).map((key) => (
        <div key={key} data-testid="string-editor">
          <LocalizedField
            label={key}
            value={draft[key]!}
            onChange={(value) => setDraft({ ...draft, [key]: value })}
          />
        </div>
      ))}

      <SaveBar
        status={status}
        error={error}
        onSave={() =>
          save(
            [
              {
                path: "src/content/ui.json",
                content: JSON.stringify(draft, null, 2) + "\n",
                encoding: "utf8",
              },
            ],
            "content: update interface strings"
          )
        }
      />
    </div>
  );
}
```

- [ ] **Step 6: Wire the three routes**

In `src/App.tsx`, add the lazy imports and nested routes:

```tsx
const ProjectsEditor = lazy(() => import("./routes/admin/ProjectsEditor"));
const VideosEditor = lazy(() => import("./routes/admin/VideosEditor"));
const StringsEditor = lazy(() => import("./routes/admin/StringsEditor"));
```

```tsx
<Route path="projects" element={<ProjectsEditor />} />
<Route path="videos" element={<VideosEditor />} />
<Route path="strings" element={<StringsEditor />} />
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/routes/admin`
Expected: PASS — 9 new tests across the three files.

- [ ] **Step 8: Run the full suite and build**

Run: `npm test` and `npm run build` — both expected to pass.

- [ ] **Step 9: Commit**

```bash
git add src/routes/admin src/App.tsx
git commit -m "feat: projects, videos and interface-strings admin screens"
```

---

### Task 7: Articles screen with Markdown editing

An article is a directory, not a single record: `meta.json` plus one Markdown file per language. Saving one writes several files, which is exactly what the store's multi-file interface exists for.

**Files:**
- Create: `src/lib/admin/articleFiles.ts`, `src/routes/admin/ArticlesEditor.tsx`
- Modify: `src/App.tsx`
- Test: `src/lib/admin/articleFiles.test.ts`, `src/routes/admin/ArticlesEditor.test.tsx`

**Interfaces:**
- Consumes: `Article`, `ArticleMeta`, `Lang` from `src/types`; `allArticles` from `src/lib/articles`; `renderMarkdown` from `src/lib/markdown`; `StoredFile` from `src/lib/store`.
- Produces: `src/lib/admin/articleFiles.ts` — `slugify(title: string, date: string): string`, `articleToFiles(article: Article): StoredFile[]`.

- [ ] **Step 1: Write the failing helper test**

`src/lib/admin/articleFiles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { articleToFiles, slugify } from "./articleFiles";
import type { Article } from "../../types";

describe("slugify", () => {
  it("prefixes the date and kebab-cases the title", () => {
    expect(slugify("My First Post", "2026-03-01")).toBe("2026-03-01-my-first-post");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("Spring Boot: testing, properly!", "2026-03-01")).toBe(
      "2026-03-01-spring-boot-testing-properly"
    );
  });

  it("transliterates nothing and drops non-latin characters rather than emitting them", () => {
    // Slugs land in URLs and on disk; keeping them ASCII avoids encoding
    // surprises across GitHub, Vercel and Windows checkouts.
    expect(slugify("مقالة", "2026-03-01")).toBe("2026-03-01-article");
  });

  it("never emits a leading or trailing dash", () => {
    expect(slugify("  spaced  ", "2026-03-01")).toBe("2026-03-01-spaced");
  });
});

const article: Article = {
  slug: "2026-03-01-example",
  date: "2026-03-01",
  topic: { en: "Backend" },
  title: { en: "Example" },
  standfirst: { en: "A summary." },
  readingMinutes: 4,
  tags: [{ label: "Java", tone: "neutral" }],
  cover: null,
  featured: false,
  published: true,
  bodies: { en: "# Hello", tr: "# Merhaba" },
};

describe("articleToFiles", () => {
  it("writes meta.json plus one file per non-empty body", () => {
    const files = articleToFiles(article);
    expect(files.map((f) => f.path)).toEqual([
      "content/articles/2026-03-01-example/meta.json",
      "content/articles/2026-03-01-example/en.md",
      "content/articles/2026-03-01-example/tr.md",
    ]);
  });

  it("omits bodies that are empty rather than writing empty files", () => {
    const files = articleToFiles({ ...article, bodies: { en: "# Hello", ar: "   " } });
    expect(files.map((f) => f.path)).not.toContain(
      "content/articles/2026-03-01-example/ar.md"
    );
  });

  it("does not put bodies inside meta.json", () => {
    const meta = JSON.parse(articleToFiles(article)[0]!.content);
    expect(meta.bodies).toBeUndefined();
    expect(meta.title.en).toBe("Example");
    expect(meta.published).toBe(true);
  });

  it("writes every file as utf8", () => {
    expect(articleToFiles(article).every((f) => f.encoding === "utf8")).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/admin/articleFiles.test.ts`
Expected: FAIL — cannot resolve `./articleFiles`.

- [ ] **Step 3: Implement the helper**

`src/lib/admin/articleFiles.ts`:

```ts
import type { Article, Lang } from "../../types";
import type { StoredFile } from "../store";

const LANGS: Lang[] = ["en", "tr", "ar"];

export function slugify(title: string, date: string): string {
  const body = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${date}-${body || "article"}`;
}

export function articleToFiles(article: Article): StoredFile[] {
  const { bodies, ...meta } = article;
  const dir = `content/articles/${article.slug}`;

  const files: StoredFile[] = [
    {
      path: `${dir}/meta.json`,
      content: JSON.stringify(meta, null, 2) + "\n",
      encoding: "utf8",
    },
  ];

  for (const lang of LANGS) {
    const body = bodies[lang];
    if (body && body.trim()) {
      files.push({ path: `${dir}/${lang}.md`, content: body, encoding: "utf8" });
    }
  }

  return files;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/admin/articleFiles.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Write the failing editor test**

`src/routes/admin/ArticlesEditor.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { allArticles } from "../../lib/articles";

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={["/admin/articles"]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ArticlesEditor", () => {
  it("lists every published article", async () => {
    renderAdmin();
    await screen.findByRole("heading", { name: "Articles" });
    expect(screen.getAllByTestId("article-row-admin")).toHaveLength(allArticles().length);
  });

  it("opens an article for editing", async () => {
    renderAdmin();
    await screen.findByRole("heading", { name: "Articles" });
    await userEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]!);
    expect(screen.getByLabelText("Title")).toHaveValue("Article title goes here");
  });

  it("saves meta.json and the English body together", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin();
    await screen.findByRole("heading", { name: "Articles" });
    await userEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]!);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    const paths = body.files.map((f: { path: string }) => f.path);
    expect(paths).toContain("content/articles/2026-01-15-example-article/meta.json");
    expect(paths).toContain("content/articles/2026-01-15-example-article/en.md");
  });

  it("shows a live preview of the Markdown body", async () => {
    renderAdmin();
    await screen.findByRole("heading", { name: "Articles" });
    await userEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]!);
    const preview = screen.getByTestId("markdown-preview");
    expect(preview.querySelector("h2")).not.toBeNull();
  });

  it("creates a new article with a date-prefixed slug", async () => {
    renderAdmin();
    await screen.findByRole("heading", { name: "Articles" });
    await userEvent.click(screen.getByRole("button", { name: /new article/i }));
    const slug = screen.getByLabelText("Slug");
    expect((slug as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}-/);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/routes/admin/ArticlesEditor.test.tsx`
Expected: FAIL — `/admin/articles` has no route.

- [ ] **Step 7: Implement the Articles editor**

`src/routes/admin/ArticlesEditor.tsx`:

```tsx
import { useMemo, useState } from "react";
import type { Article, Lang } from "../../types";
import { allArticles } from "../../lib/articles";
import { renderMarkdown } from "../../lib/markdown";
import { LANGS } from "../../lib/localize";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";
import { articleToFiles, slugify } from "../../lib/admin/articleFiles";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function blankArticle(): Article {
  const date = today();
  return {
    slug: slugify("new article", date),
    date,
    topic: { en: "" },
    title: { en: "New article" },
    standfirst: { en: "" },
    readingMinutes: 5,
    tags: [],
    cover: null,
    featured: false,
    published: false,
    bodies: { en: "" },
  };
}

export default function ArticlesEditor() {
  const articles = useMemo(() => allArticles(), []);
  const [editing, setEditing] = useState<Article | null>(null);

  if (!editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h1 style={{ margin: 0, fontSize: 32 }}>Articles</h1>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setEditing(blankArticle())}
          style={{ alignSelf: "flex-start" }}
        >
          New article
        </button>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-3)" }}>
          {articles.map((article) => (
            <li
              key={article.slug}
              data-testid="article-row-admin"
              style={{ display: "flex", gap: "var(--space-4)", alignItems: "baseline" }}
            >
              <span style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>{article.date}</span>
              <span style={{ flex: 1 }}>{article.title.en}</span>
              <button className="btn btn-secondary" type="button" onClick={() => setEditing(article)}>
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <ArticleForm article={editing} onClose={() => setEditing(null)} />;
}

function ArticleForm({ article, onClose }: { article: Article; onClose: () => void }) {
  const { draft, setDraft, status, error, save } = useContentDraft<Article>(article);
  const [bodyLang, setBodyLang] = useState<Lang>("en");

  const body = draft.bodies[bodyLang] ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)" }}>
        <h1 style={{ margin: 0, fontSize: 32 }}>Edit article</h1>
        <button className="btn btn-secondary" type="button" onClick={onClose} style={{ marginInlineStart: "auto" }}>
          Back to list
        </button>
      </div>

      <div className="field">
        <label htmlFor="article-slug">Slug</label>
        <input
          id="article-slug"
          className="input"
          value={draft.slug}
          onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="article-date">Date</label>
        <input
          id="article-date"
          className="input"
          type="date"
          value={draft.date}
          onChange={(event) => setDraft({ ...draft, date: event.target.value })}
        />
      </div>

      <LocalizedField label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
      <LocalizedField label="Topic" value={draft.topic} onChange={(topic) => setDraft({ ...draft, topic })} />
      <LocalizedField
        label="Standfirst"
        value={draft.standfirst}
        onChange={(standfirst) => setDraft({ ...draft, standfirst })}
        multiline
      />

      <div className="field">
        <label htmlFor="article-minutes">Reading minutes</label>
        <input
          id="article-minutes"
          className="input"
          type="number"
          min={1}
          value={draft.readingMinutes}
          onChange={(event) =>
            setDraft({ ...draft, readingMinutes: Number(event.target.value) || 1 })
          }
        />
      </div>

      <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(event) => setDraft({ ...draft, published: event.target.checked })}
        />
        Published (unpublished articles are excluded from the build)
      </label>

      <div role="tablist" aria-label="Body language" style={{ display: "flex", gap: "var(--space-2)" }}>
        {LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={lang === bodyLang}
            data-empty={String(!draft.bodies[lang])}
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "2px 8px" }}
            onClick={() => setBodyLang(lang)}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        <div className="field">
          <label htmlFor="article-body">Body (Markdown)</label>
          <textarea
            id="article-body"
            className="input"
            rows={20}
            value={body}
            dir={bodyLang === "ar" ? "rtl" : "ltr"}
            onChange={(event) =>
              setDraft({ ...draft, bodies: { ...draft.bodies, [bodyLang]: event.target.value } })
            }
          />
        </div>
        <div
          data-testid="markdown-preview"
          className="article-body"
          style={{ border: "1px solid var(--color-divider)", padding: "var(--space-4)", overflow: "auto" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
        />
      </div>

      <SaveBar
        status={status}
        error={error}
        onSave={() => save(articleToFiles(draft), `content: update article ${draft.slug}`)}
      />
    </div>
  );
}
```

The preview uses the same `renderMarkdown` the site uses, so what the editor previews is exactly what the page will sanitize and render — no second Markdown path to drift.

- [ ] **Step 8: Wire the route**

In `src/App.tsx`:

```tsx
const ArticlesEditor = lazy(() => import("./routes/admin/ArticlesEditor"));
```

```tsx
<Route path="articles" element={<ArticlesEditor />} />
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run src/routes/admin/ArticlesEditor.test.tsx src/lib/admin/articleFiles.test.ts`
Expected: PASS — 13 tests.

- [ ] **Step 10: Run the full suite and build**

Run: `npm test` and `npm run build` — both expected to pass.

- [ ] **Step 11: Commit**

```bash
git add src/lib/admin src/routes/admin/ArticlesEditor.tsx src/routes/admin/ArticlesEditor.test.tsx src/App.tsx
git commit -m "feat: article admin with per-language Markdown editing and live preview"
```

---

### Task 8: Image upload

**Files:**
- Create: `src/components/admin/ImageUpload.tsx`, `src/lib/admin/readFileAsBase64.ts`
- Modify: `src/routes/admin/ProfileEditor.tsx`, `src/routes/admin/ProjectsEditor.tsx`
- Test: `src/lib/admin/readFileAsBase64.test.ts`, `src/components/admin/ImageUpload.test.tsx`

**Interfaces:**
- Consumes: `StoredFile` from `src/lib/store`.
- Produces:
  - `readFileAsBase64(file: File): Promise<string>` — base64 payload without the data-URL prefix.
  - `ImageUpload` — props `{ label: string; value: string; onChange: (path: string, file: StoredFile | null) => void }`. Reports both the public path to store on the record and the `StoredFile` to include in the save.

- [ ] **Step 1: Write the failing tests**

`src/lib/admin/readFileAsBase64.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileAsBase64 } from "./readFileAsBase64";

describe("readFileAsBase64", () => {
  it("returns the payload without the data-URL prefix", async () => {
    const file = new File(["hello"], "x.txt", { type: "text/plain" });
    const encoded = await readFileAsBase64(file);
    expect(encoded).not.toContain("base64,");
    expect(atob(encoded)).toBe("hello");
  });

  it("handles binary content", async () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
    const file = new File([bytes], "x.bin", { type: "application/octet-stream" });
    const encoded = await readFileAsBase64(file);
    const decoded = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    expect(Array.from(decoded)).toEqual([0, 1, 2, 253, 254, 255]);
  });
});
```

`src/components/admin/ImageUpload.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ImageUpload from "./ImageUpload";

describe("ImageUpload", () => {
  it("shows the current path", () => {
    render(<ImageUpload label="Portrait" value="/img/portrait.jpg" onChange={() => {}} />);
    expect(screen.getByLabelText("Portrait path")).toHaveValue("/img/portrait.jpg");
  });

  it("reports a public path and a writable file when one is chosen", async () => {
    const onChange = vi.fn();
    render(<ImageUpload label="Portrait" value="" onChange={onChange} />);

    const file = new File(["binary"], "My Photo.JPG", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Upload Portrait"), file);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const [path, stored] = onChange.mock.calls.at(-1)!;
    expect(path).toBe("/img/my-photo.jpg");
    expect(stored.path).toBe("public/img/my-photo.jpg");
    expect(stored.encoding).toBe("base64");
  });

  it("lets the path be typed directly, reporting no file to write", async () => {
    const onChange = vi.fn();
    render(<ImageUpload label="Portrait" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Portrait path"), "/img/existing.png");
    expect(onChange).toHaveBeenLastCalledWith("/img/existing.png", null);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/admin/readFileAsBase64.test.ts src/components/admin/ImageUpload.test.tsx`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Implement the reader**

`src/lib/admin/readFileAsBase64.ts`:

```ts
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 4: Implement `ImageUpload`**

`src/components/admin/ImageUpload.tsx`:

```tsx
import { useId, useState } from "react";
import type { StoredFile } from "../../lib/store";
import { readFileAsBase64 } from "../../lib/admin/readFileAsBase64";

/** Filenames land in URLs and on disk, so they are normalized to lowercase ASCII. */
export function safeImageName(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = (dot === -1 ? name : name.slice(0, dot))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const ext = (dot === -1 ? "" : name.slice(dot + 1)).toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext ? `${stem || "image"}.${ext}` : stem || "image";
}

export default function ImageUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (path: string, file: StoredFile | null) => void;
}) {
  const pathId = useId();
  const fileId = useId();
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const name = safeImageName(file.name);
      const content = await readFileAsBase64(file);
      onChange(`/img/${name}`, {
        path: `public/img/${name}`,
        content,
        encoding: "base64",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div className="field">
        <label htmlFor={pathId}>{label} path</label>
        <input
          id={pathId}
          className="input"
          value={value}
          onChange={(event) => onChange(event.target.value, null)}
        />
      </div>
      <div className="field">
        <label htmlFor={fileId}>Upload {label}</label>
        <input
          id={fileId}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/admin/readFileAsBase64.test.ts src/components/admin/ImageUpload.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 6: Use it in the Profile editor**

In `src/routes/admin/ProfileEditor.tsx`, add these three imports:

```tsx
import { useState } from "react";
import type { StoredFile } from "../../lib/store";
import ImageUpload from "../../components/admin/ImageUpload";
```

Add near the top of the component:

```tsx
const [pendingImages, setPendingImages] = useState<StoredFile[]>([]);
```

Add the control after the CV field:

```tsx
<ImageUpload
  label="Portrait"
  value={draft.portrait.src}
  onChange={(src, file) => {
    field("portrait", { ...draft.portrait, src });
    if (file) setPendingImages((images) => [...images, file]);
  }}
/>
```

And change the `onSave` handler to send them alongside the JSON:

```tsx
onSave={() =>
  save(
    [
      {
        path: "src/content/profile.json",
        content: JSON.stringify(draft, null, 2) + "\n",
        encoding: "utf8",
      },
      ...pendingImages,
    ],
    "content: update profile"
  )
}
```

- [ ] **Step 7: Use it in the Projects editor**

Apply the same three changes in `src/routes/admin/ProjectsEditor.tsx`: the `pendingImages` state, an `ImageUpload` replacing the plain image-path input inside each project fieldset, and `...pendingImages` appended to the `save` file list. The per-project control:

```tsx
<ImageUpload
  label={`Project ${index + 1} image`}
  value={project.image.src}
  onChange={(src, file) => {
    update(index, { ...project, image: { ...project.image, src } });
    if (file) setPendingImages((images) => [...images, file]);
  }}
/>
```

- [ ] **Step 8: Run the full suite and build**

Run: `npm test` and `npm run build` — both expected to pass.

- [ ] **Step 9: Verify an upload end to end**

With `npm run dev` running, open `/admin/profile`, choose a small image for the portrait, and save. Confirm the file appears at `public/img/<name>` on disk and that `src/content/profile.json` now points at `/img/<name>`. Then open `/en` and confirm the portrait renders rather than showing the fallback box. Report what you observed, and delete the test image and revert `profile.json` afterwards so the commit stays clean.

- [ ] **Step 10: Commit**

```bash
git add src/components/admin src/lib/admin src/routes/admin
git commit -m "feat: image upload writing through the content store"
```

---

### Task 9: Prerender every route to static HTML

Client-only rendering means a crawler or a link preview fetching `/en/articles/<slug>` receives an empty `<div id="root">`. This renders each route at build time and writes real HTML.

**Files:**
- Create: `src/entry-server.tsx`, `scripts/prerender.mjs`
- Modify: `package.json`
- Test: `src/prerender.test.ts`

**Interfaces:**
- Consumes: `App` from `src/App`; `allArticles` from `src/lib/articles`; `LANGS` from `src/lib/localize`.
- Produces: `src/entry-server.tsx` — `render(url: string): string` and `routePaths(): string[]`.

- [ ] **Step 1: Write the failing test**

`src/prerender.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { render, routePaths } from "./entry-server";
import { allArticles } from "./lib/articles";

describe("routePaths", () => {
  it("covers every static route in every language", () => {
    const paths = routePaths();
    for (const lang of ["en", "tr", "ar"]) {
      expect(paths).toContain(`/${lang}`);
      expect(paths).toContain(`/${lang}/projects`);
      expect(paths).toContain(`/${lang}/articles`);
      expect(paths).toContain(`/${lang}/videos`);
    }
  });

  it("covers every published article in every language", () => {
    const paths = routePaths();
    for (const article of allArticles()) {
      for (const lang of ["en", "tr", "ar"]) {
        expect(paths).toContain(`/${lang}/articles/${article.slug}`);
      }
    }
  });

  it("does not prerender the admin", () => {
    expect(routePaths().some((path) => path.startsWith("/admin"))).toBe(false);
  });
});

describe("render", () => {
  it("returns markup containing the page's real content", () => {
    const html = render("/en");
    expect(html).toContain("Your name goes here");
    expect(html).toContain("<nav");
  });

  it("renders the requested language", () => {
    expect(render("/tr")).toContain("Projeler");
    expect(render("/ar/projects")).toContain("المشاريع");
  });

  it("renders an article body as HTML", () => {
    const slug = allArticles()[0]!.slug;
    expect(render(`/en/articles/${slug}`)).toContain("Opening paragraph");
  });

  it("does not throw on a route with no data", () => {
    expect(() => render("/en/articles/does-not-exist")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/prerender.test.ts`
Expected: FAIL — cannot resolve `./entry-server`.

- [ ] **Step 3: Implement the server entry**

`src/entry-server.tsx`:

```tsx
import { renderToString } from "react-dom/server";
// React Router 7 has no `react-router-dom/server` subpath — that was v6.
// v7 re-exports StaticRouter from the package root, so no extra dependency
// and no subpath import are needed. Verified against the installed 7.18.3.
import { StaticRouter } from "react-router-dom";
import App from "./App";
import { allArticles } from "./lib/articles";
import { LANGS } from "./lib/localize";

const STATIC_ROUTES = ["", "/projects", "/articles", "/videos"] as const;

/** Every URL the build should emit as static HTML. The admin is excluded. */
export function routePaths(): string[] {
  const paths: string[] = [];
  for (const lang of LANGS) {
    for (const route of STATIC_ROUTES) paths.push(`/${lang}${route}`);
    for (const article of allArticles()) paths.push(`/${lang}/articles/${article.slug}`);
  }
  return paths;
}

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/prerender.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Write the prerender script**

`scripts/prerender.mjs`:

```js
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

// DOMPurify binds to a window at module-initialisation time, and the article
// renderer imports it. Install the DOM globals BEFORE importing the SSR
// bundle, or sanitisation throws on a missing window.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
for (const key of [
  "window",
  "document",
  "Node",
  "Element",
  "HTMLElement",
  "DocumentFragment",
  "NodeFilter",
  "DOMParser",
  "HTMLTemplateElement",
  "navigator",
]) {
  if (!(key in globalThis)) {
    globalThis[key] = key === "window" ? dom.window : dom.window[key];
  }
}

const { render, routePaths } = await import("../dist-ssr/entry-server.js");

const DIST = "dist";
const template = readFileSync(join(DIST, "index.html"), "utf8");
const SITE_URL = process.env.SITE_URL || "https://example.com";

const paths = routePaths();
let written = 0;

for (const path of paths) {
  const lang = path.split("/")[1];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const markup = render(path);

  const html = template
    .replace('<html lang="en">', `<html lang="${lang}" dir="${dir}">`)
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`);

  const outPath = join(DIST, path.slice(1), "index.html");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  written += 1;
}

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  paths.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>\n`).join("") +
  `</urlset>\n`;
writeFileSync(join(DIST, "sitemap.xml"), sitemap, "utf8");

const robotsPath = join(DIST, "robots.txt");
if (existsSync(robotsPath)) {
  appendFileSync(robotsPath, `\nSitemap: ${SITE_URL}/sitemap.xml\n`, "utf8");
}

console.log(`prerendered ${written} routes, wrote sitemap.xml`);
```

- [ ] **Step 6: Wire the build**

In `package.json`, replace the `build` script and add the two it composes:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && npm run build:client && npm run build:ssr && node scripts/prerender.mjs",
    "build:client": "vite build",
    "build:ssr": "vite build --ssr src/entry-server.tsx --outDir dist-ssr",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Add `dist-ssr/` to `.gitignore` beside the existing `dist/` entry.

- [ ] **Step 7: Verify the build emits real HTML**

Run `npm run build`, then confirm the markup is actually in the files rather than an empty root:

```bash
grep -c "Your name goes here" dist/en/index.html
grep -c "المشاريع" dist/ar/projects/index.html
grep -o 'dir="rtl"' dist/ar/index.html
ls dist/en/articles/
cat dist/sitemap.xml | head -5
```

Each `grep -c` should print at least `1`, the `dir="rtl"` should match on the Arabic page and **not** on `dist/en/index.html`, and every published article slug should appear under `dist/en/articles/`. Report the actual output.

- [ ] **Step 8: Confirm the client still hydrates**

Serve `dist/` and open `/en`. The page must render immediately (that is the prerendered HTML) and remain interactive — click through to Projects and switch language to confirm the React app took over rather than leaving a static shell. Report what you observed.

- [ ] **Step 9: Run the full suite and build**

Run: `npm test` and `npm run build` — both expected to pass.

- [ ] **Step 10: Commit**

```bash
git add src/entry-server.tsx src/prerender.test.ts scripts/prerender.mjs package.json .gitignore
git commit -m "feat: prerender every route to static HTML with a sitemap"
```

---

## What this plan deliberately does not do

- **No authentication on `/admin` beyond the token.** The page is public; the token is the credential. Anyone can load the form, but without a token no save can succeed. Real auth would need a backend, which the spec rules out.
- **No draft/preview deploys.** A production save commits straight to `main`. Reverting is `git revert`.
- **No rich-text editor.** Articles are Markdown, previewed with the same renderer the site uses.
- **No image resizing or optimisation.** Uploads are stored as provided.
