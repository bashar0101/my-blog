# React Portfolio Migration — Design

**Date:** 2026-09-06
**Status:** Approved (approach C — hybrid admin)

## Problem

The site is five static HTML pages driven by `support.js`, a 1841-line
in-browser runtime that loads React UMD and Babel from a CDN, reads a hidden
`<x-dc>` element as a component template, and compiles it in the visitor's
browser on every page load. `image-slot.js` adds a further 1197 lines of
custom-element image-placeholder machinery. Content is hardcoded placeholder
markup — "Your Name", "Project title one" — repeated across pages. `i18n.js`
translates by walking the DOM after every mutation.

Three consequences:

1. **Not deployable as a real site.** Every visitor downloads and runs a
   compiler. There is no build, no bundle, no per-page HTML for crawlers.
2. **Content cannot be edited without editing markup.** Adding an article
   means hand-writing a new `.dc.html` file and duplicating nav, footer, and
   language switcher into it.
3. **The DOM-mutation i18n approach fights the renderer that owns the DOM**,
   and corrupts the design-canvas source template when it runs (see
   "Defects fixed by construction").

## Goals

- A real React application that builds to static files and deploys to Vercel.
- Content editable through forms, not markup — add an article, edit a project,
  change profile data.
- EN / TR / AR with correct RTL rendering for Arabic.
- Preserve the existing visual design exactly. `ds/industry.css` is the
  design system and stays.

## Non-goals

Deliberately excluded to keep the first version shippable: syntax
highlighting in code blocks, article search, tag filtering, RSS, comments,
view counters, dark mode, analytics. Each is additive later.

## Approach

Vite + React + React Router, static output, prerendered per route. Content
lives in JSON and Markdown files in the repo. An admin UI edits those files
through one of two save adapters chosen at build time: direct filesystem
writes in development, GitHub API commits in production.

Rejected alternatives:

- **Next.js static export** — better SEO ergonomics out of the box, but
  heavier configuration for a site this size, and the prerender step below
  closes the SEO gap with ~60 lines of our own code.
- **Deployed-admin-only (no local adapter)** — forces a GitHub token into
  `localStorage` even when editing at your own machine, for no benefit.
- **Local-admin-only** — safest, but you can never fix a typo from a phone.
- **Headless CMS / database** — adds a backend, auth, and hosting cost to a
  site whose content changes a few times a month.

## Content model

All user-facing text is a `LocalizedString`:

```ts
type Lang = "en" | "tr" | "ar";
type LocalizedString = { en: string; tr?: string; ar?: string };
```

`en` is required and is the fallback for every other language, per key. A
missing `tr` value falls back to `en` — never to the previously displayed
language.

### `src/content/profile.json`

```jsonc
{
  "name": LocalizedString,          // transliterates in Arabic
  "kicker": LocalizedString,        // "Java · Spring Boot · React"
  "headline": LocalizedString,
  "intro": LocalizedString,
  "about": LocalizedString,
  "email": "string",
  "cv": LocalizedString,            // per-language PDF path, falls back to en
  "portrait": { "src": "string", "alt": LocalizedString },
  "socials": [{ "label": "string", "url": "string" }],
  "skills": [
    {
      "group": LocalizedString,     // "Backend"
      "items": [{ "label": "string", "tone": "accent" | "neutral" }]
    }
  ]
}
```

### `src/content/projects.json`

Array of:

```jsonc
{
  "id": "slug",
  "title": LocalizedString,
  "kicker": LocalizedString,        // "Backend · API"
  "summary": LocalizedString,
  "tags": [{ "label": "string", "tone": "accent" | "neutral" }],
  "image": { "src": "string", "alt": LocalizedString },
  "url": "string | null",           // optional case-study link
  "featured": true,                 // home page shows featured, max 3
  "order": 0
}
```

### `src/content/videos.json`

Array of `{ id, title: LocalizedString, youtubeId, description: LocalizedString, featured, order }`.

`youtubeId` is the bare video id. The component builds the embed URL, so a
pasted full YouTube URL is normalized to an id on save by the admin.

### `src/content/ui.json`

The chrome dictionary — the same keys `i18n.js` uses today (`nav.home`,
`hero.viewProjects`, `contact.send`, …), each value a `LocalizedString`.
Carried over verbatim, including the existing Turkish and Arabic strings.

### `content/articles/<slug>/`

```
content/articles/2026-01-15-testing-spring-boot/
  meta.json      # slug, date, topic, readingMinutes, tags, cover, featured, published
  en.md          # body only, no frontmatter
  tr.md          # optional
  ar.md          # optional
```

`meta.json` holds `title` and `standfirst` as `LocalizedString`. Bodies are
Markdown, one file per language. A language with no file falls back to the
English body and renders a notice above it: "This article is available in
English only." `published: false` excludes an article from the build.

## Application structure

