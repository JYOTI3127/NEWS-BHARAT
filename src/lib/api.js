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

export const fetchArticles = () => fetchJson("/articles/");

export const fetchCategories = () => fetchJson("/categories/");
