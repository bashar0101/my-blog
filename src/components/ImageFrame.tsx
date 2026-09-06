import { useState } from "react";
import type { ImageRef } from "../types";
import { useLang } from "../i18n/LangProvider";
import Duotone from "./Duotone";

export default function ImageFrame({
  image,
  height,
}: {
  image: ImageRef;
  height: number | string;
}) {
  const { l } = useLang();
  const [failed, setFailed] = useState(false);

  return (
    <Duotone height={height}>
      {failed ? (
        <div
          data-testid="image-fallback"
          style={{
            width: "100%",
            height: "100%",
            background: "var(--color-neutral-200)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: "var(--color-neutral-600)",
          }}
        >
          {l(image.alt)}
        </div>
      ) : (
        <img
          src={image.src}
          alt={l(image.alt)}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
    </Duotone>
  );
}
