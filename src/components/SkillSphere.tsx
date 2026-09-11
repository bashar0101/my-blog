import { useMemo, type CSSProperties } from "react";
import type { SkillGroup } from "../types";
import { spherePoints } from "../lib/sphere";

/**
 * The skills as a slowly turning cloud.
 *
 * Every label is real text in the DOM, not a canvas: it is selectable, it is
 * read by a screen reader in source order, and it needs no WebGL. The
 * stylesheet flattens the whole thing back into an ordinary wrapped list when
 * the visitor asks for reduced motion, so there is one copy of the content
 * rather than an animated version and an accessible version that can drift.
 */
export default function SkillSphere({ skills }: { skills: SkillGroup[] }) {
  const tags = useMemo(() => skills.flatMap((group) => group.items), [skills]);
  const points = useMemo(() => spherePoints(tags.length), [tags.length]);

  if (tags.length === 0) return null;

  return (
    <div className="sphere" data-testid="skill-sphere">
      <div className="sphere-stage">
        {tags.map((tag, index) => (
          <span
            key={`${tag.label}-${index}`}
            className="sphere-node"
            style={
              {
                "--ry": `${points[index]!.ry}deg`,
                "--rx": `${points[index]!.rx}deg`,
              } as CSSProperties
            }
          >
            <span className="sphere-face">
              <span className={`tag tag-${tag.tone} sphere-label`}>{tag.label}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
