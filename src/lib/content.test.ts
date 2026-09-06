import { describe, expect, it } from "vitest";
import { allProjects, allVideos, featuredProjects, featuredVideos, profile, ui } from "./content";
import { LANGS } from "./localize";

describe("profile", () => {
  it("has an English value for every localized field", () => {
    expect(profile.name.en).toBeTruthy();
    expect(profile.kicker.en).toBeTruthy();
    expect(profile.headline.en).toBeTruthy();
    expect(profile.intro.en).toBeTruthy();
    expect(profile.about.en).toBeTruthy();
  });

  it("has a contact email and at least one social link", () => {
    expect(profile.email).toContain("@");
    expect(profile.socials.length).toBeGreaterThan(0);
  });

  it("groups skills with items", () => {
    expect(profile.skills.length).toBeGreaterThan(0);
    for (const group of profile.skills) {
      expect(group.group.en).toBeTruthy();
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});

describe("ui", () => {
  it("carries every chrome key in all three languages", () => {
    const keys = Object.keys(ui);
    expect(keys).toContain("nav.home");
    expect(keys).toContain("contact.send");
    expect(keys.length).toBe(33);
    for (const key of keys) {
      for (const lang of LANGS) {
        expect(ui[key]?.[lang], `${key}.${lang}`).toBeTruthy();
      }
    }
  });
});

describe("allProjects", () => {
  it("returns projects sorted by order ascending", () => {
    const orders = allProjects().map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("gives every project a unique id", () => {
    const ids = allProjects().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("featuredProjects", () => {
  it("returns only featured projects", () => {
    expect(featuredProjects().every((p) => p.featured)).toBe(true);
  });

  it("caps the result at three by default", () => {
    expect(featuredProjects().length).toBeLessThanOrEqual(3);
  });

  it("respects an explicit limit", () => {
    expect(featuredProjects(1).length).toBeLessThanOrEqual(1);
  });
});

describe("videos", () => {
  it("returns videos sorted by order ascending", () => {
    const orders = allVideos().map((v) => v.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("carries a bare youtube id, not a URL", () => {
    for (const video of allVideos()) {
      expect(video.youtubeId).not.toContain("/");
      expect(video.youtubeId).not.toContain("?");
    }
  });

  it("caps featured videos at two by default", () => {
    expect(featuredVideos().length).toBeLessThanOrEqual(2);
    expect(featuredVideos().every((v) => v.featured)).toBe(true);
  });
});
