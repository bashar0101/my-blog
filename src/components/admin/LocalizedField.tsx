import { useId, useState } from "react";
import type { Lang, LocalizedString } from "../../types";
import { LANGS } from "../../lib/localize";

export default function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: LocalizedString;
  onChange: (next: LocalizedString) => void;
  multiline?: boolean;
}) {
  const inputId = useId();
  const [active, setActive] = useState<Lang>("en");

  const current = value[active] ?? "";

  function update(next: string) {
    onChange({ ...value, [active]: next });
  }

  return (
    <div className="field" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <label htmlFor={inputId}>{label}</label>
      <div role="tablist" aria-label={`${label} language`} style={{ display: "flex", gap: "var(--space-2)" }}>
        {LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={lang === active}
            data-empty={String(!value[lang])}
            onClick={() => setActive(lang)}
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "2px 8px" }}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
      {multiline ? (
        <textarea
          id={inputId}
          className="input"
          rows={5}
          value={current}
          dir={active === "ar" ? "rtl" : "ltr"}
          onChange={(event) => update(event.target.value)}
        />
      ) : (
        <input
          id={inputId}
          className="input"
          value={current}
          dir={active === "ar" ? "rtl" : "ltr"}
          onChange={(event) => update(event.target.value)}
        />
      )}
    </div>
  );
}
