import { describe, expect, it } from "vitest";
import { spherePoints } from "./sphere";

/** Undoes the CSS rotations, recovering the unit vector the point stands for. */
function toVector({ ry, rx }: { ry: number; rx: number }) {
  const a = (rx * Math.PI) / 180;
  const b = (ry * Math.PI) / 180;
  return {
    x: Math.cos(a) * Math.sin(b),
    y: -Math.sin(a),
    z: Math.cos(a) * Math.cos(b),
  };
}

describe("spherePoints", () => {
  it("returns one point per label", () => {
    expect(spherePoints(14)).toHaveLength(14);
  });

  it("handles the empty and single cases", () => {
    expect(spherePoints(0)).toEqual([]);
    expect(spherePoints(-3)).toEqual([]);
    expect(spherePoints(1)).toEqual([{ ry: 0, rx: 0 }]);
  });

  it("puts every point on the unit sphere", () => {
    // The rotations have to land the label on the surface; a point that comes
    // back with a length other than 1 would sit inside or outside the cloud.
    for (const point of spherePoints(40)) {
      const { x, y, z } = toVector(point);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6);
    }
  });

  it("spreads points over the whole sphere rather than clumping", () => {
    const vectors = spherePoints(60).map(toVector);
    const mean = (pick: (v: { x: number; y: number; z: number }) => number) =>
      vectors.reduce((sum, v) => sum + pick(v), 0) / vectors.length;

    // An even spread has its centre of mass at the origin. Latitude/longitude
    // spacing, which bunches at the poles, fails this on y.
    expect(Math.abs(mean((v) => v.x))).toBeLessThan(0.1);
    expect(Math.abs(mean((v) => v.y))).toBeLessThan(0.1);
    expect(Math.abs(mean((v) => v.z))).toBeLessThan(0.1);
  });

  it("reaches both poles and the equator", () => {
    const ys = spherePoints(30).map((point) => toVector(point).y);
    expect(Math.max(...ys)).toBeCloseTo(1, 3);
    expect(Math.min(...ys)).toBeCloseTo(-1, 3);
    expect(Math.min(...ys.map(Math.abs))).toBeLessThan(0.1);
  });

  it("is deterministic, so the cloud does not reshuffle between renders", () => {
    expect(spherePoints(12)).toEqual(spherePoints(12));
  });

  it("gives no two labels the same place", () => {
    const keys = spherePoints(25).map((point) => `${point.ry}/${point.rx}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
