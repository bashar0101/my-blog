import type { UiDict } from "../../types";
import { ui as currentUi } from "../../lib/content";
import LocalizedField from "../../components/admin/LocalizedField";
import SaveBar from "../../components/admin/SaveBar";
import { useContentDraft } from "../../lib/admin/useContentDraft";

export default function StringsEditor() {
  const { draft, setDraft, status, error, save } = useContentDraft<UiDict>(currentUi);
  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <h1 style={{ margin: 0, fontSize: 32 }}>Interface strings</h1>
    <p style={{ margin: 0, color: "var(--color-neutral-700)" }}>Navigation labels, headings, and button text. Empty translations fall back to English.</p>
    {Object.keys(draft).map((key) => <div key={key} data-testid="string-editor"><LocalizedField label={key} value={draft[key]!} onChange={(value) => setDraft({ ...draft, [key]: value })} /></div>)}
    <SaveBar status={status} error={error} onSave={() => save([{ path: "src/content/ui.json", content: JSON.stringify(draft, null, 2) + "\n", encoding: "utf8" }], "content: update interface strings")} />
  </div>;
}
