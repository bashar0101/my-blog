import { useState } from "react";
import type { Project } from "../../types";
import { allProjects } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";
import CollapsibleSection from "../../components/admin/CollapsibleSection";
import ImageUpload from "../../components/admin/ImageUpload";
import type { StoredFile } from "../../lib/store";
import { parseJsonFile } from "../../lib/admin/hydrate";

const PATH = "src/content/projects.json";

function blankProject(order: number): Project {
  return {
    id: `project-${crypto.randomUUID()}`,
    title: { en: "New project" },
    kicker: { en: "" },
    summary: { en: "" },
    tags: [],
    image: { src: "/img/placeholder.jpg", alt: { en: "" } },
    url: null,
    liveUrl: null,
    featured: false,
    order,
  };
}

export default function ProjectsEditor() {
  const { draft, setDraft, status, error, save, ready } = useContentDraft<Project[]>(allProjects(), {
    paths: [PATH],
    parse: (files) => parseJsonFile<Project[]>(files, PATH, allProjects()).slice().sort((a, b) => a.order - b.order),
  });
  const [imageFiles, setImageFiles] = useState<Record<string, StoredFile>>({});
  const update = (index: number, next: Project) => setDraft(draft.map((item, i) => (i === index ? next : item)));

  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <h1 style={{ margin: 0, fontSize: 32 }}>Projects</h1>
    {draft.map((project, index) => <CollapsibleSection key={project.id} testId="project-editor" title={project.title.en || project.id}>
      <LocalizedField label={`Title ${index + 1}`} value={project.title} onChange={(title) => update(index, { ...project, title })} />
      <LocalizedField label={`Kicker ${index + 1}`} value={project.kicker} onChange={(kicker) => update(index, { ...project, kicker })} />
      <LocalizedField label={`Summary ${index + 1}`} value={project.summary} multiline onChange={(summary) => update(index, { ...project, summary })} />
      <fieldset style={{ border: "1px solid var(--color-divider)", padding: "var(--space-3)" }}><legend>Technologies</legend>
        {project.tags.map((tag, tagIndex) => <div key={tagIndex} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}><div className="field" style={{ flex: 1 }}><label htmlFor={`project-tag-${index}-${tagIndex}`}>Technology</label><input id={`project-tag-${index}-${tagIndex}`} className="input" value={tag.label} onChange={(event) => { const tags = [...project.tags]; tags[tagIndex] = { ...tag, label: event.target.value }; update(index, { ...project, tags }); }} /></div><button className="btn btn-secondary" type="button" onClick={() => update(index, { ...project, tags: project.tags.filter((_, i) => i !== tagIndex) })}>Remove technology</button></div>)}
        <button className="btn btn-secondary" type="button" onClick={() => update(index, { ...project, tags: [...project.tags, { label: "New technology", tone: "neutral" }] })}>Add technology</button>
      </fieldset>
      <LocalizedField label={`Image description ${index + 1}`} value={project.image.alt} onChange={(alt) => update(index, { ...project, image: { ...project.image, alt } })} />
      <div className="field"><label htmlFor={`project-url-${index}`}>Case-study URL (optional)</label><input id={`project-url-${index}`} className="input" type="url" placeholder="Write-up or repository" value={project.url ?? ""} onChange={(event) => update(index, { ...project, url: event.target.value || null })} /></div>
      <div className="field"><label htmlFor={`project-live-${index}`}>Live site URL (optional)</label><input id={`project-live-${index}`} className="input" type="url" placeholder="The deployed project, if it is live" value={project.liveUrl ?? ""} onChange={(event) => update(index, { ...project, liveUrl: event.target.value || null })} /><p style={{ margin: 0, fontSize: 13, color: "var(--color-neutral-700)" }}>Clicking the project image opens this. With no live site it opens the case study instead.</p></div>
      <ImageUpload label={`Project image ${index + 1}`} value={project.image.src} onChange={(src, file) => { update(index, { ...project, image: { ...project.image, src } }); setImageFiles((files) => { const next = { ...files }; if (file) next[project.id] = file; else delete next[project.id]; return next; }); }} />
      <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}><input type="checkbox" checked={project.featured} onChange={(event) => update(index, { ...project, featured: event.target.checked })} />Featured on the home page</label>
      <button className="btn btn-secondary" type="button" onClick={() => setDraft(draft.filter((_, i) => i !== index))} style={{ marginTop: "var(--space-3)" }}>Remove project {index + 1}</button>
    </CollapsibleSection>)}
    <button className="btn btn-secondary" type="button" onClick={() => setDraft([...draft, blankProject(draft.length + 1)])} style={{ alignSelf: "flex-start" }}>Add project</button>
    <SaveBar status={status} error={error} ready={ready} onSave={() => save([...Object.values(imageFiles), { path: PATH, content: JSON.stringify(draft, null, 2) + "\n", encoding: "utf8" }], "content: update projects")} />
  </div>;
}
