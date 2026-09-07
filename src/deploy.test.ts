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
