import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalFsStore } from "./LocalFsStore";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LocalFsStore", () => {
  it("posts the files to the dev-server write endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    await new LocalFsStore().write(
      [{ path: "src/content/profile.json", content: "{}", encoding: "utf8" }],
      "update profile"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/__admin/write");
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.message).toBe("update profile");
    expect(body.files).toEqual([
      { path: "src/content/profile.json", content: "{}", encoding: "utf8" },
    ]);
  });

  it("rejects a write outside the writable prefixes before any request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new LocalFsStore().write(
        [{ path: "package.json", content: "{}", encoding: "utf8" }],
        "nope"
      )
    ).rejects.toThrow(/not writable/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects the whole batch if any single path is disallowed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new LocalFsStore().write(
        [
          { path: "src/content/profile.json", content: "{}", encoding: "utf8" },
          { path: "../secrets", content: "x", encoding: "utf8" },
        ],
        "mixed"
      )
    ).rejects.toThrow(/not writable/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the server's message when the write fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "disk full" })
    );

    await expect(
      new LocalFsStore().write(
        [{ path: "src/content/profile.json", content: "{}", encoding: "utf8" }],
        "update"
      )
    ).rejects.toThrow(/disk full/);
  });
});
