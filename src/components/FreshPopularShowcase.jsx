import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatArticleDateTimeIST } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const getArticleDateValue = (article) =>
  article?.published_at ||
  article?.created_at ||
  article?.updated_at ||
  article?.date ||
  article?.publishedOn ||
  article?.createdOn ||
  article?.published_date ||
  article?.publish_date ||
  article?.post_date ||
  "";

const stripHtml = (value) =>
  String(value || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeArticles = (data, { preserveOrder = false } = {}) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  const filtered = list.filter((item) => item && (item.title || item.headline));

  if (preserveOrder) return filtered;

  return filtered.sort(
    (a, b) =>
      new Date(getArticleDateValue(b) || 0) -
      new Date(getArticleDateValue(a) || 0)
  );
};

const getArticleTitle = (article) =>
  article?.title || article?.headline || "Untitled";

const getArticleSummary = (article) =>
  stripHtml(
    article?.subtitle ||
      article?.description ||
      article?.summary ||
      article?.excerpt ||
      ""
  );

const getArticleImage = (article) => article?.image_url || article?.image || "";

const isQ4Article = (article) => {
  const q4Tokens = ["q4", "q-4", "q 4", "quarterly results", "q4 results"];

  const fields = [
    article?.title,
    article?.headline,
    article?.slug,
    article?.category_slug,
    article?.primary_category_slug,
    article?.category?.slug,
    article?.primary_category?.slug,
  ]
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);

  if (fields.some((value) => value.includes("q4-results"))) return true;
  return fields.some((value) => q4Tokens.some((token) => value.includes(token)));
};

const getArticleImageFocus = (article) =>
  isQ4Article(article) ? "left center" : "center center";

const GENERIC_CATEGORY_KEYS = new Set([
  "all",
  "all news",
  "all-news",
  "new",
  "news",
  "news category",
  "latest",
  "latest news",
  "latest-news",
]);

const normalizeCategoryKey = (value) =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const CATEGORY_LABEL_BY_SLUG = {
  "breaking-news": "BREAKING NEWS",
  "world-news": "WORLD NEWS",
  "business": "BUSINESS",
  technology: "TECHNOLOGY",
  sports: "SPORTS",
  health: "HEALTH",
  entertainment: "ENTERTAINMENT",
  education: "EDUCATION",
  automobile: "AUTOMOBILE",
  national: "NATIONAL",
  politics: "POLITICS",
  political: "POLITICS",
  trending: "TRENDING",
  "bharat-opinions": "BHARAT OPINIONS",
  "bharat-explainers": "BHARAT EXPLAINERS",
  "bharat-in-numbers": "BHARAT IN NUMBERS",
  "bharat-startups": "BHARAT STARTUPS",
  "bharat-2047": "BHARAT BY 2047",
  bfsi: "BHARAT BFSI",
  ai: "ARTIFICIAL INTELLIGENCE",
  "artificial-intelligence": "ARTIFICIAL INTELLIGENCE",
  "state-of-bharat": "STATE OF BHARAT",
};

const getCategoryFromPath = (article) => {
  const pathCandidates = [
    article?.public_url,
    article?.url,
    article?.link,
    getArticlePath(article),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const value of pathCandidates) {
    let pathname = value;

    try {
      if (value.startsWith("http://") || value.startsWith("https://")) {
        pathname = new URL(value).pathname;
      }
    } catch {
      pathname = value;
    }

    const segments = String(pathname)
      .split("/")
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean);

    if (segments.length === 0) continue;

    const slug = segments[0] === "category" ? segments[1] : segments[0];
    if (!slug) continue;

    if (GENERIC_CATEGORY_KEYS.has(normalizeCategoryKey(slug))) continue;

    if (CATEGORY_LABEL_BY_SLUG[slug]) return CATEGORY_LABEL_BY_SLUG[slug];

    const cleaned = slug.replace(/[-_]+/g, " ").trim();
    if (!cleaned || GENERIC_CATEGORY_KEYS.has(normalizeCategoryKey(cleaned))) continue;

    return cleaned.toUpperCase();
  }

  return "";
};

