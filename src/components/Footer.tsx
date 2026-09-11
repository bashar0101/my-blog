import { useLang } from "../i18n/LangProvider";
import { profile } from "../lib/content";
import LangSwitcher from "./LangSwitcher";

export default function Footer() {
  const { l } = useLang();

  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} {l(profile.name)}</span>
      <span style={{ marginInlineStart: "auto" }}>
        <LangSwitcher />
      </span>
    </footer>
  );
}
