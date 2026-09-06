import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TagList from "./TagList";

describe("TagList", () => {
  it("renders each tag with its tone class", () => {
    render(
      <TagList
        tags={[
          { label: "Java", tone: "accent" },
          { label: "Docker", tone: "neutral" },
        ]}
      />
    );
    expect(screen.getByText("Java")).toHaveClass("tag", "tag-accent");
    expect(screen.getByText("Docker")).toHaveClass("tag", "tag-neutral");
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<TagList tags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
