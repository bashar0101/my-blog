import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import TokenGate from "./TokenGate";
import { primeStore } from "../../lib/store";
import { readToken } from "../../lib/store/token";

const SECTIONS = [
  { to: "/admin/profile", label: "Profile" },
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/videos", label: "Videos" },
  { to: "/admin/articles", label: "Articles" },
  { to: "/admin/strings", label: "Interface strings" },
] as const;

export default function AdminLayout() {
  useEffect(() => {
    // Record the branch head now, so a save later can detect that someone
    // else moved it. Failure here is not fatal: the save itself re-reads the
    // head and simply loses the "changed since you loaded" comparison.
    primeStore(readToken()).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <div
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
        minHeight: "100%",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-6)",
          padding: "var(--space-4) var(--space-8)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <Link
          to="/admin"
          style={{
            fontFamily: "var(--font-heading)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontSize: 18,
            color: "var(--color-text)",
          }}
        >
          Content admin
        </Link>
        <nav style={{ display: "flex", gap: "var(--space-4)", fontSize: 14 }}>
          {SECTIONS.map((section) => (
            <Link key={section.to} to={section.to}>
              {section.label}
            </Link>
          ))}
        </nav>
        <Link to="/en" style={{ marginInlineStart: "auto", fontSize: 14 }}>
          View site →
        </Link>
      </header>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-8)" }}>
        <TokenGate>
          <Outlet />
        </TokenGate>
      </main>
    </div>
  );
}
