const SITE_URL = "https://news4bharat.com";

const BLOCKED_TOP_LEVEL_SEGMENTS = new Set([
  "article",
  "news",
  "category",
  "tag",
  "author",
  "about",
  "about-us",
  "contact",
  "contact-us",
  "privacy-policy",
  "terms-of-service",
  "terms-conditions",
  "terms-and-conditions",
  "founders-note",
  "editorial-policy",
  "career",
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

const getArticleCategorySlug = (article) => {
  const directCandidates = [
    article?.category_slug,
    article?.primary_category_slug,
    article?.category?.slug,
    article?.primary_category?.slug,
  ]
    .map((value) => String(value || "").trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  if (directCandidates[0]) return directCandidates[0];

  const categoryDetails = Array.isArray(article?.category_details)
    ? article.category_details
    : article?.category_details
      ? [article.category_details]
      : [];

  const fromDetails = categoryDetails
    .map((item) => String(item?.slug || item?.category_slug || "").trim().replace(/^\/+|\/+$/g, ""))
    .find(Boolean);

  return fromDetails || "";
};

export const isArticlePath = (value) => {
  const segments = getCleanSegments(value);
  return (
    segments.length === 2 &&
    !BLOCKED_TOP_LEVEL_SEGMENTS.has(segments[0].toLowerCase())
  );
};

export const getArticlePath = (article) => {
  const publicUrl = getValidSiteUrl(article?.public_url);
  if (publicUrl) {
    const cleanPath = `/${getCleanSegments(publicUrl.pathname).join("/")}`;
    if (isArticlePath(cleanPath)) return cleanPath;
  }

  const canonicalUrl = getValidSiteUrl(article?.canonical_url);
  if (canonicalUrl) {
    const cleanPath = `/${getCleanSegments(canonicalUrl.pathname).join("/")}`;
    if (isArticlePath(cleanPath)) return cleanPath;
  }

  const slug = String(article?.slug || article?.article_slug || article?.articleSlug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const categorySlug = getArticleCategorySlug(article);
  const derivedPath = categorySlug && slug ? `/${categorySlug}/${slug}` : "";

  return isArticlePath(derivedPath) ? derivedPath : "";
};

export const getAbsoluteArticleUrl = (article) => {
  const path = getArticlePath(article);
  return path ? `${SITE_URL}${path}` : "";
};

export const getCanonicalArticleUrl = (article) => {
  const canonical = getValidSiteUrl(article?.canonical_url);
  if (canonical) {
    const cleanPath = `/${getCleanSegments(canonical.pathname).join("/")}`;
    if (isArticlePath(cleanPath)) {
      return `${canonical.origin}${cleanPath}`;
    }
  }

  return getAbsoluteArticleUrl(article);
};
