import { Link, useParams } from "react-router-dom";
import { useLang } from "../i18n/LangProvider";
import { articleBySlug, bodyFor } from "../lib/articles";
import Blueprint from "../components/Blueprint";
import ImageFrame from "../components/ImageFrame";
import TagList from "../components/TagList";
import NotFound from "./NotFound";

export default function Article() {
  const { slug } = useParams();
  const { lang, t, l } = useLang();
  const article = slug ? articleBySlug(slug) : undefined;

  if (!article) return <NotFound />;

  const { html, fellBack } = bodyFor(article, lang);

  return (
    <main>
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "calc(var(--space-8) * 2) var(--space-8)" }}>
        <Link to={`/${lang}/articles`} style={{ fontSize: 14 }}>
          {t("article.back")}
        </Link>

        <header
          style={{
            margin: "var(--space-6) 0 var(--space-8)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-heading)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: 14,
              color: "var(--color-accent-700)",
            }}
          >
            {l(article.topic)} · {article.date} · {article.readingMinutes} min
          </span>
          <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.1, textTransform: "uppercase" }}>
            {l(article.title)}
          </h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "var(--color-neutral-700)" }}>
            {l(article.standfirst)}
          </p>
        </header>

        {fellBack && (
          <p
            data-testid="language-fallback-notice"
            style={{
              margin: "0 0 var(--space-6)",
              padding: "var(--space-3)",
              border: "1px solid var(--color-divider)",
              background: "var(--color-neutral-200)",
              fontSize: 14,
            }}
          >
            {t("article.englishOnly")}
          </p>
        )}

        {article.cover && (
          <Blueprint as="figure" style={{ margin: "0 0 var(--space-8)", padding: "var(--space-3)" }}>
            <ImageFrame image={article.cover} height={320} />
          </Blueprint>
        )}

        <div
          className="article-body"
          style={{ fontSize: 17, lineHeight: 1.75, color: "var(--color-neutral-800)" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <footer
          style={{
            marginTop: "calc(var(--space-8) * 1.5)",
            paddingTop: "var(--space-6)",
            borderTop: "1px solid var(--color-divider)",
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          <TagList tags={article.tags} />
          <Link to={`/${lang}/articles`} style={{ marginInlineStart: "auto", fontSize: 14 }}>
            {t("article.moreArticles")}
          </Link>
        </footer>
      </article>
    </main>
  );
}
