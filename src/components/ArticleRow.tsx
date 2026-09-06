import { Link } from "react-router-dom";
import type { Article } from "../types";
import { useLang } from "../i18n/LangProvider";

export default function ArticleRow({ article }: { article: Article }) {
  const { lang, l } = useLang();

  return (
    <article
      data-testid="article-row"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
    >
      <span
        style={{
          fontSize: 13,
          color: "var(--color-neutral-600)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {article.date} · {l(article.topic)}
      </span>
      <h3 style={{ margin: 0, fontSize: 20 }}>
        <Link to={`/${lang}/articles/${article.slug}`} style={{ color: "var(--color-text)" }}>
          {l(article.title)}
        </Link>
      </h3>
      <p style={{ margin: 0, fontSize: 15, color: "var(--color-neutral-700)" }}>
        {l(article.standfirst)}
      </p>
    </article>
  );
}
