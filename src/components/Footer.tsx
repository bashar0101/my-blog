import { useLang } from "../i18n/LangProvider";
import { profile } from "../lib/content";
import LangSwitcher from "./LangSwitcher";

export default function Footer() {
  const { l } = useLang();

  return (
    <footer
      className="site-footer"
      style={{
        borderTop: "1px solid var(--color-divider)",
        padding: "var(--space-6) var(--space-8)",
        display: "flex",
        maxWidth: 1200,
        margin: "0 auto",
        fontSize: 13,
        color: "var(--color-neutral-600)",
      }}
    >
      <span>© {new Date().getFullYear()} {l(profile.name)}</span>
      <span style={{ marginInlineStart: "auto" }}>
        <LangSwitcher />
      </span>
    </footer>
  );
}
