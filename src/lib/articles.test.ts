import { describe, expect, it } from "vitest";
import { allArticles, allArticlesForAdmin, articleBySlug, bodyFor, latestArticles } from "./articles";

describe("allArticles", () => {
  it("finds the seed article", () => {
    expect(allArticles().length).toBeGreaterThan(0);
  });

  it("returns only published articles", () => {
    const articles = allArticles();
    expect(articles.every((a) => a.published)).toBe(true);
    expect(articles.some((a) => a.slug === "2025-03-01-unpublished-draft")).toBe(false);
    // Computed from the full corpus (including drafts) rather than a literal
    // count, so this stays correct as articles are added or removed.
    const publishedCount = allArticlesForAdmin().filter((a) => a.published).length;
    expect(articles.length).toBe(publishedCount);
  });

  it("sorts newest first", () => {
    const articles = allArticles();
    const dates = articles.map((a) => a.date);
    expect(dates).toEqual([...dates].sort().reverse());
    const maxDate = dates.reduce((max, date) => (date > max ? date : max), dates[0]!);
    expect(articles[0]!.date).toBe(maxDate);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]! < dates[i - 1]!).toBe(true);
    }
  });

  it("gives every article an English body", () => {
    for (const article of allArticles()) {
      expect(article.bodies.en, article.slug).toBeTruthy();
    }
  });
});

describe("articleBySlug", () => {
  it("finds an article by its slug", () => {
    const first = allArticles()[0]!;
    expect(articleBySlug(first.slug)?.slug).toBe(first.slug);
  });

  it("returns undefined for an unknown slug", () => {
    expect(articleBySlug("no-such-article")).toBeUndefined();
  });
});

describe("bodyFor", () => {
  it("renders the requested language when present", () => {
    const article = { ...allArticles()[0]!, bodies: { en: "# English", tr: "# Türkçe" } };
    const result = bodyFor(article, "tr");
    expect(result.html).toContain("Türkçe");
    expect(result.fellBack).toBe(false);
  });

  it("falls back to English and reports it when the language is missing", () => {
    const article = { ...allArticles()[0]!, bodies: { en: "# English" } };
    const result = bodyFor(article, "ar");
    expect(result.html).toContain("English");
    expect(result.fellBack).toBe(true);
  });

  it("does not report a fallback when English itself was requested", () => {
    const article = { ...allArticles()[0]!, bodies: { en: "# English" } };
    expect(bodyFor(article, "en").fellBack).toBe(false);
  });
});

describe("latestArticles", () => {
  it("caps the result at three by default", () => {
    // Correct whether the corpus has more or fewer than the requested
    // number of published articles.
    const total = allArticles().length;
    expect(latestArticles().length).toBe(Math.min(3, total));
    expect(latestArticles(2).length).toBe(Math.min(2, total));
  });
});
