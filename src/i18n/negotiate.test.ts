import { afterEach, describe, expect, it, vi } from "vitest";
import { negotiateLang, readStoredLang, STORAGE_KEY, storeLang } from "./negotiate";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("STORAGE_KEY", () => {
  it("is namespaced", () => {
    expect(STORAGE_KEY).toBe("portfolio:lang");
  });
});

describe("readStoredLang", () => {
  it("returns a stored supported language", () => {
    localStorage.setItem(STORAGE_KEY, "tr");
    expect(readStoredLang()).toBe("tr");
  });

  it("returns null for an unsupported stored value", () => {
    localStorage.setItem(STORAGE_KEY, "de");
    expect(readStoredLang()).toBeNull();
  });

  it("returns null instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readStoredLang()).toBeNull();
  });
});

describe("storeLang", () => {
  it("persists the language", () => {
    storeLang("ar");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("ar");
  });

  it("swallows a storage failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => storeLang("ar")).not.toThrow();
  });
});

describe("negotiateLang", () => {
  it("prefers the stored language", () => {
    localStorage.setItem(STORAGE_KEY, "ar");
    expect(negotiateLang(["tr-TR"])).toBe("ar");
  });

  it("falls back to a supported browser language", () => {
    expect(negotiateLang(["de-DE", "tr-TR", "en-US"])).toBe("tr");
  });

  it("ignores region subtags", () => {
    expect(negotiateLang(["AR-EG"])).toBe("ar");
  });

  it("defaults to English", () => {
    expect(negotiateLang(["de-DE", "fr-FR"])).toBe("en");
    expect(negotiateLang([])).toBe("en");
  });
});
