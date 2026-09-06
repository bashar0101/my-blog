import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import LangSwitcher from "./LangSwitcher";

function renderAt(path: string, lang: "en" | "tr" | "ar") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LangProvider lang={lang}>
        <LangSwitcher />
      </LangProvider>
    </MemoryRouter>
  );
}

describe("LangSwitcher", () => {
  it("renders one real link per language", () => {
    renderAt("/en", "en");
    for (const label of ["EN", "TR", "AR"]) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href");
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("preserves the current path when switching language", () => {
    renderAt("/en/articles/some-slug", "en");
    expect(screen.getByRole("link", { name: "TR" })).toHaveAttribute(
      "href",
      "/tr/articles/some-slug"
    );
    expect(screen.getByRole("link", { name: "AR" })).toHaveAttribute(
      "href",
      "/ar/articles/some-slug"
    );
  });

  it("links to the bare language root from the home page", () => {
    renderAt("/tr", "tr");
    expect(screen.getByRole("link", { name: "AR" })).toHaveAttribute("href", "/ar");
  });

  it("marks exactly one language as current", () => {
    renderAt("/tr/projects", "tr");
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("TR");
  });

  it("does not set inline colors", () => {
    renderAt("/en", "en");
    expect(screen.getByRole("link", { name: "EN" }).getAttribute("style")).toBeNull();
  });
});
