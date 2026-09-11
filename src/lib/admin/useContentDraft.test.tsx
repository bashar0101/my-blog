import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useContentDraft } from "./useContentDraft";

const PATH = "src/content/videos.json";

/** The shape of the bits of Response the stores actually touch. */
type FakeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

function routedFetch(read: { ok: boolean; body?: unknown; status?: number }) {
  const mock = vi.fn(async (url: unknown, _init?: RequestInit): Promise<FakeResponse> => {
    if (String(url).includes("/__admin/read")) {
      return {
        ok: read.ok,
        status: read.status ?? 200,
        json: async () => read.body,
        text: async () => "read failed",
      };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => "ok" };
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function hydration() {
  return {
    paths: [PATH],
    parse: (files: Record<string, string | null>) => JSON.parse(files[PATH] ?? "[]") as string[],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useContentDraft hydration", () => {
  it("replaces the bundled seed with what the repository holds now", async () => {
    routedFetch({ ok: true, body: { [PATH]: '["from-the-repo"]' } });

    const { result } = renderHook(() => useContentDraft<string[]>(["stale-bundle"], hydration()));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.draft).toEqual(["from-the-repo"]);
  });

  /**
   * The whole point of hydrating. The bundled seed is the last *deployed*
   * content, so saving it would revert every commit made since that deploy.
   * If the read fails, the only safe move is to refuse the save.
   */
  it("refuses to save while the current content is unknown", async () => {
    const fetchMock = routedFetch({ ok: false, status: 500 });

    const { result } = renderHook(() => useContentDraft<string[]>(["stale-bundle"], hydration()));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.ready).toBe(false);

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.save(
        [{ path: PATH, content: "[]", encoding: "utf8" }],
        "content: update videos"
      );
    });

    expect(saved).toBe(false);
    expect(result.current.error).toMatch(/saving is disabled/i);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/__admin/write"))).toBe(false);
  });

  it("saves once hydrated", async () => {
    const fetchMock = routedFetch({ ok: true, body: { [PATH]: "[]" } });

    const { result } = renderHook(() => useContentDraft<string[]>(["stale-bundle"], hydration()));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.save(
        [{ path: PATH, content: "[]", encoding: "utf8" }],
        "content: update videos"
      );
    });

    expect(result.current.status).toBe("saved");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/__admin/write"))).toBe(true);
  });

  it("is ready immediately when the caller asks for no hydration", () => {
    const { result } = renderHook(() => useContentDraft<string[]>(["seed"]));
    expect(result.current.ready).toBe(true);
  });
});
