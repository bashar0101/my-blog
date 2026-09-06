# React Portfolio Site Implementation Plan (Plan A — public site)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-browser dc-runtime static site with a real Vite + React application whose every page renders from typed content files in three languages.

**Architecture:** Content lives as JSON in `src/content/` and Markdown in `content/articles/`, bundled at build time by Vite — no runtime fetching. React Router carries the language in the URL (`/:lang/...`) and a single `LangProvider` is the only thing that writes `document.documentElement.lang`/`dir`. The existing `ds/industry.css` design system is kept untouched; a new `ds/rtl.css` handles Arabic.

**Tech Stack:** Vite, React 19, React Router 7, TypeScript, Vitest + React Testing Library (jsdom), `marked`, `dompurify`.

**Spec:** `docs/superpowers/specs/2026-09-06-react-portfolio-migration-design.md`

**Scope:** This plan covers spec phases 1–2 (the public site). The admin UI, prerender script, and Vercel configuration are Plan B, written after this plan lands. Executing this plan produces a deployable site whose content is edited by hand in files; Plan B adds the forms that edit those same files.

## Global Constraints

- Languages are exactly `en`, `tr`, `ar`. `en` is required on every localized value and is the per-key fallback for the other two.
- Fallback is **per key**, never whole-dictionary. A missing `tr` value falls back to `en`, never to the previously displayed language.
- `ds/industry.css` is not edited. Arabic overrides go in a new `ds/rtl.css`.
- No physical inline margins for edge-pinning. Use `margin-inline-start` / `margin-inline-end`, never `margin-left: auto` / `margin-right: auto` for layout. (`margin: 0 auto` for centering is fine.)
- Every `localStorage` access is wrapped in `try`/`catch` and returns a default on failure.
- The only `localStorage` key is `portfolio:lang`.
- No `MutationObserver`. React is the single writer of the DOM.
- Every form input is associated with its label by `for`/`id`.
- Language links are real `<Link>`s with real `href`s so ctrl-click and middle-click work.
- Active language is marked with `aria-current="true"` and styled by CSS, never by writing inline `style.color`.

---

### Task 1: Scaffold Vite, archive the static site, add types and `L()`

The old `index.html` occupies the path Vite needs for its entry, so archiving comes first. Everything in this task exists to make one thing testable: the localization primitive every later task depends on.

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vitest.setup.ts`, `src/types.ts`, `src/lib/localize.ts`
- Test: `src/lib/localize.test.ts`
- Modify: `.gitignore`
- Move: `index.html`, `Article.dc.html`, `Articles.dc.html`, `Projects.dc.html`, `Videos.dc.html`, `support.js`, `image-slot.js`, `i18n.js` → `archive/dc-original/`; `Portfolio Directions.dc.html`, `ds/broadsheet.css`, `ds/classical.css`, `ds/modernist.css`, `_ds/` → `archive/`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `Lang`, `LocalizedString`, `Tone`, `Tag`, `ImageRef`, `SkillGroup`, `Social`, `Profile`, `Project`, `Video`, `ArticleMeta`, `Article`, `UiDict` from `src/types.ts`; `LANGS`, `isLang(v: unknown): v is Lang`, `L(value: LocalizedString | undefined, lang: Lang): string` from `src/lib/localize.ts`.

- [ ] **Step 1: Archive the static site**

```bash
mkdir -p archive/dc-original
git mv index.html Article.dc.html Articles.dc.html Projects.dc.html Videos.dc.html support.js image-slot.js i18n.js archive/dc-original/
git mv "Portfolio Directions.dc.html" archive/
git mv ds/broadsheet.css ds/classical.css ds/modernist.css archive/
```

`_ds/` and `graphify-out/` are handled by `.gitignore` in the next step rather than moved.

- [ ] **Step 2: Stop tracking build artifacts**

Append to `.gitignore`:

```gitignore
# Build output and tooling artifacts
node_modules/
dist/
graphify-out/
```

Then untrack what commit `7dba91e` swept in:

```bash
git rm -r --cached graphify-out
```

- [ ] **Step 3: Install dependencies**

```bash
npm init -y
npm install react react-dom react-router-dom marked dompurify
npm install -D vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom
```

- [ ] **Step 4: Configure the toolchain**

`package.json` — replace the generated `scripts` and `main` with:

```json
{
  "name": "portfolio",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts"],
    globals: true,
  },
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "scripts"]
}
```

`vite.config.ts` is deliberately left outside `include` — Vite loads it directly,
and `tsc -b` never needs to type-check it.

`src/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`index.html` (new, at repo root):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Portfolio</title>
    <link rel="stylesheet" href="/ds/industry.css" />
    <link rel="stylesheet" href="/ds/rtl.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`ds/` must be reachable at that URL, so move it into `public/`:

```bash
mkdir -p public
git mv ds public/ds
```

Adjust the two `<link>` hrefs above only if you place it elsewhere; `/ds/industry.css` assumes `public/ds/industry.css`.

Create `public/ds/rtl.css` as an empty file for now — Task 12 fills it, and the `<link>` must not 404 before then:

```css
/* Arabic / RTL overrides — filled in Task 12 */
```

`src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

`src/App.tsx` (a stub; Task 5 replaces it with the real route table):

```tsx
export default function App() {
  return <div />;
}
```

- [ ] **Step 5: Write the failing test**

`src/lib/localize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isLang, L, LANGS } from "./localize";

describe("LANGS", () => {
  it("is exactly en, tr, ar", () => {
    expect(LANGS).toEqual(["en", "tr", "ar"]);
  });
});

describe("isLang", () => {
  it("accepts the three supported codes", () => {
    expect(isLang("en")).toBe(true);
    expect(isLang("tr")).toBe(true);
    expect(isLang("ar")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isLang("de")).toBe(false);
    expect(isLang("EN")).toBe(false);
    expect(isLang("")).toBe(false);
    expect(isLang(null)).toBe(false);
    expect(isLang(undefined)).toBe(false);
    expect(isLang(3)).toBe(false);
  });
});

