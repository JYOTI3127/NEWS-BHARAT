import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import {
  Clock, User,
  Newspaper, RefreshCw, BookOpen, Eye,
} from "lucide-react";
import {
  API_BASE,
  formatArticleDateTimeIST,
  getArticleDateValue,
} from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";
import { canonicalizeRegionName, normalizeRegionKey } from "../lib/stateRegion";
import AdvertisementSlot from "../components/AdvertisementSlot";

const useViewportWidth = () => {
  const getValue = () =>
    typeof window !== "undefined" ? window.innerWidth : 1280;

  const [viewportWidth, setViewportWidth] = useState(getValue);

  useEffect(() => {
    const onResize = () => setViewportWidth(getValue());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return viewportWidth;
};

// AM/PM ke saath time
const formatViews = (v) => {
  if (!v) return "";
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
};

const stripHtml = (html = "") => html.replace(/<[^>]*>/g, "").trim();
const CATEGORY_ARTICLE_LIMIT = 100;
const STATE_ARTICLE_LIMIT = 10;
const MORE_IN_ARTICLES_LIMIT = 17;
const STATE_CATEGORY_SLUGS = new Set(["state-of-bharat", "states-of-bharat"]);
const NON_NAVIGABLE_STATE_PARENT_LABELS = new Set(["states of india", "union territories"]);

const isStateCategorySlug = (value) =>
  STATE_CATEGORY_SLUGS.has(String(value || "").trim().toLowerCase());
const isStateParentGroupLabel = (value) =>
  NON_NAVIGABLE_STATE_PARENT_LABELS.has(String(value || "").trim().toLowerCase());

const normalizeCategoryDisplayName = (value, fallback = "") => {
  const label = String(value || fallback || "").trim();
  return label.toLowerCase() === "political" ? "Politics" : label;
};

const getSelectedSubcategoryValues = (selectedSubcategories) => {
  if (!selectedSubcategories || typeof selectedSubcategories !== "object") return [];

  const subs = selectedSubcategories.subs;
  if (subs && typeof subs === "object") {
    return Object.values(subs)
      .flat()
      .filter((value) => typeof value === "string" && value.trim().length > 0);
  }

  return Object.values(selectedSubcategories)
    .flat()
    .filter((value) => typeof value === "string" && value.trim().length > 0);
};

const getListFromArticlesResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (data?.results && typeof data.results === "object") {
    return Object.values(data.results).flatMap((value) =>
      Array.isArray(value) ? value : []
    );
  }
  return [];
};

const getPossibleStateValues = (article) => {
  const values = [
    article?.selected_state_name,
    article?.state,
    article?.state_name,
    article?.selected_subcategory,
    article?.selectedState,
  ];

  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean);
};

const doesArticleMatchSubcategory = (article, subFilter) => {
  const target = String(subFilter || "").trim().toLowerCase();
  const normalizedTarget = normalizeRegionKey(subFilter);
  if (!target) return true;

  const selectedValues = getSelectedSubcategoryValues(article.selected_subcategories);
  if (
    selectedValues.some((value) => {
      const text = String(value || "").trim();
      return text.toLowerCase() === target || normalizeRegionKey(text) === normalizedTarget;
    })
  ) {
    return true;
  }

  if (
    getPossibleStateValues(article).some(
      (value) => {
        const text = String(value || "").trim();
        return text.toLowerCase() === target || normalizeRegionKey(text) === normalizedTarget;
      }
    )
  ) {
    return true;
  }

  const text = `${article.title} ${article.subtitle || ""} ${stripHtml(article.content || "")}`.toLowerCase();
  return text.includes(target);
};

