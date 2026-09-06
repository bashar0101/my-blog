import { useLang } from "../i18n/LangProvider";
import { allArticles } from "../lib/articles";
import PageHeader from "../components/PageHeader";
import ArticleRow from "../components/ArticleRow";

export default function Articles() {
  const { t } = useLang();

  return (
    <main>
      <PageHeader kicker={t("articles.kicker")} title={t("articles.title")} />
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        {allArticles().map((article) => (
          <ArticleRow key={article.slug} article={article} />
        ))}
      </section>
    </main>
  );
}
