import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToken, readToken, storeToken, TOKEN_KEY } from "./token";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("TOKEN_KEY", () => {
  it("is namespaced", () => {
    expect(TOKEN_KEY).toBe("portfolio:ghToken");
  });
});

describe("readToken", () => {
  it("returns a stored token", () => {
    localStorage.setItem(TOKEN_KEY, "ghp_abc");
    expect(readToken()).toBe("ghp_abc");
  });

  it("returns null when absent", () => {
    expect(readToken()).toBeNull();
  });

  it("returns null rather than throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readToken()).toBeNull();
  });
});

describe("storeToken", () => {
  it("persists the token", () => {
    storeToken("ghp_abc");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("ghp_abc");
  });

  it("swallows a storage failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => storeToken("ghp_abc")).not.toThrow();
  });
});

describe("clearToken", () => {
  it("removes the token", () => {
    storeToken("ghp_abc");
    clearToken();
    expect(readToken()).toBeNull();
  });
});
