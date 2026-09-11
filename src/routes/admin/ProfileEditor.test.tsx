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

/** The shape of the bits of Response the stores actually touch. */
type FakeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

/**
 * The editor reads the current profile before it will let anything be saved,
 * so every save test has to answer both calls. Routing by URL also keeps the
 * write assertions honest — they look up the write call rather than assuming
 * it is the first one.
 */
function stubFetch(write: Partial<FakeResponse>) {
  const mock = vi.fn(async (url: unknown, _init?: RequestInit): Promise<FakeResponse> => {
    if (String(url).includes("/__admin/read")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ "src/content/profile.json": JSON.stringify(profile) }),
        text: async () => "",
      };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => "", ...write };
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function writeCall(mock: ReturnType<typeof stubFetch>): { files: { path: string; content: string }[] } {
  const call = mock.mock.calls.find(([url]) => String(url).includes("/__admin/write"));
  if (!call) throw new Error("no write call was made");
  return JSON.parse((call[1]as RequestInit).body as string);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProfileEditor", () => {
  it("loads the profile the repository holds, not the bundled copy", async () => {
    // Unstubbed, the hydration read would be a real jsdom network request to
    // /__admin/read, which hangs long enough to time out the lazy route below
    // whenever the suite is under load.
    stubFetch({ ok: true, text: async () => "" });

    renderAdmin("/admin/profile");
    expect(await screen.findByLabelText("Headline")).toHaveValue(profile.headline.en);
    expect(screen.getByLabelText("Email")).toHaveValue(profile.email);
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
  });

  it("writes the edited profile to src/content/profile.json", async () => {
    const fetchMock = stubFetch({ ok: true, text: async () => "" });

    renderAdmin("/admin/profile");
    const headline = await screen.findByLabelText("Headline");
    await userEvent.clear(headline);
    await userEvent.type(headline, "Bashar Khoujah");
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(writeCall(fetchMock)).toBeTruthy());
    const body = writeCall(fetchMock);
    expect(body.files).toHaveLength(1);
    expect(body.files[0]!.path).toBe("src/content/profile.json");
    const written = JSON.parse(body.files[0]!.content);
    expect(written.headline.en).toBe("Bashar Khoujah");
    // Everything else survives the round trip.
    expect(written.email).toBe(profile.email);
    expect(written.skills).toHaveLength(profile.skills.length);
  });

  it("reports a failed save without losing the edit", async () => {
    stubFetch({ ok: false, status: 500, text: async () => "disk full" });

    renderAdmin("/admin/profile");
    const headline = await screen.findByLabelText("Headline");
    await userEvent.clear(headline);
    await userEvent.type(headline, "Bashar");
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/disk full/);
    expect(screen.getByLabelText("Headline")).toHaveValue("Bashar");
  });
});
