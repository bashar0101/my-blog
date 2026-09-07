import type { ReactNode } from "react";

/** Native disclosure keeps lengthy editor forms readable without hiding controls from keyboards or assistive tech. */
export default function CollapsibleSection({
  title,
  children,
  open = false,
  testId,
}: {
  title: ReactNode;
  children: ReactNode;
  open?: boolean;
  testId?: string;
}) {
  return (
    <details
      open={open}
      data-testid={testId}
      style={{ border: "1px solid var(--color-divider)", padding: "var(--space-3) var(--space-4)" }}
    >
      <summary style={{ cursor: "pointer", fontFamily: "var(--font-heading)", fontSize: 18 }}>
        {title}
      </summary>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", paddingTop: "var(--space-4)" }}>
        {children}
      </div>
    </details>
  );
}
