import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|html)$/.test(entry) ? [path] : [];
  });
}

describe("migration", () => {
  it("no longer ships the in-browser dc runtime", () => {
    expect(existsSync("archive/dc-original/support.js")).toBe(false);
    expect(existsSync("archive/dc-original/image-slot.js")).toBe(false);
    expect(existsSync("archive/dc-original/i18n.js")).toBe(false);
  });

  it("keeps no reference to the old runtime in shipped source", () => {
    // Exclude this file itself: its own source necessarily contains these
    // substrings as regex literals, which would otherwise self-flag as a
    // false positive regardless of whether the runtime is actually gone.
    const offenders = [...sourceFiles("src"), "index.html"]
      .filter((path) => path !== join("src", "migration.test.ts"))
      .filter((path) => /support\.js|image-slot|x-dc|data-i18n/.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("keeps the design system that the site still uses", () => {
    expect(existsSync("public/ds/industry.css")).toBe(true);
    expect(existsSync("public/ds/rtl.css")).toBe(true);
  });
});
