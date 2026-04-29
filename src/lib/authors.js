const safeDecode = (value) => {
  const raw = String(value || "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const toArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

export const getArticleAuthorName = (article) =>
  String(
    article?.display_author_name ||
      article?.author_display_name ||
      article?.author_name ||
      article?.posted_by_fullname ||
      article?.author?.full_name ||
      article?.author?.name ||
      article?.author?.username ||
      "News4Bharat"
  ).trim();

export const buildAuthorSlug = (value) =>
  String(safeDecode(value).trim())
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export const getArticleAuthorSlugCandidates = (article) => {
  const rawCandidates = [
    article?.author_slug,
    article?.authorSlug,
    article?.author?.slug,
    article?.author?.username,
    article?.author?.name,
    article?.author?.full_name,
    article?.author_username,
    article?.posted_by,
    article?.created_by,
    article?.updated_by,
    ...toArray(article?.author),
    ...toArray(article?.authors),
    ...toArray(article?.assigned_to),
  ];

  const expanded = rawCandidates.flatMap((value) => {
    if (value && typeof value === "object") {
      return [
        value.slug,
        value.username,
        value.name,
        value.full_name,
        value.id,
      ];
    }
    return [value];
  });

  const normalized = expanded
    .map((value) => buildAuthorSlug(value))
    .filter(Boolean);

  const fallbackNameSlug = buildAuthorSlug(getArticleAuthorName(article));
  if (fallbackNameSlug) normalized.push(fallbackNameSlug);

  return Array.from(new Set(normalized));
};

export const getArticleAuthorSlug = (article) => {
  const candidates = getArticleAuthorSlugCandidates(article);
  const preferred = candidates.find((slug) => !/^\d+$/.test(slug));
  return preferred || candidates[0] || "";
};
