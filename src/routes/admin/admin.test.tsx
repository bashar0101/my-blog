import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  localStorage.clear();
  document.head.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove());
});

describe("admin route", () => {
  it("renders the admin index at /admin", async () => {
    renderAt("/admin");
    expect(await screen.findByRole("heading", { name: /content admin/i })).toBeInTheDocument();
  });

  it("is not language-prefixed", async () => {
    renderAt("/admin");
    expect(await screen.findByRole("heading", { name: /content admin/i })).toBeInTheDocument();
    expect(screen.queryByTestId("not-found")).not.toBeInTheDocument();
  });

  it("marks itself noindex so it cannot be indexed", async () => {
    renderAt("/admin");
    await screen.findByRole("heading", { name: /content admin/i });
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots).not.toBeNull();
    expect(robots!.getAttribute("content")).toContain("noindex");
  });

  it("links to every editor section", async () => {
    renderAt("/admin");
    await screen.findByRole("heading", { name: /content admin/i });
    for (const name of [/profile/i, /projects/i, /videos/i, /articles/i, /interface strings/i]) {
      // AdminLayout's nav and AdminHome's index both link to each section with
      // the same accessible name, so more than one match is correct — not a bug.
      expect(screen.getAllByRole("link", { name }).length).toBeGreaterThan(0);
    }
  });

  it("does not render the public site chrome", async () => {
    renderAt("/admin");
    await screen.findByRole("heading", { name: /content admin/i });
    // The public Nav renders a language switcher; the admin must not.
    expect(screen.queryByRole("link", { name: "TR" })).not.toBeInTheDocument();
  });
});