const getSubcategoryLabel = (article) => {
  const directCandidates = [
    article?.selected_subcategory,
    article?.subcategory,
    article?.sub_category,
    article?.subCategory,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const candidate of directCandidates) {
    if (!GENERIC_CATEGORY_KEYS.has(normalizeCategoryKey(candidate))) {
      return candidate.toUpperCase();
    }
  }

  const subs = article?.selected_subcategories?.subs;
  if (subs && typeof subs === "object") {
    for (const values of Object.values(subs)) {
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        const normalized = String(value || "").trim();
        if (!normalized) continue;
        if (GENERIC_CATEGORY_KEYS.has(normalizeCategoryKey(normalized))) continue;
        return normalized.toUpperCase();
      }
    }
  }

  return "";
};

const getArticleCategory = (article) => {
  const categoryPool = [];

  if (article?.category_slug) categoryPool.push(article.category_slug);
  if (article?.primary_category_slug) categoryPool.push(article.primary_category_slug);
  if (article?.selected_subcategory) categoryPool.push(article.selected_subcategory);
  if (article?.section) categoryPool.push(article.section);
  if (article?.section_name) categoryPool.push(article.section_name);

  if (Array.isArray(article?.category_details)) {
    article.category_details.forEach((item) => {
      if (item?.name) categoryPool.push(item.name);
      if (item?.slug) categoryPool.push(item.slug);
    });
  }

  if (article?.category && typeof article.category === "object") {
    if (article.category.name) categoryPool.push(article.category.name);
    if (article.category.title) categoryPool.push(article.category.title);
    if (article.category.slug) categoryPool.push(article.category.slug);
  } else if (typeof article?.category === "string") {
    categoryPool.push(article.category);
  }

  if (Array.isArray(article?.categories)) {
    article.categories.forEach((item) => {
      if (typeof item === "string") {
        categoryPool.push(item);
        return;
      }
      if (item?.name) categoryPool.push(item.name);
      if (item?.slug) categoryPool.push(item.slug);
    });
  }

  const cleanedCategories = categoryPool
    .map((value) => String(value || "").replace(/[-_]+/g, " ").trim())
    .filter(Boolean);

  const specificCategory = cleanedCategories.find(
    (value) => !GENERIC_CATEGORY_KEYS.has(normalizeCategoryKey(value))
  );

  if (specificCategory) return specificCategory.toUpperCase();

  const subcategoryLabel = getSubcategoryLabel(article);
  if (subcategoryLabel) return subcategoryLabel;

  return getCategoryFromPath(article);
};

const isBreakingArticle = (article) => {
  const textPool = [];
  const tokenPool = [];

  const pushValue = (value) => {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return;
    textPool.push(text);

    const token = text.replace(/[^a-z0-9]+/g, "");
    if (token) tokenPool.push(token);
  };

  pushValue(article?.category_slug);
  pushValue(article?.primary_category_slug);
  pushValue(article?.section);
  pushValue(article?.section_name);
  pushValue(article?.selected_subcategory);
  pushValue(article?.primary_category?.slug);
  pushValue(article?.primary_category?.name);
  pushValue(article?.primary_category?.title);

  if (article?.category && typeof article.category === "object") {
    pushValue(article.category.slug);
    pushValue(article.category.name);
    pushValue(article.category.title);
  } else {
    pushValue(article?.category);
  }

  if (Array.isArray(article?.category_details)) {
    article.category_details.forEach((item) => {
      pushValue(item?.slug);
      pushValue(item?.name);
      pushValue(item?.title);
    });
  }

  if (Array.isArray(article?.categories)) {
    article.categories.forEach((item) => {
      if (typeof item === "string") {
        pushValue(item);
        return;
      }
      pushValue(item?.slug);
      pushValue(item?.name);
      pushValue(item?.title);
    });
  }

  const selectedSubs = article?.selected_subcategories?.subs;
  if (selectedSubs && typeof selectedSubs === "object") {
    Object.values(selectedSubs).forEach((values) => {
      if (!Array.isArray(values)) return;
      values.forEach((value) => pushValue(value));
    });
  }

  pushValue(article?.public_url);
  pushValue(article?.url);
  pushValue(article?.link);
  pushValue(getArticlePath(article));
  pushValue(getArticleCategory(article));

  const hasBreakingText = textPool.some((value) =>
    value.includes("breaking-news") ||
    value.includes("breaking news") ||
    value === "breaking" ||
    value.startsWith("breaking/")
  );

  const hasBreakingToken = tokenPool.some((token) =>
    token.includes("breakingnews") || token === "breaking"
  );

  return hasBreakingText || hasBreakingToken;
};

