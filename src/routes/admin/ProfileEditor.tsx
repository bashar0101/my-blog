import { useState } from "react";
import type { Profile } from "../../types";
import { profile as currentProfile } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";
import CollapsibleSection from "../../components/admin/CollapsibleSection";
import ImageUpload from "../../components/admin/ImageUpload";
import type { StoredFile } from "../../lib/store";
import { parseJsonFile } from "../../lib/admin/hydrate";

const PATH = "src/content/profile.json";

export default function ProfileEditor() {
  const { draft, setDraft, status, error, save, ready } = useContentDraft<Profile>(currentProfile, {
    paths: [PATH],
    parse: (files) => parseJsonFile(files, PATH, currentProfile),
  });
  const [portraitFile, setPortraitFile] = useState<StoredFile | null>(null);

  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Profile</h1>

      <CollapsibleSection title="Core profile" open>
      <LocalizedField label="Name" value={draft.name} onChange={(v) => field("name", v)} />
      <LocalizedField label="Kicker" value={draft.kicker} onChange={(v) => field("kicker", v)} />
      <LocalizedField label="Headline" value={draft.headline} onChange={(v) => field("headline", v)} />
      <LocalizedField label="Intro" value={draft.intro} onChange={(v) => field("intro", v)} multiline />
      <LocalizedField label="About" value={draft.about} onChange={(v) => field("about", v)} multiline />
      <LocalizedField label="CV link" value={draft.cv} onChange={(v) => field("cv", v)} />

      <div className="field">
        <label htmlFor="profile-email">Email</label>
        <input
          id="profile-email"
          className="input"
          type="email"
          value={draft.email}
          onChange={(event) => field("email", event.target.value)}
        />
      </div>

      <fieldset style={{ border: "1px solid var(--color-divider)", padding: "var(--space-4)" }}>
        <legend>Portrait</legend>
        <ImageUpload label="Portrait" value={draft.portrait.src} onChange={(src, file) => { field("portrait", { ...draft.portrait, src }); setPortraitFile(file); }} />
        <LocalizedField label="Portrait description" value={draft.portrait.alt} onChange={(alt) => field("portrait", { ...draft.portrait, alt })} />
      </fieldset>
      </CollapsibleSection>

      <CollapsibleSection title="Social links">
        {draft.socials.map((social, index) => (
          <div key={index} style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor={`social-label-${index}`}>Label</label>
              <input
                id={`social-label-${index}`}
                className="input"
                value={social.label}
                onChange={(event) => {
                  const socials = [...draft.socials];
                  socials[index] = { ...social, label: event.target.value };
                  field("socials", socials);
                }}
              />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor={`social-url-${index}`}>URL</label>
              <input
                id={`social-url-${index}`}
                className="input"
                value={social.url}
                onChange={(event) => {
                  const socials = [...draft.socials];
                  socials[index] = { ...social, url: event.target.value };
                  field("socials", socials);
                }}
              />
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => field("socials", draft.socials.filter((_, i) => i !== index))}>Remove social link</button>
          </div>
        ))}
        <button className="btn btn-secondary" type="button" onClick={() => field("socials", [...draft.socials, { label: "New link", url: "" }])}>Add social link</button>
      </CollapsibleSection>

      <CollapsibleSection title="Skills">
        {draft.skills.map((skillGroup, groupIndex) => (
          <div key={groupIndex} style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <LocalizedField label={`Skill group ${groupIndex + 1}`} value={skillGroup.group} onChange={(group) => {
              const skills = [...draft.skills]; skills[groupIndex] = { ...skillGroup, group }; field("skills", skills);
            }} />
            {skillGroup.items.map((item, itemIndex) => <div key={itemIndex} style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
              <div className="field" style={{ flex: 1 }}><label htmlFor={`skill-${groupIndex}-${itemIndex}`}>Skill</label><input id={`skill-${groupIndex}-${itemIndex}`} className="input" value={item.label} onChange={(event) => { const skills = [...draft.skills]; const items = [...skillGroup.items]; items[itemIndex] = { ...item, label: event.target.value }; skills[groupIndex] = { ...skillGroup, items }; field("skills", skills); }} /></div>
              <button className="btn btn-secondary" type="button" onClick={() => { const skills = [...draft.skills]; skills[groupIndex] = { ...skillGroup, items: skillGroup.items.filter((_, i) => i !== itemIndex) }; field("skills", skills); }}>Remove skill</button>
            </div>)}
            <button className="btn btn-secondary" type="button" onClick={() => { const skills = [...draft.skills]; skills[groupIndex] = { ...skillGroup, items: [...skillGroup.items, { label: "New skill", tone: "neutral" }] }; field("skills", skills); }} style={{ marginTop: "var(--space-2)" }}>Add skill</button>
            <button className="btn btn-secondary" type="button" onClick={() => field("skills", draft.skills.filter((_, i) => i !== groupIndex))} style={{ marginInlineStart: "var(--space-2)", marginTop: "var(--space-2)" }}>Remove group</button>
          </div>
        ))}
        <button className="btn btn-secondary" type="button" onClick={() => field("skills", [...draft.skills, { group: { en: "New group" }, items: [] }])}>Add skill group</button>
      </CollapsibleSection>

      <SaveBar
        status={status}
        error={error}
        ready={ready}
        onSave={() =>
          save(
            [
              ...(portraitFile ? [portraitFile] : []),
              {
                path: PATH,
                content: JSON.stringify(draft, null, 2) + "\n",
                encoding: "utf8",
              },
            ],
            "content: update profile"
          )
        }
      />
    </div>
  );
}
