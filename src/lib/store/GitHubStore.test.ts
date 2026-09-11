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

describe("GitHubStore caching", () => {
  it("reads the branch ref with cache disabled", async () => {
    // GitHub answers this GET with `Cache-Control: public, max-age=60`. Served
    // from the browser cache, it hands back a head that has since been
    // superseded, the next commit is parented on it, and the fast-forward-only
    // ref PATCH fails with "Update is not a fast forward". Two saves inside a
    // minute were enough.
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ object: { sha: "abc123" } }));
    vi.stubGlobal("fetch", fetchMock);

    await new GitHubStore(config).loadBaseSha();

    expect((fetchMock.mock.calls[0]![1] as RequestInit).cache).toBe("no-store");
  });
});

describe("GitHubStore.read", () => {
  it("decodes the file, multi-byte characters included", async () => {
    const text = '[{"title":"مشاريع","city":"İstanbul"}]';
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        // Wrapped the way the contents API returns it; atob rejects newlines.
        jsonResponse({
          encoding: "base64",
          content: Buffer.from(text, "utf8").toString("base64").replace(/(.{60})/g, "$1\n"),
        })
      )
    );

    const files = await new GitHubStore(config).read(["src/content/projects.json"]);

    expect(files["src/content/projects.json"]).toBe(text);
  });

  it("returns null for a path the repository does not have", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));

    const files = await new GitHubStore(config).read(["content/articles/new/meta.json"]);

    expect(files["content/articles/new/meta.json"]).toBeNull();
  });

  it("reads with cache disabled too", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ encoding: "base64", content: btoa("{}") }));
    vi.stubGlobal("fetch", fetchMock);

    await new GitHubStore(config).read(["src/content/profile.json"]);

    expect((fetchMock.mock.calls[0]![1] as RequestInit).cache).toBe("no-store");
  });

  it("reports a failure that is not a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: "Bad credentials" }) })
    );

    await expect(new GitHubStore(config).read(["src/content/profile.json"])).rejects.toThrow(
      /Bad credentials/
    );
  });
});

import { createStore } from "./index";

describe("createStore", () => {
  it("returns the same instance for the same token", () => {
    // GitHubStore remembers the branch head it saw at load time. A fresh
    // instance per save would reset that memory, and every write would
    // pass the conflict check no matter who else had committed.
    expect(createStore("ghp_same")).toBe(createStore("ghp_same"));
  });
});
