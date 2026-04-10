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

export const slugifyPathSegment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getCanonicalPathSegments = (article) => {
  const canonical = String(article?.canonical_url || "").trim();
  if (!canonical) return [];

  try {
    const parsed = new URL(canonical, SITE_URL);
    if (parsed.origin !== SITE_URL) return [];
    return getCleanSegments(parsed.pathname);
  } catch {
    return [];
  }
};

const getCategoryObjects = (article) => {
  const candidates = [];

  if (Array.isArray(article?.category_details)) {
    candidates.push(...article.category_details);
  } else if (article?.category_details && typeof article.category_details === "object") {
    candidates.push(article.category_details);
  }

  if (Array.isArray(article?.categories)) {
    candidates.push(...article.categories.filter((item) => item && typeof item === "object"));
  }

  if (article?.category && typeof article.category === "object") {
    candidates.push(article.category);
  }

  return candidates;
};

export const getArticleSlug = (article, fallback = "") => {
  const directSegments = getCleanSegments(article?.slug);
  if (directSegments.length > 0) {
    return slugifyPathSegment(directSegments[directSegments.length - 1]);
  }

  const fallbackSegments = getCleanSegments(fallback);
  if (fallbackSegments.length > 0) {
    return slugifyPathSegment(fallbackSegments[fallbackSegments.length - 1]);
  }

  return slugifyPathSegment(article?.id || "");
};

export const getArticleCategorySlug = (article, fallback = "") => {
  const canonicalSegments = getCanonicalPathSegments(article);
  if (
    canonicalSegments.length >= 2 &&
    !BLOCKED_TOP_LEVEL_SEGMENTS.has(slugifyPathSegment(canonicalSegments[0]))
  ) {
    return slugifyPathSegment(canonicalSegments[0]);
  }

  for (const category of getCategoryObjects(article)) {
    const slug = slugifyPathSegment(category?.slug || category?.name || "");
    if (slug) return slug;
  }

  const slugSegments = getCleanSegments(article?.slug);
  if (
    slugSegments.length >= 2 &&
    !BLOCKED_TOP_LEVEL_SEGMENTS.has(slugifyPathSegment(slugSegments[0]))
  ) {
    return slugifyPathSegment(slugSegments[0]);
  }

  const fallbackSegments = getCleanSegments(fallback);
  if (
    fallbackSegments.length > 0 &&
    !BLOCKED_TOP_LEVEL_SEGMENTS.has(slugifyPathSegment(fallbackSegments[0]))
  ) {
    return slugifyPathSegment(fallbackSegments[0]);
  }

  if (typeof article?.category === "string") {
    const categorySlug = slugifyPathSegment(article.category);
    if (categorySlug) return categorySlug;
  }

  return "";
};

export const getArticlePathFromParts = (categorySlug, articleSlug) => {
  const safeCategorySlug = slugifyPathSegment(categorySlug);
  const safeArticleSlug = slugifyPathSegment(articleSlug);

  if (!safeCategorySlug || !safeArticleSlug) return "";
  return `/${safeCategorySlug}/${safeArticleSlug}/`;
};

export const isArticlePath = (value) => {
  const segments = getCleanSegments(value);
  return (
    segments.length === 2 &&
    !BLOCKED_TOP_LEVEL_SEGMENTS.has(slugifyPathSegment(segments[0]))
  );
};

export const getArticlePath = (
  article,
  { fallbackCategorySlug = "", fallbackSlug = "" } = {}
) => {
  const canonicalSegments = getCanonicalPathSegments(article);
  if (
    canonicalSegments.length >= 2 &&
    !BLOCKED_TOP_LEVEL_SEGMENTS.has(canonicalSegments[0])
  ) {
    return `/${canonicalSegments[0]}/${canonicalSegments[canonicalSegments.length - 1]}/`;
  }

  const articleSlug = getArticleSlug(article, fallbackSlug);
  const categorySlug = getArticleCategorySlug(article, fallbackCategorySlug);
  return getArticlePathFromParts(categorySlug, articleSlug);
};

export const getAbsoluteArticleUrl = (
  article,
  options = {}
) => {
  const path = getArticlePath(article, options);
  return path ? `${SITE_URL}${path}` : SITE_URL;
};