const isBreakingByCategoryLabel = (article) =>
  String(getArticleCategory(article) || "").trim().toUpperCase() === "BREAKING NEWS";

const formatDateTime = (article) => {
  const updatedDisplay = String(article?.updated_display || "").trim();
  if (updatedDisplay) return updatedDisplay;

  const rawDate = String(
    article?.published_at ||
      article?.published_date ||
      article?.publishedOn ||
      article?.post_date ||
      article?.publish_date ||
      article?.updated_at ||
      article?.created_at ||
      article?.createdOn ||
      article?.date ||
      ""
  ).trim();

  if (rawDate) {
    const formattedRaw = formatArticleDateTimeIST({ published_at: rawDate });
    return formattedRaw || rawDate;
  }

  const formatted = formatArticleDateTimeIST(article);
  return formatted || "";
};

const truncate = (value, size) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= size) return text;
  return `${text.slice(0, size).trim()}...`;
};

const getArticleIdentityKey = (article, index = 0) =>
  String(
    article?.id ||
    article?.slug ||
    article?.public_url ||
    article?.url ||
    article?.link ||
    getArticleTitle(article) ||
    index
  ).trim().toLowerCase();

const getViewportWidth = () =>
  typeof window !== "undefined" ? window.innerWidth : 1440;

const getRailVisibleCount = (width) => {
  if (width >= 1440) return 4;
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  if (width >= 425) return 2;
  return 1;
};

