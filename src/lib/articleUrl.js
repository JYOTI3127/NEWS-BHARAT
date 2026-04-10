const SITE_URL = "https://news4bharat.com";

const BLOCKED_TOP_LEVEL_SEGMENTS = new Set([
  "article",
  "news",
  "category",
  "tag",
  "author",
  "about",
  "contact",
  "privacy-policy",
  "terms-of-service",
  "founders-note",
  "editorial-policy",
  "careers",
  "disclaimer",
  "60-seconds",
  "commingsoon",
]);

const getCleanSegments = (value) =>
  String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

const getValidSiteUrl = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized, SITE_URL);
    if (parsed.origin !== SITE_URL) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const isArticlePath = (value) => {
  const segments = getCleanSegments(value);
  return (
    segments.length === 2 &&
    !BLOCKED_TOP_LEVEL_SEGMENTS.has(segments[0].toLowerCase())
  );
};

export const getArticlePath = (article) => {
  const parsed = getValidSiteUrl(article?.public_url);
  if (!parsed) return "";

  const cleanPath = `/${getCleanSegments(parsed.pathname).join("/")}/`;
  return isArticlePath(cleanPath) ? cleanPath : "";
};

export const getAbsoluteArticleUrl = (article) => {
  const parsed = getValidSiteUrl(article?.public_url);
  if (!parsed) return "";

  const path = getArticlePath(article);
  return path ? `${parsed.origin}${path}` : "";
};

export const getCanonicalArticleUrl = (article) => {
  const canonical = getValidSiteUrl(article?.canonical_url);
  if (canonical) {
    const cleanPath = `/${getCleanSegments(canonical.pathname).join("/")}/`;
    if (isArticlePath(cleanPath)) {
      return `${canonical.origin}${cleanPath}`;
    }
  }

  return getAbsoluteArticleUrl(article);
};
