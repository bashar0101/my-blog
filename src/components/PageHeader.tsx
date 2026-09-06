export default function PageHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "calc(var(--space-8) * 2) var(--space-8) var(--space-8)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-heading)",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          fontSize: 14,
          color: "var(--color-accent-700)",
        }}
      >
        {kicker}
      </span>
      <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.1, textTransform: "uppercase" }}>
        {title}
      </h1>
    </header>
  );
}
