import type { Article, ArticleMeta, Lang } from "../types";
import { renderMarkdown } from "./markdown";

const metaModules = import.meta.glob<ArticleMeta>("/content/articles/*/meta.json", {
  eager: true,
  import: "default",
});

const bodyModules = import.meta.glob<string>("/content/articles/*/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

function slugFromPath(path: string): string {
  return path.split("/")[3] ?? "";
}

function langFromPath(path: string): string {
  return (path.split("/").pop() ?? "").replace(/\.md$/, "");
}

const loadedArticles: Article[] = Object.entries(metaModules)
  .map(([path, meta]) => {
    const slug = slugFromPath(path);
    const bodies: Partial<Record<Lang, string>> = {};
    for (const [bodyPath, source] of Object.entries(bodyModules)) {
      if (slugFromPath(bodyPath) !== slug) continue;
      const lang = langFromPath(bodyPath);
      if (lang === "en" || lang === "tr" || lang === "ar") bodies[lang] = source;
    }
    return { ...meta, slug, bodies };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

const articles = loadedArticles.filter((article) => article.published);

export function allArticles(): Article[] {
  return articles;
}

/** Admin needs drafts too, so it can publish or permanently remove them. */
export function allArticlesForAdmin(): Article[] {
  return loadedArticles;
}

export function articleBySlug(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}

export function latestArticles(limit = 3): Article[] {
  return articles.slice(0, limit);
}

export function bodyFor(article: Article, lang: Lang): { html: string; fellBack: boolean } {
  const source = article.bodies[lang];
  if (source) return { html: renderMarkdown(source), fellBack: false };
  return { html: renderMarkdown(article.bodies.en ?? ""), fellBack: lang !== "en" };
}
