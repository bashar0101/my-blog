import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("logical properties", () => {
  it("never uses physical auto margins for edge pinning", () => {
    const offenders = sourceFiles("src").filter((path) => {
      const source = readFileSync(path, "utf8");
      return /margin(Left|Right)\s*:\s*["']auto["']/.test(source) ||
        /margin-(left|right)\s*:\s*auto/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});

describe("rtl.css", () => {
  const css = readFileSync("public/ds/rtl.css", "utf8");

  it("resets letter-spacing for Arabic", () => {
    expect(css).toMatch(/:root\[lang="ar"\][^}]*letter-spacing:\s*normal/s);
  });

  it("drops uppercase transforms for Arabic", () => {
    expect(css).toMatch(/:root\[lang="ar"\][^}]*text-transform:\s*none/s);
  });

  it("swaps in an Arabic heading font", () => {
    expect(css).toMatch(/--font-heading:[^;]*Arabic/);
  });
});
