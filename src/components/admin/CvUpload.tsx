import { useId, useState } from "react";
import type { Lang, LocalizedString } from "../../types";
import type { StoredFile } from "../../lib/store";
import { LANGS } from "../../lib/localize";
import { readFileAsBase64, validatePdf } from "../../lib/admin/readFileAsBase64";

/**
 * One CV per language, at a fixed name. A fresh name per upload would leave
 * every superseded CV in the repository and still published, which is the
 * opposite of what replacing your CV is for.
 */
export function cvRepoPath(lang: Lang): string {
  return `public/cv/cv-${lang}.pdf`;
}

export function cvUrl(lang: Lang): string {
  return `/cv/cv-${lang}.pdf`;
}

export default function CvUpload({
  value,
  onChange,
}: {
  value: LocalizedString;
  /** The file is null when the path was typed rather than uploaded. */
  onChange: (value: LocalizedString, file: StoredFile | null) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<Partial<Record<Lang, string>>>({});

  async function choose(lang: Lang, file: File | undefined) {
    if (!file) return;
    const problem = validatePdf(file);
    if (problem) {
      setError(`${lang.toUpperCase()}: ${problem}`);
      return;
    }
    try {
      const content = await readFileAsBase64(file);
      setError("");
      setChosen((current) => ({ ...current, [lang]: file.name }));
      onChange(
        { ...value, [lang]: cvUrl(lang) },
        { path: cvRepoPath(lang), content, encoding: "base64" }
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The file could not be read.");
    }
  }

  return (
    <fieldset style={{ border: "1px solid var(--color-divider)", padding: "var(--space-3)" }}>
      <legend>CV (PDF)</legend>
      <p style={{ margin: "0 0 var(--space-3)", fontSize: 14, color: "var(--color-neutral-700)" }}>
        Upload one PDF per language. A language with no CV of its own falls back to the English one.
        The file goes live with the next deploy.
      </p>
      {LANGS.map((lang) => {
        const current = value[lang] ?? "";
        return (
          <div key={lang} className="field" style={{ marginBottom: "var(--space-3)" }}>
            <label htmlFor={`${inputId}-${lang}`}>CV file ({lang.toUpperCase()})</label>
            <input
              id={`${inputId}-${lang}`}
              className="input"
              type="file"
              accept="application/pdf"
              onChange={(event) => void choose(lang, event.currentTarget.files?.[0])}
            />
            {chosen[lang] && (
              <p role="status" style={{ margin: 0, fontSize: 13 }}>
                {chosen[lang]} ready — press Save to publish it.
              </p>
            )}
            <label htmlFor={`${inputId}-${lang}-path`}>CV link ({lang.toUpperCase()})</label>
            <input
              id={`${inputId}-${lang}-path`}
              className="input"
              value={current}
              placeholder={lang === "en" ? "" : "falls back to English"}
              onChange={(event) => onChange({ ...value, [lang]: event.target.value }, null)}
            />
          </div>
        );
      })}
      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
