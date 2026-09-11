import type { SaveStatus } from "../../lib/admin/useContentDraft";

export default function SaveBar({
  status,
  error,
  onSave,
  /** False while the editor is still reading the current content. */
  ready = true,
}: {
  status: SaveStatus;
  error: string;
  onSave: () => void;
  ready?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        borderTop: "1px solid var(--color-divider)",
        paddingTop: "var(--space-4)",
        marginTop: "var(--space-6)",
      }}
    >
      <button
        className="btn btn-primary"
        type="button"
        onClick={onSave}
        disabled={status === "saving" || !ready}
      >
        {status === "saving" ? "Saving…" : !ready ? "Loading…" : "Save"}
      </button>
      {!ready && status !== "error" && (
        <p role="status" style={{ margin: 0, fontSize: 14 }}>
          Reading the current content…
        </p>
      )}
      {status === "saved" && (
        <p role="status" style={{ margin: 0, fontSize: 14 }}>
          {import.meta.env.DEV ? "Written to your files." : "Committed. Live in about a minute."}
        </p>
      )}
      {status === "error" && (
        <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
