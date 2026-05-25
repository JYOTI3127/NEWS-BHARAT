export const stripArticleHtml = (value) =>
  String(value || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getArticlePlainText = (article) =>
  stripArticleHtml(
    article?.content_html ||
      article?.content ||
      article?.content_clean ||
      article?.content_raw ||
      article?.articleBody ||
      article?.body ||
      article?.subtitle ||
      article?.summary ||
      article?.description ||
      article?.excerpt ||
      ""
  );

export const getArticleSummary = (article, maxLength = 132) => {
  const summary = stripArticleHtml(
    article?.subtitle ||
      article?.description ||
      article?.summary ||
      article?.excerpt ||
      article?.meta_description ||
      ""
  );

  if (!summary || summary.length <= maxLength) return summary;
  return `${summary.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

export const getArticleAuthorName = (article) =>
  String(
    article?.display_author_name ||
      article?.author_display_name ||
      article?.author_name ||
      article?.posted_by_fullname ||
      article?.posted_by_username ||
      article?.author?.name ||
      article?.author?.username ||
      "News4Bharat Desk"
  ).trim();

export const getArticleReadTime = (article) => {
  const directValue =
    article?.read_time ||
    article?.reading_time ||
    article?.estimated_read_time ||
    article?.readTime;

  if (directValue) {
    const directText = String(directValue).trim();
    if (/read/i.test(directText)) return directText;
    if (/min/i.test(directText)) return `${directText} read`;
    return `${directText} min read`;
  }

  const wordCount = getArticlePlainText(article).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(wordCount / 220))} min read`;
};

export const getArticleDateLabel = (article, options = {}) => {
  const value =
    article?.published_date ||
    article?.published_at ||
    article?.updated_at ||
    article?.created_at ||
    article?.date ||
    "";

  if (!value) return "";

  try {
    return new Date(value)
      .toLocaleString("en-IN", {
        day: options.compact ? undefined : "2-digit",
        month: options.compact ? undefined : "short",
        year: options.compact ? undefined : "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
      .replace(/\b(am|pm)\b/g, (match) => match.toUpperCase())
      .replace(",", " at");
  } catch {
    return String(value);
  }
};
