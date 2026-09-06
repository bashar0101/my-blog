import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(source: string): string {
  if (!source) return "";
  const raw = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
