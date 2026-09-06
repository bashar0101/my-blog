import { useLang } from "../i18n/LangProvider";

export default function NotFound() {
  const { t } = useLang();

  return (
    <main
      data-testid="not-found"
      style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-8)" }}
    >
      <h1 style={{ textTransform: "uppercase" }}>404</h1>
      <p>{t("notFound.body")}</p>
    </main>
  );
}
