import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("public/ds/motion.css", "utf8");

/** Everything inside the reduced-motion media block. */
const reduced = (() => {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  return start === -1 ? "" : css.slice(start);
})();

function rule(selector: string, source = css): string {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) return "";
  return source.slice(start, source.indexOf("}", start));
}

describe("motion.css", () => {
  it("spins the sphere and counter-spins its labels over the same duration", () => {
    // Different durations and the two drift apart, so labels that started
    // upright end up rotating with the sphere and reading mirrored.
    expect(rule(".sphere-stage")).toContain("var(--sphere-duration) linear infinite");
    expect(rule(".sphere-label")).toContain("var(--sphere-duration) linear infinite");
    expect(css).toContain("@keyframes sphere-spin");
    expect(css).toContain("@keyframes sphere-counter-spin");
  });

  it("holds the cloud still on hover and on keyboard focus", () => {
    // Focus as well as hover: a label is a real element, so it can be tabbed
    // to, and a moving target cannot be read.
    expect(css).toContain(".sphere:hover .sphere-stage");
    expect(css).toContain(".sphere:focus-within .sphere-stage");
    expect(css).toContain("animation-play-state: paused");
  });

  it("holds the marquee still on hover and on keyboard focus", () => {
    expect(css).toContain(".marquee:hover .marquee-track");
    expect(css).toContain(".marquee:focus-within .marquee-track");
  });

  it("runs the marquee with the reading direction in Arabic", () => {
    expect(css).toMatch(/:root\[dir="rtl"\]\s*\.marquee-track\s*\{[^}]*animation-direction:\s*reverse/);
  });
});

/**
 * The part that matters most. Continuous motion can cause nausea and
 * migraines, and `prefers-reduced-motion` is how a visitor says so. Merely
 * pausing is not enough: a stopped sphere is a heap of overlapping labels and
 * a stopped marquee is a row clipped at the container edge, so both have to
 * fall back to the plain wrapped lists they are built from.
 */
describe("reduced motion", () => {
  it("is honoured at all", () => {
    expect(reduced).not.toBe("");
  });

  it("stops every animation", () => {
    for (const selector of [".sphere-stage", ".sphere-label", ".marquee-track"]) {
      expect(rule(selector, reduced), selector).toContain("animation: none");
    }
  });

  it("flattens the sphere into an ordinary wrapped list", () => {
    expect(rule(".sphere-stage", reduced)).toContain("flex-wrap: wrap");
    expect(rule(".sphere-node", reduced)).toContain("position: static");
    expect(rule(".sphere-node", reduced)).toContain("transform: none");
    expect(rule(".sphere", reduced)).toContain("perspective: none");
  });

  it("unclips the marquee and drops its duplicate copy", () => {
    expect(rule(".marquee", reduced)).toContain("overflow: visible");
    expect(rule(".marquee-track[aria-hidden=\"true\"]", reduced)).toContain("display: none");
  });
});
