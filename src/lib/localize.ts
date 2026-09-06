import type { Lang, LocalizedString } from "../types";

export const LANGS: readonly Lang[] = ["en", "tr", "ar"];

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

export function L(value: LocalizedString | undefined, lang: Lang): string {
  if (!value) return "";
  const translated = value[lang];
  if (translated != null && translated !== "") return translated;
  return value.en ?? "";
}
