import { Link, useLocation } from "react-router-dom";
import { LANGS } from "../lib/localize";
import { useLang } from "../i18n/LangProvider";

export default function LangSwitcher() {
  const { lang } = useLang();
  const { pathname } = useLocation();
  const rest = pathname.replace(/^\/(en|tr|ar)(?=\/|$)/, "");

  return (
    <div className="lang-switcher">
      {LANGS.map((code, index) => (
        <span key={code}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <Link to={`/${code}${rest}`} aria-current={code === lang ? "true" : undefined}>
            {code.toUpperCase()}
          </Link>
        </span>
      ))}
    </div>
  );
}
