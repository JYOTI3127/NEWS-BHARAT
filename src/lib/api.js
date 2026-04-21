const LIVE_API_BASE = "https://news4bharat.cloud/api";

export const API_BASE = import.meta.env.DEV ? "/api" : LIVE_API_BASE;

export const apiUrl = (path = "") => {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

export const fetchJson = async (path) => {
  const response = await fetch(apiUrl(path));

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

const buildArticlesPath = ({ page = 1, limit = 10, category } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (category) params.set("category", category);
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

export const fetchArticlePage = ({ page = 1, limit = 10, category } = {}) =>
  fetchJson(buildArticlesPath({ page, limit, category }));

export const fetchPaginatedArticles = async ({ category, limit = 10, maxPages = 100 } = {}) => {
  const allArticles = [];
  const seen = new Set();
  let page = 1;
  let nextUrl = "";
  let pages = 0;

  while (pages < maxPages) {
    const response = await fetch(nextUrl || apiUrl(buildArticlesPath({ page, limit, category })));

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

export const fetchCategories = () => fetchJson("/categories/");
