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
