import type { Project } from "../types";
import { useLang } from "../i18n/LangProvider";
import { externalHref } from "../lib/links";
import Blueprint from "./Blueprint";
import ImageFrame from "./ImageFrame";
import TagList from "./TagList";

export default function ProjectCard({ project }: { project: Project }) {
  const { t, l } = useLang();
  const live = externalHref(project.liveUrl);
  const caseStudy = externalHref(project.url);
  // The image is the biggest target on the card, so it goes to the most real
  // destination there is: the running site, or the write-up when nothing is
  // deployed. With neither, it stays a plain image rather than a dead link.
  const imageHref = live ?? caseStudy;

  const image = <ImageFrame image={project.image} height={160} />;

  return (
    <Blueprint
      as="article"
      className="card"
      testId="project-card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
    >
      {imageHref ? (
        <a
          href={imageHref}
          // The alt text describes the picture, not where the link goes, so the
          // link is named after the project instead.
          aria-label={l(project.title)}
          data-testid="project-image-link"
          // The link's content is the picture; an inherited underline would
          // draw a stray rule under the frame.
          style={{ display: "block", textDecoration: "none" }}
        >
          {image}
        </a>
      ) : (
        image
      )}
      <span className="card-kicker">{l(project.kicker)}</span>
      <h3 className="card-title" style={{ margin: 0 }}>
        {l(project.title)}
      </h3>
      <p className="card-body" style={{ margin: 0 }}>
        {l(project.summary)}
      </p>
      <TagList tags={project.tags} />
      {(live || caseStudy) && (
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", fontSize: 14 }}>
          {live && <a href={live}>{t("projects.liveSite")}</a>}
          {caseStudy && <a href={caseStudy}>{t("projects.caseStudy")}</a>}
        </div>
      )}
    </Blueprint>
  );
}
