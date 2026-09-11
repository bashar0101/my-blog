export default function PageHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="shell page-header">
      <span className="page-kicker">{kicker}</span>
      <h1 className="page-title">{title}</h1>
    </header>
  );
}
