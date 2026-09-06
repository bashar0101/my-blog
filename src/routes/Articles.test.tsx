import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allArticles } from "../lib/articles";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Articles", () => {
  it("lists every published article", () => {
    renderAt("/en/articles");
    expect(screen.getAllByTestId("article-row")).toHaveLength(allArticles().length);
  });

  it("renders the localized page title", () => {
    renderAt("/ar/articles");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("المقالات");
  });

  it("renders the structural class hooks that rtl.css targets", () => {
    const { container } = renderAt("/en/articles");
    expect(container.querySelector(".page-kicker")).not.toBeNull();
    expect(container.querySelector(".row-meta")).not.toBeNull();
  });
});
