import { Link, NavLink } from "react-router-dom";
import { useLang } from "../i18n/LangProvider";
import { profile } from "../lib/content";
import LangSwitcher from "./LangSwitcher";

export default function Nav() {
  const { lang, t, l } = useLang();
  const base = `/${lang}`;

  return (
    <nav className="nav" style={{ borderBottom: "1px solid var(--color-divider)" }}>
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
      <div className="nav-links">
        <NavLink to={base} end>
          {t("nav.home")}
        </NavLink>
        <NavLink to={`${base}/projects`}>{t("nav.projects")}</NavLink>
        <NavLink to={`${base}/articles`}>{t("nav.articles")}</NavLink>
        <NavLink to={`${base}/videos`}>{t("nav.videos")}</NavLink>
      </div>
      <LangSwitcher />
      {/* No CV uploaded yet: an empty href would re-request the current page
          under a Download button, which is worse than no button at all. */}
      {l(profile.cv) !== "" && (
        <a
          className="btn btn-secondary"
          href={l(profile.cv)}
          download
          style={{ whiteSpace: "nowrap" }}
        >
          {t("nav.downloadCV")}
        </a>
      )}
    </nav>
  );
}
