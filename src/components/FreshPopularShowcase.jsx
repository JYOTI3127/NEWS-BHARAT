import { useEffect, useMemo, useState } from "react";
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

const normalizeArticles = (data) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  return list
    .filter((item) => item && (item.title || item.headline))
    .sort(
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

const GENERIC_CATEGORY_KEYS = new Set([
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
  "bharat-economy": "BUSINESS",
  business: "BUSINESS",
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

const formatDateTime = (article) => {
  const formatted = formatArticleDateTimeIST(article);
  return formatted || "";
};

const truncate = (value, size) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= size) return text;
  return `${text.slice(0, size).trim()}...`;
};

const getViewportWidth = () =>
  typeof window !== "undefined" ? window.innerWidth : 1440;

const getRailVisibleCount = (width) => {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  if (width >= 425) return 2;
  return 1;
};

const buildBuckets = (articles) => {
  const CENTER_CARD_COUNT = 6;
  const SIDE_LIST_COUNT = 8;

  const list = normalizeArticles(articles);
  const hero = list[0] || null;
  const withoutHero = list.slice(1);
  const topRail = withoutHero.slice(0, 12);
  const centerCards = withoutHero.slice(0, CENTER_CARD_COUNT);
  const freshStart = CENTER_CARD_COUNT;
  const fresh = withoutHero.slice(freshStart, freshStart + SIDE_LIST_COUNT);
  const popularStart = freshStart + SIDE_LIST_COUNT;
  const popular = withoutHero.slice(popularStart, popularStart + SIDE_LIST_COUNT);

  return {
    topRail,
    hero,
    centerCards,
    fresh: fresh.length
      ? fresh
      : withoutHero.slice(CENTER_CARD_COUNT, CENTER_CARD_COUNT + SIDE_LIST_COUNT),
    popular: popular.length
      ? popular
      : withoutHero.slice(
          CENTER_CARD_COUNT + SIDE_LIST_COUNT,
          CENTER_CARD_COUNT + SIDE_LIST_COUNT * 2
        ),
  };
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

export default function FreshPopularShowcase({ articles = [] }) {
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [railStart, setRailStart] = useState(0);

  const { topRail, hero, centerCards, fresh, popular } = useMemo(
    () => buildBuckets(articles),
    [articles]
  );

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
    setRailStart((prev) => Math.max(0, Math.min(prev, maxRailStart)));
  }, [maxRailStart]);

  useEffect(() => {
    setRailStart(0);
  }, [topRail.length]);

  if (!Array.isArray(articles) || articles.length === 0) return null;

  const visibleRail = topRail.slice(railStart, railStart + railVisibleCount);
  const canPrev = railStart > 0;
  const canNext = railStart < maxRailStart;

  return (
    <section className="mx-auto mb-5 w-full font-['Poppins',sans-serif] min-[320px]:mb-5 min-[768px]:mb-6 min-[1024px]:mb-7 min-[1440px]:mb-8 min-[1920px]:mb-10">
      <div className="rounded-lg  p-2.5 min-[320px]:p-2.5 min-[375px]:p-3 min-[425px]:p-3.5 min-[768px]:p-3 min-[1024px]:p-3.5 min-[1440px]:p-4 min-[1920px]:p-5">
        <div className="mb-2.5 flex items-center gap-2 min-[768px]:mb-3">
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
                <h3 className="m-0 text-[11px] font-bold leading-[1.3] text-[#1d1d1d] transition-colors hover:text-[#d80100] min-[375px]:text-[12px] min-[768px]:text-[13px] min-[1440px]:text-[14px] min-[1920px]:text-[15px]">
                  {truncate(getArticleTitle(article), 72)}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="text-[9px] font-semibold text-[#6a6a6a] min-[768px]:text-[10px]">
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
        </div>

        <div className="grid gap-2.5 min-[425px]:gap-3 min-[768px]:grid-cols-[200px_minmax(0,1fr)] min-[1024px]:grid-cols-[180px_minmax(0,1fr)_180px] min-[1440px]:grid-cols-[220px_minmax(0,1fr)_220px] min-[1920px]:grid-cols-[270px_minmax(0,1fr)_270px]">
          <aside className="flex flex-col border border-[#dfdfdf] bg-[#fafafa] p-2.5 min-[375px]:p-3 min-[1440px]:p-3.5">
            <h2 className="m-0 whitespace-nowrap text-[18px] font-extrabold leading-none text-[#121212] min-[320px]:text-[18px] min-[375px]:text-[20px] min-[425px]:text-[21px] min-[768px]:text-[20px] min-[1024px]:text-[22px] min-[1440px]:text-[24px] min-[1920px]:text-[28px]">
              Trending
            </h2>
            {/* <p className="mb-2 mt-1.5 text-[8px] font-extrabold leading-[1.3] text-[#313131] min-[375px]:text-[8.5px] min-[425px]:text-[9px] min-[768px]:mb-2.5 min-[1024px]:text-[9.5px] min-[1440px]:mb-3 min-[1440px]:text-[10px]">
              TODAY: BROWSE OUR EDITOR&apos;S HAND PICKED ARTICLES!
            </p> */}

            <div className="mt-2 flex flex-1 flex-col bg-white px-2 py-1 min-[1440px]:mt-2.5">
              {fresh.map((article, idx) => (
                <StoryLink
                  key={`${article?.id || article?.slug || idx}-fresh`}
                  article={article}
                  className={`block py-1.5 no-underline ${
                    idx === 0 ? "border-t-0 pt-0" : "border-t border-[#ebebeb]"
                  }`}
                >
                  {getArticleCategory(article) ? (
                    <span className="mb-0.5 block text-[9px] font-extrabold text-[#d80100] min-[1440px]:text-[10px]">
                      {getArticleCategory(article)}
                    </span>
                  ) : null}
                  <h3 className="m-0 mb-1 line-clamp-3 text-[11px] font-bold leading-[1.3] text-[#1c1c1c] transition-colors hover:text-[#d80100] min-[425px]:text-[11.5px] min-[1440px]:text-[12px] min-[1920px]:text-[13px]">
                    {truncate(getArticleTitle(article), 90)}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] font-semibold text-[#666] min-[1440px]:text-[10px]">
                      {formatDateTime(article)}
                    </span>
                  </div>
                </StoryLink>
              ))}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-2">
            {hero && (
              <StoryLink
                article={hero}
                className="relative block min-h-[320px] overflow-hidden border border-[#dfdfdf] bg-[#555] no-underline min-[375px]:min-h-[360px] min-[425px]:min-h-[400px] min-[768px]:min-h-[460px] min-[1024px]:min-h-[390px]"
              >
                {getArticleImage(hero) ? (
                  <img
                    src={getArticleImage(hero)}
                    alt={getArticleTitle(hero)}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-[#ddd] text-xs font-semibold text-[#777]">
                    No image
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[rgba(6,6,6,0.92)] via-[rgba(6,6,6,0.5)] to-transparent p-2.5 min-[425px]:p-3 min-[1440px]:p-4">
                  {getArticleCategory(hero) ? (
                    <span className="mb-1 inline-flex items-center bg-[#d90b0b] px-1.5 py-0.5 text-[9px] font-extrabold text-white min-[768px]:text-[10px] min-[1440px]:text-[11px]">
                      {getArticleCategory(hero)}
                    </span>
                  ) : null}
                  <h3 className="m-0 text-[16px] font-extrabold leading-[1.2] text-white min-[425px]:text-[17px] min-[768px]:text-[18px] min-[1024px]:text-[20px] min-[1440px]:text-[24px] min-[1920px]:text-[28px]">
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

            <div className="grid grid-cols-1 gap-2 min-[425px]:grid-cols-2 min-[1024px]:grid-cols-3">
              {centerCards.map((article, idx) => (
                <StoryLink
                  key={`${article?.id || article?.slug || idx}-card`}
                  article={article}
                  className="block overflow-hidden border border-[#dfdfdf] bg-white no-underline"
                >
                  {getArticleImage(article) ? (
                    <img
                      src={getArticleImage(article)}
                      alt={getArticleTitle(article)}
                      className="block h-[80px] w-full object-cover object-center min-[425px]:h-[90px] min-[768px]:h-[95px] min-[1440px]:h-[110px] min-[1920px]:h-[130px]"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-[80px] w-full items-center justify-center bg-[#ebebeb] text-[10px] text-[#7a7a7a] min-[425px]:h-[90px] min-[768px]:h-[95px] min-[1440px]:h-[110px] min-[1920px]:h-[130px]">
                      No image
                    </div>
                  )}
                  <div className="p-1.5 min-[425px]:p-2">
                    {getArticleCategory(article) ? (
                      <span className="mb-0.5 block text-[8px] font-extrabold text-[#d80100] min-[768px]:text-[9px] min-[1440px]:text-[10px]">
                        {getArticleCategory(article)}
                      </span>
                    ) : null}
                    <h3 className="m-0 text-[10px] font-bold leading-[1.3] text-[#1d1d1d] transition-colors hover:text-[#d80100] min-[425px]:text-[10.5px] min-[768px]:text-[11px] min-[1440px]:text-[12px] min-[1920px]:text-[13px]">
                      {truncate(getArticleTitle(article), 72)}
                    </h3>
                    <span className="mt-1 block text-[8px] font-semibold text-[#666] min-[768px]:text-[9px] min-[1440px]:text-[10px]">
                      {formatDateTime(article)}
                    </span>
                  </div>
                </StoryLink>
              ))}
            </div>
          </div>

          <aside className="flex flex-col border border-[#dfdfdf] bg-[#fafafa] p-2.5 min-[375px]:p-3 min-[768px]:col-span-2 min-[1024px]:col-span-1 min-[1440px]:p-3.5">
            <h2 className="m-0 whitespace-nowrap text-[18px] font-extrabold leading-none text-[#121212] min-[320px]:text-[18px] min-[375px]:text-[20px] min-[425px]:text-[21px] min-[768px]:text-[20px] min-[1024px]:text-[22px] min-[1440px]:text-[24px] min-[1920px]:text-[28px]">
              Popular
            </h2>
            <div className="mt-2 flex flex-1 flex-col bg-white px-2 py-1 min-[1440px]:mt-2.5">
              {popular.map((article, idx) => (
                <StoryLink
                  key={`${article?.id || article?.slug || idx}-popular`}
                  article={article}
                  className={`block py-1.5 no-underline ${
                    idx === popular.length - 1 ? "border-b-0" : "border-b border-[#efefef]"
                  }`}
                >
                  {getArticleCategory(article) ? (
                    <span className="mb-0.5 block text-[9px] font-extrabold text-[#d80100] min-[1440px]:text-[10px]">
                      {getArticleCategory(article)}
                    </span>
                  ) : null}
                  <h3 className="m-0 line-clamp-3 text-[10px] font-bold leading-[1.3] text-[#171717] transition-colors hover:text-[#d80100] min-[425px]:text-[10.5px] min-[768px]:text-[11px] min-[1440px]:text-[12px] min-[1920px]:text-[13px]">
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
