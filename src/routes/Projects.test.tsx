import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allProjects } from "../lib/content";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Projects", () => {
  it("renders every project, not only the featured ones", () => {
    renderAt("/en/projects");
    expect(screen.getAllByTestId("project-card")).toHaveLength(allProjects().length);
  });

  it("renders the localized page title", () => {
    renderAt("/tr/projects");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Projeler");
  });

  it("renders the Arabic page title", () => {
    renderAt("/ar/projects");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("المشاريع");
  });
});
