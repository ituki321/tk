/**
 * http/https が無ければ https:// を補完する。
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function openUrl(raw: string | null | undefined) {
  const url = normalizeUrl(raw);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
