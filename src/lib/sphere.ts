/** Where one label sits on the sphere, as the two CSS rotations that put it there. */
export interface SpherePoint {
  /** rotateY, degrees. */
  ry: number;
  /** rotateX, degrees. */
  rx: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DEG = 180 / Math.PI;

/**
 * Evenly spaced points on a sphere, by the Fibonacci lattice.
 *
 * Spacing labels by latitude and longitude bunches them at the poles, which
 * reads as a clump rather than a cloud. The golden angle avoids that without
 * any relaxation step, and is deterministic — the same skills always land in
 * the same places, so the sphere does not reshuffle on every render.
 *
 * The result is expressed as the CSS rotations rather than x/y/z because that
 * is what the stylesheet consumes: `rotateY(ry) rotateX(rx) translateZ(r)`
 * lands an element at the surface point, and CSS has no vector type.
 */
export function spherePoints(count: number): SpherePoint[] {
  if (count <= 0) return [];
  if (count === 1) return [{ ry: 0, rx: 0 }];

  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * index;
    const x = Math.cos(theta) * ring;
    const z = Math.sin(theta) * ring;

    // Inverting `Ry(ry) · Rx(rx) · (0,0,1)` = (cos rx · sin ry, −sin rx, cos rx · cos ry).
    return {
      ry: round(Math.atan2(x, z) * DEG),
      rx: round(-Math.asin(y) * DEG),
    };
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
