import type { Tag } from "../types";

export default function TagList({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
      {tags.map((tag, index) => (
        <span key={`${tag.label}-${index}`} className={`tag tag-${tag.tone}`}>
          {tag.label}
        </span>
      ))}
    </div>
  );
}
