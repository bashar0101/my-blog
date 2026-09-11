import { describe, expect, it } from "vitest";
import { readFileAsBase64, validateImage, validatePdf } from "./readFileAsBase64";

function fakeFile(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validatePdf", () => {
  it("accepts a PDF within the size cap", () => {
    expect(validatePdf(fakeFile("cv.pdf", "application/pdf", 1024))).toBeNull();
  });

  it("rejects a file that is not a PDF, whatever it is named", () => {
    // The CV is published for download, so the reported type decides, not the
    // extension the file happens to carry.
    expect(validatePdf(fakeFile("cv.pdf", "image/jpeg", 1024))).toMatch(/PDF/);
  });

  it("rejects a file the browser could not identify", () => {
    expect(validatePdf(fakeFile("cv.pdf", "", 1024))).toMatch(/PDF/);
  });

  it("rejects a PDF over 10 MB", () => {
    const tooBig = { type: "application/pdf", size: 10 * 1024 * 1024 + 1 } as File;
    expect(validatePdf(tooBig)).toMatch(/10 MB/);
  });

  it("accepts one exactly at 10 MB", () => {
    const exact = { type: "application/pdf", size: 10 * 1024 * 1024 } as File;
    expect(validatePdf(exact)).toBeNull();
  });
});

describe("validateImage", () => {
  it("still rejects a PDF", () => {
    expect(validateImage(fakeFile("cv.pdf", "application/pdf", 1024))).toMatch(/JPEG|PNG|WebP/);
  });
});

describe("readFileAsBase64", () => {
  it("returns the payload without the data: prefix", async () => {
    const content = await readFileAsBase64(
      new File([new Uint8Array([37, 80, 68, 70])], "cv.pdf", { type: "application/pdf" })
    );

    expect(content).not.toContain(",");
    expect(content).not.toMatch(/^data:/);
    // "%PDF" — the bytes survive the round trip rather than being re-encoded.
    expect(atob(content)).toBe("%PDF");
  });
});
