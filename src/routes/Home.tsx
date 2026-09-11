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
import SkillSphere from "../components/SkillSphere";
import TrustedBy from "../components/TrustedBy";

export default function Home() {
  const { lang, t, l } = useLang();

  return (
    <main>
      <header className="shell hero grid-hero">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span className="page-kicker">{l(profile.kicker)}</span>
          <h1 className="hero-title">{l(profile.headline)}</h1>
          <p className="hero-lead">{l(profile.intro)}</p>
          <div className="hero-actions">
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

      <TrustedBy heading={t("trusted.heading")} companies={profile.trustedBy} />

      <section className="shell section grid-aside">
        <SectionHeading title={t("about.heading")} />
        <p className="prose-lead">{l(profile.about)}</p>
      </section>

      <section className="shell section">
        <SectionHeading
          title={t("featured.heading")}
          linkTo={`/${lang}/projects`}
          linkLabel={t("featured.viewAll")}
        />
        <div className="grid-cards">
          {featuredProjects().map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      <section className="shell section grid-halves">
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

      <section className="shell section grid-aside">
        <SectionHeading title={t("skills.heading")} />
        <div className="skills-list">
          {/* The group names, once, as a line above the cloud. Repeating each
              group's tags underneath would put every skill on the page twice. */}
          <p className="skills-groups">
            {profile.skills.map((group) => l(group.group)).join(" · ")}
          </p>
          <SkillSphere skills={profile.skills} />
        </div>
      </section>

      <section id="contact" className="shell section grid-halves">
        <div className="contact-details">
          <SectionHeading title={t("contact.heading")} />
          <a href={`mailto:${profile.email}`} style={{ fontSize: 17 }}>
            {profile.email}
          </a>
          <div className="contact-socials">
            {profile.socials.map((social) => (
              <a key={social.label} href={social.url}>
                {social.label}
              </a>
            ))}
          </div>
          {l(profile.cv) !== "" && (
            <a
              className="btn btn-secondary"
              href={l(profile.cv)}
              download
              style={{ alignSelf: "flex-start" }}
            >
              {t("nav.downloadCV")}
            </a>
          )}
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
