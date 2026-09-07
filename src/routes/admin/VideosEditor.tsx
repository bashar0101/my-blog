import type { Video } from "../../types";
import { allVideos } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";
import CollapsibleSection from "../../components/admin/CollapsibleSection";

export function normalizeYouTubeId(input: string): string {
  const value = input.trim();
  const match = /(?:[?&]v=|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]+)/.exec(value);
  return match?.[1] ?? value;
}

function blankVideo(order: number): Video {
  return { id: `video-${crypto.randomUUID()}`, title: { en: "New video" }, youtubeId: "", description: { en: "" }, featured: false, order };
}

export default function VideosEditor() {
  const { draft, setDraft, status, error, save } = useContentDraft<Video[]>(allVideos());
  const update = (index: number, next: Video) => setDraft(draft.map((item, i) => (i === index ? next : item)));
  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <h1 style={{ margin: 0, fontSize: 32 }}>Videos</h1>
    {draft.map((video, index) => <CollapsibleSection key={video.id} testId="video-editor" title={video.title.en || video.id}>
      <LocalizedField label={`Video title ${index + 1}`} value={video.title} onChange={(title) => update(index, { ...video, title })} />
      <LocalizedField label={`Video description ${index + 1}`} value={video.description ?? { en: "" }} multiline onChange={(description) => update(index, { ...video, description })} />
      <div className="field"><label htmlFor={`video-id-${index}`}>YouTube video ID or URL</label><input id={`video-id-${index}`} className="input" value={video.youtubeId} onChange={(event) => update(index, { ...video, youtubeId: event.target.value })} /></div>
      <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}><input type="checkbox" checked={video.featured} onChange={(event) => update(index, { ...video, featured: event.target.checked })} />Featured on the home page</label>
      <button className="btn btn-secondary" type="button" onClick={() => setDraft(draft.filter((_, i) => i !== index))} style={{ marginTop: "var(--space-3)" }}>Remove video {index + 1}</button>
    </CollapsibleSection>)}
    <button className="btn btn-secondary" type="button" onClick={() => setDraft([...draft, blankVideo(draft.length + 1)])} style={{ alignSelf: "flex-start" }}>Add video</button>
    <SaveBar status={status} error={error} onSave={() => save([{ path: "src/content/videos.json", content: JSON.stringify(draft.map((video) => ({ ...video, youtubeId: normalizeYouTubeId(video.youtubeId) })), null, 2) + "\n", encoding: "utf8" }], "content: update videos")} />
  </div>;
}