```
src/
  main.tsx                 entry, router
  routes/
    Home.tsx  Projects.tsx  Articles.tsx  Article.tsx  Videos.tsx  NotFound.tsx
    admin/                 lazy chunk, excluded from prerender
  components/
    Nav.tsx  Footer.tsx  LangSwitcher.tsx  Blueprint.tsx  Duotone.tsx
    ProjectCard.tsx  ArticleRow.tsx  VideoEmbed.tsx  ImageFrame.tsx
    ContactForm.tsx  SkillRow.tsx  Tag.tsx
  i18n/
    LangProvider.tsx       context, t(key), L(localizedString)
    negotiate.ts           storage + Accept-Language → default lang
  content/                 the JSON above
  lib/
    content.ts             loads + types content at build time
    markdown.ts            marked + DOMPurify
ds/industry.css            unchanged
public/img/                real images
scripts/prerender.mjs      post-build static HTML generation
```

`Blueprint` renders the four `<i class="corner">` elements the current markup
repeats inline everywhere. `Duotone` wraps the image treatment. `ImageFrame`
replaces `<image-slot>` with a real `<img>` plus an `onError` fallback that
keeps the framed box rather than collapsing the layout.

Content is loaded with `import.meta.glob(..., { eager: true })`, so it is
bundled at build time. There is no runtime fetch, no loading state, no CORS,
and a malformed JSON file fails the build instead of the page.

## Routing and i18n

Routes carry the language, so every page is shareable and separately
indexable:

```
/                       → redirect to /:lang (stored choice, else Accept-Language, else en)
/:lang                  Home
/:lang/projects         Projects
/:lang/articles         Articles
/:lang/articles/:slug   Article
/:lang/videos           Videos
/admin                  Admin (no language prefix)
*                       NotFound, rendered in the current language
```

`:lang` is validated against `["en","tr","ar"]`; anything else renders
NotFound rather than silently falling back.

`LangProvider` reads `:lang` from the route and is the single source of
truth. It sets `document.documentElement.lang` and `dir`, and exposes
`t(key)` for `ui.json` and `L(value)` for content. There is no
MutationObserver: React owns the DOM and renders the correct language on
first paint.

`localStorage` is used only to remember the last chosen language for the
root redirect. Every access is wrapped in `try/catch` and the key is
namespaced `portfolio:lang`, so a sandboxed iframe or blocked site-data
degrades to the default language instead of throwing.

### Arabic and RTL

- `dir="rtl"` on `<html>` when `lang === "ar"`.
- Every layout rule uses logical properties. All existing
  `margin-left: auto` becomes `margin-inline-start: auto`, so nav, footer,
  and the "All projects →" links pin to the correct edge in both directions.
- A `:root[lang="ar"]` block in a new `ds/rtl.css`: `letter-spacing: normal`,
  `text-transform: none` (uppercase is meaningless in Arabic), and
  `--font-heading` swapped to an Arabic display stack
  (`"IBM Plex Sans Arabic", "Noto Kufi Arabic", system-ui`) since
  "Barlow Condensed" has no Arabic coverage.
- Directional arrows in strings (`All projects →`) are already per-language
  values in `ui.json`, so the Arabic value carries `←`.

## Admin

Route `/admin`, code-split into its own chunk, carrying
`<meta name="robots" content="noindex">` and disallowed in `robots.txt`.

Screens: Profile, Projects, Videos, Articles, UI strings. Every localized
field renders as a three-tab input (EN / TR / AR) so a translation is filled
in beside the original rather than in a separate screen. The article editor
is a Markdown textarea with live preview, per language.

### Save adapter

```ts
interface ContentStore {
  write(
    files: { path: string; content: string; encoding: "utf8" | "base64" }[],
    message: string
  ): Promise<void>;
}
```

**`LocalFsStore`** (development). POSTs to `/__admin/write`, served by a Vite
dev-server middleware plugin registered only when `command === "serve"`, so
it cannot exist in a production build. The plugin resolves each path against
the repo root and rejects anything that escapes `content/`, `src/content/`,
or `public/img/`. No token, no network, no auth surface.

**`GitHubStore`** (production). Commits through the Git Data API — create
blobs, build a tree, create a commit, update the ref — so a multi-file save
(article body + metadata + cover image) lands as one atomic commit rather
than several partial ones. Authentication is a fine-grained personal access
token, scoped to this one repository with Contents: Read and Write, pasted
once and held in `localStorage` under `portfolio:ghToken`. The token is sent
only to `api.github.com`, is never logged, and the admin UI states plainly
that anyone with access to the browser profile can use it. The store records
the base commit SHA when it loads; if remote `HEAD` has moved at save time it
refuses and asks for a reload, rather than overwriting a change made
elsewhere.

The adapter is selected by `import.meta.env.DEV`. The editor components are
identical in both modes.

Image upload reads the file, writes it base64 to `public/img/<name>`, and
stores the path on the record.

