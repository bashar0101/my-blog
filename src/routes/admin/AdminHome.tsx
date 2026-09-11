import { Link } from "react-router-dom";

const SECTIONS = [
  { to: "/admin/profile", label: "Profile", blurb: "Your name, bio, skills, socials, portrait and CV files." },
  { to: "/admin/projects", label: "Projects", blurb: "The project cards and which are featured." },
  { to: "/admin/videos", label: "Videos", blurb: "YouTube embeds and their captions." },
  { to: "/admin/articles", label: "Articles", blurb: "Write, edit and publish articles." },
  { to: "/admin/strings", label: "Interface strings", blurb: "Nav labels, headings and buttons." },
] as const;

export default function AdminHome() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Content admin</h1>
      <p style={{ margin: 0, color: "var(--color-neutral-700)" }}>
        {import.meta.env.DEV
          ? "Development mode: changes are written straight to your files."
          : "Changes are committed to GitHub and go live in about a minute."}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-3)" }}>
        {SECTIONS.map((section) => (
          <li key={section.to}>
            <Link to={section.to} style={{ fontSize: 18 }}>
              {section.label}
            </Link>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-700)" }}>
              {section.blurb}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
