import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./HomeCategorySections.css";

const API_BASE = "https://news4bharat.cloud/api";
const CATEGORY_API = `${API_BASE}/categories/`;

const VARIANT_ROTATION = ["editorial", "scoreline", "mosaic", "cards", "spotlight"];

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
  { key: "world-news", title: "World News", slugs: ["world-news", "worldnews"], variant: "editorial" },
  { key: "sports", title: "Sports", slugs: ["sports", "sport"], variant: "scoreline" },
  { key: "entertainment", title: "Entertainment", slugs: ["entertainment", "entertainmnet"], variant: "mosaic" },
  { key: "technology", title: "Technology", slugs: ["technology"], variant: "cards" },
  { key: "automobile", title: "Automobile", slugs: ["automobile", "auto"], variant: "spotlight" },
  { key: "health", title: "Health", slugs: ["health"], variant: "cards" },
  { key: "ai", title: "AI", slugs: ["ai", "artificial-intelligence"], variant: "editorial" },
];

const EXCLUDED_HOME_SLUGS = new Set([
  "60-second-read",
  "bharat-economy",
  "bharat-explainers",
  "bharat-opinions",
  "bharat-numbers",
  "bharats-startups",
  "bharat-startups",
  "states-of-bharat",
  "state-of-bharat",
]);

