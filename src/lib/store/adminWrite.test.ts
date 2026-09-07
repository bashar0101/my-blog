import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  WRITABLE_PREFIXES as pluginPrefixes,
  isWritablePath as pluginIsWritablePath,
  resolveWrites,
} from "../../../vite-plugin-admin-write";
import { WRITABLE_PREFIXES as storePrefixes, isWritablePath as storeIsWritablePath } from "./paths";

const CASES: { path: string; expected: boolean }[] = [
  // Accepted, one per writable prefix.
  { path: "src/content/profile.json", expected: true },
  { path: "content/articles/a-slug/meta.json", expected: true },
  { path: "content/articles/a-slug/en.md", expected: true },
  { path: "public/img/portrait.jpg", expected: true },
  // Outside the writable prefixes entirely.
  { path: "package.json", expected: false },
  { path: "src/App.tsx", expected: false },
  { path: "public/ds/industry.css", expected: false },
  { path: ".env", expected: false },
  // Traversal starting inside a writable prefix.
  { path: "src/content/../../package.json", expected: false },
  { path: "content/articles/../../.env", expected: false },
  { path: "public/img/../../../etc/passwd", expected: false },
  // Absolute paths.
  { path: "/etc/passwd", expected: false },
  { path: "C:/Windows/system.ini", expected: false },
  // Backslash separators.
  { path: "src\\content\\profile.json", expected: false },
  { path: "src/content/..\\..\\package.json", expected: false },
  // Empty path and a bare prefix.
  { path: "", expected: false },
  { path: "src/content/", expected: false },
  // Sibling-directory prefix confusion: "src/contentX/" is not "src/content/".
  { path: "src/contentX/evil.json", expected: false },
];

describe("guard parity between src/lib/store/paths.ts and vite-plugin-admin-write.ts", () => {
  it("share the exact same WRITABLE_PREFIXES", () => {
    expect(pluginPrefixes).toEqual(storePrefixes);
  });

  it.each(CASES)("agree on isWritablePath($path) -> $expected", ({ path, expected }) => {
    expect(pluginIsWritablePath(path)).toBe(expected);
    expect(storeIsWritablePath(path)).toBe(expected);
    expect(pluginIsWritablePath(path)).toBe(storeIsWritablePath(path));
  });
});

describe("resolveWrites", () => {
  // A real, isolated OS temp directory rather than a mocked node:fs: this
  // module is also imported by vite.config.ts to register the dev-server
  // plugin, so it is loaded once during Vite/Vitest server bootstrap, before
  // any test file's node:fs mock would apply — mocking node:fs here silently
  // fails to intercept resolveWrites's calls. A real, disposable directory
  // sidesteps that entirely and is what actually proves nothing was written.
  let root: string;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("rejects the whole batch, with no targets and nothing written to disk, if any single path is disallowed", () => {
    root = mkdtempSync(join(tmpdir(), "admin-write-test-"));

    const result = resolveWrites(root, [
      { path: "src/content/profile.json", content: "{}", encoding: "utf8" },
      { path: "package.json", content: "x", encoding: "utf8" },
    ]);

    expect("error" in result).toBe(true);
    expect("targets" in result).toBe(false);
    // The critical assertion: the valid file that sorted before the invalid
    // one in the batch must not have been written to disk. If validation
    // and writing were interleaved (the original bug), this file would
    // exist even though the shape assertions above still pass.
    expect(existsSync(join(root, "src/content/profile.json"))).toBe(false);
  });

  it("resolves one target per file, each under the root, when every path is valid — and writes nothing to disk itself", () => {
    root = mkdtempSync(join(tmpdir(), "admin-write-test-"));

    const result = resolveWrites(root, [
      { path: "src/content/profile.json", content: "{}", encoding: "utf8" },
      { path: "public/img/portrait.jpg", content: "x", encoding: "utf8" },
    ]);

    if (!("targets" in result)) {
      throw new Error(`expected targets, got error: ${result.error}`);
    }
    expect(result.targets).toHaveLength(2);
    for (const { target } of result.targets) {
      expect(target.startsWith(root)).toBe(true);
      // resolveWrites only resolves; the middleware writes once every
      // target in the batch is known to be valid.
      expect(existsSync(target)).toBe(false);
    }
  });
});
