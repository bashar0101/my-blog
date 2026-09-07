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
