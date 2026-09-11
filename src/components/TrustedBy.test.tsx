import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrustedBy from "./TrustedBy";

describe("TrustedBy", () => {
  it("renders nothing when there is nobody to name", () => {
    // An empty "trusted by" strip says less than nothing, so the section is
    // absent rather than present and blank.
    const { container: none } = render(<TrustedBy heading="Trusted by" companies={[]} />);
    expect(none).toBeEmptyDOMElement();

    const { container: missing } = render(
      <TrustedBy heading="Trusted by" companies={undefined} />
    );
    expect(missing).toBeEmptyDOMElement();
  });

  it("ignores an entry whose name was left blank", () => {
    render(<TrustedBy heading="Trusted by" companies={[{ label: "   " }]} />);
    expect(screen.queryByTestId("trusted-by")).not.toBeInTheDocument();
  });

  it("names each company once to a screen reader, twice to the eye", () => {
    // Two copies make the scroll seamless; the duplicate is aria-hidden so it
    // is not read out a second time.
    render(<TrustedBy heading="Trusted by" companies={[{ label: "Senyora" }]} />);

    expect(screen.getAllByText("Senyora")).toHaveLength(2);
    const lists = screen.getByTestId("trusted-by").querySelectorAll("ul");
    expect(lists).toHaveLength(2);
    expect(lists[0]!.getAttribute("aria-hidden")).toBeNull();
    expect(lists[1]!.getAttribute("aria-hidden")).toBe("true");
  });

  it("links a company that has a site", () => {
    render(
      <TrustedBy heading="Trusted by" companies={[{ label: "Senyora", url: "senyora.example" }]} />
    );
    expect(screen.getAllByRole("link", { name: "Senyora" })[0]).toHaveAttribute(
      "href",
      "https://senyora.example/"
    );
  });

  it("refuses a link that is not http(s)", () => {
    render(
      <TrustedBy
        heading="Trusted by"
        companies={[{ label: "Senyora", url: "javascript:alert(1)" }]}
      />
    );
    expect(screen.queryByRole("link", { name: "Senyora" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Senyora")).toHaveLength(2);
  });

  it("labels the section for assistive tech", () => {
    render(<TrustedBy heading="Trusted by" companies={[{ label: "Senyora" }]} />);
    expect(screen.getByRole("region", { name: "Trusted by" })).toBeInTheDocument();
  });
});
