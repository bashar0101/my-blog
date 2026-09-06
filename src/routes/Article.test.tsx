import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allArticles } from "../lib/articles";

const slug = allArticles()[0]!.slug;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Article", () => {
  it("renders the article title and body", () => {
    renderAt(`/en/articles/${slug}`);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Article title goes here"
    );
    expect(screen.getByText(/Opening paragraph/)).toBeInTheDocument();
  });

  it("renders the body Markdown as HTML", () => {
    renderAt(`/en/articles/${slug}`);
    expect(screen.getByRole("heading", { name: "First section heading" })).toBeInTheDocument();
  });

  it("shows a notice when the article is only available in English", () => {
    renderAt(`/tr/articles/${slug}`);
    expect(screen.getByTestId("language-fallback-notice")).toBeInTheDocument();
  });

  it("shows no notice on the English version", () => {
    renderAt(`/en/articles/${slug}`);
    expect(screen.queryByTestId("language-fallback-notice")).not.toBeInTheDocument();
  });

  it("links back to the articles index", () => {
    renderAt(`/en/articles/${slug}`);
    expect(screen.getByRole("link", { name: "← All articles" })).toHaveAttribute(
      "href",
      "/en/articles"
    );
  });

  it("renders not-found for an unknown slug", () => {
    renderAt("/en/articles/no-such-article");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });
});