After a production save, Vercel rebuilds on the new commit and the change is
live in roughly forty seconds. The admin says so instead of implying the save
was instant.

## Contact form

Currently a `type="button"` that sends nothing. It will POST to **Formspree**
— no backend, no API key in the repo, free tier sufficient for a portfolio —
with the endpoint in `VITE_FORMSPREE_ENDPOINT`. A honeypot field filters
bots. Success and failure both render inline, and the entered text survives a
failure.

If mail volume ever justifies it, the same form can point at a Vercel
serverless function using Resend; the component's submit handler is the only
thing that changes.

## Defects fixed by construction

The code review of the current `i18n.js` work found fourteen issues. Replacing
the DOM-walking approach with React rendering eliminates these without
separate fixes:

| Finding | Resolution |
| --- | --- |
| `applyLang` corrupts the hidden `<x-dc>` template | `<x-dc>` and `support.js` are deleted |
| Unguarded `localStorage` kills the module | Single guarded read, `try/catch`, default on failure |
| Observer ignores attribute mutations | No observer; React re-renders |
| No per-key dictionary fallback | `L()` falls back per key to `en` |
| `dir=rtl` breaks `margin-left:auto` | Logical properties throughout |
| Arabic inherits `letter-spacing` and a Latin font | `:root[lang="ar"]` overrides in `ds/rtl.css` |
| Ctrl/middle-click on language link navigates | `<Link>` with a real `href` |
| Inline color overwrite kills `color:inherit` | Active state via `aria-current` + CSS |
| Unnamespaced `lang` storage key | `portfolio:lang` |
| Unthrottled observer scans | No observer |
| Observer races React | React is the single writer |
| `applyLang` called three times at startup | Single render |
| Switcher markup duplicated ten times | One `LangSwitcher` component |
| Form labels unassociated, stray `</input>` | `for`/`id` pairs, valid JSX |

## Build and deploy

`npm run build` runs Vite, then `scripts/prerender.mjs`: for each content
route it renders the app with `renderToString`, injects the markup and a
per-page `<title>`/`<meta description>`/`og:` tags into the HTML template,
and writes `dist/<route>/index.html`. Every article ships as real HTML in all
three languages, so crawlers and link previews see content. `/admin` is
excluded. The script also emits `sitemap.xml` and `robots.txt`.

Prerendering requires the app to render without browser globals at module
scope. The only such access is the language `localStorage` read, which lives
inside an effect and is guarded.

`vercel.json` sets the output directory to `dist` and rewrites unmatched
paths to `/index.html` so client-side navigation works for routes the
prerender did not emit.

## Error handling

| Case | Behavior |
| --- | --- |
| Malformed content JSON | Build fails with the file name — never reaches production |
| Missing translation for a key | Falls back to `en`; warns in the dev console |
| Article missing a language file | Renders the English body under a visible notice |
| Missing or broken image | `onError` renders the framed placeholder, layout intact |
| Unknown `:lang` or article slug | NotFound page in the current language |
| Admin save rejected by GitHub | Inline error with GitHub's message; form state preserved |
| Remote moved since load | Save refused, reload requested — no silent overwrite |
| `localStorage` unavailable | Default language, no throw |

## Testing

Vitest and React Testing Library.

- `L()` fallback chain: missing key → `en`; missing language → `en`; missing
  both → key name in dev, empty in production.
- Language route parsing accepts the three valid codes and rejects others.
- `LangSwitcher` renders three real `href`s and marks exactly one
  `aria-current`.
- `Article` falls back to the English body and renders the notice when a
  language file is absent.
- `LocalFsStore` path guard rejects `../` and absolute paths.
- `GitHubStore` builds the expected blob/tree/commit payload sequence against
  a mocked `fetch`, and refuses a save when the base SHA has moved.
- Form labels are associated with their inputs (`getByLabelText` finds each).
- `npm run build` succeeds and emits one HTML file per article per language.

## Migration

`ds/industry.css` is kept and used as-is. The other three design-system
stylesheets, `Portfolio Directions.dc.html`, and `_ds/` are planning
artifacts — they move to `archive/` and are excluded from the build rather
than deleted.

The five `.dc.html` files stay in `archive/dc-original/` until each page's
React equivalent is confirmed to match visually, then are removed in a
separate commit. `support.js` and `image-slot.js` are deleted once
`ImageFrame` and the components replace them.

Existing placeholder copy and the existing EN/TR/AR dictionary values are
migrated into the content files verbatim, so the site renders identically
after migration and real content is filled in afterwards through the admin.

## Phases

1. Scaffold (Vite, TypeScript, Vitest), content model and loader, design
   system wired, Home route rendering from content.
2. Remaining routes, `LangProvider`, RTL stylesheet, language-aware routing,
   Markdown articles.
3. Admin: shared editor UI, `LocalFsStore`, `GitHubStore`, image upload.
4. Contact form, prerender script, `vercel.json`, sitemap, deploy.
