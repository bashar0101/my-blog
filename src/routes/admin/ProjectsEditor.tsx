import type { Project } from "../../types";
import { allProjects } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";

function blankProject(order: number): Project {
  return {
    id: `project-${crypto.randomUUID()}`,
    title: { en: "New project" },
    kicker: { en: "" },
    summary: { en: "" },
    tags: [],
    image: { src: "/img/placeholder.jpg", alt: { en: "" } },
    url: null,
    featured: false,
    order,
  };
}

export default function ProjectsEditor() {
  const { draft, setDraft, status, error, save } = useContentDraft<Project[]>(allProjects());
  const update = (index: number, next: Project) => setDraft(draft.map((item, i) => (i === index ? next : item)));

  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <h1 style={{ margin: 0, fontSize: 32 }}>Projects</h1>
    {draft.map((project, index) => <fieldset key={project.id} data-testid="project-editor" style={{ border: "1px solid var(--color-divider)", padding: "var(--space-4)" }}>
      <legend>{project.title.en || project.id}</legend>
      <LocalizedField label={`Title ${index + 1}`} value={project.title} onChange={(title) => update(index, { ...project, title })} />
      <LocalizedField label={`Kicker ${index + 1}`} value={project.kicker} onChange={(kicker) => update(index, { ...project, kicker })} />
      <LocalizedField label={`Summary ${index + 1}`} value={project.summary} multiline onChange={(summary) => update(index, { ...project, summary })} />
      <LocalizedField label={`Image description ${index + 1}`} value={project.image.alt} onChange={(alt) => update(index, { ...project, image: { ...project.image, alt } })} />
      <div className="field"><label htmlFor={`project-url-${index}`}>Case-study URL (optional)</label><input id={`project-url-${index}`} className="input" type="url" value={project.url ?? ""} onChange={(event) => update(index, { ...project, url: event.target.value || null })} /></div>
      <div className="field"><label htmlFor={`project-image-${index}`}>Image path</label><input id={`project-image-${index}`} className="input" value={project.image.src} onChange={(event) => update(index, { ...project, image: { ...project.image, src: event.target.value } })} /></div>
      <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}><input type="checkbox" checked={project.featured} onChange={(event) => update(index, { ...project, featured: event.target.checked })} />Featured on the home page</label>
      <button className="btn btn-secondary" type="button" onClick={() => setDraft(draft.filter((_, i) => i !== index))} style={{ marginTop: "var(--space-3)" }}>Remove project {index + 1}</button>
    </fieldset>)}
    <button className="btn btn-secondary" type="button" onClick={() => setDraft([...draft, blankProject(draft.length + 1)])} style={{ alignSelf: "flex-start" }}>Add project</button>
    <SaveBar status={status} error={error} onSave={() => save([{ path: "src/content/projects.json", content: JSON.stringify(draft, null, 2) + "\n", encoding: "utf8" }], "content: update projects")} />
  </div>;
}
