import { useMemo, useState } from "react";
import type { Article, Lang } from "../../types";
import { allArticlesForAdmin } from "../../lib/articles";
import { renderMarkdown } from "../../lib/markdown";
import { LANGS } from "../../lib/localize";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";
import { articleToFiles, slugify } from "../../lib/admin/articleFiles";
import type { StoredFile } from "../../lib/store";
import ImageUpload from "../../components/admin/ImageUpload";

function today() { return new Date().toISOString().slice(0, 10); }
function blankArticle(): Article {
  const date = today();
  return { slug: slugify("new article", date), date, topic: { en: "" }, title: { en: "New article" }, standfirst: { en: "" }, readingMinutes: 5, tags: [], cover: null, featured: false, published: false, bodies: { en: "" } };
}
function deletionFiles(article: Article): StoredFile[] {
  return ["meta.json", ...LANGS.filter((lang) => article.bodies[lang]?.trim()).map((lang) => `${lang}.md`)].map((name) => ({ path: `content/articles/${article.slug}/${name}`, content: "", encoding: "utf8", delete: true }));
}

export default function ArticlesEditor() {
  const articles = useMemo(() => allArticlesForAdmin(), []);
  const [editing, setEditing] = useState<Article | null>(null);
  const [removed, setRemoved] = useState<Article | null>(null);
  if (editing) return <ArticleForm article={editing} onClose={() => setEditing(null)} />;
  if (removed) return <RemoveArticle article={removed} onClose={() => setRemoved(null)} />;
  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <h1 style={{ margin: 0, fontSize: 32 }}>Articles</h1>
    <button className="btn btn-primary" type="button" onClick={() => setEditing(blankArticle())} style={{ alignSelf: "flex-start" }}>New article</button>
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-3)" }}>{articles.map((article) => <li key={article.slug} data-testid="article-row-admin" style={{ display: "flex", gap: "var(--space-3)", alignItems: "baseline" }}><span style={{ fontSize: 13 }}>{article.date}</span><span style={{ flex: 1 }}>{article.title.en}</span><button className="btn btn-secondary" type="button" onClick={() => setEditing(article)}>Edit</button><button className="btn btn-secondary" type="button" onClick={() => setRemoved(article)}>Remove</button></li>)}</ul>
  </div>;
}

function RemoveArticle({ article, onClose }: { article: Article; onClose: () => void }) {
  const { status, error, save } = useContentDraft(article);
  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}><h1 style={{ margin: 0, fontSize: 32 }}>Remove article</h1><p style={{ margin: 0 }}>Permanently remove “{article.title.en}” and its language files?</p><div style={{ display: "flex", gap: "var(--space-3)" }}><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button><SaveBar status={status} error={error} onSave={async () => { if (await save(deletionFiles(article), `content: remove article ${article.slug}`)) onClose(); }} /></div></div>;
}

function ArticleForm({ article, onClose }: { article: Article; onClose: () => void }) {
  const { draft, setDraft, status, error, save } = useContentDraft<Article>(article);
  const [bodyLang, setBodyLang] = useState<Lang>("en");
  const [coverFile, setCoverFile] = useState<StoredFile | null>(null);
  const body = draft.bodies[bodyLang] ?? "";
  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)" }}><h1 style={{ margin: 0, fontSize: 32 }}>Edit article</h1><button className="btn btn-secondary" type="button" onClick={onClose} style={{ marginInlineStart: "auto" }}>Back to list</button></div>
    <div className="field"><label htmlFor="article-slug">Slug</label><input id="article-slug" className="input" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() })} /></div>
    <div className="field"><label htmlFor="article-date">Date</label><input id="article-date" className="input" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></div>
    <LocalizedField label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
    <LocalizedField label="Topic" value={draft.topic} onChange={(topic) => setDraft({ ...draft, topic })} />
    <LocalizedField label="Standfirst" value={draft.standfirst} multiline onChange={(standfirst) => setDraft({ ...draft, standfirst })} />
    <fieldset style={{ border: "1px solid var(--color-divider)", padding: "var(--space-3)" }}><legend>Tags</legend>
      {draft.tags.map((tag, index) => <div key={index} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}><div className="field" style={{ flex: 1 }}><label htmlFor={`article-tag-${index}`}>Tag</label><input id={`article-tag-${index}`} className="input" value={tag.label} onChange={(event) => { const tags = [...draft.tags]; tags[index] = { ...tag, label: event.target.value }; setDraft({ ...draft, tags }); }} /></div><button className="btn btn-secondary" type="button" onClick={() => setDraft({ ...draft, tags: draft.tags.filter((_, i) => i !== index) })}>Remove tag</button></div>)}
      <button className="btn btn-secondary" type="button" onClick={() => setDraft({ ...draft, tags: [...draft.tags, { label: "New tag", tone: "neutral" }] })}>Add tag</button>
    </fieldset>
    <LocalizedField label="Cover image description" value={draft.cover?.alt ?? { en: "" }} onChange={(alt) => setDraft({ ...draft, cover: { src: draft.cover?.src ?? "", alt } })} />
    <ImageUpload label="Cover image" value={draft.cover?.src ?? ""} onChange={(src, file) => { setDraft({ ...draft, cover: { src, alt: draft.cover?.alt ?? { en: "" } } }); setCoverFile(file); }} />
    <div className="field"><label htmlFor="article-minutes">Reading minutes</label><input id="article-minutes" className="input" type="number" min="1" value={draft.readingMinutes} onChange={(event) => setDraft({ ...draft, readingMinutes: Math.max(1, Number(event.target.value) || 1) })} /></div>
    <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} />Published</label>
    <div role="tablist" aria-label="Body language" style={{ display: "flex", gap: "var(--space-2)" }}>{LANGS.map((lang) => <button key={lang} type="button" role="tab" aria-selected={lang === bodyLang} className="btn btn-secondary" onClick={() => setBodyLang(lang)}>{lang.toUpperCase()}</button>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}><div className="field"><label htmlFor="article-body">Body (Markdown)</label><textarea id="article-body" className="input" rows={20} value={body} dir={bodyLang === "ar" ? "rtl" : "ltr"} onChange={(event) => setDraft({ ...draft, bodies: { ...draft.bodies, [bodyLang]: event.target.value } })} /></div><div data-testid="markdown-preview" className="article-body" style={{ border: "1px solid var(--color-divider)", padding: "var(--space-4)" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} /></div>
    <SaveBar status={status} error={error} onSave={() => save([...articleToFiles(draft), ...(draft.slug !== article.slug ? deletionFiles(article) : []), ...(coverFile ? [coverFile] : [])], `content: update article ${draft.slug}`)} />
  </div>;
}
