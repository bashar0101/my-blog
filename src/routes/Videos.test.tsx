import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allVideos } from "../lib/content";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Videos", () => {
  it("renders every video", () => {
    renderAt("/en/videos");
    // queryAll, not getAll: getAll throws on zero matches, and an empty
    // videos.json is valid content the owner can produce from the admin.
    expect(screen.queryAllByTestId("video-embed")).toHaveLength(allVideos().length);
  });

  it("embeds each video by its id on the privacy-preserving host", () => {
    const { container } = renderAt("/en/videos");
    const frames = [...container.querySelectorAll("iframe")];
    expect(frames).toHaveLength(allVideos().length);
    for (const [index, frame] of frames.entries()) {
      expect(frame.getAttribute("src")).toBe(
        `https://www.youtube-nocookie.com/embed/${allVideos()[index]!.youtubeId}`
      );
    }
  });
});
