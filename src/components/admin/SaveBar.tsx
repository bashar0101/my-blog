import type { SaveStatus } from "../../lib/admin/useContentDraft";

export default function SaveBar({
  status,
  error,
  onSave,
}: {
  status: SaveStatus;
  error: string;
  onSave: () => void;
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
        disabled={status === "saving"}
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>
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
