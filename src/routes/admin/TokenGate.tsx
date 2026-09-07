import { useId, useState, type FormEvent, type ReactNode } from "react";
import { readToken, storeToken } from "../../lib/store/token";

/**
 * Production-only gate. The deployed admin commits to GitHub, which needs a
 * token; development writes to disk and needs none, so this renders nothing
 * in dev. This is a convenience gate, not a security boundary: the page is
 * public and the token is the only real credential.
 */
export default function TokenGate({ children }: { children: ReactNode }) {
  const inputId = useId();
  const [token, setToken] = useState(() => readToken());
  const [draft, setDraft] = useState("");

  if (import.meta.env.DEV || token) return <>{children}</>;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    storeToken(draft.trim());
    setToken(draft.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "60ch" }}
    >
      <div className="field">
        <label htmlFor={inputId}>GitHub personal access token</label>
        <input
          id={inputId}
          className="input"
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-700)" }}>
        Use a fine-grained token scoped to this repository only, with Contents set to Read
        and write. It is stored in this browser and sent only to api.github.com. Anyone with
        access to this browser profile can use it.
      </p>
      <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>
        Save token
      </button>
    </form>
  );
}
