import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("routing", () => {
  it("renders the home page for a valid language", () => {
    renderAt("/en");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders navigation in the language from the URL", () => {
    renderAt("/tr");
    expect(screen.getByRole("link", { name: "Projeler" })).toBeInTheDocument();
  });

  it("rejects an unsupported language", () => {
    renderAt("/de");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });

  it("renders not-found for an unknown path", () => {
    renderAt("/en/nope");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });

  it("redirects the bare root to a language", () => {
    renderAt("/");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
