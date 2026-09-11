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
  const heading = <h2 className="section-title">{title}</h2>;

  if (!linkTo || !linkLabel) return heading;

  return (
    <div className="section-heading-row">
      {heading}
      <Link to={linkTo} style={{ marginInlineStart: "auto", fontSize: 14 }}>
        {linkLabel}
      </Link>
    </div>
  );
}
