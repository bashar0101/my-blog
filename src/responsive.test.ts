import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("public/ds/layout.css", "utf8");

/** Everything inside one `@media (max-width: …)` block. */
function mediaBlock(query: string): string {
  const start = css.indexOf(`@media (max-width: ${query})`);
  if (start === -1) return "";
  const next = css.indexOf("@media", start + 1);
  return css.slice(start, next === -1 ? undefined : next);
}

/** The declarations of the first rule whose selector list starts with `selector`. */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("}", start));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return entry.endsWith(".tsx") && !entry.endsWith(".test.tsx") ? [path] : [];
  });
}

/** Everything a visitor sees. The admin is a desktop editing tool. */
const publicComponents = [...sourceFiles("src/components"), ...sourceFiles("src/routes")].filter(
  (path) => !path.includes("admin")
);

describe("viewport", () => {
  it("scales to the device width", () => {
    // Without this a phone lays the page out at ~980px and zooms out: no media
    // query ever matches and the text is unreadable.
    expect(html).toContain('name="viewport"');
    expect(html).toContain("width=device-width");
  });
});

describe("layout.css", () => {
  it("is linked by the page", () => {
    expect(html).toContain('href="/ds/layout.css"');
  });

  it("loads after industry.css and before motion.css and rtl.css", () => {
    // industry.css holds the base rules layout.css overrides, and rtl.css's
    // Arabic overrides have to keep the last word.
    const order = ["/ds/industry.css", "/ds/layout.css", "/ds/motion.css", "/ds/rtl.css"].map((href) =>
      html.indexOf(href)
    );
    expect(order.includes(-1)).toBe(false);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("stacks the hero and the two-up sections below 900px", () => {
    const block = mediaBlock("900px");
    expect(block).toContain(".grid-hero");
    expect(block).toContain(".grid-halves");
    expect(block).toMatch(/grid-template-columns:\s*1fr;/);
  });

  it("stacks the label-and-content sections below 800px", () => {
    const block = mediaBlock("800px");
    expect(block).toContain(".grid-aside");
    expect(block).toMatch(/grid-template-columns:\s*1fr;/);
  });

  it("sizes the card grids by the container rather than a fixed count", () => {
    // auto-fit needs no breakpoint: three columns become two, then one, as the
    // container narrows. repeat(3, 1fr) never stops being three columns.
    expect(rule(".grid-cards")).toContain("repeat(auto-fit, minmax(");
    expect(rule(".grid-media")).toContain("repeat(auto-fit, minmax(");
  });

  it("scales headline type with the viewport", () => {
    for (const selector of [".hero-title", ".page-title", ".section-title"]) {
      expect(rule(selector), selector).toContain("clamp(");
    }
  });

  it("lets the nav wrap instead of overflowing", () => {
    expect(rule(".nav")).toContain("flex-wrap: wrap");
  });

  it("keeps gutters on a phone", () => {
    expect(rule(":root")).toContain("--page-pad: clamp(");
  });

  it("uses logical properties for centring, so RTL is unaffected", () => {
    expect(css).not.toMatch(/margin-(left|right):\s*auto/);
    expect(css).toContain("margin-inline: auto");
  });

  it("lets the admin chrome wrap too", () => {
    // Five section links plus the brand do not fit across a phone.
    expect(rule(".admin-header")).toContain("flex-wrap: wrap");
    expect(rule(".admin-nav")).toContain("flex-wrap: wrap");
  });

  it("hides the honeypot by clipping, not by pushing it off the left edge", () => {
    // Browsers clip leftward overflow in LTR, so `left: -9999px` looks hidden
    // in English. In RTL that is the scrollable direction, and it gave every
    // Arabic page 9999px of horizontal scroll.
    const hidden = rule(".visually-hidden");
    expect(hidden).toContain("clip-path");
    expect(hidden).not.toContain("-9999");
  });

  it("gives long-form content somewhere to put an unbreakable token", () => {
    expect(rule(".article-body")).toContain("overflow-wrap");
  });
});

/**
 * The load-bearing guard. An inline style outranks every external rule, so a
 * grid or a page width written in a style prop cannot be made responsive by
 * any stylesheet — it has to live in layout.css. This catches the next one
 * added, rather than waiting for someone to open the site on a phone.
 */
describe("public components keep layout out of style props", () => {
  it("finds the components", () => {
    expect(publicComponents.length).toBeGreaterThan(5);
  });

  it("declares no grid columns inline", () => {
    const offenders = publicComponents.filter((path) =>
      readFileSync(path, "utf8").includes("gridTemplateColumns")
    );
    expect(offenders).toEqual([]);
  });

  it("hides nothing with a physical off-screen offset", () => {
    // A negative physical left/right is direction-dependent: hidden in one
    // writing direction, a 9999px scrollbar in the other.
    const offenders = publicComponents.filter((path) =>
      /(left|right):\s*["']?-9{3,}/.test(readFileSync(path, "utf8"))
    );
    expect(offenders).toEqual([]);
  });

  it("declares no fixed page width inline", () => {
    const offenders = publicComponents.filter((path) =>
      /maxWidth:\s*\d/.test(readFileSync(path, "utf8"))
    );
    expect(offenders).toEqual([]);
  });
});
