import type { CSSProperties, ReactNode } from "react";

export default function Blueprint({
  as: Tag = "div",
  className = "",
  style,
  testId,
  children,
}: {
  as?: "div" | "figure" | "article";
  className?: string;
  style?: CSSProperties;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={`blueprint ${className}`.trim()} style={style} data-testid={testId}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </Tag>
  );
}
