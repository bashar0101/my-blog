import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CvUpload, { cvRepoPath, cvUrl } from "./CvUpload";
import { isWritablePath } from "../../lib/store/paths";

function pdf(name = "bashar-cv.pdf"): File {
  return new File([new Uint8Array([37, 80, 68, 70])], name, { type: "application/pdf" });
}

describe("CvUpload", () => {
  it("turns a chosen PDF into a committable file and a public URL", async () => {
    const onChange = vi.fn();
    render(<CvUpload value={{ en: "" }} onChange={onChange} />);

    await userEvent.upload(screen.getByLabelText("CV file (EN)"), pdf());

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const [value, file] = onChange.mock.calls.at(-1)!;
    expect(value.en).toBe("/cv/cv-en.pdf");
    expect(file.path).toBe("public/cv/cv-en.pdf");
    expect(file.encoding).toBe("base64");
    expect(atob(file.content)).toBe("%PDF");
  });

  it("writes each language to its own file and leaves the others alone", async () => {
    const onChange = vi.fn();
    render(<CvUpload value={{ en: "/cv/cv-en.pdf" }} onChange={onChange} />);

    await userEvent.upload(screen.getByLabelText("CV file (TR)"), pdf("ozgecmis.pdf"));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const [value, file] = onChange.mock.calls.at(-1)!;
    expect(file.path).toBe("public/cv/cv-tr.pdf");
    expect(value.tr).toBe("/cv/cv-tr.pdf");
    expect(value.en).toBe("/cv/cv-en.pdf");
  });

  it("refuses a file that is not a PDF and commits nothing", async () => {
    const onChange = vi.fn();
    render(<CvUpload value={{ en: "" }} onChange={onChange} />);

    // applyAccept: false because the accept attribute is only a hint — a drag
    // and drop, or an OS file dialog set to "All files", still hands the input
    // whatever was chosen. The component has to check for itself.
    await userEvent.upload(
      screen.getByLabelText("CV file (EN)"),
      new File(["x"], "cv.pdf", { type: "image/jpeg" }),
      { applyAccept: false }
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/PDF/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still lets the link be typed, with no file to upload", async () => {
    const onChange = vi.fn();
    render(<CvUpload value={{ en: "" }} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("CV link (EN)"), "/");

    const [value, file] = onChange.mock.calls.at(-1)!;
    expect(value.en).toBe("/");
    expect(file).toBeNull();
  });
});

describe("CV paths", () => {
  it("are writable, so a save is not rejected by the store's path guard", () => {
    // public/cv/ had to be added to WRITABLE_PREFIXES; without it every CV
    // upload would fail at the last step with "Path is not writable".
    for (const lang of ["en", "tr", "ar"] as const) {
      expect(isWritablePath(cvRepoPath(lang))).toBe(true);
      expect(cvUrl(lang)).toBe(`/cv/cv-${lang}.pdf`);
    }
  });

  it("does not make the whole directory writable", () => {
    expect(isWritablePath("public/cv/")).toBe(false);
  });
});
