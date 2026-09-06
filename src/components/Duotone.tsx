import type { ReactNode } from "react";

export default function Duotone({
  height,
  children,
}: {
  height: number | string;
  children: ReactNode;
}) {
  return (
    <div className="duotone" style={{ width: "100%", height }}>
      {children}
    </div>
  );
}
