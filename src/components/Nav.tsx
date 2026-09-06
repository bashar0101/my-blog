import { Link, NavLink } from "react-router-dom";
import { useLang } from "../i18n/LangProvider";
import { profile } from "../lib/content";
import LangSwitcher from "./LangSwitcher";

export default function Nav() {
  const { lang, t, l } = useLang();
  const base = `/${lang}`;

  return (
    <nav
      className="nav"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-6)",
        padding: "var(--space-4) var(--space-8)",
        borderBottom: "1px solid var(--color-divider)",
      }}
    >
      <Link
        to={base}
        className="nav-brand"
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: 20,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--color-text)",
        }}
      >
        {l(profile.name)}
      </Link>
      <div
        style={{
          display: "flex",
          gap: "var(--space-6)",
          marginInlineStart: "auto",
          fontSize: 15,
        }}
      >
        <NavLink to={base} end>
          {t("nav.home")}
        </NavLink>
        <NavLink to={`${base}/projects`}>{t("nav.projects")}</NavLink>
        <NavLink to={`${base}/articles`}>{t("nav.articles")}</NavLink>
        <NavLink to={`${base}/videos`}>{t("nav.videos")}</NavLink>
      </div>
      <LangSwitcher />
      <a
        className="btn btn-secondary"
        href={l(profile.cv)}
        download
        style={{ whiteSpace: "nowrap" }}
      >
        {t("nav.downloadCV")}
      </a>
    </nav>
  );
}
