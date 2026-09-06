import type { Video } from "../types";
import { useLang } from "../i18n/LangProvider";
import Blueprint from "./Blueprint";

export default function VideoEmbed({ video }: { video: Video }) {
  const { l } = useLang();
  const title = l(video.title);

  return (
    <Blueprint as="figure" style={{ margin: 0, padding: "var(--space-2)" }}>
      <div data-testid="video-embed" style={{ width: "100%", aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </div>
      <figcaption style={{ padding: "var(--space-2) 0 0", fontSize: 15 }}>{title}</figcaption>
    </Blueprint>
  );
}
