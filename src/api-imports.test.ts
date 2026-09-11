import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function apiFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return apiFiles(path);
    return entry.endsWith(".ts") ? [path] : [];
  });
}

/**
 * The serverless functions under api/ are the only code Node loads directly —
 * everything under src/ goes through Vite's bundler first. package.json sets
 * "type": "module", so Node resolves these as ESM, and ESM requires an explicit
 * file extension on every relative import.
 *
 * tsconfig uses moduleResolution "bundler", which accepts extensionless
 * specifiers, so `tsc -b` compiles them without complaint and the local build
 * passes. The failure only appears at runtime, where it throws
 * ERR_MODULE_NOT_FOUND during module load — before the handler exists, so a
 * try/catch inside the handler cannot report it. Every function under api/
 * imports ../_auth, so one missing extension took down the entire auth surface
 * with an opaque FUNCTION_INVOCATION_FAILED.
 */
describe("api/ relative imports", () => {
  const files = apiFiles("api");

  it("finds the serverless functions", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("carries an explicit extension on every relative import", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/from\s+"(\.[^"]*)"/g)) {
        const specifier = match[1]!;
        if (!specifier.endsWith(".js")) offenders.push(`${file} → ${specifier}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
