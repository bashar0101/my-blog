import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { readToken, storeToken } from "../../lib/store/token";

/**
 * Production admin requires a server-verified GitHub OAuth session before it
 * can show the editing controls. The GitHub contents token is then requested
 * separately and remains scoped to repository writes only.
 */
export default function TokenGate({ children }: { children: ReactNode }) {
  const inputId = useId();
  const [token, setToken] = useState(() => readToken());
  const [draft, setDraft] = useState("");
  const [auth, setAuth] = useState<"checking" | "signed-out" | "signed-in">(
    import.meta.env.DEV ? "signed-in" : "checking"
  );

  useEffect(() => {
    if (import.meta.env.DEV) return;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((response) => setAuth(response.ok ? "signed-in" : "signed-out"))
      .catch(() => setAuth("signed-out"));
  }, []);

  if (auth === "checking") return <p role="status">Checking access…</p>;

  if (auth === "signed-out") return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "60ch" }}>
    <h1 style={{ margin: 0, fontSize: 32 }}>Admin sign-in required</h1>
    <p style={{ margin: 0 }}>Only the authorized GitHub account can access this admin area.</p>
    <a className="btn btn-primary" href="/api/auth/login" style={{ alignSelf: "flex-start" }}>Sign in with GitHub</a>
  </div>;

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
      <div style={{ display: "flex", gap: "var(--space-3)" }}><button className="btn btn-primary" type="submit">Save token</button><button className="btn btn-secondary" type="button" onClick={() => { void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(() => setAuth("signed-out")); }}>Sign out</button></div>
    </form>
  );
}
