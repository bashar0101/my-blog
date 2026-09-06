import { useLang } from "../i18n/LangProvider";
import { allProjects } from "../lib/content";
import PageHeader from "../components/PageHeader";
import ProjectCard from "../components/ProjectCard";

export default function Projects() {
  const { t } = useLang();

  return (
    <main>
      <PageHeader kicker={t("projects.kicker")} title={t("projects.title")} />
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-8)",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-6)",
        }}
      >
        {allProjects().map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </section>
    </main>
  );
}
