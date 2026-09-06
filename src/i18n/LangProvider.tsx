import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { Lang, LocalizedString } from "../types";
import { L } from "../lib/localize";
import { ui } from "../lib/content";
import { storeLang } from "./negotiate";

interface LangContextValue {
  lang: Lang;
  t: (key: string) => string;
  l: (value: LocalizedString | undefined) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    storeLang(lang);
  }, [lang]);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      l: (localized) => L(localized, lang),
      t: (key) => {
        const entry = ui[key];
        if (!entry) {
          if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
          return key;
        }
        return L(entry, lang);
      },
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang must be used inside a LangProvider");
  return value;
}
