import { useEffect, useState, useRef, memo } from "react";
import { Link } from "react-router-dom";
import "./HomeCategorySections.css";
import { API_BASE } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const CATEGORY_API = `${API_BASE}/categories/`;

const VARIANT_BY_SLUG = {
  "world-news": "editorial",
  sports: "scoreline",
  sport: "scoreline",
  entertainment: "mosaic",
  technology: "cards",
  automobile: "spotlight",
  health: "cards",
  ai: "editorial",
  "artificial-intelligence": "editorial",
};

const HOMEPAGE_CATEGORY_CONFIG = [
  { key: "world-news",    title: "World News",    slugs: ["world-news", "worldnews"],              variant: "editorial" },
  { key: "sports",        title: "Sports",        slugs: ["sports", "sport"],                      variant: "scoreline" },
  { key: "entertainment", title: "Entertainment", slugs: ["entertainment", "entertainmnet"],        variant: "mosaic" },
  { key: "technology",    title: "Technology",    slugs: ["technology"],                           variant: "cards" },
  { key: "automobile",    title: "Automobile",    slugs: ["automobile", "auto"],                   variant: "spotlight" },
  { key: "health",        title: "Health",        slugs: ["health"],                               variant: "cards" },
  { key: "ai",            title: "AI",            slugs: ["ai", "artificial-intelligence"],        variant: "editorial" },
];

const HIDE_CATEGORY_LABEL_KEYS = new Set([
  "world-news",
  "technology",
  "automobile",
  "health",
  "ai",
]);

