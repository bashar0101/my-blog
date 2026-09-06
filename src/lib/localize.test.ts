import { describe, expect, it } from "vitest";
import { isLang, L, LANGS } from "./localize";

describe("LANGS", () => {
  it("is exactly en, tr, ar", () => {
    expect(LANGS).toEqual(["en", "tr", "ar"]);
  });
});

describe("isLang", () => {
  it("accepts the three supported codes", () => {
    expect(isLang("en")).toBe(true);
    expect(isLang("tr")).toBe(true);
    expect(isLang("ar")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isLang("de")).toBe(false);
    expect(isLang("EN")).toBe(false);
    expect(isLang("")).toBe(false);
    expect(isLang(null)).toBe(false);
    expect(isLang(undefined)).toBe(false);
    expect(isLang(3)).toBe(false);
  });
});

describe("L", () => {
  const value = { en: "Projects", tr: "Projeler", ar: "المشاريع" };

  it("returns the requested language", () => {
    expect(L(value, "tr")).toBe("Projeler");
    expect(L(value, "ar")).toBe("المشاريع");
  });

  it("falls back to English per key when the language is missing", () => {
    expect(L({ en: "Skills" }, "tr")).toBe("Skills");
  });

  it("falls back to English when the translation is an empty string", () => {
    expect(L({ en: "Skills", tr: "" }, "tr")).toBe("Skills");
  });

  it("returns an empty string for an undefined value", () => {
    expect(L(undefined, "en")).toBe("");
  });
});
