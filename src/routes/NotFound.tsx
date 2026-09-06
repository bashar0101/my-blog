export default function NotFound() {
  return (
    <main
      data-testid="not-found"
      style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-8)" }}
    >
      <h1 style={{ textTransform: "uppercase" }}>404</h1>
      <p>This page does not exist.</p>
    </main>
  );
}
