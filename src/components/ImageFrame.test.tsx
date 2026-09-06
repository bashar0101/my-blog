import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import ImageFrame from "./ImageFrame";

const image = { src: "/img/missing.jpg", alt: { en: "A portrait", tr: "Bir portre" } };

function renderFrame(lang: "en" | "tr" | "ar" = "en") {
  return render(
    <LangProvider lang={lang}>
      <ImageFrame image={image} height={200} />
    </LangProvider>
  );
}

describe("ImageFrame", () => {
  it("renders an img with localized alt text", () => {
    renderFrame("tr");
    expect(screen.getByRole("img", { name: "Bir portre" })).toBeInTheDocument();
  });

  it("falls back to English alt text", () => {
    renderFrame("ar");
    expect(screen.getByRole("img", { name: "A portrait" })).toBeInTheDocument();
  });

  it("keeps the framed box when the image fails to load", () => {
    renderFrame();
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("image-fallback")).toBeInTheDocument();
  });
});
