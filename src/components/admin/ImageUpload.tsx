import { useId, useState } from "react";
import type { StoredFile } from "../../lib/store";
import { readFileAsBase64, validateImage } from "../../lib/admin/readFileAsBase64";

function extensionFor(file: File): string {
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

export default function ImageUpload({ label, value, onChange }: { label: string; value: string; onChange: (path: string, file: StoredFile | null) => void }) {
  const inputId = useId();
  const [error, setError] = useState("");
  async function choose(file: File | undefined) {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) { setError(problem); return; }
    try {
      const content = await readFileAsBase64(file);
      const filename = `${crypto.randomUUID()}.${extensionFor(file)}`;
      const path = `public/img/${filename}`;
      onChange(`/img/${filename}`, { path, content, encoding: "base64" });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The image could not be read.");
    }
  }
  return <div className="field">
    <label htmlFor={inputId}>Upload {label}</label>
    <input id={inputId} className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choose(event.currentTarget.files?.[0])} />
    <label htmlFor={`${inputId}-path`}>{label} path</label>
    <input id={`${inputId}-path`} className="input" value={value} onChange={(event) => onChange(event.target.value, null)} />
    {error && <p role="alert" style={{ margin: 0, color: "var(--color-accent-700)" }}>{error}</p>}
  </div>;
}
