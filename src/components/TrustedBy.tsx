import type { TrustedCompany } from "../types";
import { externalHref } from "../lib/links";

/**
 * The "trusted by" strip: a row of names that scrolls continuously.
 *
 * The list is rendered twice side by side and both copies slide by exactly one
 * copy's width, so the loop has no seam and needs no JavaScript. The second
 * copy is aria-hidden — it is the same names again, and a screen reader
 * reading them twice would be a bug, not emphasis.
 */
export default function TrustedBy({
  heading,
  companies,
}: {
  heading: string;
  companies: TrustedCompany[] | undefined;
}) {
  const named = (companies ?? []).filter((company) => company.label.trim() !== "");
  if (named.length === 0) return null;

  const row = (hidden: boolean) => (
    <ul className="marquee-track" aria-hidden={hidden || undefined}>
      {named.map((company, index) => {
        const href = externalHref(company.url);
        return (
          <li key={`${company.label}-${index}`} className="marquee-item">
            {href ? <a href={href}>{company.label}</a> : company.label}
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="trusted shell" aria-label={heading} data-testid="trusted-by">
      <p className="trusted-heading">{heading}</p>
      <div className="marquee">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