// ─── Middle section: backend order, no sort, no filter ───────────────────────
const buildBuckets = (articles) => {
  const list = Array.isArray(articles) ? articles : articles?.results || [];
  const filtered = list.filter((item) => item && (item.title || item.headline));

  // Only deduplicate — no sort, no exclude
  const seen = new Set();
  const unique = filtered.filter((article, index) => {
    const key = getArticleIdentityKey(article, index);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const hero = unique[0] || null;
  const centerCards = unique.slice(1); // backend order preserved
  const topRail = unique;

  return { topRail, hero, centerCards };
};
// ─────────────────────────────────────────────────────────────────────────────

const buildSideBuckets = (articles) => {
  const list = normalizeArticles(articles, { preserveOrder: true });
  const fresh = list.filter(
    (article) => isBreakingArticle(article) || isBreakingByCategoryLabel(article)
  );
  const popular = list.filter(
    (article) => !isBreakingArticle(article) && !isBreakingByCategoryLabel(article)
  );

  return { fresh, popular };
};

function StoryLink({ article, className, children }) {
  const path = getArticlePath(article);
  if (!path) return <article className={className}>{children}</article>;
  return (
    <Link to={path} className={className}>
      {children}
    </Link>
  );
}

export default function FreshPopularShowcase({
  articles = [],
  sideArticles = [],
  sidePanelsLoading = false,
}) {
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [railStart, setRailStart] = useState(0);
  const middleColumnRef = useRef(null);
  const [middleColumnHeight, setMiddleColumnHeight] = useState(0);

  const backendArticles = useMemo(
    () => normalizeArticles(articles, { preserveOrder: true }),
    [articles]
  );

  const isResponsiveViewport = viewportWidth < 1024;
  const is375Viewport = viewportWidth > 320 && viewportWidth <= 375;

  const sidePanelArticles = useMemo(() => {
    if (isResponsiveViewport) return backendArticles;
    if (sidePanelsLoading) return [];

    const fullFeed = normalizeArticles(sideArticles, { preserveOrder: true });
    if (fullFeed.length > 0) return fullFeed;
    return [];
  }, [isResponsiveViewport, sidePanelsLoading, sideArticles, backendArticles]);

  const sourceArticles = useMemo(() => {
    if (backendArticles.length > 0) return backendArticles;
    return [];
  }, [backendArticles]);

  // Middle section: backend order, no frontend filter
  const { topRail, hero, centerCards } = useMemo(
    () => buildBuckets(sourceArticles),
    [sourceArticles]
  );

  // Side panels: breaking/popular logic unchanged
  const { fresh, popular } = useMemo(
    () => buildSideBuckets(sidePanelArticles),
    [sidePanelArticles]
  );

  const visibleFresh = useMemo(
    () => (isResponsiveViewport ? fresh.slice(0, 5) : fresh),
    [isResponsiveViewport, fresh]
  );

  const visiblePopular = useMemo(
    () => (isResponsiveViewport ? popular.slice(0, 5) : popular),
    [isResponsiveViewport, popular]
  );

  const showSideLoading = !isResponsiveViewport && sidePanelsLoading;
  const sideLoadingRows = useMemo(() => Array.from({ length: 5 }), []);

  const shouldMatchMiddleHeight = viewportWidth >= 1024 && middleColumnHeight > 0;
  const sideColumnStyle = shouldMatchMiddleHeight
    ? { height: `${middleColumnHeight}px` }
    : undefined;

  const railVisibleCount = useMemo(
    () => getRailVisibleCount(viewportWidth),
    [viewportWidth]
  );

  const maxRailStart = Math.max(0, topRail.length - railVisibleCount);

  useEffect(() => {
    const onResize = () => setViewportWidth(getViewportWidth());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const middleElement = middleColumnRef.current;
    if (!middleElement || typeof window === "undefined") return undefined;

    const updateMiddleHeight = () => {
      const nextHeight = Math.ceil(middleElement.getBoundingClientRect().height || 0);
      setMiddleColumnHeight(nextHeight);
    };

    updateMiddleHeight();
    window.addEventListener("resize", updateMiddleHeight);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateMiddleHeight);
      observer.observe(middleElement);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateMiddleHeight);
      };
    }

    return () => {
      window.removeEventListener("resize", updateMiddleHeight);
    };
  }, [hero, centerCards.length, viewportWidth]);

  useEffect(() => {
    setRailStart((prev) => Math.max(0, Math.min(prev, maxRailStart)));
  }, [maxRailStart]);

  useEffect(() => {
    setRailStart(0);
  }, [topRail.length]);

  if (!Array.isArray(sourceArticles) || sourceArticles.length === 0) return null;

  const visibleRail = topRail.slice(railStart, railStart + railVisibleCount);
  const canPrev = railStart > 0;
  const canNext = railStart < maxRailStart;
  const middleImageOnlyCards = centerCards.slice(0, 2);
  const middleStoryCards = centerCards.slice(2);

  return (
    <section className="mx-auto mb-5 w-full font-['Poppins',sans-serif] min-[320px]:mb-5 min-[768px]:mb-6 min-[1024px]:mb-7 min-[1440px]:mb-8 min-[1920px]:mb-10">
      <div className="rounded-lg  p-2.5 min-[320px]:p-2.5 min-[375px]:p-3 min-[425px]:p-3.5 min-[768px]:p-3 min-[1024px]:p-3.5 min-[1440px]:p-4 min-[1920px]:p-5">
        {/* <div className="mb-2.5 flex items-center gap-2 min-[768px]:mb-3">
          <button
            type="button"
            onClick={() => canPrev && setRailStart((prev) => Math.max(0, prev - 1))}
            aria-label="Previous"
            disabled={!canPrev}
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
              canPrev
                ? "cursor-pointer border-[#b30000] bg-[#d80100] text-white hover:bg-[#b90000]"
                : "cursor-not-allowed border-[#f2b8b8] bg-[#fde9e9] text-[#d18f8f]"
            }`}
          >
            &#60;
          </button>

          <div
            className="grid flex-1 gap-2 min-[425px]:gap-2.5 min-[768px]:gap-3"
            style={{ gridTemplateColumns: `repeat(${railVisibleCount}, minmax(0, 1fr))` }}
            aria-label="Top headlines"
          >
            {visibleRail.map((article, idx) => (
              <StoryLink
                key={`${article?.id || article?.slug || idx}-rail`}
                article={article}
                className="block min-w-0 no-underline"
              >
                <h3 className="fps-title-only fps-top-rail-title m-0 text-[11px] font-bold leading-[1.3] text-[#1d1d1d] transition-colors hover:text-[#D80100] min-[375px]:text-[12px] min-[768px]:text-[13px] min-[1440px]:text-[14px] min-[1920px]:text-[15px]">
                  {truncate(getArticleTitle(article), 120)}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="fps-top-rail-time text-[9px] font-semibold text-[#6a6a6a] min-[768px]:text-[10px]">
                    {formatDateTime(article)}
                  </span>
                </div>
              </StoryLink>
            ))}
          </div>

          <button
            type="button"
            onClick={() => canNext && setRailStart((prev) => Math.min(maxRailStart, prev + 1))}
            aria-label="Next"
            disabled={!canNext}
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
              canNext
                ? "cursor-pointer border-[#b30000] bg-[#d80100] text-white hover:bg-[#b90000]"
                : "cursor-not-allowed border-[#f2b8b8] bg-[#fde9e9] text-[#d18f8f]"
            }`}
          >
            &#62;
          </button>
        </div> */}

        <div className="grid items-start gap-2.5 min-[425px]:gap-3 min-[768px]:grid-cols-[200px_minmax(0,1fr)] min-[1024px]:grid-cols-[180px_minmax(0,1fr)_180px] min-[1440px]:grid-cols-[220px_minmax(0,1fr)_220px] min-[1920px]:grid-cols-[270px_minmax(0,1fr)_270px]">
          <aside
            className="flex flex-col border border-[#dfdfdf] bg-[#fafafa] px-1.5 py-2 min-[375px]:px-2 min-[375px]:py-2.5 min-[1440px]:px-2.5 min-[1440px]:py-3"
            style={sideColumnStyle}
          >
            <h2 className="m-0 whitespace-nowrap text-[14px] font-extrabold leading-none text-[#121212] min-[320px]:text-[14px] min-[375px]:text-[15px] min-[425px]:text-[16px] min-[768px]:text-[16px] min-[1024px]:text-[17px] min-[1440px]:text-[18px] min-[1920px]:text-[20px]">
              Breaking News
            </h2>

            <div
              className={`mt-2 flex flex-1 flex-col bg-white min-[1440px]:mt-2.5 ${
                shouldMatchMiddleHeight
                  ? "scrollbar-invisible min-h-0 overflow-y-auto pr-1"
                  : ""
              }`}
            >
              {showSideLoading
                ? sideLoadingRows.map((_, idx) => (
                    <div
                      key={`fresh-loading-${idx}`}
                      className={`block py-1.5 ${
                        idx === 0 ? "border-t-0 pt-0" : "border-t border-[#ebebeb]"
                      }`}
                    >
                      <div className="h-3 w-[92%] animate-pulse rounded bg-[#ececec]" />
                      <div className="mt-1 h-3 w-[76%] animate-pulse rounded bg-[#f1f1f1]" />
                      <div className="mt-1 h-2 w-[52%] animate-pulse rounded bg-[#f4f4f4]" />
                    </div>
                  ))
                : visibleFresh.map((article, idx) => (
                    <StoryLink
                      key={`${article?.id || article?.slug || idx}-fresh`}
                      article={article}
                      className={`block py-1.5 no-underline ${
                        idx === 0 ? "border-t-0 pt-0" : "border-t border-[#ebebeb]"
                      }`}
                    >
                      <h3 className="fps-title-only fps-breaking-title m-0 mb-1 line-clamp-3 text-[8px] font-normal leading-[1.3] text-[#d80100] transition-colors hover:text-[#b90000] min-[425px]:text-[8.5px] min-[1440px]:text-[9px] min-[1920px]:text-[10px]">
                        {truncate(getArticleTitle(article), 90)}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-normal text-[#666] min-[1440px]:text-[11px]">
                          {formatDateTime(article)}
                        </span>
                      </div>
                    </StoryLink>
                  ))}
            </div>
          </aside>

          <div ref={middleColumnRef} className="flex min-w-0 self-start flex-col gap-2">
            {hero && (
              <StoryLink
                article={hero}
                className="relative block min-h-[320px] overflow-hidden border border-[#dfdfdf] bg-[#555] no-underline max-[320px]:min-h-[196px] min-[375px]:min-h-[360px] min-[425px]:min-h-[400px] min-[768px]:min-h-[460px] min-[1024px]:min-h-[390px] min-[1440px]:min-h-[500px] min-[1920px]:min-h-[560px]"
              >
                {getArticleImage(hero) ? (
                  <img
                    src={getArticleImage(hero)}
                    alt={getArticleTitle(hero)}
                    className={`absolute left-0 right-0 top-0 h-[65%] w-full ${
                      is375Viewport ? "object-cover object-center" : "object-cover object-center"
                    } max-[320px]:object-cover max-[320px]:object-top`}
                    style={{
                      objectPosition: is375Viewport ? "center center" : getArticleImageFocus(hero),
                    }}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="absolute left-0 right-0 top-0 flex h-[65%] w-full items-center justify-center bg-[#ddd] text-xs font-semibold text-[#777]">
                    No image
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[rgba(6,6,6,0.92)] via-[rgba(6,6,6,0.5)] to-transparent p-2.5 min-[425px]:p-3 min-[1440px]:p-4">
                  {getArticleCategory(hero) ? (
                    <span className="mb-1 inline-flex items-center bg-[#d90b0b] px-1.5 py-0.5 text-[9px] font-semibold text-white min-[768px]:text-[10px] min-[1440px]:text-[11px]">
                      {getArticleCategory(hero)}
                    </span>
                  ) : null}
                  <h3 className="m-0 text-[16px] font-medium leading-[1.2] text-white min-[425px]:text-[17px] min-[768px]:text-[18px] min-[1024px]:text-[20px] min-[1440px]:text-[24px] min-[1920px]:text-[28px]">
                    {truncate(getArticleTitle(hero), 96)}
                  </h3>
                  <p className="m-0 mt-1.5 text-[10px] font-medium leading-[1.4] text-white/90 min-[425px]:text-[10.5px] min-[768px]:text-[11px] min-[1024px]:text-[12px] min-[1440px]:text-[13px] min-[1920px]:text-[15px]">
                    {truncate(getArticleSummary(hero), 150)}
                  </p>
                  <span className="mt-1.5 inline-block text-[9px] font-semibold text-white/90 min-[768px]:text-[10px] min-[1440px]:text-[11px]">
                    {formatDateTime(hero)}
                  </span>
                </div>
              </StoryLink>
            )}

            <div className="grid grid-cols-1 gap-2 min-[425px]:grid-cols-2">
              {middleImageOnlyCards.map((article, idx) => (
                (() => {
                  const mobileImageHeightClass =
                    idx === 1 ? "max-[320px]:h-[176px]" : "max-[320px]:h-[165px]";

                  return (
                <StoryLink
                  key={`${article?.id || article?.slug || idx}-image-only`}
                  article={article}
                  className="block overflow-hidden border border-[#dfdfdf] bg-white no-underline"
                >
                  {getArticleImage(article) ? (
                    <img
                      src={getArticleImage(article)}
                      alt={getArticleTitle(article)}
                      className={`block h-[180px] w-full object-cover object-center max-[375px]:h-[230px] ${mobileImageHeightClass} max-[320px]:object-cover min-[425px]:h-[155px] min-[768px]:h-[210px] min-[1024px]:h-[185px] min-[1440px]:h-[220px] min-[1920px]:h-[240px]`}
                      style={{
                        objectPosition: getArticleImageFocus(article),
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className={`flex h-[180px] w-full items-center justify-center bg-[#ebebeb] text-[10px] text-[#7a7a7a] max-[375px]:h-[230px] ${mobileImageHeightClass} min-[425px]:h-[155px] min-[768px]:h-[210px] min-[1024px]:h-[185px] min-[1440px]:h-[220px] min-[1920px]:h-[240px]`}>
                      No image
                    </div>
                  )}
                  <div className="p-1.5 min-[425px]:p-2">
                    {getArticleCategory(article) ? (
                      <span className="mb-0.5 block text-[8px] font-semibold text-[#d80100] min-[768px]:text-[9px] min-[1440px]:text-[10px]">
                        {getArticleCategory(article)}
                      </span>
                    ) : null}
                    <h3 className="fps-title-only m-0 line-clamp-2 text-[11px] font-semibold leading-[1.3] text-[#1d1d1d] transition-colors hover:text-[#D80100] min-[425px]:text-[11.5px] min-[768px]:text-[12px] min-[1440px]:text-[13px] min-[1920px]:text-[14px]">
                      {truncate(getArticleTitle(article), 90)}
                    </h3>
                    <span className="mt-1 block text-[8px] font-semibold text-[#666] min-[768px]:text-[9px] min-[1440px]:text-[10px]">
                      {formatDateTime(article)}
                    </span>
                  </div>
                </StoryLink>
                  );
                })()
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 min-[425px]:grid-cols-2 min-[1024px]:grid-cols-3">
              {middleStoryCards.map((article, idx) => (
                (() => {
                  const mobileStoryHeightClass =
                    "max-[320px]:h-[199px]";

                  return (
                <StoryLink
                  key={`${article?.id || article?.slug || idx}-card`}
                  article={article}
                  className="block overflow-hidden border border-[#dfdfdf] bg-white no-underline"
                >
                  {getArticleImage(article) ? (
                    <img
                      src={getArticleImage(article)}
                      alt={getArticleTitle(article)}
                      className={`block h-[96px] w-full object-cover object-center max-[375px]:h-[230px] max-[375px]:object-cover ${mobileStoryHeightClass} max-[320px]:object-cover min-[425px]:h-[128px] min-[768px]:h-[116px] min-[1440px]:h-[130px] min-[1920px]:h-[146px]`}
                      style={{
                        objectPosition: getArticleImageFocus(article),
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className={`flex h-[96px] w-full items-center justify-center bg-[#ebebeb] text-[10px] text-[#7a7a7a] max-[375px]:h-[230px] ${mobileStoryHeightClass} min-[425px]:h-[128px] min-[768px]:h-[116px] min-[1440px]:h-[130px] min-[1920px]:h-[146px]`}>
                      No image
                    </div>
                  )}
                  <div className="p-1.5 min-[425px]:p-2">
                    {getArticleCategory(article) ? (
                      <span className="mb-0.5 block text-[8px] font-semibold text-[#d80100] min-[768px]:text-[9px] min-[1440px]:text-[10px]">
                        {getArticleCategory(article)}
                      </span>
                    ) : null}
                    <h3 className="fps-title-only m-0 line-clamp-3 text-[10px] font-normal leading-[1.3] text-[#1d1d1d] transition-colors hover:text-[#D80100] min-[425px]:text-[10.5px] min-[768px]:text-[11px] min-[1440px]:text-[12px] min-[1920px]:text-[13px]">
                      {truncate(getArticleTitle(article), 72)}
                    </h3>
                    <span className="mt-1 block text-[8px] font-semibold text-[#666] min-[768px]:text-[9px] min-[1440px]:text-[10px]">
                      {formatDateTime(article)}
                    </span>
                  </div>
                </StoryLink>
                  );
                })()
              ))}
            </div>
          </div>

          <aside
            className="flex flex-col border border-[#dfdfdf] bg-[#fafafa] px-1.5 py-2 min-[375px]:px-2 min-[375px]:py-2.5 min-[768px]:col-span-2 min-[1024px]:col-span-1 min-[1440px]:px-2.5 min-[1440px]:py-3"
            style={sideColumnStyle}
          >
            <h2 className="m-0 whitespace-nowrap text-[14px] font-extrabold leading-none text-[#121212] min-[320px]:text-[14px] min-[375px]:text-[15px] min-[425px]:text-[16px] min-[768px]:text-[16px] min-[1024px]:text-[17px] min-[1440px]:text-[18px] min-[1920px]:text-[20px]">
              Popular
            </h2>
            <div
              className={`mt-2 flex min-h-0 flex-1 flex-col bg-white min-[1440px]:mt-2.5 ${
                shouldMatchMiddleHeight
                  ? "scrollbar-invisible overflow-y-auto pr-1"
                  : ""
              }`}
            >
              {showSideLoading
                ? sideLoadingRows.map((_, idx) => (
                    <div
                      key={`popular-loading-${idx}`}
                      className={`block py-1.5 ${
                        idx === sideLoadingRows.length - 1 ? "border-b-0" : "border-b border-[#efefef]"
                      }`}
                    >
                      <div className="h-2 w-[38%] animate-pulse rounded bg-[#f0e1e1]" />
                      <div className="mt-1 h-3 w-[90%] animate-pulse rounded bg-[#ececec]" />
                      <div className="mt-1 h-3 w-[72%] animate-pulse rounded bg-[#f1f1f1]" />
                      <div className="mt-1 h-2 w-[52%] animate-pulse rounded bg-[#f4f4f4]" />
                    </div>
                  ))
                : visiblePopular.map((article, idx) => (
                    <StoryLink
                      key={`${article?.id || article?.slug || idx}-popular`}
                      article={article}
                      className={`block py-1.5 no-underline ${
                        idx === visiblePopular.length - 1 ? "border-b-0" : "border-b border-[#efefef]"
                      }`}
                    >
                      {getArticleCategory(article) ? (
                        <span className="mb-0.5 block text-[9px] font-semibold text-[#d80100] min-[1440px]:text-[10px]">
                          {getArticleCategory(article)}
                        </span>
                      ) : null}
                      <h3 className="fps-title-only m-0 line-clamp-3 text-[10px] font-normal leading-[1.3] text-[#171717] transition-colors hover:text-[#D80100] min-[425px]:text-[10.5px] min-[768px]:text-[11px] min-[1440px]:text-[12px] min-[1920px]:text-[13px]">
                        {truncate(getArticleTitle(article), 86)}
                      </h3>
                      <span className="mt-1 block text-[8px] font-semibold text-[#666] min-[768px]:text-[9px] min-[1440px]:text-[10px]">
                        {formatDateTime(article)}
                      </span>
                    </StoryLink>
                  ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
