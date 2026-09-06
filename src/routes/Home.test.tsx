import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Home", () => {
  it("renders the profile headline", () => {
    renderAt("/en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your name goes here");
  });

  it("renders the about text", () => {
    renderAt("/en");
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("renders at most three featured projects", () => {
    renderAt("/en");
    expect(screen.getAllByTestId("project-card").length).toBeLessThanOrEqual(3);
  });

  it("links to the full projects page", () => {
    renderAt("/en");
    expect(screen.getByRole("link", { name: "All projects →" })).toHaveAttribute(
      "href",
      "/en/projects"
    );
  });

  it("links article rows to their detail page", () => {
    renderAt("/en");
    const link = screen.getAllByTestId("article-row")[0]!.querySelector("a")!;
    expect(link.getAttribute("href")).toMatch(/^\/en\/articles\//);
  });

  it("renders headings in Turkish on the Turkish home page", () => {
    renderAt("/tr");
    expect(screen.getByRole("heading", { name: "Öne çıkan projeler" })).toBeInTheDocument();
  });

  it("renders the contact form", () => {
    renderAt("/en");
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });
});
