import { Link } from "react-router-dom";
import { useLang } from "../i18n/LangProvider";
import { featuredProjects, featuredVideos, profile } from "../lib/content";
import { latestArticles } from "../lib/articles";
import Blueprint from "../components/Blueprint";
import ImageFrame from "../components/ImageFrame";
import ProjectCard from "../components/ProjectCard";
import ArticleRow from "../components/ArticleRow";
import VideoEmbed from "../components/VideoEmbed";
import SectionHeading from "../components/SectionHeading";
import ContactForm from "../components/ContactForm";
import TagList from "../components/TagList";

const section = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "var(--space-8)",
  borderTop: "1px solid var(--color-divider)",
} as const;

export default function Home() {
  const { lang, t, l } = useLang();

  return (
    <main>
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "var(--space-8)",
          alignItems: "center",
          padding: "calc(var(--space-8) * 2.5) var(--space-8)",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: 14,
              color: "var(--color-accent-700)",
            }}
          >
            {l(profile.kicker)}
          </span>
          <h1 style={{ margin: 0, fontSize: 64, lineHeight: 1.05, textTransform: "uppercase" }}>
            {l(profile.headline)}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: "52ch",
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--color-neutral-700)",
            }}
          >
            {l(profile.intro)}
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
            <Blueprint as="div">
              <Link className="btn btn-primary" to={`/${lang}/projects`}>
                {t("hero.viewProjects")}
              </Link>
            </Blueprint>
            <a className="btn btn-secondary" href="#contact">
              {t("hero.contactMe")}
            </a>
          </div>
        </div>
        <Blueprint as="figure" style={{ margin: 0, padding: "var(--space-3)" }}>
          <ImageFrame image={profile.portrait} height={340} />
        </Blueprint>
      </header>

      <section style={{ ...section, display: "grid", gridTemplateColumns: "220px 1fr", gap: "var(--space-8)" }}>
        <h2 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("about.heading")}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.7,
            color: "var(--color-neutral-700)",
            maxWidth: "68ch",
          }}
        >
          {l(profile.about)}
        </p>
      </section>

      <section style={section}>
        <SectionHeading
          title={t("featured.heading")}
          linkTo={`/${lang}/projects`}
          linkLabel={t("featured.viewAll")}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-6)" }}>
          {featuredProjects().map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      <section
        style={{
          ...section,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "calc(var(--space-8) * 2)",
        }}
      >
        <div>
          <SectionHeading
            title={t("latest.heading")}
            linkTo={`/${lang}/articles`}
            linkLabel={t("latest.viewAll")}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {latestArticles().map((article) => (
              <ArticleRow key={article.slug} article={article} />
            ))}
          </div>
        </div>
        <div>
          <SectionHeading
            title={t("videosHome.heading")}
            linkTo={`/${lang}/videos`}
            linkLabel={t("videosHome.viewAll")}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {featuredVideos().map((video) => (
              <VideoEmbed key={video.id} video={video} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...section, display: "grid", gridTemplateColumns: "220px 1fr", gap: "var(--space-8)" }}>
        <h2 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("skills.heading")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {profile.skills.map((group) => (
            <div
              key={group.group.en}
              style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}
            >
              <span
                style={{
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-neutral-600)",
                  width: 90,
                }}
              >
                {l(group.group)}
              </span>
              <TagList tags={group.items} />
            </div>
          ))}
        </div>
      </section>

      <section
        id="contact"
        style={{
          ...section,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "calc(var(--space-8) * 2)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <h2 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {t("contact.heading")}
          </h2>
          <a href={`mailto:${profile.email}`} style={{ fontSize: 17 }}>
            {profile.email}
          </a>
          <div style={{ display: "flex", gap: "var(--space-4)", fontSize: 15 }}>
            {profile.socials.map((social) => (
              <a key={social.label} href={social.url}>
                {social.label}
              </a>
            ))}
          </div>
          <a
            className="btn btn-secondary"
            href={l(profile.cv)}
            download
            style={{ alignSelf: "flex-start" }}
          >
            {t("nav.downloadCV")}
          </a>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
