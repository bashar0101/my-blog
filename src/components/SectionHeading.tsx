import { Link } from "react-router-dom";

const headingStyle = {
  margin: 0,
  fontSize: 28,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
} as const;

export default function SectionHeading({
  title,
  linkTo,
  linkLabel,
}: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  const heading = <h2 style={headingStyle}>{title}</h2>;

  if (!linkTo || !linkLabel) return heading;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-4)",
        marginBottom: "var(--space-6)",
      }}
    >
      {heading}
      <Link to={linkTo} style={{ marginInlineStart: "auto", fontSize: 14 }}>
        {linkLabel}
      </Link>
    </div>
  );
}
