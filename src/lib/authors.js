export const getArticleAuthorName = (article) =>
  String(
    article?.display_author_name ||
      article?.author_display_name ||
      article?.author_name ||
      article?.posted_by_fullname ||
      article?.author?.username ||
      "News4Bharat"
  ).trim();

export const buildAuthorSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getArticleAuthorSlug = (article) =>
  buildAuthorSlug(getArticleAuthorName(article));

