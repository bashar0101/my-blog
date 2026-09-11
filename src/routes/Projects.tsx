import { useLang } from "../i18n/LangProvider";
import { allProjects } from "../lib/content";
import PageHeader from "../components/PageHeader";
import ProjectCard from "../components/ProjectCard";

export default function Projects() {
  const { t } = useLang();

  return (
    <main>
      <PageHeader kicker={t("projects.kicker")} title={t("projects.title")} />
      <section className="shell grid-cards">
        {allProjects().map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </section>
    </main>
  );
}
