import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allArticles, bodyFor } from "../lib/articles";

const article = allArticles()[0]!;
const slug = article.slug;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

// Renders markdown-produced HTML through a scratch element so we read back
// plain text the same way the browser/jsdom would, rather than hand-parsing
// the markup ourselves.
function plainTextOf(html: string): string {
  const scratch = document.createElement("div");
  scratch.innerHTML = html;
  return scratch.textContent ?? "";
}

describe("Article", () => {
  it("renders the article title and body", () => {
    const { container } = renderAt(`/en/articles/${slug}`);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(article.title.en);

    // A distinctive fragment pulled from the article's own English body
    // (via bodyFor, the same helper the route uses) rather than a literal
    // that happened to match the seed content.
    const bodyText = plainTextOf(bodyFor(article, "en").html);
    const fragment = bodyText.slice(0, 40);
    expect(fragment.length).toBeGreaterThan(0);
    const renderedBodyText = container.querySelector(".article-body")?.textContent ?? "";
    expect(renderedBodyText).toContain(fragment);
  });

  it("renders the body Markdown as HTML", () => {
    const { container } = renderAt(`/en/articles/${slug}`);
    const bodyEl = container.querySelector(".article-body");
    expect(bodyEl).not.toBeNull();
    // The body region must be non-empty and contain at least one element
    // produced by Markdown rendering (marked always wraps text in block
    // elements such as <p>), and it must match what bodyFor computes for
    // this exact article/language pair.
    expect(bodyEl!.children.length).toBeGreaterThan(0);
    expect(bodyEl!.innerHTML).toBe(bodyFor(article, "en").html);
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