describe("L", () => {
  const value = { en: "Projects", tr: "Projeler", ar: "المشاريع" };

  it("returns the requested language", () => {
    expect(L(value, "tr")).toBe("Projeler");
    expect(L(value, "ar")).toBe("المشاريع");
  });

  it("falls back to English per key when the language is missing", () => {
    expect(L({ en: "Skills" }, "tr")).toBe("Skills");
  });

  it("falls back to English when the translation is an empty string", () => {
    expect(L({ en: "Skills", tr: "" }, "tr")).toBe("Skills");
  });

  it("returns an empty string for an undefined value", () => {
    expect(L(undefined, "en")).toBe("");
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- src/lib/localize.test.ts`
Expected: FAIL — cannot resolve `./localize`.

- [ ] **Step 7: Write the types**

`src/types.ts`:

```ts
export type Lang = "en" | "tr" | "ar";

export type LocalizedString = { en: string; tr?: string; ar?: string };

export type Tone = "accent" | "neutral";

export interface Tag {
  label: string;
  tone: Tone;
}

export interface ImageRef {
  src: string;
  alt: LocalizedString;
}

export interface SkillGroup {
  group: LocalizedString;
  items: Tag[];
}

export interface Social {
  label: string;
  url: string;
}

export interface Profile {
  name: LocalizedString;
  kicker: LocalizedString;
  headline: LocalizedString;
  intro: LocalizedString;
  about: LocalizedString;
  email: string;
  cv: LocalizedString;
  portrait: ImageRef;
  socials: Social[];
  skills: SkillGroup[];
}

export interface Project {
  id: string;
  title: LocalizedString;
  kicker: LocalizedString;
  summary: LocalizedString;
  tags: Tag[];
  image: ImageRef;
  url: string | null;
  featured: boolean;
  order: number;
}

export interface Video {
  id: string;
  title: LocalizedString;
  youtubeId: string;
  description?: LocalizedString;
  featured: boolean;
  order: number;
}

export interface ArticleMeta {
  slug: string;
  date: string;
  topic: LocalizedString;
  title: LocalizedString;
  standfirst: LocalizedString;
  readingMinutes: number;
  tags: Tag[];
  cover: ImageRef | null;
  featured: boolean;
  published: boolean;
}

export interface Article extends ArticleMeta {
  bodies: Partial<Record<Lang, string>>;
}

export type UiDict = Record<string, LocalizedString>;
```

- [ ] **Step 8: Write the localization primitive**

`src/lib/localize.ts`:

```ts
import type { Lang, LocalizedString } from "../types";

export const LANGS: readonly Lang[] = ["en", "tr", "ar"];

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

export function L(value: LocalizedString | undefined, lang: Lang): string {
  if (!value) return "";
  const translated = value[lang];
  if (translated != null && translated !== "") return translated;
  return value.en ?? "";
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 8 tests.

- [ ] **Step 10: Verify the build works**

Run: `npm run build`
Expected: exits 0, writes `dist/index.html`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite app, archive the dc-runtime site, add content types"
```

---

### Task 2: Content loader for profile, projects, videos, and UI strings

**Files:**
- Create: `src/content/profile.json`, `src/content/projects.json`, `src/content/videos.json`, `src/content/ui.json`, `src/lib/content.ts`
- Test: `src/lib/content.test.ts`

**Interfaces:**
- Consumes: `Profile`, `Project`, `Video`, `UiDict` from `src/types.ts`.
- Produces: `profile: Profile`, `ui: UiDict`, `allProjects(): Project[]`, `featuredProjects(limit?: number): Project[]`, `allVideos(): Video[]`, `featuredVideos(limit?: number): Video[]` from `src/lib/content.ts`. All sorted by `order` ascending.

- [ ] **Step 1: Write the failing test**

`src/lib/content.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/content.test.ts`
Expected: FAIL — cannot resolve `./content`.

- [ ] **Step 3: Write the content files**

`src/content/profile.json` — the placeholder copy from the archived `index.html`, now structured. Turkish and Arabic values are left off every field except those the old dictionary already translated; `L()` falls back to English for the rest, and Plan B's admin fills them in.

```json
{
  "name": { "en": "Your Name" },
  "kicker": { "en": "Java · Spring Boot · React" },
  "headline": { "en": "Your name goes here" },
  "intro": {
    "en": "One or two sentences introducing yourself — what you build, what you write about, and what you care about. Replace this text."
  },
  "about": {
    "en": "A short paragraph about your background as a backend developer — your experience with Java and Spring Boot, your frontend work with React, and the kind of problems you enjoy solving. Replace this text with your own story."
  },
  "email": "your.email@example.com",
  "cv": { "en": "/cv-en.pdf" },
  "portrait": { "src": "/img/portrait.jpg", "alt": { "en": "Your portrait" } },
  "socials": [
    { "label": "GitHub", "url": "https://github.com/" },
    { "label": "LinkedIn", "url": "https://www.linkedin.com/" },
    { "label": "YouTube", "url": "https://www.youtube.com/" }
  ],
  "skills": [
    {
      "group": { "en": "Backend", "tr": "Backend", "ar": "الواجهة الخلفية" },
      "items": [
        { "label": "Java", "tone": "accent" },
        { "label": "Spring Boot", "tone": "accent" },
        { "label": "Your skill", "tone": "neutral" },
        { "label": "Your skill", "tone": "neutral" }
      ]
    },
    {
      "group": { "en": "Frontend", "tr": "Frontend", "ar": "الواجهة الأمامية" },
      "items": [
        { "label": "React", "tone": "accent" },
        { "label": "Your skill", "tone": "neutral" },
        { "label": "Your skill", "tone": "neutral" }
      ]
    },
    {
      "group": { "en": "Tools", "tr": "Araçlar", "ar": "الأدوات" },
      "items": [
        { "label": "Your tool", "tone": "neutral" },
        { "label": "Your tool", "tone": "neutral" },
        { "label": "Your tool", "tone": "neutral" }
      ]
    }
  ]
}
```

`src/content/projects.json`:

```json
[
  {
    "id": "project-one",
    "title": { "en": "Project title one" },
    "kicker": { "en": "Backend · API" },
    "summary": { "en": "One or two lines describing the project, the problem it solves, and your role in it." },
    "tags": [
      { "label": "Spring Boot", "tone": "accent" },
      { "label": "PostgreSQL", "tone": "neutral" }
    ],
    "image": { "src": "/img/project-one.jpg", "alt": { "en": "Project screenshot" } },
    "url": null,
    "featured": true,
    "order": 1
  },
  {
    "id": "project-two",
    "title": { "en": "Project title two" },
    "kicker": { "en": "Full stack" },
    "summary": { "en": "One or two lines describing the project, the problem it solves, and your role in it." },
    "tags": [
      { "label": "Java", "tone": "accent" },
      { "label": "React", "tone": "neutral" }
    ],
    "image": { "src": "/img/project-two.jpg", "alt": { "en": "Project screenshot" } },
    "url": null,
    "featured": true,
    "order": 2
  },
  {
    "id": "project-three",
    "title": { "en": "Project title three" },
    "kicker": { "en": "Microservices" },
    "summary": { "en": "One or two lines describing the project, the problem it solves, and your role in it." },
    "tags": [
      { "label": "Kafka", "tone": "accent" },
      { "label": "Docker", "tone": "neutral" }
    ],
    "image": { "src": "/img/project-three.jpg", "alt": { "en": "Project screenshot" } },
    "url": null,
    "featured": true,
    "order": 3
  }
]
```

`src/content/videos.json`:

```json
[
  {
    "id": "video-one",
    "title": { "en": "Video title goes here" },
    "youtubeId": "dQw4w9WgXcQ",
    "description": { "en": "A one-line description of the video. Replace this text." },
    "featured": true,
    "order": 1
  },
  {
    "id": "video-two",
    "title": { "en": "Second video title" },
    "youtubeId": "dQw4w9WgXcQ",
    "description": { "en": "A one-line description of the video. Replace this text." },
    "featured": true,
    "order": 2
  }
]
```

`src/content/ui.json` — every key from the archived `i18n.js` dictionary, all three languages, verbatim:

```json
{
  "nav.home": { "en": "Home", "tr": "Ana Sayfa", "ar": "الرئيسية" },
  "nav.projects": { "en": "Projects", "tr": "Projeler", "ar": "المشاريع" },
  "nav.articles": { "en": "Articles", "tr": "Makaleler", "ar": "المقالات" },
  "nav.videos": { "en": "Videos", "tr": "Videolar", "ar": "الفيديوهات" },
  "nav.downloadCV": { "en": "Download CV", "tr": "CV İndir", "ar": "تحميل السيرة الذاتية" },
  "hero.viewProjects": { "en": "View projects", "tr": "Projeleri görüntüle", "ar": "عرض المشاريع" },
  "hero.contactMe": { "en": "Contact me", "tr": "Bana ulaşın", "ar": "تواصل معي" },
  "about.heading": { "en": "About", "tr": "Hakkımda", "ar": "نبذة عني" },
  "featured.heading": { "en": "Featured projects", "tr": "Öne çıkan projeler", "ar": "مشاريع مميزة" },
  "featured.viewAll": { "en": "All projects →", "tr": "Tüm projeler →", "ar": "كل المشاريع ←" },
  "latest.heading": { "en": "Latest articles", "tr": "Son makaleler", "ar": "أحدث المقالات" },
  "latest.viewAll": { "en": "All articles →", "tr": "Tüm makaleler →", "ar": "كل المقالات ←" },
  "videosHome.heading": { "en": "Videos", "tr": "Videolar", "ar": "الفيديوهات" },
  "videosHome.viewAll": { "en": "All videos →", "tr": "Tüm videolar →", "ar": "كل الفيديوهات ←" },
  "skills.heading": { "en": "Skills", "tr": "Yetenekler", "ar": "المهارات" },
  "skills.backend": { "en": "Backend", "tr": "Backend", "ar": "الواجهة الخلفية" },
  "skills.frontend": { "en": "Frontend", "tr": "Frontend", "ar": "الواجهة الأمامية" },
  "skills.tools": { "en": "Tools", "tr": "Araçlar", "ar": "الأدوات" },
  "contact.heading": { "en": "Contact", "tr": "İletişim", "ar": "تواصل" },
  "contact.name": { "en": "Name", "tr": "Ad", "ar": "الاسم" },
  "contact.email": { "en": "Email", "tr": "E-posta", "ar": "البريد الإلكتروني" },
  "contact.message": { "en": "Message", "tr": "Mesaj", "ar": "الرسالة" },
  "contact.send": { "en": "Send message", "tr": "Mesaj gönder", "ar": "إرسال الرسالة" },
  "articles.kicker": { "en": "Writing", "tr": "Yazılar", "ar": "الكتابة" },
  "articles.title": { "en": "Articles", "tr": "Makaleler", "ar": "المقالات" },
  "articleCard.read": { "en": "Read →", "tr": "Oku →", "ar": "اقرأ ←" },
  "projects.kicker": { "en": "Portfolio", "tr": "Portföy", "ar": "الأعمال" },
  "projects.title": { "en": "Projects", "tr": "Projeler", "ar": "المشاريع" },
  "projects.caseStudy": { "en": "Case study →", "tr": "Vaka incelemesi →", "ar": "دراسة الحالة ←" },
  "videos.kicker": { "en": "Watch", "tr": "İzle", "ar": "شاهد" },
  "videos.title": { "en": "Videos", "tr": "Videolar", "ar": "الفيديوهات" },
  "article.back": { "en": "← All articles", "tr": "← Tüm makaleler", "ar": "→ كل المقالات" },
  "article.moreArticles": { "en": "More articles →", "tr": "Diğer makaleler →", "ar": "المزيد من المقالات ←" }
}
```

- [ ] **Step 4: Write the loader**

`src/lib/content.ts`:

```ts
import type { Profile, Project, UiDict, Video } from "../types";
import profileJson from "../content/profile.json";
import projectsJson from "../content/projects.json";
import videosJson from "../content/videos.json";
import uiJson from "../content/ui.json";

export const profile = profileJson as Profile;
export const ui = uiJson as UiDict;

const projects = (projectsJson as Project[]).slice().sort((a, b) => a.order - b.order);
const videos = (videosJson as Video[]).slice().sort((a, b) => a.order - b.order);

export function allProjects(): Project[] {
  return projects;
}

export function featuredProjects(limit = 3): Project[] {
  return projects.filter((p) => p.featured).slice(0, limit);
}

export function allVideos(): Video[] {
  return videos;
}

export function featuredVideos(limit = 2): Video[] {
  return videos.filter((v) => v.featured).slice(0, limit);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/content.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: load profile, projects, videos, and UI strings from content files"
```

---

### Task 3: Article loader and Markdown rendering

**Files:**
- Create: `content/articles/2026-01-15-example-article/meta.json`, `content/articles/2026-01-15-example-article/en.md`, `src/lib/markdown.ts`, `src/lib/articles.ts`
- Test: `src/lib/markdown.test.ts`, `src/lib/articles.test.ts`

**Interfaces:**
- Consumes: `Article`, `ArticleMeta`, `Lang` from `src/types.ts`.
- Produces: `renderMarkdown(source: string): string` from `src/lib/markdown.ts`; `allArticles(): Article[]` (published only, newest first), `articleBySlug(slug: string): Article | undefined`, `bodyFor(article: Article, lang: Lang): { html: string; fellBack: boolean }`, `latestArticles(limit?: number): Article[]` from `src/lib/articles.ts`.

- [ ] **Step 1: Write the failing Markdown test**

`src/lib/markdown.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders headings and paragraphs", () => {
    const html = renderMarkdown("# Title\n\nA paragraph.");
    expect(html).toContain("<h1");
    expect(html).toContain("Title");
    expect(html).toContain("<p>A paragraph.</p>");
  });

  it("renders fenced code blocks", () => {
    const html = renderMarkdown("```java\npublic class Example {}\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("<code");
    expect(html).toContain("public class Example");
  });

  it("strips script tags", () => {
    const html = renderMarkdown('Hello <script>alert("x")</script> world');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(");
  });

  it("strips inline event handlers", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("returns an empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/markdown.test.ts`
Expected: FAIL — cannot resolve `./markdown`.

- [ ] **Step 3: Implement Markdown rendering**

`src/lib/markdown.ts`:

```ts
import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(source: string): string {
  if (!source) return "";
  const raw = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/lib/markdown.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Write the seed article**

`content/articles/2026-01-15-example-article/meta.json`:

```json
{
  "slug": "2026-01-15-example-article",
  "date": "2026-01-15",
  "topic": { "en": "Backend" },
  "title": { "en": "Article title goes here" },
  "standfirst": { "en": "A one-sentence standfirst summarising the article. Replace this text." },
  "readingMinutes": 6,
  "tags": [
    { "label": "Tag", "tone": "neutral" },
    { "label": "Tag", "tone": "neutral" }
  ],
  "cover": { "src": "/img/article-cover.jpg", "alt": { "en": "Article cover image" } },
  "featured": true,
  "published": true
}
```

`content/articles/2026-01-15-example-article/en.md`:

````markdown
Opening paragraph of your article goes here. Write your introduction, set up the problem, and tell the reader what they'll learn. Replace this text with your own writing.

## First section heading

Body paragraph. Explain your first point here — the context, the approach, the trade-offs. Replace this text.

```java
// Code sample goes here
public class Example {
    // ...
}
```

A paragraph following the code sample, walking the reader through what it does. Replace this text.

## Second section heading

Another body paragraph. Replace this text with the next part of your article.

Closing paragraph — summarise the takeaway and point the reader at what to try next. Replace this text.
````

- [ ] **Step 6: Write the failing article-loader test**

`src/lib/articles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { allArticles, articleBySlug, bodyFor, latestArticles } from "./articles";

describe("allArticles", () => {
  it("finds the seed article", () => {
    expect(allArticles().length).toBeGreaterThan(0);
  });

  it("returns only published articles", () => {
    expect(allArticles().every((a) => a.published)).toBe(true);
  });

  it("sorts newest first", () => {
    const dates = allArticles().map((a) => a.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("gives every article an English body", () => {
    for (const article of allArticles()) {
      expect(article.bodies.en, article.slug).toBeTruthy();
    }
  });
});

describe("articleBySlug", () => {
  it("finds an article by its slug", () => {
    const first = allArticles()[0]!;
    expect(articleBySlug(first.slug)?.slug).toBe(first.slug);
  });

  it("returns undefined for an unknown slug", () => {
    expect(articleBySlug("no-such-article")).toBeUndefined();
  });
});

describe("bodyFor", () => {
  it("renders the requested language when present", () => {
    const article = { ...allArticles()[0]!, bodies: { en: "# English", tr: "# Türkçe" } };
    const result = bodyFor(article, "tr");
    expect(result.html).toContain("Türkçe");
    expect(result.fellBack).toBe(false);
  });

  it("falls back to English and reports it when the language is missing", () => {
    const article = { ...allArticles()[0]!, bodies: { en: "# English" } };
    const result = bodyFor(article, "ar");
    expect(result.html).toContain("English");
    expect(result.fellBack).toBe(true);
  });

  it("does not report a fallback when English itself was requested", () => {
    const article = { ...allArticles()[0]!, bodies: { en: "# English" } };
    expect(bodyFor(article, "en").fellBack).toBe(false);
  });
});

describe("latestArticles", () => {
  it("caps the result at three by default", () => {
    expect(latestArticles().length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npm test -- src/lib/articles.test.ts`
Expected: FAIL — cannot resolve `./articles`.

- [ ] **Step 8: Implement the article loader**

`src/lib/articles.ts`:

```ts
import type { Article, ArticleMeta, Lang } from "../types";
import { renderMarkdown } from "./markdown";

const metaModules = import.meta.glob<ArticleMeta>("/content/articles/*/meta.json", {
  eager: true,
  import: "default",
});

const bodyModules = import.meta.glob<string>("/content/articles/*/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

function slugFromPath(path: string): string {
  return path.split("/")[3] ?? "";
}

function langFromPath(path: string): string {
  return (path.split("/").pop() ?? "").replace(/\.md$/, "");
}

const articles: Article[] = Object.entries(metaModules)
  .map(([path, meta]) => {
    const slug = slugFromPath(path);
    const bodies: Partial<Record<Lang, string>> = {};
    for (const [bodyPath, source] of Object.entries(bodyModules)) {
      if (slugFromPath(bodyPath) !== slug) continue;
      const lang = langFromPath(bodyPath);
      if (lang === "en" || lang === "tr" || lang === "ar") bodies[lang] = source;
    }
    return { ...meta, slug, bodies };
  })
  .filter((article) => article.published)
  .sort((a, b) => b.date.localeCompare(a.date));

export function allArticles(): Article[] {
  return articles;
}

export function articleBySlug(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}

export function latestArticles(limit = 3): Article[] {
  return articles.slice(0, limit);
}

export function bodyFor(article: Article, lang: Lang): { html: string; fellBack: boolean } {
  const source = article.bodies[lang];
  if (source) return { html: renderMarkdown(source), fellBack: false };
  return { html: renderMarkdown(article.bodies.en ?? ""), fellBack: lang !== "en" };
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: load Markdown articles with per-language bodies and English fallback"
```

---

### Task 4: Language negotiation and `LangProvider`

**Files:**
- Create: `src/i18n/negotiate.ts`, `src/i18n/LangProvider.tsx`
- Test: `src/i18n/negotiate.test.ts`, `src/i18n/LangProvider.test.tsx`

**Interfaces:**
- Consumes: `isLang`, `L` from `src/lib/localize.ts`; `ui` from `src/lib/content.ts`.
- Produces: `STORAGE_KEY`, `readStoredLang(): Lang | null`, `storeLang(lang: Lang): void`, `negotiateLang(preferred?: readonly string[]): Lang` from `src/i18n/negotiate.ts`; `LangProvider` (props `{ lang: Lang; children: ReactNode }`) and `useLang(): { lang: Lang; t: (key: string) => string; l: (value: LocalizedString | undefined) => string }` from `src/i18n/LangProvider.tsx`.

- [ ] **Step 1: Write the failing negotiation test**

`src/i18n/negotiate.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { negotiateLang, readStoredLang, STORAGE_KEY, storeLang } from "./negotiate";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("STORAGE_KEY", () => {
  it("is namespaced", () => {
    expect(STORAGE_KEY).toBe("portfolio:lang");
  });
});

describe("readStoredLang", () => {
  it("returns a stored supported language", () => {
    localStorage.setItem(STORAGE_KEY, "tr");
    expect(readStoredLang()).toBe("tr");
  });

  it("returns null for an unsupported stored value", () => {
    localStorage.setItem(STORAGE_KEY, "de");
    expect(readStoredLang()).toBeNull();
  });

  it("returns null instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readStoredLang()).toBeNull();
  });
});

describe("storeLang", () => {
  it("persists the language", () => {
    storeLang("ar");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("ar");
  });

  it("swallows a storage failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => storeLang("ar")).not.toThrow();
  });
});

describe("negotiateLang", () => {
  it("prefers the stored language", () => {
    localStorage.setItem(STORAGE_KEY, "ar");
    expect(negotiateLang(["tr-TR"])).toBe("ar");
  });

  it("falls back to a supported browser language", () => {
    expect(negotiateLang(["de-DE", "tr-TR", "en-US"])).toBe("tr");
  });

  it("ignores region subtags", () => {
    expect(negotiateLang(["AR-EG"])).toBe("ar");
  });

  it("defaults to English", () => {
    expect(negotiateLang(["de-DE", "fr-FR"])).toBe("en");
    expect(negotiateLang([])).toBe("en");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/i18n/negotiate.test.ts`
Expected: FAIL — cannot resolve `./negotiate`.

- [ ] **Step 3: Implement negotiation**

`src/i18n/negotiate.ts`:

```ts
import type { Lang } from "../types";
import { isLang } from "../lib/localize";

export const STORAGE_KEY = "portfolio:lang";

export function readStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage denied (sandboxed iframe, blocked site data). The choice simply
    // does not persist across visits; everything else keeps working.
  }
}

export function negotiateLang(
  preferred: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages ?? []
): Lang {
  const stored = readStoredLang();
  if (stored) return stored;
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/i18n/negotiate.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 5: Write the failing provider test**

`src/i18n/LangProvider.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LangProvider, useLang } from "./LangProvider";

function Probe() {
  const { lang, t, l } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="known">{t("nav.home")}</span>
      <span data-testid="unknown">{t("no.such.key")}</span>
      <span data-testid="localized">{l({ en: "English", tr: "Türkçe" })}</span>
    </div>
  );
}

describe("LangProvider", () => {
  it("translates chrome keys into the active language", () => {
    render(
      <LangProvider lang="tr">
        <Probe />
      </LangProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("tr");
    expect(screen.getByTestId("known")).toHaveTextContent("Ana Sayfa");
    expect(screen.getByTestId("localized")).toHaveTextContent("Türkçe");
  });

  it("falls back to English per key for a missing translation", () => {
    render(
      <LangProvider lang="ar">
        <Probe />
      </LangProvider>
    );
    expect(screen.getByTestId("localized")).toHaveTextContent("English");
  });

  it("renders an unknown key as the key itself rather than blank", () => {
    render(
      <LangProvider lang="en">
        <Probe />
      </LangProvider>
    );
    expect(screen.getByTestId("unknown")).toHaveTextContent("no.such.key");
  });

  it("sets the document language and direction for Arabic", () => {
    render(
      <LangProvider lang="ar">
        <Probe />
      </LangProvider>
    );
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("sets left-to-right for Turkish", () => {
    render(
      <LangProvider lang="tr">
        <Probe />
      </LangProvider>
    );
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("throws a clear error when used outside a provider", () => {
    expect(() => render(<Probe />)).toThrow(/useLang must be used inside a LangProvider/);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- src/i18n/LangProvider.test.tsx`
Expected: FAIL — cannot resolve `./LangProvider`.

- [ ] **Step 7: Implement the provider**

`src/i18n/LangProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { Lang, LocalizedString } from "../types";
import { L } from "../lib/localize";
import { ui } from "../lib/content";
import { storeLang } from "./negotiate";

interface LangContextValue {
  lang: Lang;
  t: (key: string) => string;
  l: (value: LocalizedString | undefined) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    storeLang(lang);
  }, [lang]);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      l: (localized) => L(localized, lang),
      t: (key) => {
        const entry = ui[key];
        if (!entry) {
          if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
          return key;
        }
        return L(entry, lang);
      },
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang must be used inside a LangProvider");
  return value;
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: language negotiation and LangProvider with per-key English fallback"
```

---

### Task 5: Router shell, `Nav`, `Footer`, `LangSwitcher`

**Files:**
- Create: `src/components/Nav.tsx`, `src/components/Footer.tsx`, `src/components/LangSwitcher.tsx`, `src/routes/LangLayout.tsx`, `src/routes/RootRedirect.tsx`, `src/routes/NotFound.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/LangSwitcher.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useLang`, `LangProvider`, `negotiateLang`, `isLang`, `profile`.
- Produces: `App` default export from `src/App.tsx`; route table `/`, `/:lang`, `/:lang/projects`, `/:lang/articles`, `/:lang/articles/:slug`, `/:lang/videos`, `*`.

Routes for Projects, Articles, Article, and Videos render a placeholder heading in this task and are filled in by Tasks 8–10. The route table is created here so navigation and language switching are testable now.

- [ ] **Step 1: Write the failing LangSwitcher test**

`src/components/LangSwitcher.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import LangSwitcher from "./LangSwitcher";

function renderAt(path: string, lang: "en" | "tr" | "ar") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LangProvider lang={lang}>
        <LangSwitcher />
      </LangProvider>
    </MemoryRouter>
  );
}

describe("LangSwitcher", () => {
  it("renders one real link per language", () => {
    renderAt("/en", "en");
    for (const label of ["EN", "TR", "AR"]) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href");
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("preserves the current path when switching language", () => {
    renderAt("/en/articles/some-slug", "en");
    expect(screen.getByRole("link", { name: "TR" })).toHaveAttribute(
      "href",
      "/tr/articles/some-slug"
    );
    expect(screen.getByRole("link", { name: "AR" })).toHaveAttribute(
      "href",
      "/ar/articles/some-slug"
    );
  });

  it("links to the bare language root from the home page", () => {
    renderAt("/tr", "tr");
    expect(screen.getByRole("link", { name: "AR" })).toHaveAttribute("href", "/ar");
  });

  it("marks exactly one language as current", () => {
    renderAt("/tr/projects", "tr");
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("TR");
  });

  it("does not set inline colors", () => {
    renderAt("/en", "en");
    expect(screen.getByRole("link", { name: "EN" }).getAttribute("style")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/LangSwitcher.test.tsx`
Expected: FAIL — cannot resolve `./LangSwitcher`.

- [ ] **Step 3: Implement `LangSwitcher`**

`src/components/LangSwitcher.tsx`:

```tsx
import { Link, useLocation } from "react-router-dom";
import { LANGS } from "../lib/localize";
import { useLang } from "../i18n/LangProvider";

export default function LangSwitcher() {
  const { lang } = useLang();
  const { pathname } = useLocation();
  const rest = pathname.replace(/^\/(en|tr|ar)(?=\/|$)/, "");

  return (
    <div className="lang-switcher">
      {LANGS.map((code, index) => (
        <span key={code}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <Link to={`/${code}${rest}`} aria-current={code === lang ? "true" : undefined}>
            {code.toUpperCase()}
          </Link>
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Add the switcher styles**

Append to `public/ds/rtl.css` — this file holds every rule this migration adds, keeping `industry.css` untouched:

```css
.lang-switcher {
  display: flex;
  gap: var(--space-2);
  font-size: 13px;
  align-items: center;
}
.lang-switcher a {
  color: var(--color-neutral-600);
}
.lang-switcher a[aria-current="true"] {
  color: var(--color-accent-700);
}
.site-footer .lang-switcher a {
  color: inherit;
}
.site-footer .lang-switcher a[aria-current="true"] {
  color: var(--color-accent-700);
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test -- src/components/LangSwitcher.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 6: Write `Nav` and `Footer`**

`src/components/Nav.tsx`:

```tsx
import { Link, NavLink } from "react-router-dom";
import { useLang } from "../i18n/LangProvider";
import { profile } from "../lib/content";
import LangSwitcher from "./LangSwitcher";

export default function Nav() {
  const { lang, t, l } = useLang();
  const base = `/${lang}`;

  return (
    <nav
      className="nav"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-6)",
        padding: "var(--space-4) var(--space-8)",
        borderBottom: "1px solid var(--color-divider)",
      }}
    >
      <Link
        to={base}
        className="nav-brand"
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: 20,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--color-text)",
        }}
      >
        {l(profile.name)}
      </Link>
      <div
        style={{
          display: "flex",
          gap: "var(--space-6)",
          marginInlineStart: "auto",
          fontSize: 15,
        }}
      >
        <NavLink to={base} end>
          {t("nav.home")}
        </NavLink>
        <NavLink to={`${base}/projects`}>{t("nav.projects")}</NavLink>
        <NavLink to={`${base}/articles`}>{t("nav.articles")}</NavLink>
        <NavLink to={`${base}/videos`}>{t("nav.videos")}</NavLink>
      </div>
      <LangSwitcher />
      <a
        className="btn btn-secondary"
        href={l(profile.cv)}
        download
        style={{ whiteSpace: "nowrap" }}
      >
        {t("nav.downloadCV")}
      </a>
    </nav>
  );
}
```

`src/components/Footer.tsx`:

```tsx
import { useLang } from "../i18n/LangProvider";
import { profile } from "../lib/content";
import LangSwitcher from "./LangSwitcher";

export default function Footer() {
  const { l } = useLang();

  return (
    <footer
      className="site-footer"
      style={{
        borderTop: "1px solid var(--color-divider)",
        padding: "var(--space-6) var(--space-8)",
        display: "flex",
        maxWidth: 1200,
        margin: "0 auto",
        fontSize: 13,
        color: "var(--color-neutral-600)",
      }}
    >
      <span>© {new Date().getFullYear()} {l(profile.name)}</span>
      <span style={{ marginInlineStart: "auto" }}>
        <LangSwitcher />
      </span>
    </footer>
  );
}
```

Add the active-nav rule to `public/ds/rtl.css`:

```css
.nav a.active {
  color: var(--color-accent-700);
}
```

- [ ] **Step 7: Write the failing routing test**

`src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("routing", () => {
  it("renders the home page for a valid language", () => {
    renderAt("/en");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders navigation in the language from the URL", () => {
    renderAt("/tr");
    expect(screen.getByRole("link", { name: "Projeler" })).toBeInTheDocument();
  });

  it("rejects an unsupported language", () => {
    renderAt("/de");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });

  it("renders not-found for an unknown path", () => {
    renderAt("/en/nope");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });

  it("redirects the bare root to a language", () => {
    renderAt("/");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — `App` renders an empty div, no navigation.

- [ ] **Step 9: Implement the route shell**

`src/routes/RootRedirect.tsx`:

```tsx
import { Navigate } from "react-router-dom";
import { negotiateLang } from "../i18n/negotiate";

export default function RootRedirect() {
  return <Navigate to={`/${negotiateLang()}`} replace />;
}
```

`src/routes/NotFound.tsx`:

```tsx
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
```

`src/routes/LangLayout.tsx`:

```tsx
import { Outlet, useParams } from "react-router-dom";
import { isLang } from "../lib/localize";
import { LangProvider } from "../i18n/LangProvider";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import NotFound from "./NotFound";

export default function LangLayout() {
  const { lang } = useParams();
  if (!isLang(lang)) return <NotFound />;

  return (
    <LangProvider lang={lang}>
      <div
        style={{
          background: "var(--color-bg)",
          color: "var(--color-text)",
          fontFamily: "var(--font-body)",
          minHeight: "100%",
        }}
      >
        <Nav />
        <Outlet />
        <Footer />
      </div>
    </LangProvider>
  );
}
```

`src/App.tsx`:

```tsx
import { Route, Routes } from "react-router-dom";
import LangLayout from "./routes/LangLayout";
import RootRedirect from "./routes/RootRedirect";
import NotFound from "./routes/NotFound";

function Placeholder({ name }: { name: string }) {
  return <main data-testid={`placeholder-${name}`} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/:lang" element={<LangLayout />}>
        <Route index element={<Placeholder name="home" />} />
        <Route path="projects" element={<Placeholder name="projects" />} />
        <Route path="articles" element={<Placeholder name="articles" />} />
        <Route path="articles/:slug" element={<Placeholder name="article" />} />
        <Route path="videos" element={<Placeholder name="videos" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: language-aware routing with shared nav, footer, and language switcher"
```

---

### Task 6: Layout primitives — `Blueprint`, `Duotone`, `ImageFrame`, `TagList`

These replace the four `<i class="corner">` elements repeated inline throughout the old markup, and the `<image-slot>` custom element.

**Files:**
- Create: `src/components/Blueprint.tsx`, `src/components/Duotone.tsx`, `src/components/ImageFrame.tsx`, `src/components/TagList.tsx`
- Test: `src/components/ImageFrame.test.tsx`, `src/components/TagList.test.tsx`

**Interfaces:**
- Consumes: `ImageRef`, `Tag` from `src/types.ts`; `useLang`.
- Produces: `Blueprint` (props `{ as?: "div" | "figure" | "article"; className?: string; style?: CSSProperties; testId?: string; children: ReactNode }`); `Duotone` (props `{ height: number | string; children: ReactNode }`); `ImageFrame` (props `{ image: ImageRef; height: number | string }`); `TagList` (props `{ tags: Tag[] }`).

- [ ] **Step 1: Write the failing tests**

`src/components/ImageFrame.test.tsx`:

```tsx
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
```

`src/components/TagList.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TagList from "./TagList";

describe("TagList", () => {
  it("renders each tag with its tone class", () => {
    render(
      <TagList
        tags={[
          { label: "Java", tone: "accent" },
          { label: "Docker", tone: "neutral" },
        ]}
      />
    );
    expect(screen.getByText("Java")).toHaveClass("tag", "tag-accent");
    expect(screen.getByText("Docker")).toHaveClass("tag", "tag-neutral");
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<TagList tags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components`
Expected: FAIL — cannot resolve `./ImageFrame` and `./TagList`.

- [ ] **Step 3: Implement the primitives**

`src/components/Blueprint.tsx`:

```tsx
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
```

`src/components/Duotone.tsx`:

```tsx
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
```

`src/components/ImageFrame.tsx`:

```tsx
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
```

`src/components/TagList.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: blueprint, duotone, image frame, and tag list primitives"
```

---

### Task 7: `ContactForm`

**Files:**
- Create: `src/components/ContactForm.tsx`, `.env.example`
- Test: `src/components/ContactForm.test.tsx`

**Interfaces:**
- Consumes: `useLang`.
- Produces: `ContactForm` (no props). Reads `import.meta.env.VITE_FORMSPREE_ENDPOINT`.

- [ ] **Step 1: Write the failing test**

`src/components/ContactForm.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import ContactForm from "./ContactForm";

function renderForm() {
  return render(
    <LangProvider lang="en">
      <ContactForm />
    </LangProvider>
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_FORMSPREE_ENDPOINT", "https://formspree.io/f/test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("ContactForm", () => {
  it("associates every label with its input", () => {
    renderForm();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("posts the entered values to the configured endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://formspree.io/f/test");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ name: "Ada", email: "ada@example.com", message: "Hello" });
  });

  it("keeps the entered text when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    renderForm();

    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveValue("Hello");
  });

  it("does not submit when the honeypot is filled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderForm();

    const honeypot = container.querySelector<HTMLInputElement>('input[name="company"]')!;
    await userEvent.type(honeypot, "spam-bot");
    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports that the form is not configured when the endpoint is unset", async () => {
    vi.stubEnv("VITE_FORMSPREE_ENDPOINT", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not configured/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/ContactForm.test.tsx`
Expected: FAIL — cannot resolve `./ContactForm`.

- [ ] **Step 3: Implement the form**

`src/components/ContactForm.tsx`:

```tsx
import { useId, useState, type FormEvent } from "react";
import { useLang } from "../i18n/LangProvider";
import Blueprint from "./Blueprint";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const { t } = useLang();
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (company) return; // honeypot: a bot filled a field humans never see

    const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT;
    if (!endpoint) {
      setStatus("error");
      setError("The contact form is not configured yet. Email me directly instead.");
      return;
    }

    setStatus("sending");
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <div className="field">
        <label htmlFor={nameId}>{t("contact.name")}</label>
        <input
          id={nameId}
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={emailId}>{t("contact.email")}</label>
        <input
          id={emailId}
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={messageId}>{t("contact.message")}</label>
        <textarea
          id={messageId}
          className="input"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

      <input
        type="text"
        name="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
      />

      <Blueprint as="div" style={{ alignSelf: "flex-start" }}>
        <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
          {t("contact.send")}
        </button>
      </Blueprint>

      {status === "sent" && <p role="status">Thanks — your message is on its way.</p>}
      {status === "error" && (
        <p role="alert" style={{ color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Document the environment variable**

`.env.example`:

```bash
# Formspree endpoint for the contact form.
# Create a form at https://formspree.io and paste its endpoint here.
VITE_FORMSPREE_ENDPOINT=
```

Add `.env` and `.env.local` to `.gitignore`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/components/ContactForm.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: working contact form with honeypot and inline error handling"
```

---

### Task 8: Home route

**Files:**
- Create: `src/routes/Home.tsx`, `src/components/ProjectCard.tsx`, `src/components/ArticleRow.tsx`, `src/components/VideoEmbed.tsx`, `src/components/SectionHeading.tsx`
- Modify: `src/App.tsx` (replace the home placeholder)
- Test: `src/routes/Home.test.tsx`

**Interfaces:**
- Consumes: `profile`, `featuredProjects`, `featuredVideos` from `src/lib/content.ts`; `latestArticles` from `src/lib/articles.ts`; `Blueprint`, `ImageFrame`, `TagList`, `ContactForm`, `useLang`.
- Produces: `ProjectCard` (props `{ project: Project }`); `ArticleRow` (props `{ article: Article }`); `VideoEmbed` (props `{ video: Video }`); `SectionHeading` (props `{ title: string; linkTo?: string; linkLabel?: string }`); `Home` default export.

- [ ] **Step 1: Write the failing test**

`src/routes/Home.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Home", () => {
  it("renders the profile headline", () => {
    renderAt("/en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your name goes here");
  });

  it("renders the about text", () => {
    renderAt("/en");
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("renders at most three featured projects", () => {
    renderAt("/en");
    expect(screen.getAllByTestId("project-card").length).toBeLessThanOrEqual(3);
  });

  it("links to the full projects page", () => {
    renderAt("/en");
    expect(screen.getByRole("link", { name: "All projects →" })).toHaveAttribute(
      "href",
      "/en/projects"
    );
  });

  it("links article rows to their detail page", () => {
    renderAt("/en");
    const link = screen.getAllByTestId("article-row")[0]!.querySelector("a")!;
    expect(link.getAttribute("href")).toMatch(/^\/en\/articles\//);
  });

  it("renders headings in Turkish on the Turkish home page", () => {
    renderAt("/tr");
    expect(screen.getByRole("heading", { name: "Öne çıkan projeler" })).toBeInTheDocument();
  });

  it("renders the contact form", () => {
    renderAt("/en");
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/routes/Home.test.tsx`
Expected: FAIL — the home route is still a placeholder.

- [ ] **Step 3: Write the shared card components**

`src/components/SectionHeading.tsx`:

```tsx
import { Link } from "react-router-dom";

export default function SectionHeading({
  title,
  linkTo,
  linkLabel,
}: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-4)",
        marginBottom: "var(--space-6)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 28,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </h2>
      {linkTo && linkLabel && (
        <Link to={linkTo} style={{ marginInlineStart: "auto", fontSize: 14 }}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
```

`src/components/ProjectCard.tsx`:

```tsx
import type { Project } from "../types";
import { useLang } from "../i18n/LangProvider";
import Blueprint from "./Blueprint";
import ImageFrame from "./ImageFrame";
import TagList from "./TagList";

export default function ProjectCard({ project }: { project: Project }) {
  const { t, l } = useLang();

  return (
    <Blueprint
      as="article"
      className="card"
      testId="project-card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
    >
      <ImageFrame image={project.image} height={160} />
      <span className="card-kicker">{l(project.kicker)}</span>
      <h3 className="card-title" style={{ margin: 0 }}>
        {l(project.title)}
      </h3>
      <p className="card-body" style={{ margin: 0 }}>
        {l(project.summary)}
      </p>
      <TagList tags={project.tags} />
      {project.url && (
        <a href={project.url} style={{ fontSize: 14 }}>
          {t("projects.caseStudy")}
        </a>
      )}
    </Blueprint>
  );
}
```

`src/components/ArticleRow.tsx`:

```tsx
import { Link } from "react-router-dom";
import type { Article } from "../types";
import { useLang } from "../i18n/LangProvider";

export default function ArticleRow({ article }: { article: Article }) {
  const { lang, l } = useLang();

  return (
    <article
      data-testid="article-row"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
    >
      <span
        style={{
          fontSize: 13,
          color: "var(--color-neutral-600)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {article.date} · {l(article.topic)}
      </span>
      <h3 style={{ margin: 0, fontSize: 20 }}>
        <Link to={`/${lang}/articles/${article.slug}`} style={{ color: "var(--color-text)" }}>
          {l(article.title)}
        </Link>
      </h3>
      <p style={{ margin: 0, fontSize: 15, color: "var(--color-neutral-700)" }}>
        {l(article.standfirst)}
      </p>
    </article>
  );
}
```

`src/components/VideoEmbed.tsx`:

```tsx
import type { Video } from "../types";
import { useLang } from "../i18n/LangProvider";
import Blueprint from "./Blueprint";

export default function VideoEmbed({ video }: { video: Video }) {
  const { l } = useLang();
  const title = l(video.title);

  return (
    <Blueprint as="figure" style={{ margin: 0, padding: "var(--space-2)" }}>
      <div data-testid="video-embed" style={{ width: "100%", aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </div>
      <figcaption style={{ padding: "var(--space-2) 0 0", fontSize: 15 }}>{title}</figcaption>
    </Blueprint>
  );
}
```

- [ ] **Step 4: Write the home route**

`src/routes/Home.tsx`:

```tsx
import { Link } from "react-router-dom";
import { useLang } from "../i18n/LangProvider";
import { featuredProjects, featuredVideos, profile } from "../lib/content";
import { latestArticles } from "../lib/articles";
import Blueprint from "../components/Blueprint";
import ImageFrame from "../components/ImageFrame";
import ProjectCard from "../components/ProjectCard";
import ArticleRow from "../components/ArticleRow";
import VideoEmbed from "../components/VideoEmbed";
import SectionHeading from "../components/SectionHeading";
import ContactForm from "../components/ContactForm";
import TagList from "../components/TagList";

const section = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "var(--space-8)",
  borderTop: "1px solid var(--color-divider)",
} as const;

export default function Home() {
  const { lang, t, l } = useLang();

  return (
    <main>
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "var(--space-8)",
          alignItems: "center",
          padding: "calc(var(--space-8) * 2.5) var(--space-8)",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: 14,
              color: "var(--color-accent-700)",
            }}
          >
            {l(profile.kicker)}
          </span>
          <h1 style={{ margin: 0, fontSize: 64, lineHeight: 1.05, textTransform: "uppercase" }}>
            {l(profile.headline)}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: "52ch",
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--color-neutral-700)",
            }}
          >
            {l(profile.intro)}
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
            <Blueprint as="div">
              <Link className="btn btn-primary" to={`/${lang}/projects`}>
                {t("hero.viewProjects")}
              </Link>
            </Blueprint>
            <a className="btn btn-secondary" href="#contact">
              {t("hero.contactMe")}
            </a>
          </div>
        </div>
        <Blueprint as="figure" style={{ margin: 0, padding: "var(--space-3)" }}>
          <ImageFrame image={profile.portrait} height={340} />
        </Blueprint>
      </header>

      <section style={{ ...section, display: "grid", gridTemplateColumns: "220px 1fr", gap: "var(--space-8)" }}>
        <h2 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("about.heading")}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.7,
            color: "var(--color-neutral-700)",
            maxWidth: "68ch",
          }}
        >
          {l(profile.about)}
        </p>
      </section>

      <section style={section}>
        <SectionHeading
          title={t("featured.heading")}
          linkTo={`/${lang}/projects`}
          linkLabel={t("featured.viewAll")}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-6)" }}>
          {featuredProjects().map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      <section
        style={{
          ...section,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "calc(var(--space-8) * 2)",
        }}
      >
        <div>
          <SectionHeading
            title={t("latest.heading")}
            linkTo={`/${lang}/articles`}
            linkLabel={t("latest.viewAll")}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {latestArticles().map((article) => (
              <ArticleRow key={article.slug} article={article} />
            ))}
          </div>
        </div>
        <div>
          <SectionHeading
            title={t("videosHome.heading")}
            linkTo={`/${lang}/videos`}
            linkLabel={t("videosHome.viewAll")}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {featuredVideos().map((video) => (
              <VideoEmbed key={video.id} video={video} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...section, display: "grid", gridTemplateColumns: "220px 1fr", gap: "var(--space-8)" }}>
        <h2 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("skills.heading")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {profile.skills.map((group) => (
            <div
              key={group.group.en}
              style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}
            >
              <span
                style={{
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-neutral-600)",
                  width: 90,
                }}
              >
                {l(group.group)}
              </span>
              <TagList tags={group.items} />
            </div>
          ))}
        </div>
      </section>

      <section
        id="contact"
        style={{
          ...section,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "calc(var(--space-8) * 2)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <h2 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {t("contact.heading")}
          </h2>
          <a href={`mailto:${profile.email}`} style={{ fontSize: 17 }}>
            {profile.email}
          </a>
          <div style={{ display: "flex", gap: "var(--space-4)", fontSize: 15 }}>
            {profile.socials.map((social) => (
              <a key={social.label} href={social.url}>
                {social.label}
              </a>
            ))}
          </div>
          <a
            className="btn btn-secondary"
            href={l(profile.cv)}
            download
            style={{ alignSelf: "flex-start" }}
          >
            {t("nav.downloadCV")}
          </a>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Wire the route**

In `src/App.tsx`, add `import Home from "./routes/Home";` and replace
`<Route index element={<Placeholder name="home" />} />` with
`<Route index element={<Home />} />`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: home route rendering from content files"
```

---

### Task 9: Projects and Videos routes

**Files:**
- Create: `src/routes/Projects.tsx`, `src/routes/Videos.tsx`, `src/components/PageHeader.tsx`
- Modify: `src/App.tsx`
- Test: `src/routes/Projects.test.tsx`, `src/routes/Videos.test.tsx`

**Interfaces:**
- Consumes: `allProjects`, `allVideos`, `ProjectCard`, `VideoEmbed`, `useLang`.
- Produces: `PageHeader` (props `{ kicker: string; title: string }`); `Projects` and `Videos` default exports.

- [ ] **Step 1: Write the failing tests**

`src/routes/Projects.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allProjects } from "../lib/content";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Projects", () => {
  it("renders every project, not only the featured ones", () => {
    renderAt("/en/projects");
    expect(screen.getAllByTestId("project-card")).toHaveLength(allProjects().length);
  });

  it("renders the localized page title", () => {
    renderAt("/tr/projects");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Projeler");
  });

  it("renders the Arabic page title", () => {
    renderAt("/ar/projects");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("المشاريع");
  });
});
```

`src/routes/Videos.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allVideos } from "../lib/content";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Videos", () => {
  it("renders every video", () => {
    renderAt("/en/videos");
    expect(screen.getAllByTestId("video-embed")).toHaveLength(allVideos().length);
  });

  it("embeds each video by its id on the privacy-preserving host", () => {
    const { container } = renderAt("/en/videos");
    const frames = [...container.querySelectorAll("iframe")];
    expect(frames).toHaveLength(allVideos().length);
    for (const [index, frame] of frames.entries()) {
      expect(frame.getAttribute("src")).toBe(
        `https://www.youtube-nocookie.com/embed/${allVideos()[index]!.youtubeId}`
      );
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/routes`
Expected: FAIL — both routes are still placeholders.

- [ ] **Step 3: Implement `PageHeader` and both routes**

`src/components/PageHeader.tsx`:

```tsx
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
```

`src/routes/Projects.tsx`:

```tsx
import { useLang } from "../i18n/LangProvider";
import { allProjects } from "../lib/content";
import PageHeader from "../components/PageHeader";
import ProjectCard from "../components/ProjectCard";

export default function Projects() {
  const { t } = useLang();

  return (
    <main>
      <PageHeader kicker={t("projects.kicker")} title={t("projects.title")} />
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-8)",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-6)",
        }}
      >
        {allProjects().map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </section>
    </main>
  );
}
```

`src/routes/Videos.tsx`:

```tsx
import { useLang } from "../i18n/LangProvider";
import { allVideos } from "../lib/content";
import PageHeader from "../components/PageHeader";
import VideoEmbed from "../components/VideoEmbed";

export default function Videos() {
  const { t } = useLang();

  return (
    <main>
      <PageHeader kicker={t("videos.kicker")} title={t("videos.title")} />
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-8)",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--space-6)",
        }}
      >
        {allVideos().map((video) => (
          <VideoEmbed key={video.id} video={video} />
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Wire the routes**

In `src/App.tsx`, import both and replace the `projects` and `videos` placeholder elements with `<Projects />` and `<Videos />`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: projects and videos routes"
```

---

### Task 10: Articles index and article detail routes

**Files:**
- Create: `src/routes/Articles.tsx`, `src/routes/Article.tsx`
- Modify: `src/App.tsx`
- Test: `src/routes/Articles.test.tsx`, `src/routes/Article.test.tsx`

**Interfaces:**
- Consumes: `allArticles`, `articleBySlug`, `bodyFor`, `ArticleRow`, `PageHeader`, `Blueprint`, `ImageFrame`, `TagList`, `useLang`.
- Produces: `Articles` and `Article` default exports.

- [ ] **Step 1: Write the failing tests**

`src/routes/Articles.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allArticles } from "../lib/articles";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Articles", () => {
  it("lists every published article", () => {
    renderAt("/en/articles");
    expect(screen.getAllByTestId("article-row")).toHaveLength(allArticles().length);
  });

  it("renders the localized page title", () => {
    renderAt("/ar/articles");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("المقالات");
  });
});
```

`src/routes/Article.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { allArticles } from "../lib/articles";

const slug = allArticles()[0]!.slug;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Article", () => {
  it("renders the article title and body", () => {
    renderAt(`/en/articles/${slug}`);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Article title goes here"
    );
    expect(screen.getByText(/Opening paragraph/)).toBeInTheDocument();
  });

  it("renders the body Markdown as HTML", () => {
    renderAt(`/en/articles/${slug}`);
    expect(screen.getByRole("heading", { name: "First section heading" })).toBeInTheDocument();
  });

  it("shows a notice when the article is only available in English", () => {
    renderAt(`/tr/articles/${slug}`);
    expect(screen.getByTestId("language-fallback-notice")).toBeInTheDocument();
  });

  it("shows no notice on the English version", () => {
    renderAt(`/en/articles/${slug}`);
    expect(screen.queryByTestId("language-fallback-notice")).not.toBeInTheDocument();
  });

  it("links back to the articles index", () => {
    renderAt(`/en/articles/${slug}`);
    expect(screen.getByRole("link", { name: "← All articles" })).toHaveAttribute(
      "href",
      "/en/articles"
    );
  });

  it("renders not-found for an unknown slug", () => {
    renderAt("/en/articles/no-such-article");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/routes/Article`
Expected: FAIL — both routes are still placeholders.

- [ ] **Step 3: Implement both routes**

`src/routes/Articles.tsx`:

```tsx
import { useLang } from "../i18n/LangProvider";
import { allArticles } from "../lib/articles";
import PageHeader from "../components/PageHeader";
import ArticleRow from "../components/ArticleRow";

export default function Articles() {
  const { t } = useLang();

  return (
    <main>
      <PageHeader kicker={t("articles.kicker")} title={t("articles.title")} />
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        {allArticles().map((article) => (
          <ArticleRow key={article.slug} article={article} />
        ))}
      </section>
    </main>
  );
}
```

`src/routes/Article.tsx`:

```tsx
import { Link, useParams } from "react-router-dom";
import { useLang } from "../i18n/LangProvider";
import { articleBySlug, bodyFor } from "../lib/articles";
import Blueprint from "../components/Blueprint";
import ImageFrame from "../components/ImageFrame";
import TagList from "../components/TagList";
import NotFound from "./NotFound";

export default function Article() {
  const { slug } = useParams();
  const { lang, t, l } = useLang();
  const article = slug ? articleBySlug(slug) : undefined;

  if (!article) return <NotFound />;

  const { html, fellBack } = bodyFor(article, lang);

  return (
    <main>
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "calc(var(--space-8) * 2) var(--space-8)" }}>
        <Link to={`/${lang}/articles`} style={{ fontSize: 14 }}>
          {t("article.back")}
        </Link>

        <header
          style={{
            margin: "var(--space-6) 0 var(--space-8)",
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
            {l(article.topic)} · {article.date} · {article.readingMinutes} min
          </span>
          <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.1, textTransform: "uppercase" }}>
            {l(article.title)}
          </h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "var(--color-neutral-700)" }}>
            {l(article.standfirst)}
          </p>
        </header>

        {fellBack && (
          <p
            data-testid="language-fallback-notice"
            style={{
              margin: "0 0 var(--space-6)",
              padding: "var(--space-3)",
              border: "1px solid var(--color-divider)",
              background: "var(--color-neutral-200)",
              fontSize: 14,
            }}
          >
            This article is available in English only.
          </p>
        )}

        {article.cover && (
          <Blueprint as="figure" style={{ margin: "0 0 var(--space-8)", padding: "var(--space-3)" }}>
            <ImageFrame image={article.cover} height={320} />
          </Blueprint>
        )}

        <div
          className="article-body"
          style={{ fontSize: 17, lineHeight: 1.75, color: "var(--color-neutral-800)" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <footer
          style={{
            marginTop: "calc(var(--space-8) * 1.5)",
            paddingTop: "var(--space-6)",
            borderTop: "1px solid var(--color-divider)",
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          <TagList tags={article.tags} />
          <Link to={`/${lang}/articles`} style={{ marginInlineStart: "auto", fontSize: 14 }}>
            {t("article.moreArticles")}
          </Link>
        </footer>
      </article>
    </main>
  );
}
```

The article body is sanitized HTML from `renderMarkdown`, which is why `dangerouslySetInnerHTML` is safe here — Task 3's tests cover script and event-handler stripping.

Add body styles to `public/ds/rtl.css`:

```css
.article-body > * + * {
  margin-block-start: var(--space-6);
}
.article-body h2 {
  font-size: 28px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.article-body pre {
  padding: var(--space-4);
  background: var(--color-neutral-200);
  border: 1px solid var(--color-divider);
  font-size: 14px;
  line-height: 1.6;
  overflow: auto;
}
```

- [ ] **Step 4: Wire the routes and delete the placeholder helper**

In `src/App.tsx`, import both and replace the `articles` and `articles/:slug` placeholders with `<Articles />` and `<Article />`. This was the last placeholder route, so delete the `Placeholder` function too — `noUnusedLocals: true` fails the build otherwise. `src/App.tsx` now reads in full:

```tsx
import { Route, Routes } from "react-router-dom";
import LangLayout from "./routes/LangLayout";
import RootRedirect from "./routes/RootRedirect";
import NotFound from "./routes/NotFound";
import Home from "./routes/Home";
import Projects from "./routes/Projects";
import Articles from "./routes/Articles";
import Article from "./routes/Article";
import Videos from "./routes/Videos";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/:lang" element={<LangLayout />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        <Route path="articles" element={<Articles />} />
        <Route path="articles/:slug" element={<Article />} />
        <Route path="videos" element={<Videos />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: articles index and article detail with Markdown bodies"
```

---

### Task 11: Arabic and RTL correctness

The Arabic switch currently produces broken typography: `industry.css` sets a Latin-only condensed heading font and `letter-spacing` on headings, which severs Arabic letter joining, and uppercase transforms mean nothing in Arabic.

**Files:**
- Modify: `public/ds/rtl.css`
- Test: `src/rtl.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: the `:root[lang="ar"]` override block; a repository-wide guard test.

- [ ] **Step 1: Write the failing test**

`src/rtl.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("logical properties", () => {
  it("never uses physical auto margins for edge pinning", () => {
    const offenders = sourceFiles("src").filter((path) => {
      const source = readFileSync(path, "utf8");
      return /margin(Left|Right)\s*:\s*["']auto["']/.test(source) ||
        /margin-(left|right)\s*:\s*auto/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});

describe("rtl.css", () => {
  const css = readFileSync("public/ds/rtl.css", "utf8");

  it("resets letter-spacing for Arabic", () => {
    expect(css).toMatch(/:root\[lang="ar"\][^}]*letter-spacing:\s*normal/s);
  });

  it("drops uppercase transforms for Arabic", () => {
    expect(css).toMatch(/:root\[lang="ar"\][^}]*text-transform:\s*none/s);
  });

  it("swaps in an Arabic heading font", () => {
    expect(css).toMatch(/--font-heading:[^;]*Arabic/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/rtl.test.ts`
Expected: FAIL — the three `rtl.css` assertions fail; the margin guard passes if earlier tasks were followed.

- [ ] **Step 3: Write the Arabic overrides**

Append to `public/ds/rtl.css`:

```css
/* Arabic overrides.
   industry.css sets --font-heading to "Barlow Condensed", which has no Arabic
   coverage, plus letter-spacing and uppercase transforms on every heading.
   letter-spacing breaks the joins between Arabic letters and uppercase is
   meaningless in the script, so both are reset here rather than in industry.css. */
:root[lang="ar"] {
  --font-heading: "IBM Plex Sans Arabic", "Noto Kufi Arabic", "Segoe UI", system-ui, sans-serif;
  --font-body: "IBM Plex Sans Arabic", "Noto Sans Arabic", "Segoe UI", system-ui, sans-serif;
}

:root[lang="ar"] h1,
:root[lang="ar"] h2,
:root[lang="ar"] h3,
:root[lang="ar"] .nav-brand,
:root[lang="ar"] .card-kicker {
  letter-spacing: normal;
  text-transform: none;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 5: Check Arabic visually**

Run: `npm run dev`, open `/ar`, and confirm: the page reads right-to-left; the nav links sit on the correct edge; Arabic headings are joined, not spaced out; the "All projects ←" arrow points left.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Arabic typography and RTL layout correctness"
```

---

### Task 12: Remove the dead runtime, document, and verify the build

**Files:**
- Delete: `archive/dc-original/support.js`, `archive/dc-original/image-slot.js`, `archive/dc-original/i18n.js`
- Create: `README.md`
- Test: `src/migration.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable — this task closes out the migration.

The `.dc.html` files stay in `archive/dc-original/` as the visual reference. The three JavaScript files are deleted because their replacements are tested and in place.

- [ ] **Step 1: Confirm visual parity first**

Run `npm run dev` and compare each page against its archived original opened directly in a browser: `/en` against `archive/dc-original/index.html`, `/en/projects` against `Projects.dc.html`, `/en/articles` against `Articles.dc.html`, `/en/articles/<slug>` against `Article.dc.html`, `/en/videos` against `Videos.dc.html`. Fix any divergence before continuing — after the next step the originals no longer render.

- [ ] **Step 2: Write the failing test**

`src/migration.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|html)$/.test(entry) ? [path] : [];
  });
}

describe("migration", () => {
  it("no longer ships the in-browser dc runtime", () => {
    expect(existsSync("archive/dc-original/support.js")).toBe(false);
    expect(existsSync("archive/dc-original/image-slot.js")).toBe(false);
    expect(existsSync("archive/dc-original/i18n.js")).toBe(false);
  });

  it("keeps no reference to the old runtime in shipped source", () => {
    const offenders = [...sourceFiles("src"), "index.html"].filter((path) =>
      /support\.js|image-slot|x-dc|data-i18n/.test(readFileSync(path, "utf8"))
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the design system that the site still uses", () => {
    expect(existsSync("public/ds/industry.css")).toBe(true);
    expect(existsSync("public/ds/rtl.css")).toBe(true);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/migration.test.ts`
Expected: FAIL — the three runtime files still exist.

- [ ] **Step 4: Delete the dead runtime**

```bash
git rm archive/dc-original/support.js archive/dc-original/image-slot.js archive/dc-original/i18n.js
```

- [ ] **Step 5: Write the README**

`README.md`:

````markdown
# Portfolio

A React portfolio site. Content lives in files; the site is built to static
HTML and deployed to Vercel.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit and component tests
npm run build    # static output in dist/
```

## Editing content

| What | Where |
| --- | --- |
| Your name, bio, skills, socials, CV link | `src/content/profile.json` |
| Projects | `src/content/projects.json` |
| Videos | `src/content/videos.json` |
| Nav, headings, button labels | `src/content/ui.json` |
| Articles | `content/articles/<slug>/` |
| Images and CV PDF | `public/img/`, `public/` |

Every piece of visible text is an object with `en`, `tr`, and `ar` keys. Only
`en` is required — a missing translation falls back to English for that key
alone.

To add an article, create `content/articles/<yyyy-mm-dd-slug>/` containing
`meta.json` and at least `en.md`. Add `tr.md` and `ar.md` when you have them.
Set `"published": false` to keep a draft out of the build.

## Configuration

Copy `.env.example` to `.env` and set `VITE_FORMSPREE_ENDPOINT` to the endpoint
of a form created at https://formspree.io. Without it the contact form tells
visitors to email directly instead.

## Languages

`en`, `tr`, `ar`. The language is part of the URL (`/tr/projects`), so every
page is separately shareable. Arabic renders right-to-left; its typography
overrides live in `public/ds/rtl.css`.

## Archive

`archive/` holds the original design-canvas pages and the three unused design
system variants. Nothing there is built or deployed; it is kept as a visual
reference.
````

- [ ] **Step 6: Run the full suite and build**

Run: `npm test`
Expected: PASS — all suites green.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove the in-browser dc runtime and document the project"
```

---

## What Plan B covers

Written after this plan lands, against the same spec:

1. Admin shell at `/admin` — lazy chunk, `noindex`, editor screens for profile, projects, videos, articles, and UI strings, with an EN/TR/AR tab strip on every localized field.
2. `ContentStore` interface and `LocalFsStore` — a Vite dev-server middleware that writes to disk with a path guard, registered only when `command === "serve"`.
3. `GitHubStore` — blob/tree/commit/ref sequence for atomic multi-file saves, fine-grained PAT in `localStorage`, base-SHA conflict detection.
4. Image upload through the active store.
5. `scripts/prerender.mjs` — real HTML per route per language, plus `sitemap.xml` and `robots.txt`.
6. `vercel.json`, deployment, and a first production release.
