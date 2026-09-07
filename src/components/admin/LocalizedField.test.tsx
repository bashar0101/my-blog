import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LocalizedField from "./LocalizedField";

describe("LocalizedField", () => {
  it("shows the English value first", () => {
    render(
      <LocalizedField
        label="Headline"
        value={{ en: "Hello", tr: "Merhaba", ar: "مرحبا" }}
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText("Headline")).toHaveValue("Hello");
  });

  it("switches to another language without losing the others", async () => {
    render(
      <LocalizedField
        label="Headline"
        value={{ en: "Hello", tr: "Merhaba", ar: "مرحبا" }}
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("tab", { name: "TR" }));
    expect(screen.getByLabelText("Headline")).toHaveValue("Merhaba");
    await userEvent.click(screen.getByRole("tab", { name: "AR" }));
    expect(screen.getByLabelText("Headline")).toHaveValue("مرحبا");
  });

  it("reports an edit for the active language only", async () => {
    const onChange = vi.fn();
    render(
      <LocalizedField label="Headline" value={{ en: "Hello" }} onChange={onChange} />
    );
    await userEvent.type(screen.getByLabelText("Headline"), "!");
    expect(onChange).toHaveBeenLastCalledWith({ en: "Hello!" });
  });

  it("marks exactly one tab as selected", async () => {
    render(<LocalizedField label="Headline" value={{ en: "Hello" }} onChange={() => {}} />);
    const selected = screen.getAllByRole("tab").filter(
      (tab) => tab.getAttribute("aria-selected") === "true"
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("EN");
  });

  it("shows which languages are still empty", () => {
    render(<LocalizedField label="Headline" value={{ en: "Hello" }} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "TR" })).toHaveAttribute("data-empty", "true");
    expect(screen.getByRole("tab", { name: "EN" })).toHaveAttribute("data-empty", "false");
  });

  it("renders a textarea when multiline", () => {
    render(
      <LocalizedField label="About" value={{ en: "x" }} onChange={() => {}} multiline />
    );
    expect(screen.getByLabelText("About").tagName).toBe("TEXTAREA");
  });
});
