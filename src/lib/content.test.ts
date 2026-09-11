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
    // Named, not counted. The owner adds interface strings from the admin, so
    // an exact count fails on every legitimate addition; what actually has to
    // hold is that the keys the components render are present and translated.
    for (const required of [
      "nav.home",
      "nav.downloadCV",
      "contact.send",
      "projects.title",
      "projects.caseStudy",
      "projects.liveSite",
    ]) {
      expect(keys).toContain(required);
    }
    expect(keys.length).toBeGreaterThanOrEqual(39);
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

  it("puts the lowest-order project first", () => {
    const orders = allProjects().map((p) => p.order);
    expect(allProjects()[0]!.order).toBe(Math.min(...orders));
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
    // Correct whether the corpus has more or fewer than three featured
    // projects.
    const eligible = allProjects().filter((p) => p.featured).length;
    expect(featuredProjects().length).toBe(Math.min(3, eligible));
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

  it("puts the lowest-order video first", () => {
    // Derived, not hardcoded: the owner edits this corpus from the admin, and
    // an empty or renumbered videos.json is valid content, not a regression.
    const orders = allVideos().map((v) => v.order);
    if (orders.length === 0) return;
    expect(allVideos()[0]!.order).toBe(Math.min(...orders));
  });

  it("carries a bare youtube id, not a URL", () => {
    for (const video of allVideos()) {
      expect(video.youtubeId).not.toContain("/");
      expect(video.youtubeId).not.toContain("?");
    }
  });

  it("caps featured videos at two by default", () => {
    // Correct whether the corpus has more or fewer than two featured videos.
    const eligible = allVideos().filter((v) => v.featured).length;
    expect(featuredVideos().length).toBe(Math.min(2, eligible));
    expect(featuredVideos().every((v) => v.featured)).toBe(true);
  });
});
