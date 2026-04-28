import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Newspaper } from "lucide-react";
import { fetchPaginatedArticles } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const getArticleDateValue = (article) =>
  article?.published_at ||
  article?.created_at ||
  article?.updated_at ||
  article?.date ||
  "";

const getArticleImage = (article) => article?.image_url || article?.image || "";
const getArticleTitle = (article) => article?.title || article?.headline || "Untitled";

const getArticleTags = (article) => {
  const tokens = [];
  const pushCsv = (value) => {
    if (!value) return;
    String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => tokens.push(item));
  };

  if (Array.isArray(article?.tags_list)) {
    article.tags_list
      .map((item) => (typeof item === "string" ? item : item?.name || item?.title || ""))
      .map((item) => String(item).trim())
      .filter(Boolean)
      .forEach((item) => tokens.push(item));
  }

  pushCsv(article?.tags);
  pushCsv(article?.focus_keyword);
  pushCsv(article?.secondary_keywords);

  return tokens;
};

const isQ4Article = (article) => {
  const haystack = [
    article?.title,
    article?.headline,
    article?.subtitle,
    article?.meta_title,
    article?.meta_description,
    ...getArticleTags(article),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasQ4Token = /\bq[\s-]?4\b|\bfourth quarter\b/.test(haystack);
  const hasResultsToken = /\bresult\b|\bresults\b|\bearnings\b|\bprofit\b/.test(haystack);

  return hasQ4Token && hasResultsToken;
};

const dedupe = (list) => {
  const seen = new Set();
  return list.filter((item) => {
    const key = String(item?.id || item?.slug || getArticleTitle(item)).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortByNewest = (list) =>
  [...list].sort(
    (a, b) =>
      new Date(getArticleDateValue(b) || 0).getTime() -
      new Date(getArticleDateValue(a) || 0).getTime()
  );

const formatDate = (article) => {
  const raw = getArticleDateValue(article);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
};

export default function Q4ResultsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchPaginatedArticles({ limit: 200, maxPages: 10, full: true });
        if (cancelled) return;
        const q4Articles = dedupe(sortByNewest(list.filter(isQ4Article)));
        setArticles(q4Articles);
      } catch (error) {
        if (!cancelled) {
          console.error("Q4 results fetch failed:", error);
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const titleCount = useMemo(
    () => `${articles.length} article${articles.length === 1 ? "" : "s"}`,
    [articles.length]
  );

  return (
    <div className="min-h-screen bg-white pt-[62px] font-[Poppins,_sans-serif]">
      <div className="category-page-align mx-auto min-h-[calc(100vh-62px)] bg-[#f7f4f0] px-4 sm:px-6 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 mb-6 transition-colors"
        >
          <ArrowLeft size={13} /> Back to Home
        </Link>

        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">
              Corporate Tracker
            </p>
            <h1 className="text-3xl font-extrabold text-slate-900">Q4 Results</h1>
          </div>
          {!loading && <span className="text-sm text-slate-500">{titleCount}</span>}
        </div>

        {loading && (
          <div className="flex justify-center mt-20">
            <div className="w-9 h-9 border-[3px] border-[#f0ece8] border-t-[#D80100] rounded-full animate-spin" />
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center mt-20 text-gray-400">
            <Newspaper size={40} className="mx-auto mb-3" />
            <p>No Q4 result articles found.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => {
            const href = getArticlePath(article);
            const card = (
              <>
                <div className="w-full h-44 bg-slate-100 overflow-hidden">
                  {getArticleImage(article) ? (
                    <img
                      src={getArticleImage(article)}
                      alt={getArticleTitle(article)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Newspaper size={32} color="#ccc" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[14px] font-bold text-gray-900 line-clamp-2 leading-snug mb-2">
                    {getArticleTitle(article)}
                  </p>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock size={10} />
                    {formatDate(article)}
                  </span>
                </div>
              </>
            );

            if (!href) {
              return (
                <article
                  key={article.id || article.slug}
                  className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden"
                >
                  {card}
                </article>
              );
            }

            return (
              <Link
                key={article.id || article.slug}
                to={href}
                className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-md transition-shadow"
              >
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

