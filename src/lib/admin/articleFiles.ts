import type { Article, Lang } from "../../types";
import type { StoredFile } from "../store";

const LANGS: readonly Lang[] = ["en", "tr", "ar"];

export function slugify(title: string, date: string): string {
  const body = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${date}-${body || "article"}`;
}

export function articleToFiles(article: Article): StoredFile[] {
  const { bodies, ...meta } = article;
  const dir = `content/articles/${article.slug}`;
  const files: StoredFile[] = [{ path: `${dir}/meta.json`, content: JSON.stringify(meta, null, 2) + "\n", encoding: "utf8" }];
  for (const lang of LANGS) {
    const body = bodies[lang];
    if (body?.trim()) files.push({ path: `${dir}/${lang}.md`, content: body, encoding: "utf8" });
  }
  return files;
}