const EXCLUDED_HOME_SLUGS = new Set([
  "60-second-read", "bharat-economy", "bharat-explainers",
  "bharat-opinions", "bharat-in-numbers", "bharats-startups",
  "bharat-startups", "states-of-bharat", "state-of-bharat",
]);

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
const formatDate = (value) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const datePart = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const timePart = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${datePart} | ${timePart}`.replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
  } catch { return ""; }
};

const getArticleDateValue = (a) =>
  a?.published_at || a?.created_at || a?.updated_at ||
  a?.date || a?.publishedOn || a?.createdOn ||
  a?.published_date || a?.publish_date || a?.post_date || "";

const normalizeArticles = (data) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  return list
    .filter((item) => item && (item.title || item.headline))
    .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));
};

const getArticleImage   = (a) => a?.image_url || a?.image || "";
const getArticleTitle   = (a) => a?.title || a?.headline || "Untitled";
const getSectionArticleTitle = (article, section) => {
  const primary = String(getArticleTitle(article) || "").trim();

  if (section?.key === "automobile" && /(\.\.\.|�)$/.test(primary)) {
    const fallback = String(article?.headline || article?.article_title || "").trim();
    if (fallback && fallback.length > primary.length) return fallback;
  }

  return primary || "Untitled";
};
const getArticleSummary = (a) =>
  String(
    a?.subtitle ||
    a?.description ||
    a?.summary ||
    a?.excerpt ||
    a?.short_description ||
    a?.intro ||
    a?.content ||
    ""
  )
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const getCategoryLabel  = (a, fallback) => {
  const details = Array.isArray(a?.category_details) ? a.category_details : [];
  const breakingCategory = details.find((cat) => {
    const slug = String(cat?.slug || "").trim().toLowerCase();
    const name = String(cat?.name || "").trim().toLowerCase();
    return slug === "breaking-news" || name === "breaking news";
  });

  return breakingCategory?.name || details[0]?.name || fallback;
};
const shouldShowCategoryLabel = (section) => !HIDE_CATEGORY_LABEL_KEYS.has(section?.key);

// ─────────────────────────────────────────────
// ✅ FIX 1: useIs4K — stable hook, component ke bahar
// ─────────────────────────────────────────────
const useIs4K = () => {
  const getValue = () => (typeof window !== "undefined" ? window.innerWidth > 2560 : false);
  const [is4K, setIs4K] = useState(getValue);
  useEffect(() => {
    const onResize = () => setIs4K(getValue());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return is4K;
};

// ─────────────────────────────────────────────
// ✅ FIX 2: doesArticleMatchSection
// Pehle: category_details undefined pe crash karta tha
// Ab: safe check — dono slug aur id se match
// ─────────────────────────────────────────────
const doesArticleMatchSection = (article, section) => {
  const sectionSlugs = (section?.slugs || []).map((s) => String(s).toLowerCase());

  // category_details se match (safe check)
  if (Array.isArray(article?.category_details) && article.category_details.length > 0) {
    const matched = article.category_details.some((cat) =>
      sectionSlugs.includes(String(cat?.slug || "").toLowerCase())
    );
    if (matched) return true;
  }

  // categories (id array) se match
  if (section?.id && Array.isArray(article?.categories)) {
    return article.categories.some((cId) => Number(cId) === Number(section.id));
  }

  // category string field se match (fallback)
  if (article?.category) {
    return sectionSlugs.includes(String(article.category).toLowerCase());
  }

  return false;
};

// ─────────────────────────────────────────────
// ✅ FIX 3: Categories ek baar fetch karo — module level cache
// Pehle: har render pe fetchCategories() call hoti thi
// Ab: pehli baar fetch, phir cache se
// ─────────────────────────────────────────────
let _categoriesCache = null;
let _categoriesFetching = null;

async function getCachedCategories() {
  if (_categoriesCache) return _categoriesCache;
  if (_categoriesFetching) return _categoriesFetching;

  _categoriesFetching = (async () => {
    try {
      const res  = await fetch(CATEGORY_API);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const categories = Array.isArray(data) ? data : data?.results || [];

      const result = HOMEPAGE_CATEGORY_CONFIG.map((section) => {
        const matched = categories.find((cat) => {
          const status = String(cat?.status || "").toLowerCase();
          return (
            cat?.slug &&
            section.slugs.some((s) => s.toLowerCase() === cat.slug.toLowerCase()) &&
            !EXCLUDED_HOME_SLUGS.has(cat.slug) &&
            (status === "" || status === "active")
          );
        });

        return {
          key:     section.key,
          id:      matched?.id,
          title:   matched?.name || section.title,
          path:    `/category/${matched?.slug || section.slugs[0]}`,
          slugs:   matched
            ? [matched.slug, ...section.slugs.filter((s) => s !== matched.slug)]
            : section.slugs,
          variant: matched ? VARIANT_BY_SLUG[matched.slug] || section.variant : section.variant,
        };
      });

      _categoriesCache = result;
      return result;
    } catch {
      return HOMEPAGE_CATEGORY_CONFIG.map((s) => ({
        key: s.key, id: undefined,
        title: s.title,
        path:  `/category/${s.slugs[0]}`,
        slugs: s.slugs,
        variant: s.variant,
      }));
    }
  })();

  return _categoriesFetching;
}

// ─────────────────────────────────────────────
// ✅ FIX 4: fetchCategoryArticles — sirf tab call karo
// jab local articles nahi mile
// ─────────────────────────────────────────────
async function fetchCategoryArticles(section) {
  const slugs = section?.slugs || [];
  for (const slug of slugs) {
    try {
      const res = await fetch(`${API_BASE}/articles/?category=${encodeURIComponent(slug)}&page=1&limit=8`);
      if (!res.ok) continue;
      const data     = await res.json();
      const articles = normalizeArticles(data);
      if (articles.length > 0) return { articles, matchedSlug: slug };
    } catch { continue; }
  }
  return { articles: [], matchedSlug: slugs[0] };
}

// ─────────────────────────────────────────────
// UI Components — memo se wrap, unnecessary re-render nahi
// ─────────────────────────────────────────────
const SectionHeader = memo(({ title, path }) => (
  <div className="hcs-header">
    <div className="hcs-header-left">
      <span className="hcs-header-bar" />
      <h2 className="hcs-header-title">{title}</h2>
    </div>
    <Link to={path} className="hcs-header-link">View All</Link>
  </div>
));

const StoryLink = memo(({ article, className, children }) => {
  const articlePath = getArticlePath(article);
  if (!articlePath) return <div className={className}>{children}</div>;
  return <Link to={articlePath} className={className}>{children}</Link>;
});

const ArticleThumb = memo(({ article, alt, className, priority = false }) => {
  const src = getArticleImage(article);
  if (!src) return <div className={`${className} hcs-thumb-fallback`}>No Image</div>;
  return (
    <img
      src={src} alt={alt} className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async" width={640} height={360}
    />
  );
});

const SectionFallback = memo(({ title, path }) => (
  <section className="hcs-section">
    <SectionHeader title={title} path={path} />
    <div className="hcs-empty">No articles available right now.</div>
  </section>
));

const EditorialSection = memo(({ section, articles }) => {
  const featured  = articles[0];
  const sideItems = articles.slice(1, 5);
  if (!featured) return <SectionFallback title={section.title} path={section.path} />;
  return (
    <section className="hcs-section">
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-editorial">
        <StoryLink
          article={featured}
          className={`hcs-editorial-featured${section.key === "world-news" ? " hcs-editorial-featured--world" : ""}${section.key === "ai" ? " hcs-editorial-featured--ai" : ""}`}
        >
          <div className="hcs-editorial-image-wrap">
            <ArticleThumb article={featured} alt={getArticleTitle(featured)} className="hcs-editorial-image" />
            <div className="hcs-editorial-overlay" />
          </div>
          <div className="hcs-editorial-copy">
            {shouldShowCategoryLabel(section) ? (
              <span className="hcs-kicker">{getCategoryLabel(featured, section.title)}</span>
            ) : null}
            <h3 className="hcs-featured-title">{getSectionArticleTitle(featured, section)}</h3>
            <p className="hcs-summary">{getArticleSummary(featured)}</p>
            <span className="hcs-meta">{formatDate(getArticleDateValue(featured))}</span>
          </div>
        </StoryLink>
        <div className="hcs-editorial-side">
          {sideItems.map((article) => (
            <StoryLink key={article.id || article.slug} article={article} className="hcs-side-card">
              <ArticleThumb
                article={article}
                alt={getArticleTitle(article)}
                className={`hcs-side-thumb${section.key === "world-news" ? " hcs-world-news-side-thumb" : ""}${section.key === "ai" ? " hcs-ai-side-thumb" : ""}`}
              />
              <div className="hcs-side-copy">
                {shouldShowCategoryLabel(section) ? (
                  <span className="hcs-kicker">{getCategoryLabel(article, section.title)}</span>
                ) : null}
                <h4 className={`hcs-side-title${section.key === "world-news" ? " hcs-world-news-side-title" : ""}${section.key === "ai" ? " hcs-ai-side-title" : ""}`}>{getArticleTitle(article)}</h4>
                {(section.key === "world-news" || section.key === "ai") && getArticleSummary(article) ? (
                  <p className={`hcs-side-summary${section.key === "world-news" ? " hcs-world-news-side-summary" : ""}${section.key === "ai" ? " hcs-ai-side-summary" : ""}`}>{getArticleSummary(article)}</p>
                ) : null}
                <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
              </div>
            </StoryLink>
          ))}
        </div>
      </div>
    </section>
  );
});

const ScorelineSection = memo(({ section, articles }) => {
  const featured = articles[0];
  const cards    = articles.slice(1, 5);
  if (!featured) return <SectionFallback title={section.title} path={section.path} />;
  return (
    <section className="hcs-section">
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-scoreline">
        <StoryLink article={featured} className="hcs-scoreline-featured">
          <div className="hcs-scoreline-image-wrap">
            <ArticleThumb
              article={featured}
              alt={getArticleTitle(featured)}
              className={`hcs-scoreline-image${section.key === "sports" ? " hcs-scoreline-image--sports" : ""}`}
            />
          </div>
          <div className="hcs-scoreline-text">
            <span className="hcs-kicker">Top Story</span>
            <h3 className="hcs-featured-title">{getArticleTitle(featured)}</h3>
            <p className="hcs-summary">{getArticleSummary(featured)}</p>
            <span className="hcs-meta">{formatDate(getArticleDateValue(featured))}</span>
          </div>
        </StoryLink>
        <div className="hcs-scoreline-list">
          {cards.map((article, index) => (
            <StoryLink key={article.id || article.slug} article={article} className="hcs-scoreline-item">
              <span className="hcs-scoreline-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="hcs-scoreline-copy">
                <h4 className="hcs-side-title">{getArticleTitle(article)}</h4>
                <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
              </div>
            </StoryLink>
          ))}
        </div>
      </div>
    </section>
  );
});

const MosaicSection = memo(({ section, articles }) => {
  const featured = articles[0];
  const cards    = articles.slice(1, 5);
  if (!featured) return <SectionFallback title={section.title} path={section.path} />;
  return (
    <section className="hcs-section">
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-mosaic">
        <StoryLink article={featured} className="hcs-mosaic-featured">
          <ArticleThumb article={featured} alt={getArticleTitle(featured)} className="hcs-mosaic-image" />
          <div className="hcs-mosaic-copy">
            {shouldShowCategoryLabel(section) ? (
              <span className="hcs-kicker">{getCategoryLabel(featured, section.title)}</span>
            ) : null}
            <h3 className="hcs-featured-title">{getArticleTitle(featured)}</h3>
            <span className="hcs-meta">{formatDate(getArticleDateValue(featured))}</span>
          </div>
        </StoryLink>
        <div className="hcs-mosaic-grid">
          {cards.map((article) => (
            <StoryLink key={article.id || article.slug} article={article} className="hcs-mosaic-card">
              <ArticleThumb article={article} alt={getArticleTitle(article)} className="hcs-mosaic-thumb" />
              <div className="hcs-mosaic-card-copy">
                <h4 className="hcs-side-title">{getArticleTitle(article)}</h4>
                <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
              </div>
            </StoryLink>
          ))}
        </div>
      </div>
    </section>
  );
});

const CardsSection = memo(({ section, articles }) => {
  const cards = articles.slice(0, 4);
  if (cards.length === 0) return <SectionFallback title={section.title} path={section.path} />;
  return (
    <section className="hcs-section">
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-cards">
        {cards.map((article) => (
          <StoryLink key={article.id || article.slug} article={article} className="hcs-card">
            <ArticleThumb article={article} alt={getArticleTitle(article)} className="hcs-card-thumb" />
            <div className="hcs-card-copy">
              {shouldShowCategoryLabel(section) ? (
                <span className="hcs-kicker">{getCategoryLabel(article, section.title)}</span>
              ) : null}
              <h4 className="hcs-side-title">{getArticleTitle(article)}</h4>
              <p className="hcs-summary">{getArticleSummary(article)}</p>
              <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
            </div>
          </StoryLink>
        ))}
      </div>
    </section>
  );
});

const SpotlightSection = memo(({ section, articles }) => {
  const featured    = articles[0];
  const sideItems   = articles.slice(1, 3);
  const bottomItems = articles.slice(3, 6);
  if (!featured) return <SectionFallback title={section.title} path={section.path} />;
  return (
    <section className={`hcs-section${section.key === "automobile" ? " hcs-section-automobile" : ""}`}>
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-spotlight">
        <StoryLink article={featured} className="hcs-spotlight-main">
          <ArticleThumb
            article={featured}
            alt={getArticleTitle(featured)}
            className={`hcs-spotlight-main-image${section.key === "automobile" ? " hcs-automobile-main-image" : ""}`}
          />
          <div className="hcs-spotlight-main-copy">
            {shouldShowCategoryLabel(section) ? (
              <span className="hcs-kicker">{getCategoryLabel(featured, section.title)}</span>
            ) : null}
            <h3 className="hcs-featured-title">{getSectionArticleTitle(featured, section)}</h3>
            <p className="hcs-summary">{getArticleSummary(featured)}</p>
            <span className="hcs-meta">{formatDate(getArticleDateValue(featured))}</span>
          </div>
        </StoryLink>
        <div className="hcs-spotlight-side">
          {sideItems.map((article) => (
            <StoryLink key={article.id || article.slug} article={article} className="hcs-side-card">
              <ArticleThumb
                article={article}
                alt={getArticleTitle(article)}
                className={`hcs-side-thumb${section.key === "automobile" ? " hcs-automobile-side-thumb" : ""}`}
              />
              <div className="hcs-side-copy">
                {shouldShowCategoryLabel(section) ? (
                  <span className="hcs-kicker">{getCategoryLabel(article, section.title)}</span>
                ) : null}
                <h4 className={`hcs-side-title${section.key === "automobile" ? " hcs-automobile-side-title" : ""}`}>{getSectionArticleTitle(article, section)}</h4>
                {section.key === "automobile" && getArticleSummary(article) ? (
                  <p className="hcs-side-summary hcs-automobile-side-summary">{getArticleSummary(article)}</p>
                ) : null}
                <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
              </div>
            </StoryLink>
          ))}
        </div>
      </div>
      <div className="hcs-bottom-rail">
        {bottomItems.map((article) => (
          <StoryLink key={article.id || article.slug} article={article} className="hcs-bottom-rail-card">
            <ArticleThumb
              article={article}
              alt={getArticleTitle(article)}
              className={`hcs-bottom-rail-thumb${section.key === "automobile" ? " hcs-automobile-bottom-thumb" : ""}`}
            />
            <div className="hcs-bottom-rail-copy">
              <h4 className={`hcs-side-title${section.key === "automobile" ? " hcs-automobile-side-title" : ""}`}>{getSectionArticleTitle(article, section)}</h4>
              {section.key === "automobile" && getArticleSummary(article) ? (
                <p className="hcs-side-summary hcs-automobile-side-summary">{getArticleSummary(article)}</p>
              ) : null}
              <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
            </div>
          </StoryLink>
        ))}
      </div>
    </section>
  );
});

const CategorySection = memo(({ section, articles }) => {
  switch (section.variant) {
    case "editorial":  return <EditorialSection  section={section} articles={articles} />;
    case "scoreline":  return <ScorelineSection  section={section} articles={articles} />;
    case "mosaic":     return <MosaicSection     section={section} articles={articles} />;
    case "spotlight":  return <SpotlightSection  section={section} articles={articles} />;
    default:           return <CardsSection      section={section} articles={articles} />;
  }
});

// ─────────────────────────────────────────────
// ✅ Main Component
// ─────────────────────────────────────────────
export default function HomeCategorySections({ articles: passedArticles = null }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading]   = useState(true);
  const is4K = useIs4K();

  // ✅ FIX: passedArticles ka stable reference — useRef se track karo
  // Pehle: har baar naya array aata tha → useEffect dobara chalta tha
  // Ab: sirf tab chale jab articles ka content sach mein change ho
  const prevArticlesRef = useRef(null);
  const loadedRef       = useRef(false);

  useEffect(() => {
    const incoming = normalizeArticles(passedArticles);

    // Agar pehle se load ho chuka hai aur articles count same hai — skip
    if (loadedRef.current && prevArticlesRef.current?.length === incoming.length) return;

    prevArticlesRef.current = incoming;
    let ignore = false;

    async function loadSections() {
      try {
        // ✅ FIX: getCachedCategories — sirf ek baar fetch hoga
        const categorySections = await getCachedCategories();

        // ✅ FIX: Pehle local articles se match karo
        // Agar kisi section mein local articles mile → API call mat karo
        const results = await Promise.all(
          categorySections.map(async (section) => {
            const localArticles = incoming
              .filter((article) => doesArticleMatchSection(article, section))
              .slice(0, 8);

            if (localArticles.length > 0) {
              // ✅ Local articles mile — koi API call nahi!
              return { ...section, articles: localArticles };
            }

            // ✅ Sirf tab API call karo jab local mein kuch nahi mila
            const response = await fetchCategoryArticles(section);
            return { ...section, matchedSlug: response.matchedSlug, articles: response.articles };
          })
        );

        if (ignore) return;

        setSections(results.filter((s) => s.articles.length > 0));
        loadedRef.current = true;
      } catch (error) {
        console.error("Error loading homepage categories:", error);
      } finally {
        if (!ignore) {
          setLoading(false);
          document.dispatchEvent(new Event("prerender-ready"));
        }
      }
    }

    loadSections();
    return () => { ignore = true; };
  }, [passedArticles]);

  if (loading) {
    return <div className={`hcs-root${is4K ? " hcs-root-4k" : ""}`}>Loading categories...</div>;
  }

  if (sections.length === 0) {
    return (
      <div className="hcs-root">
        <div className="hcs-empty">No category sections available.</div>
      </div>
    );
  }

  return (
    <div className={`hcs-root${is4K ? " hcs-root-4k" : ""}`}>
      {sections.map((section) => (
        <CategorySection key={section.key} section={section} articles={section.articles} />
      ))}
    </div>
  );
}

