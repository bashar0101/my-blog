import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Project } from "../types";
import ProjectCard from "./ProjectCard";
import { LangProvider } from "../i18n/LangProvider";

function project(extra: Partial<Project> = {}): Project {
  return {
    id: "p1",
    title: { en: "Senyora Restaurant" },
    kicker: { en: "Backend · API" },
    summary: { en: "A restaurant site." },
    tags: [],
    image: { src: "/img/senyora.jpg", alt: { en: "screenshot" } },
    url: null,
    liveUrl: null,
    featured: false,
    order: 1,
    ...extra,
  };
}

function renderCard(value: Project) {
  return render(
    <MemoryRouter initialEntries={["/en"]}>
      <LangProvider lang="en">
        <ProjectCard project={value} />
      </LangProvider>
    </MemoryRouter>
  );
}

describe("ProjectCard image link", () => {
  it("opens the live site when the project is deployed", () => {
    renderCard(project({ liveUrl: "https://senyora.example", url: "https://github.com/x/y" }));

    const link = screen.getByTestId("project-image-link");
    expect(link).toHaveAttribute("href", "https://senyora.example/");
    // Named after the project: the alt text describes the picture, not the
    // destination, so it makes a poor link name.
    expect(link).toHaveAccessibleName("Senyora Restaurant");
    expect(link.querySelector("img")).toBeInTheDocument();
  });

  it("falls back to the case study when nothing is deployed", () => {
    renderCard(project({ url: "https://github.com/x/y" }));

    expect(screen.getByTestId("project-image-link")).toHaveAttribute(
      "href",
      "https://github.com/x/y"
    );
  });

  it("leaves the image unwrapped when there is no link at all", () => {
    renderCard(project());

    expect(screen.queryByTestId("project-image-link")).not.toBeInTheDocument();
    expect(screen.getByAltText("screenshot")).toBeInTheDocument();
  });

  it("does not turn a non-http scheme into a clickable image", () => {
    renderCard(project({ liveUrl: "javascript:alert(1)" }));

    expect(screen.queryByTestId("project-image-link")).not.toBeInTheDocument();
  });
});

describe("ProjectCard links", () => {
  it("shows both links when both are set", () => {
    renderCard(project({ liveUrl: "https://senyora.example", url: "https://github.com/x/y" }));

    expect(screen.getByRole("link", { name: /visit site/i })).toHaveAttribute(
      "href",
      "https://senyora.example/"
    );
    expect(screen.getByRole("link", { name: /case study/i })).toHaveAttribute(
      "href",
      "https://github.com/x/y"
    );
  });

  it("shows only the case study when the project is not live", () => {
    renderCard(project({ url: "https://github.com/x/y" }));

    expect(screen.queryByRole("link", { name: /visit site/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /case study/i })).toBeInTheDocument();
  });

  it("shows neither when the project has no links", () => {
    renderCard(project());

    expect(screen.queryByRole("link", { name: /visit site/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /case study/i })).not.toBeInTheDocument();
  });
});
