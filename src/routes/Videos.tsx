import { useLang } from "../i18n/LangProvider";
import { allVideos } from "../lib/content";
import PageHeader from "../components/PageHeader";
import VideoEmbed from "../components/VideoEmbed";

export default function Videos() {
  const { t } = useLang();

  return (
    <main>
      <PageHeader kicker={t("videos.kicker")} title={t("videos.title")} />
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-8)",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--space-6)",
        }}
      >
        {allVideos().map((video) => (
          <VideoEmbed key={video.id} video={video} />
        ))}
      </section>
    </main>
  );
}
