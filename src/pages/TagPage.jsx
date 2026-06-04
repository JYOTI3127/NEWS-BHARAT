import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Clock, Newspaper, Tag, ArrowLeft } from "lucide-react";
import { fetchPaginatedArticles } from "../lib/api";
import { getArticlePath, isArticlePath } from "../lib/articleUrl";

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
  const combined = [];
  const pushTokens = (value) => {
    if (!value) return;
    String(value)
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => combined.push(token));
  };

  if (Array.isArray(article?.tags_list)) {
    article.tags_list
      .map((tag) =>
        typeof tag === "string"
          ? tag.trim()
          : String(tag?.name || tag?.tag || tag?.title || "").trim()
      )
      .filter(Boolean)
      .forEach((token) => combined.push(token));
  }

  pushTokens(article?.tags);
  pushTokens(article?.focus_keyword);
  pushTokens(article?.secondary_keywords);

  return Array.from(new Set(combined));
};

const safeDecode = (value) => {
  const raw = String(value || "");
  if (!raw) return "";

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const normalizeTag = (value) =>
  safeDecode(value)
    .replace(/\+/g, " ")
    .replace(/^#+/, "")
    .replace(/&/g, " and ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeTagKey = (value) =>
  normalizeTag(value).replace(/[^a-z0-9]+/g, "");

const getCleanSegments = (value) =>
  String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

const getArticleRouteFromUrlLikeValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw, "https://news4bharat.com");
    const cleanPath = `/${getCleanSegments(parsed.pathname).join("/")}`;
    return isArticlePath(cleanPath) ? cleanPath : "";
  } catch {
    const cleanPath = `/${getCleanSegments(raw).join("/")}`;
    return isArticlePath(cleanPath) ? cleanPath : "";
  }
};

const getArticleHref = (article) => {
  const fromPublicUrl = getArticlePath(article);
  if (fromPublicUrl) return fromPublicUrl;

  const fromCanonical = getArticleRouteFromUrlLikeValue(article?.canonical_url);
  if (fromCanonical) return fromCanonical;

  const fromDirectUrl = getArticleRouteFromUrlLikeValue(article?.url || article?.link);
  if (fromDirectUrl) return fromDirectUrl;

  const slug = String(article?.slug || article?.article_slug || "").trim();
  const categorySlug = String(
    article?.category_slug ||
      article?.primary_category_slug ||
      article?.category_details?.[0]?.slug ||
      article?.category?.slug ||
      ""
  ).trim();

  if (slug && categorySlug) {
    const derivedPath = `/${categorySlug}/${slug}`;
    if (isArticlePath(derivedPath)) return derivedPath;
  }

  return "";
};

export default function TagPage() {
  const { tagName } = useParams();
  const decoded = safeDecode(tagName || "");
  const displayTag = decoded.replace(/^#+/, "").trim();
  const normalizedTag = normalizeTag(decoded);
  const normalizedTagFingerprint = normalizeTagKey(decoded);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    window.scrollTo(0, 0);
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetchPaginatedArticles({ limit: 200, maxPages: 10, full: true })
      .then((list) => {
        if (cancelled) return;
        const filtered = list.filter((a) => {
          const tags = getArticleTags(a);
          return tags.some((tag) => {
            const normalized = normalizeTag(tag);
            if (normalized === normalizedTag) return true;
            return normalizeTagKey(tag) === normalizedTagFingerprint;
          });
        });
        setArticles(filtered);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Tag page articles fetch failed:", error);
          setArticles([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedTag, normalizedTagFingerprint]);

  return (
    <div className="min-h-screen pt-[62px] font-[Poppins,_sans-serif]">
      <div className="category-page-align mx-auto min-h-[calc(100vh-62px)] px-4 sm:px-6 py-8">

        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 mb-6 transition-colors">
          <ArrowLeft size={13} /> Back to Home
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <Tag size={18} className="text-red-600" />
          <h1 className="text-2xl font-extrabold text-gray-900">#{displayTag}</h1>
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
          {articles.map((a) => {
            const href = getArticleHref(a);
            const card = (
              <>
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
              </>
            );

            if (!href) {
              return (
                <article
                  key={a.id || a.slug}
                  className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden"
                >
                  {card}
                </article>
              );
            }

            return (
              <Link
                key={a.id || a.slug}
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
