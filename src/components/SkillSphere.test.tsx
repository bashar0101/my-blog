import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SkillSphere from "./SkillSphere";
import type { SkillGroup } from "../types";

const skills: SkillGroup[] = [
  { group: { en: "Backend" }, items: [{ label: "Java", tone: "accent" }, { label: "Spring Boot", tone: "neutral" }] },
  { group: { en: "Frontend" }, items: [{ label: "React", tone: "accent" }] },
];

describe("SkillSphere", () => {
  it("renders every skill once, as real text", () => {
    // Not a canvas: the labels are selectable, and a screen reader reads them
    // in source order without a parallel text version to keep in sync.
    render(<SkillSphere skills={skills} />);

    for (const label of ["Java", "Spring Boot", "React"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("places each label with its own pair of rotations", () => {
    const { container } = render(<SkillSphere skills={skills} />);
    const nodes = [...container.querySelectorAll<HTMLElement>(".sphere-node")];

    expect(nodes).toHaveLength(3);
    const places = nodes.map((node) => `${node.style.getPropertyValue("--ry")}/${node.style.getPropertyValue("--rx")}`);
    expect(places.every((place) => place.includes("deg"))).toBe(true);
    expect(new Set(places).size).toBe(places.length);
  });

  it("keeps the tag styling so it matches the rest of the site", () => {
    const { container } = render(<SkillSphere skills={skills} />);
    expect(container.querySelector(".tag.tag-accent.sphere-label")).not.toBeNull();
    expect(container.querySelector(".tag.tag-neutral.sphere-label")).not.toBeNull();
  });

  it("renders nothing when there are no skills", () => {
    const { container } = render(<SkillSphere skills={[]} />);
    expect(container).toBeEmptyDOMElement();

    const { container: emptyGroup } = render(
      <SkillSphere skills={[{ group: { en: "Backend" }, items: [] }]} />
    );
    expect(emptyGroup).toBeEmptyDOMElement();
  });
});
