import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import type { Project } from "../../types";

const PATH = "src/content/projects.json";

const seed: Project = {
  id: "p1",
  title: { en: "Senyora Restaurant" },
  kicker: { en: "Backend · API" },
  summary: { en: "A restaurant site." },
  tags: [],
  image: { src: "/img/senyora.jpg", alt: { en: "screenshot" } },
  url: "https://github.com/bashar0101/ecommerce-api",
  liveUrl: null,
  featured: true,
  order: 1,
};

function stubFetch() {
  const mock = vi.fn(async (url: unknown, _init?: RequestInit) => {
    if (String(url).includes("/__admin/read")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ [PATH]: JSON.stringify([seed]) }),
        text: async () => "",
      };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function savedProjects(mock: ReturnType<typeof stubFetch>): Project[] {
  const call = mock.mock.calls.find(([url]) => String(url).includes("/__admin/write"));
  if (!call) throw new Error("no write call was made");
  const body = JSON.parse((call[1] as RequestInit).body as string) as {
    files: { path: string; content: string }[];
  };
  return JSON.parse(body.files.find((file) => file.path === PATH)!.content);
}

/**
 * Each project sits in a <details>. Its fields are in the DOM either way, but
 * they cannot be focused while it is closed — the same reason clicking a
 * control inside a collapsed section does nothing in a real browser.
 */
async function openProjectSection() {
  await userEvent.click(await screen.findByText("Senyora Restaurant"));
}

function renderProjectsAdmin() {
  return render(
    <MemoryRouter initialEntries={["/admin/projects"]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProjectsEditor live site URL", () => {
  it("saves the deployed project's URL next to the case study", async () => {
    const fetchMock = stubFetch();

    renderProjectsAdmin();
    await openProjectSection();

    const live = screen.getByLabelText("Live site URL (optional)");
    await userEvent.type(live, "https://senyora.example");
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(savedProjects(fetchMock)).toBeTruthy());
    const [project] = savedProjects(fetchMock);

    expect(project!.liveUrl).toBe("https://senyora.example");
    // The case study is a separate link, not replaced by the live one.
    expect(project!.url).toBe("https://github.com/bashar0101/ecommerce-api");
  });

  it("stores an emptied field as null rather than an empty string", async () => {
    const fetchMock = stubFetch();

    renderProjectsAdmin();
    await openProjectSection();

    const caseStudy = screen.getByLabelText("Case-study URL (optional)");
    await userEvent.clear(caseStudy);
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(savedProjects(fetchMock)).toBeTruthy());
    expect(savedProjects(fetchMock)[0]!.url).toBeNull();
  });
});
