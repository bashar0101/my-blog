import { describe, expect, it } from "vitest";
import { externalHref } from "./links";

describe("externalHref", () => {
  it("keeps http and https links", () => {
    expect(externalHref("https://senyora.example")).toBe("https://senyora.example/");
    expect(externalHref("http://senyora.example/path")).toBe("http://senyora.example/path");
  });

  it("reads a bare domain as https", () => {
    expect(externalHref("senyora.example")).toBe("https://senyora.example/");
    expect(externalHref("  senyora.example/app  ")).toBe("https://senyora.example/app");
  });

  it("treats an empty or absent value as no link", () => {
    expect(externalHref(null)).toBeNull();
    expect(externalHref(undefined)).toBeNull();
    expect(externalHref("")).toBeNull();
    expect(externalHref("   ")).toBeNull();
  });

  /**
   * The admin's type="url" input accepts these, and the value is rendered
   * straight into an href. Rejecting them here is the only thing between a
   * typed-in scheme and a link every visitor can click.
   */
  it("refuses schemes that are not http(s)", () => {
    expect(externalHref("javascript:alert(1)")).toBeNull();
    expect(externalHref("JavaScript:alert(1)")).toBeNull();
    expect(externalHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(externalHref("vbscript:msgbox(1)")).toBeNull();
    expect(externalHref("file:///etc/passwd")).toBeNull();
  });

  it("refuses something that is not a URL at all", () => {
    expect(externalHref("http://")).toBeNull();
  });
});
