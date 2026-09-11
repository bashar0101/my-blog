import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

/**
 * A profile with no CV uploaded yet. Without the guard in Nav and Home the
 * button still renders with href="", which re-requests the current page under
 * a Download label.
 */
vi.mock("../lib/content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/content")>();
  return { ...actual, profile: { ...actual.profile, cv: { en: "" } } };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("CV download button", () => {
  it("is not rendered at all when no CV has been uploaded", async () => {
    renderAt("/en");
    // The nav renders eagerly; wait for it before asserting an absence.
    expect(await screen.findByRole("navigation")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download cv/i })).not.toBeInTheDocument();
  });

  it("leaves no empty href behind", async () => {
    const { container } = renderAt("/en");
    expect(await screen.findByRole("navigation")).toBeInTheDocument();
    expect([...container.querySelectorAll("a[download]")]).toHaveLength(0);
  });
});
