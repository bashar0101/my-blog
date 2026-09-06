import { Outlet, useParams } from "react-router-dom";
import { isLang } from "../lib/localize";
import { LangProvider } from "../i18n/LangProvider";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import NotFound from "./NotFound";

export default function LangLayout() {
  const { lang } = useParams();
  if (!isLang(lang))
    return (
      <LangProvider lang="en">
        <NotFound />
      </LangProvider>
    );

  return (
    <LangProvider lang={lang}>
      <div
        style={{
          background: "var(--color-bg)",
          color: "var(--color-text)",
          fontFamily: "var(--font-body)",
          minHeight: "100%",
        }}
      >
        <Nav />
        <Outlet />
        <Footer />
      </div>
    </LangProvider>
  );
}
