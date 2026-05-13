const LIVE_API_BASE = "https://news4bharat.cloud/api";

export const API_BASE = import.meta.env.DEV ? "/api" : LIVE_API_BASE;

export const apiUrl = (path = "") => {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

export const fetchJson = async (path) => {
 const response = await fetch(apiUrl(path), {
  cache: "no-store",
});

  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`);
  }

  return response.json();
};

export const getListFromResponse = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.value)
      ? data.value
      : Array.isArray(data?.results)
        ? data.results
        : [];

export const getArticleDateValue = (article) =>
  article?.published_date ||
  article?.date ||
  article?.published_at ||
  article?.created_at ||
  article?.updated_at ||
  "";

export const getDate = (article) => {
  const raw =
    article?.published_date ||
    article?.date ||
    article?.published_at ||
    article?.created_at;

  if (!raw) return "";

  if (typeof raw === "string" && raw.includes(",")) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

export const formatArticleDateTimeIST = (articleOrDate) => {
  const rawDate =
    typeof articleOrDate === "string"
      ? articleOrDate
      : getArticleDateValue(articleOrDate);

  if (!rawDate) return "";

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "";

  const readable = date.toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return `${readable.replace(/\b(am|pm)\b/g, (match) => match.toUpperCase())} IST`;
};

export const formatArticleDateIST = (articleOrDate) => {
  return typeof articleOrDate === "string"
    ? getDate({ published_date: articleOrDate })
    : getDate(articleOrDate);
};

const buildArticlesPath = ({ page = 1, limit = 10, category, full = false } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (category) params.set("category", category);
  if (full) params.set("full", "1");
  return `/articles/?${params.toString()}`;
};

const normalizeNextUrl = (value) => {
  const next = String(value || "").trim();
  if (!next || !import.meta.env.DEV) return next;

  try {
    const nextUrl = new URL(next);
    const liveUrl = new URL(LIVE_API_BASE);
    if (nextUrl.origin === liveUrl.origin && nextUrl.pathname.startsWith(liveUrl.pathname)) {
      const path = `${nextUrl.pathname.slice(liveUrl.pathname.length)}${nextUrl.search}`;
      return apiUrl(path || "/");
    }
  } catch {
    return next;
  }

  return next;
};

export const fetchArticlePage = ({ page = 1, limit = 10, category, full = false } = {}) =>
  fetchJson(buildArticlesPath({ page, limit, category, full }));

export const fetchPaginatedArticles = async ({
  category,
  limit = 10,
  maxPages = 100,
  full = false,
} = {}) => {
  const allArticles = [];
  const seen = new Set();
  let page = 1;
  let nextUrl = "";
  let pages = 0;

  while (pages < maxPages) {
const response = await fetch(
  nextUrl || apiUrl(buildArticlesPath({ page, limit, category, full })),
  {
    cache: "no-store",
  }
);

    if (!response.ok) {
      throw new Error(`Request failed for articles page ${page}: ${response.status}`);
    }

    const data = await response.json();
    const list = getListFromResponse(data);

    list.forEach((article) => {
      const key = String(article?.id || article?.slug || article?.public_url || "").trim();
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      allArticles.push(article);
    });

    pages += 1;

    if (Array.isArray(data)) break;
    if (data?.has_next === true) {
      page = Number(data?.page || page) + 1;
      nextUrl = "";
      continue;
    }

    nextUrl = normalizeNextUrl(data?.next);
    if (!nextUrl) break;
  }

  return allArticles;
};

export const fetchArticles = async () => {
  return fetchPaginatedArticles({ limit: 10 });
};

export const fetchHomepageLatestNewsCurrent = () =>
  fetchJson("/homepage/latest_news/current/");

export const getLatestNewsArticlesFromResponse = (data) =>
  Array.isArray(data?.articles) ? data.articles : getListFromResponse(data);

// ─── FreshPopularShowcase ─────────────────────────────────────────────────────
// Endpoint: GET /homepage/latest_news/current/
// Response: { slot, display_count: 12, articles: [...] }
// Backend display_count change kare — frontend automatically wahi dikhayega
export const fetchFreshPopularShowcase = () =>
  fetchJson("/homepage/latest_news/current/");

export const getFreshPopularArticlesFromResponse = (data) => {
  if (!data) return [];

  // articles key se data lo
  const articles = Array.isArray(data?.articles)
    ? data.articles
    : getListFromResponse(data);

  // display_count backend set karta hai — frontend sirf respect karta hai
  const displayCount = Number(data?.display_count);
  if (Number.isFinite(displayCount) && displayCount > 0) {
    return articles.slice(0, displayCount);
  }

  return articles;
};
// ─────────────────────────────────────────────────────────────────────────────

export const fetchHomepageHeroCurrent = () =>
  fetchJson("/homepage/hero/current/");

export const getHomepageHeroArticlesFromResponse = (data) => {
  const isArticleLike = (item) =>
    item &&
    typeof item === "object" &&
    (
      item.title ||
      item.headline ||
      item.article_title ||
      item.name ||
      item.slug ||
      item.id ||
      item.article_id ||
      item.public_url ||
      item.url ||
      item.image_url ||
      item.image ||
      item?.image?.url ||
      item.featured_image ||
      item.featured_image_url ||
      item.thumbnail ||
      item.thumbnail_url
    );

  const toIdentityKey = (item, index = 0) =>
    String(
      item?.id ||
      item?.slug ||
      item?.public_url ||
      item?.url ||
      item?.headline ||
      item?.title ||
      index
    ).trim().toLowerCase();

  const dedupeArticles = (list) => {
    const seen = new Set();
    return list.filter((item, index) => {
      if (!isArticleLike(item)) return false;
      const key = toIdentityKey(item, index);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const preferredKeys = [
    "main_article",
    "overlay_article_1",
    "overlay_article_2",
    "overlay_article_3",
    "overlay_articles",
    "articles",
    "hero_articles",
    "featured_articles",
    "selected_articles",
    "results",
    "items",
    "data",
    "hero",
    "payload",
  ];

  const collectArticles = (value, depth = 0, seen = new Set()) => {
    if (depth > 7 || value == null) return [];
    if (typeof value !== "object") return [];
    if (seen.has(value)) return [];
    seen.add(value);

    if (isArticleLike(value)) return [value];

    if (Array.isArray(value)) {
      return value.flatMap((item) => collectArticles(item, depth + 1, seen));
    }

    const preferredResults = [];
    for (const key of preferredKeys) {
      if (!(key in value)) continue;
      const found = collectArticles(value[key], depth + 1, seen);
      if (found.length > 0) preferredResults.push(...found);
    }
    if (preferredResults.length > 0) return preferredResults;

    const fromValues = Object.values(value).flatMap((nestedValue) =>
      collectArticles(nestedValue, depth + 1, seen)
    );
    return fromValues;
  };

  const directList = getListFromResponse(data);
  const directArticles = dedupeArticles(
    Array.isArray(directList) ? directList : collectArticles(directList)
  );
  if (directArticles.length > 0) return directArticles;

  return dedupeArticles(collectArticles(data));
};

export const fetchCategories = () => fetchJson("/categories/");