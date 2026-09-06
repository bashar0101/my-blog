import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders headings and paragraphs", () => {
    const html = renderMarkdown("# Title\n\nA paragraph.");
    expect(html).toContain("<h1");
    expect(html).toContain("Title");
    expect(html).toContain("<p>A paragraph.</p>");
  });

  it("renders fenced code blocks", () => {
    const html = renderMarkdown("```java\npublic class Example {}\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("<code");
    expect(html).toContain("public class Example");
  });

  it("strips script tags", () => {
    const html = renderMarkdown('Hello <script>alert("x")</script> world');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(");
  });

  it("strips inline event handlers", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("strips javascript: URIs from links", () => {
    const html = renderMarkdown("[click](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("returns an empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