const formatDate = (value) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const datePart = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const timePart = date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${datePart} | ${timePart}`.replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());
  } catch {
    return "";
  }
};

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

const normalizeArticles = (data) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  return list
    .filter((item) => item && (item.title || item.headline))
    .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));
};

const getArticleImage = (article) => article?.image_url || article?.image || "";
const getArticleTitle = (article) => article?.title || article?.headline || "Untitled";
const getArticleSummary = (article) =>
  article?.subtitle || article?.description || article?.summary || article?.excerpt || "";
const getCategoryLabel = (article, fallback) => article?.category_details?.[0]?.name || fallback;

const getSectionVariant = (slug, index) =>
  VARIANT_BY_SLUG[slug] || VARIANT_ROTATION[index % VARIANT_ROTATION.length];

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

async function fetchCategoryArticles(section) {
  const slugs = section?.slugs || [];

  for (const slug of slugs) {
    try {
      const res = await fetch(`${API_BASE}/articles/?category=${encodeURIComponent(slug)}&limit=8`);
      if (!res.ok) continue;
      const data = await res.json();
      const articles = normalizeArticles(data);
      if (articles.length > 0) {
        return { articles, matchedSlug: slug };
      }
    } catch {
      // Try next slug candidate.
    }
  }

  try {
    const res = await fetch(`${API_BASE}/articles/`);
    if (res.ok) {
      const data = await res.json();
      const allArticles = normalizeArticles(data);
      const filteredArticles = allArticles.filter((article) => {
        const categoryMatchesSlug =
          Array.isArray(article?.category_details) &&
          article.category_details.some((cat) =>
            slugs.some((slug) => cat?.slug?.toLowerCase() === slug.toLowerCase())
          );

        const categoryMatchesId =
          section?.id &&
          Array.isArray(article?.categories) &&
          article.categories.includes(section.id);

        return categoryMatchesSlug || categoryMatchesId;
      });

      if (filteredArticles.length > 0) {
        return {
          articles: filteredArticles.slice(0, 8),
          matchedSlug: filteredArticles[0]?.category_details?.[0]?.slug || slugs[0],
        };
      }
    }
  } catch {
    // Fall back to empty state.
  }

  return { articles: [], matchedSlug: slugs[0] };
}

async function fetchCategories() {
  try {
    const res = await fetch(CATEGORY_API);
    if (!res.ok) throw new Error("Failed to fetch categories");
    const data = await res.json();
    const categories = Array.isArray(data) ? data : data?.results || [];

    return HOMEPAGE_CATEGORY_CONFIG.map((section, index) => {
      const matchedCategory = categories.find((category) => {
        const status = String(category?.status || "").toLowerCase();
        return (
          category?.slug &&
          section.slugs.some((slug) => slug.toLowerCase() === category.slug.toLowerCase()) &&
          !EXCLUDED_HOME_SLUGS.has(category.slug) &&
          (status === "" || status === "active")
        );
      });

      return {
        key: section.key,
        id: matchedCategory?.id,
        title: matchedCategory?.name || section.title,
        path: `/category/${matchedCategory?.slug || section.slugs[0]}`,
        slugs: matchedCategory ? [matchedCategory.slug, ...section.slugs.filter((slug) => slug !== matchedCategory.slug)] : section.slugs,
        variant: matchedCategory ? getSectionVariant(matchedCategory.slug, index) : section.variant,
      };
    });
  } catch {
    return HOMEPAGE_CATEGORY_CONFIG.map((section) => ({
      key: section.key,
      id: undefined,
      title: section.title,
      path: `/category/${section.slugs[0]}`,
      slugs: section.slugs,
      variant: section.variant,
    }));
  }
}

function SectionHeader({ title, path }) {
  return (
    <div className="hcs-header">
      <div className="hcs-header-left">
        <span className="hcs-header-bar" />
        <h2 className="hcs-header-title">{title}</h2>
      </div>
      <Link to={path} className="hcs-header-link">
        View All
      </Link>
    </div>
  );
}

function StoryLink({ article, className, children }) {
  const slug = article?.slug;
  if (!slug) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Link to={`/article/${slug}`} className={className}>
      {children}
    </Link>
  );
}

function ArticleThumb({ article, alt, className }) {
  const src = getArticleImage(article);

  if (!src) {
    return <div className={`${className} hcs-thumb-fallback`}>No Image</div>;
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}

function SectionFallback({ title, path }) {
  return (
    <section className="hcs-section">
      <SectionHeader title={title} path={path} />
      <div className="hcs-empty">No articles available right now.</div>
    </section>
  );
}

function EditorialSection({ section, articles }) {
  const featured = articles[0];
  const sideItems = articles.slice(1, 5);

  if (!featured) return <SectionFallback title={section.title} path={section.path} />;

  return (
    <section className="hcs-section">
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-editorial">
        <StoryLink article={featured} className="hcs-editorial-featured">
          <div className="hcs-editorial-image-wrap">
            <ArticleThumb article={featured} alt={getArticleTitle(featured)} className="hcs-editorial-image" />
            <div className="hcs-editorial-overlay" />
          </div>
          <div className="hcs-editorial-copy">
            <span className="hcs-kicker">{getCategoryLabel(featured, section.title)}</span>
            <h3 className="hcs-featured-title">{getArticleTitle(featured)}</h3>
            <p className="hcs-summary">{getArticleSummary(featured)}</p>
            <span className="hcs-meta">{formatDate(getArticleDateValue(featured))}</span>
          </div>
        </StoryLink>

        <div className="hcs-editorial-side">
          {sideItems.map((article) => (
            <StoryLink key={article.id || article.slug} article={article} className="hcs-side-card">
              <ArticleThumb article={article} alt={getArticleTitle(article)} className="hcs-side-thumb" />
              <div className="hcs-side-copy">
                <span className="hcs-kicker">{getCategoryLabel(article, section.title)}</span>
                <h4 className="hcs-side-title">{getArticleTitle(article)}</h4>
                <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
              </div>
            </StoryLink>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScorelineSection({ section, articles }) {
  const featured = articles[0];
  const cards = articles.slice(1, 5);

  if (!featured) return <SectionFallback title={section.title} path={section.path} />;

  return (
    <section className="hcs-section">
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-scoreline">
        <StoryLink article={featured} className="hcs-scoreline-featured">
          <div className="hcs-scoreline-image-wrap">
            <ArticleThumb article={featured} alt={getArticleTitle(featured)} className="hcs-scoreline-image" />
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
}

function MosaicSection({ section, articles }) {
  const featured = articles[0];
  const cards = articles.slice(1, 5);

  if (!featured) return <SectionFallback title={section.title} path={section.path} />;

  return (
    <section className="hcs-section">
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-mosaic">
        <StoryLink article={featured} className="hcs-mosaic-featured">
          <ArticleThumb article={featured} alt={getArticleTitle(featured)} className="hcs-mosaic-image" />
          <div className="hcs-mosaic-copy">
            <span className="hcs-kicker">{getCategoryLabel(featured, section.title)}</span>
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
}

function CardsSection({ section, articles }) {
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
              <span className="hcs-kicker">{getCategoryLabel(article, section.title)}</span>
              <h4 className="hcs-side-title">{getArticleTitle(article)}</h4>
              <p className="hcs-summary">{getArticleSummary(article)}</p>
              <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
            </div>
          </StoryLink>
        ))}
      </div>
    </section>
  );
}

function SpotlightSection({ section, articles }) {
  const featured = articles[0];
  const sideItems = articles.slice(1, 3);
  const bottomItems = articles.slice(3, 6);

  if (!featured) return <SectionFallback title={section.title} path={section.path} />;

  return (
    <section className="hcs-section">
      <SectionHeader title={section.title} path={section.path} />
      <div className="hcs-spotlight">
        <StoryLink article={featured} className="hcs-spotlight-main">
            <ArticleThumb article={featured} alt={getArticleTitle(featured)} className="hcs-spotlight-main-image" />
          <div className="hcs-spotlight-main-copy">
            <span className="hcs-kicker">Featured</span>
            <h3 className="hcs-featured-title">{getArticleTitle(featured)}</h3>
            <p className="hcs-summary">{getArticleSummary(featured)}</p>
            <span className="hcs-meta">{formatDate(getArticleDateValue(featured))}</span>
          </div>
        </StoryLink>

        <div className="hcs-spotlight-side">
          {sideItems.map((article) => (
            <StoryLink key={article.id || article.slug} article={article} className="hcs-side-card">
              <ArticleThumb article={article} alt={getArticleTitle(article)} className="hcs-side-thumb" />
              <div className="hcs-side-copy">
                <span className="hcs-kicker">{getCategoryLabel(article, section.title)}</span>
                <h4 className="hcs-side-title">{getArticleTitle(article)}</h4>
                <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
              </div>
            </StoryLink>
          ))}
        </div>
      </div>

      <div className="hcs-bottom-rail">
        {bottomItems.map((article) => (
          <StoryLink key={article.id || article.slug} article={article} className="hcs-bottom-rail-card">
            <ArticleThumb article={article} alt={getArticleTitle(article)} className="hcs-bottom-rail-thumb" />
            <div className="hcs-bottom-rail-copy">
              <h4 className="hcs-side-title">{getArticleTitle(article)}</h4>
              <span className="hcs-meta">{formatDate(getArticleDateValue(article))}</span>
            </div>
          </StoryLink>
        ))}
      </div>
    </section>
  );
}

function CategorySection({ section, articles }) {
  switch (section.variant) {
    case "editorial":
      return <EditorialSection section={section} articles={articles} />;
    case "scoreline":
      return <ScorelineSection section={section} articles={articles} />;
    case "mosaic":
      return <MosaicSection section={section} articles={articles} />;
    case "spotlight":
      return <SpotlightSection section={section} articles={articles} />;
    default:
      return <CardsSection section={section} articles={articles} />;
  }
}

export default function HomeCategorySections() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const is4K = useIs4K();

  useEffect(() => {
    let ignore = false;

    async function loadSections() {
      const categorySections = await fetchCategories();
        const results = await Promise.all(
        categorySections.map(async (section) => {
          const response = await fetchCategoryArticles(section);
          return {
            ...section,
            matchedSlug: response.matchedSlug,
            articles: response.articles,
          };
        })
      );

      if (ignore) return;
      setSections(results.filter((section) => section.articles.length > 0));
      setLoading(false);
    }

    loadSections();

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={`hcs-root${is4K ? " hcs-root-4k" : ""}`}>
        <section className="hcs-section">
          <div className="hcs-empty">Loading homepage categories...</div>
        </section>
      </div>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={`hcs-root${is4K ? " hcs-root-4k" : ""}`}>
      {sections.map((section) => (
        <CategorySection key={section.key} section={section} articles={section.articles} />
      ))}
    </div>
  );
}
