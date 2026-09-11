import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { profile } from "../../lib/content";

function renderAdmin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProfileEditor", () => {
  it("loads the current profile into the form", async () => {
    renderAdmin("/admin/profile");
    expect(await screen.findByLabelText("Headline")).toHaveValue(profile.headline.en);
    expect(screen.getByLabelText("Email")).toHaveValue(profile.email);
  });

  it("writes the edited profile to src/content/profile.json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin("/admin/profile");
    const headline = await screen.findByLabelText("Headline");
    await userEvent.clear(headline);
    await userEvent.type(headline, "Bashar Khoujah");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.files).toHaveLength(1);
    expect(body.files[0].path).toBe("src/content/profile.json");
    const written = JSON.parse(body.files[0].content);
    expect(written.headline.en).toBe("Bashar Khoujah");
    // Everything else survives the round trip.
    expect(written.email).toBe(profile.email);
    expect(written.skills).toHaveLength(profile.skills.length);
  });

  it("reports a failed save without losing the edit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "disk full" })
    );

    renderAdmin("/admin/profile");
    const headline = await screen.findByLabelText("Headline");
    await userEvent.clear(headline);
    await userEvent.type(headline, "Bashar");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/disk full/);
    expect(screen.getByLabelText("Headline")).toHaveValue("Bashar");
  });
});
