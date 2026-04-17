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

const getListFromResponse = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.value)
      ? data.value
      : Array.isArray(data?.results)
        ? data.results
        : [];

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

export const fetchArticles = async () => {
  const allArticles = [];
  const seen = new Set();
  let nextUrl = apiUrl("/articles/?limit=200");
  let pages = 0;

  while (nextUrl && pages < 25) {
    const response = await fetch(nextUrl);

    if (!response.ok) {
      throw new Error(`Request failed for articles page ${pages + 1}: ${response.status}`);
    }

    const data = await response.json();
    const list = getListFromResponse(data);

    list.forEach((article) => {
      const key = String(article?.id || article?.slug || "").trim();
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      allArticles.push(article);
    });

    nextUrl = normalizeNextUrl(data?.next);
    pages += 1;

    if (Array.isArray(data)) break;
  }

  return allArticles;
};

export const fetchCategories = () => fetchJson("/categories/");
