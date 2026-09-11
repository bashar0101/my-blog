import { useLang } from "../i18n/LangProvider";
import { allVideos } from "../lib/content";
import PageHeader from "../components/PageHeader";
import VideoEmbed from "../components/VideoEmbed";

export default function Videos() {
  const { t } = useLang();

  return (
    <main>
      <PageHeader kicker={t("videos.kicker")} title={t("videos.title")} />
      <section className="shell grid-media">
        {allVideos().map((video) => (
          <VideoEmbed key={video.id} video={video} />
        ))}
      </section>
    </main>
  );
}
