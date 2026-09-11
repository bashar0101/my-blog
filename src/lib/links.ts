/**
 * Project links are typed into the admin and rendered straight into an href.
 * The admin's type="url" input does not stop `javascript:` or `data:`, so the
 * scheme is checked here instead of trusted: anything that is not http(s) is
 * treated as no link at all rather than rendered as a dead or dangerous one.
 *
 * A value with no scheme ("example.com") is read as https, which is what
 * someone typing a domain into a URL field meant.
 */
export function externalHref(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
}
