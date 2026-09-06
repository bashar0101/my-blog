import { Link } from "react-router-dom";

export default function SectionHeading({
  title,
  linkTo,
  linkLabel,
}: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-4)",
        marginBottom: "var(--space-6)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 28,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </h2>
      {linkTo && linkLabel && (
        <Link to={linkTo} style={{ marginInlineStart: "auto", fontSize: 14 }}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