export default function CategoryPage() {
  const { slug } = useParams();
  const location = useLocation();
  const viewportWidth = useViewportWidth();

  const searchParams  = new URLSearchParams(location.search);
  const rawSubFilter  = searchParams.get("subcategory") || "";
  const subFilter = isStateCategorySlug(slug) && isStateParentGroupLabel(rawSubFilter)
    ? ""
    : rawSubFilter;

  const [category, setCategory]     = useState(null);
  const [articles, setArticles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      setLoading(true);
      setVisibleCount(6);
      const isStateCategory = isStateCategorySlug(slug);
      const stateSubFilter = isStateCategory
        ? canonicalizeRegionName(subFilter)
        : String(subFilter || "").trim();
      const shouldFetchByState = isStateCategory && stateSubFilter.length > 0;
      const requestLimit = shouldFetchByState ? STATE_ARTICLE_LIMIT : CATEGORY_ARTICLE_LIMIT;
      const articlesUrl = shouldFetchByState
        ? `${API_BASE}/articles/by-state/?state=${encodeURIComponent(stateSubFilter)}&page=1&limit=${requestLimit}`
        : `${API_BASE}/articles/?category=${encodeURIComponent(slug)}&page=1&limit=${requestLimit}`;

      const [categoryResult, articlesResult] = await Promise.allSettled([
        fetch(`${API_BASE}/categories/`).then((res) => res.json()),
        fetch(articlesUrl).then((res) => res.json()),
      ]);

      if (categoryResult.status === "fulfilled") {
        const data = categoryResult.value;
        const found = Array.isArray(data) ? data.find((c) => c.slug === slug) : null;
        setCategory(found || { name: slug });
      } else {
        setCategory({ name: slug });
      }

      if (articlesResult.status === "fulfilled") {
        const data = articlesResult.value;
        const filtered = getListFromArticlesResponse(data);

        const sorted = [...filtered].sort(
          (a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0)
        );

        // When data is already fetched from by-state endpoint, avoid filtering it again on client.
        const finalArticles = shouldFetchByState
          ? sorted
          : subFilter
            ? sorted.filter((a) => doesArticleMatchSubcategory(a, subFilter))
            : sorted;

        const normalized = finalArticles.map((a) => ({
          ...a,
          image: a.image_url || a.image || null,
          // display_author_name API se aata hai "News4Bharat"
          // author: a.display_author_name || a.author_display_name || "News4Bharat",
          author: "News4Bharat",
          description: a.subtitle || (a.content ? stripHtml(a.content).slice(0, 150) : ""),
        }));

        setArticles(normalized);
      } else {
        console.error("Articles fetch error:", articlesResult.reason);
        setArticles([]);
      }

      setLoading(false);
      document.dispatchEvent(new Event('prerender-ready'))
    };
    fetchData();
  }, [slug, subFilter]);

  const heroArticle   = articles[0] || null;
  const gridArticles  = articles.slice(1, visibleCount + 1);
  const moreInArticles = articles.slice(0, MORE_IN_ARTICLES_LIMIT);
  const hasMore       = visibleCount + 1 < articles.length;
  const isWorldNewsCategory = ["world-news", "worldnews"].includes(String(slug || "").trim().toLowerCase());
  const shouldClampWorldNewsHeader = isWorldNewsCategory && viewportWidth <= 1440;
  const shouldClampWorldNewsParagraph = isWorldNewsCategory && viewportWidth >= 768 && viewportWidth <= 1440;
  const categoryDisplayName = normalizeCategoryDisplayName(category?.name, slug);
  const shellStyle = {
    width: "var(--site-content-width)",
    maxWidth: "var(--site-content-width)",
  };
  const heroMediaStyle = (() => {
    if (viewportWidth >= 1441 && viewportWidth <= 2560) {
      return {
        aspectRatio: "14 / 8",
        height: "auto",
      };
    }

    if (viewportWidth >= 1280) {
      return { height: "365px" };
    }

    if (viewportWidth >= 1024) {
      return { height: "450px" };
    }

    if (viewportWidth >= 768) {
      return { height: "480px" };
    }

    return undefined;
  })();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-9 h-9 border-[3px] border-[#f0ece8] border-t-[#D80100] rounded-full mb-3 animate-spin" />
        <p className="text-[#888] text-[13px] font-[Poppins,_sans-serif]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4f0] font-[Poppins,_sans-serif]">
      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot
          page="home"
          placement="home_side_left"
          variant="sideRail"
          className="home-side-ad home-side-ad--left"
          dismissible
          minWidth={768}
        />
      </aside>

      {/* Category Header */}
      <div className="bg-white border-b-4 border-[#D80100] py-5 sm:py-[28px]">
        <div className="category-page-align max-w-[1240px] mx-auto px-4 sm:px-6" style={shellStyle}>
          <h1
            className="text-[clamp(18px,3.5vw,34px)] font-extrabold text-[#111] mb-1 tracking-[-0.4px]"
            style={shouldClampWorldNewsHeader ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } : undefined}
          >
            {subFilter ? (
              <>
                <Link
                  to={`/category/${slug}`}
                  className="text-[#111] hover:text-[#D80100] no-underline hover:no-underline"
                  style={{ textDecoration: "none" }}
                >
                  {categoryDisplayName}
                </Link>
                <span>{` > ${subFilter}`}</span>
              </>
            ) : (
              categoryDisplayName
            )}
          </h1>
          {category?.description && (
            <p
              className="text-[13px] text-[#666] mb-2 leading-[1.6]"
              style={shouldClampWorldNewsHeader ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
            >
              {category.description}
            </p>
          )}
          <span className="inline-flex items-center text-[12px] text-[#D80100] font-semibold">
            <BookOpen size={13} className="mr-1.5 align-middle" />
            {articles.length} Articles
          </span>
        </div>
      </div>

      <AdvertisementSlot
        page="category"
        placement="home_top"
        variant="leaderboard"
        className="home-top-ad home-top-ad--desktop"
        minWidth={769}
      />
      <AdvertisementSlot
        page="category"
        placement="home_top_mobile"
        variant="mobileStrip"
        className="home-top-ad home-top-ad--mobile"
        maxWidth={768}
      />

      <div
        className="category-page-align max-w-[1240px] mx-auto px-4 sm:px-6 py-[28px] grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-7 items-start"
        style={shellStyle}
      >

        {/* LEFT MAIN CONTENT */}
        <div className="min-w-0">

          {/* Hero Article */}
          {heroArticle && (
            <Link
              to={getArticlePath(heroArticle)}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div className="bg-white rounded-[12px] overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.08)] mb-7 hover:shadow-[0_8px_28px_rgba(0,0,0,0.13)] transition-shadow duration-200">
                <div
                  className="relative w-full h-[220px] sm:h-[300px] lg:h-[420px] xl:h-[460px] overflow-hidden"
                  style={heroMediaStyle}
                >
                  {heroArticle.image
                    ? <img src={heroArticle.image} alt={heroArticle.title} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" width={1280} height={720} />
                    : <div className="w-full h-full flex items-center justify-center bg-[#f0ece8]"><Newspaper size={40} color="#ccc" /></div>
                  }
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[rgba(0,0,0,0.3)] to-transparent" />
                </div>
                <div className="p-4 sm:p-[20px_24px_24px]">
                  <h2 className="text-[clamp(16px,2.5vw,22px)] font-extrabold text-[#111] mb-2 leading-[1.4] tracking-[-0.3px]">
                    {heroArticle.title}
                  </h2>
                  <p className="text-[13.5px] text-[#555] mb-[14px] leading-[1.7]">{heroArticle.description}</p>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {/* Author - News4Bharat dikhega */}
                    <span className="inline-flex items-center text-[11.5px] text-[#D80100] font-semibold">
                      <User size={12} className="mr-1" />{heroArticle.author}
                    </span>
                    {/* Time AM/PM ke saath */}
                    <span className="inline-flex items-center text-[11.5px] text-[#888] font-medium">
                      <Clock size={12} className="mr-1" />{formatArticleDateTimeIST(heroArticle)}
                    </span>
                    {heroArticle.views && (
                      <span className="inline-flex items-center text-[11.5px] text-[#888] font-medium">
                        <Eye size={12} className="mr-1" />{formatViews(heroArticle.views)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Section Divider */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[13px] font-bold text-[#D80100] uppercase tracking-[0.8px] whitespace-nowrap">Latest Articles</span>
            <div className="flex-1 h-px bg-[#e8e4df]" />
          </div>

          {/* Articles Grid */}
          {articles.length === 0 ? (
            <div className="text-center py-14 flex flex-col items-center">
              <Newspaper size={48} color="#ccc" />
              <p className="text-[16px] font-bold text-[#333] mt-4 mb-2">No articles yet</p>
              <p className="text-[13px] text-[#888]">Articles will be available soon!</p>
            </div>
          ) : gridArticles.length === 0 ? null : (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {gridArticles.map((article) => (
                <Link
                  key={article.id}
                  to={getArticlePath(article)}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <div className="group bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.07)] hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(0,0,0,0.11)] transition-transform duration-200 ease-out overflow-hidden h-full">
                    <div className="relative h-[180px] sm:h-40 w-full overflow-hidden">
                      {article.image ? (
                        <img src={article.image} alt={article.title} className="w-full h-full object-cover" loading="lazy" decoding="async" width={640} height={360} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100">
                          <Newspaper size={28} color="#ccc" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                      <h3 className="text-[15px] sm:text-lg font-semibold leading-snug line-clamp-2">{article.title}</h3>
                      {article.description && (
                        <p className={`text-sm text-slate-600 ${shouldClampWorldNewsParagraph ? "line-clamp-1" : "line-clamp-3"}`}>
                          {shouldClampWorldNewsParagraph ? article.description : `${article.description.slice(0, 90)}...`}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {/* Author red color mein */}
                        <span className="flex items-center gap-1 text-red-600 font-semibold">
                          <User size={11} />{article.author}
                        </span>
                        {/* AM/PM time */}
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock size={11} />{formatArticleDateTimeIST(article)}
                        </span>
                      </div>
                      {article.views && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600">
                          <Eye size={11} /><span>{formatViews(article.views)} views</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-7 py-3 text-sm font-semibold transition-colors duration-200"
                onClick={() => setVisibleCount((p) => p + 6)}
              >
                <RefreshCw size={14} />
                Load More Articles
              </button>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
       <aside className="flex flex-col gap-5 lg:order-last">

          <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-red-600">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {`More in ${categoryDisplayName}`}
              </span>
              <span className="text-[11px] text-red-600 font-semibold">
                {moreInArticles.length} Posts
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {moreInArticles.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">No posts found.</div>
              ) : (
                moreInArticles.map((article, index) => (
                  <Link
                    key={article.id || article.slug || index}
                    to={getArticlePath(article)}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    <div className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-slate-100">
                        {article.image ? (
                          <img
                            src={article.image}
                            alt={article.title}
                            className={`w-full h-full ${isWorldNewsCategory ? "object-contain" : "object-cover"}`}
                            loading="lazy"
                            decoding="async"
                            width={128}
                            height={96}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100">
                            <Newspaper size={16} color="#ccc" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                          {article.title}
                        </p>
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock size={10} />{formatArticleDateTimeIST(article)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

        </aside>
      </div>

      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot
          page="home"
          placement="home_side_right"
          variant="sideRail"
          className="home-side-ad home-side-ad--right"
          dismissible
          minWidth={768}
        />
      </aside>
    </div>
  );
}
