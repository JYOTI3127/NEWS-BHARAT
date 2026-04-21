import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Clock, Newspaper, Tag, ArrowLeft } from "lucide-react";
import { apiUrl } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const formatDate = (d) =>
  d ? new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).replace(/am|pm/i, (m) => m.toUpperCase()) : "";

const getArticleImage = (article) => {
  const candidates = [article?.image_url, article?.image];
  return candidates.find((v) => typeof v === "string" && v.trim().length > 0) || null;
};

const getArticleTags = (article) => {
  if (Array.isArray(article?.tags_list)) {
    return article.tags_list
      .map((tag) =>
        typeof tag === "string"
          ? tag.trim()
          : String(tag?.name || tag?.tag || tag?.title || "").trim()
      )
      .filter(Boolean);
  }

  return String(article?.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const normalizeTag = (value) =>
  String(value || "")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getArticleList = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.value)
      ? data.value
      : Array.isArray(data?.results)
        ? data.results
        : [];

const fetchAllArticles = async (signal) => {
  const allArticles = [];
  const seen = new Set();
  let nextUrl = apiUrl("/articles/?page=1&limit=200");
  let pages = 0;

  while (nextUrl && pages < 10) {
    const response = await fetch(nextUrl, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch articles: ${response.status}`);
    }

    const data = await response.json();
    const list = getArticleList(data);

    list.forEach((article) => {
      const key = String(article?.id || article?.slug || "").trim();
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      allArticles.push(article);
    });

    nextUrl = typeof data?.next === "string" && data.next.trim() ? data.next.trim() : "";
    pages += 1;
  }

  return allArticles;
};

export default function TagPage() {
  const { tagName } = useParams();
  const decoded = decodeURIComponent(tagName || "");
  const normalizedTag = normalizeTag(decoded);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    window.scrollTo(0, 0);
    setLoading(true);
    fetchAllArticles(controller.signal)
      .then((list) => {
        const filtered = list.filter((a) => {
          const tags = getArticleTags(a);
          return tags.some((tag) => normalizeTag(tag) === normalizedTag);
        });
        setArticles(filtered);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Tag page articles fetch failed:", error);
          setArticles([]);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [normalizedTag]);

  return (
    <div className="min-h-screen bg-[#f7f4f0] font-[Poppins,_sans-serif]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8">

        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 mb-6 transition-colors">
          <ArrowLeft size={13} /> Back to Home
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <Tag size={18} className="text-red-600" />
          <h1 className="text-2xl font-extrabold text-gray-900">#{decoded}</h1>
          {!loading && (
            <span className="text-sm text-gray-400 ml-2">
              ({articles.length} article{articles.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>

        {loading && (
          <div className="flex justify-center mt-20">
            <div className="w-9 h-9 border-[3px] border-[#f0ece8] border-t-[#D80100] rounded-full animate-spin" />
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center mt-20 text-gray-400">
            <Newspaper size={40} className="mx-auto mb-3" />
            <p>No articles found for this tag.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((a) => (
            <Link
              key={a.id}
              to={getArticlePath(a)}
              className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="w-full h-44 bg-slate-100 overflow-hidden">
                {getArticleImage(a) ? (
                  <img src={getArticleImage(a)} alt={a.title}
                    className="w-full h-full object-cover" loading="lazy" decoding="async" width={640} height={352} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Newspaper size={32} color="#ccc" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-[14px] font-bold text-gray-900 line-clamp-2 leading-snug mb-2">
                  {a.title}
                </p>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock size={10} />
                  {formatDate(a.published_at || a.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
