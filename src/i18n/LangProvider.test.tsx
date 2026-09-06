import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LangProvider, useLang } from "./LangProvider";

function Probe() {
  const { lang, t, l } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="known">{t("nav.home")}</span>
      <span data-testid="unknown">{t("no.such.key")}</span>
      <span data-testid="localized">{l({ en: "English", tr: "Türkçe" })}</span>
    </div>
  );
}

describe("LangProvider", () => {
  it("translates chrome keys into the active language", () => {
    render(
      <LangProvider lang="tr">
        <Probe />
      </LangProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("tr");
    expect(screen.getByTestId("known")).toHaveTextContent("Ana Sayfa");
    expect(screen.getByTestId("localized")).toHaveTextContent("Türkçe");
  });

  it("falls back to English per key for a missing translation", () => {
    render(
      <LangProvider lang="ar">
        <Probe />
      </LangProvider>
    );
    expect(screen.getByTestId("localized")).toHaveTextContent("English");
  });

  it("renders an unknown key as the key itself rather than blank", () => {
    render(
      <LangProvider lang="en">
        <Probe />
      </LangProvider>
    );
    expect(screen.getByTestId("unknown")).toHaveTextContent("no.such.key");
  });

  it("sets the document language and direction for Arabic", () => {
    render(
      <LangProvider lang="ar">
        <Probe />
      </LangProvider>
    );
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("sets left-to-right for Turkish", () => {
    render(
      <LangProvider lang="tr">
        <Probe />
      </LangProvider>
    );
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("throws a clear error when used outside a provider", () => {
    expect(() => render(<Probe />)).toThrow(/useLang must be used inside a LangProvider/);
  });
});
