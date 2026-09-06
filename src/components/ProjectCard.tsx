import type { Project } from "../types";
import { useLang } from "../i18n/LangProvider";
import Blueprint from "./Blueprint";
import ImageFrame from "./ImageFrame";
import TagList from "./TagList";

export default function ProjectCard({ project }: { project: Project }) {
  const { t, l } = useLang();

  return (
    <Blueprint
      as="article"
      className="card"
      testId="project-card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
    >
      <ImageFrame image={project.image} height={160} />
      <span className="card-kicker">{l(project.kicker)}</span>
      <h3 className="card-title" style={{ margin: 0 }}>
        {l(project.title)}
      </h3>
      <p className="card-body" style={{ margin: 0 }}>
        {l(project.summary)}
      </p>
      <TagList tags={project.tags} />
      {project.url && (
        <a href={project.url} style={{ fontSize: 14 }}>
          {t("projects.caseStudy")}
        </a>
      )}
    </Blueprint>
  );
}
