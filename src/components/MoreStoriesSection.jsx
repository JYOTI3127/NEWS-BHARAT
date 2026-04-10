import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./MoreStoriesSection.css";
import { API_BASE } from "../lib/api";
const CATEGORY_API = `${API_BASE}/categories/`;

const FEATURED_HOME_SLUGS = new Set([
  "world-news",
  "worldnews",
  "sports",
  "sport",
  "entertainment",
  "entertainmnet",
  "technology",
  "automobile",
  "auto",
  "health",
  "ai",
  "artificial-intelligence",
]);

const EXISTING_HOME_SLUGS = new Set([
  "60-second-read",
  "bharat-economy",
  "bharat-explainers",
  "bharat-opinions",
  "bharat-in-numbers",
  "bharats-startups",
  "bharat-startups",
  "states-of-bharat",
  "state-of-bharat",
]);

const ARTICLES_PER_CATEGORY = 2;
const MAX_TOTAL_ARTICLES = 18;

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

const normalizeArticles = (data) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  return list
    .filter((item) => item && (item.title || item.headline))
    .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));
};

const getArticleTitle = (article) => article?.title || article?.headline || "Untitled";
const getArticleSummary = (article) =>
  article?.subtitle || article?.description || article?.summary || article?.excerpt || "";
const getArticleImage = (article) => article?.image_url || article?.image || "";
const getEligibleCategoryDetails = (article) => {
  const details = Array.isArray(article?.category_details) ? article.category_details : [];
  return details.filter((cat) => {
    const slug = String(cat?.slug || "").toLowerCase();
    return slug && !FEATURED_HOME_SLUGS.has(slug) && !EXISTING_HOME_SLUGS.has(slug);
  });
};

const getArticleCategory = (article) => getEligibleCategoryDetails(article)[0]?.name || "Latest";
const getPrimaryCategorySlug = (article) =>
  String(getEligibleCategoryDetails(article)[0]?.slug || "").toLowerCase();

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

const isExcludedArticle = (article) => {
  return getEligibleCategoryDetails(article).length === 0;
};

async function fetchCategories() {
  try {
    const res = await fetch(CATEGORY_API);
    if (!res.ok) throw new Error("Failed to fetch categories");
    const data = await res.json();
    const categories = Array.isArray(data) ? data : data?.results || [];

    return categories.filter((category) => {
      const slug = String(category?.slug || "").toLowerCase();
      const status = String(category?.status || "").toLowerCase();
      return (
        slug &&
        !FEATURED_HOME_SLUGS.has(slug) &&
        !EXISTING_HOME_SLUGS.has(slug) &&
        (status === "" || status === "active")
      );
    });
  } catch {
    return [];
  }
}

async function fetchArticlesForCategory(category) {
  const slug = category?.slug;
  if (!slug) return [];

  try {
    const res = await fetch(`${API_BASE}/articles/?category=${encodeURIComponent(slug)}&limit=${ARTICLES_PER_CATEGORY}`);
    if (!res.ok) return [];
    const data = await res.json();
    return normalizeArticles(data).filter((article) => !isExcludedArticle(article));
  } catch {
    return [];
  }
}

async function fetchAllArticles() {
  try {
    const res = await fetch(`${API_BASE}/articles/`);
    if (!res.ok) throw new Error("Failed to fetch all articles");
    const data = await res.json();
    return normalizeArticles(data);
  } catch {
    return [];
  }
}

function StoryCard({ article }) {
  const slug = article?.slug;
  const image = getArticleImage(article);
  const content = (
    <>
      <div className="mss-thumb-wrap">
        {image ? (
          <img
            src={image}
            alt={getArticleTitle(article)}
            className="mss-thumb"
            loading="lazy"
            decoding="async"
            width={480}
            height={240}
          />
        ) : (
          <div className="mss-thumb mss-thumb-fallback">No Image</div>
        )}
      </div>
      <div className="mss-copy">
        <h3 className="mss-title">{getArticleTitle(article)}</h3>
        <p className="mss-summary">{getArticleSummary(article)}</p>
        <span className="mss-meta">{formatDate(getArticleDateValue(article))}</span>
      </div>
    </>
  );

  if (!slug) {
    return <article className="mss-card">{content}</article>;
  }

  return (
    <Link to={`/article/${slug}/`} className="mss-card">
      {content}
    </Link>
  );
}

export default function MoreStoriesSection() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const is4K = useIs4K();

  useEffect(() => {
    let ignore = false;

    async function loadArticles() {
      try {
        const categories = await fetchCategories();
        const allArticles = await fetchAllArticles();
        const categoryResults = await Promise.all(
          categories.map(async (category) => ({
            slug: category.slug,
            articles: await fetchArticlesForCategory(category),
          }))
        );

        const uniqueArticles = [];
        const seen = new Set();
        const representedCategorySlugs = new Set();

        categoryResults.forEach((entry) => {
          entry.articles.forEach((article) => {
            const key = article?.id || article?.slug;
            if (!key || seen.has(key)) return;
            seen.add(key);
            uniqueArticles.push(article);
            const primarySlug = getPrimaryCategorySlug(article);
            if (primarySlug) {
              representedCategorySlugs.add(primarySlug);
            }
          });
        });

        const groupedFallbackArticles = new Map();

        allArticles.forEach((article) => {
          const primarySlug = getPrimaryCategorySlug(article);
          const key = article?.id || article?.slug;
          if (!primarySlug || !key || seen.has(key)) return;

          const currentGroup = groupedFallbackArticles.get(primarySlug) || [];
          if (currentGroup.length < ARTICLES_PER_CATEGORY) {
            currentGroup.push(article);
            groupedFallbackArticles.set(primarySlug, currentGroup);
          }
        });

        groupedFallbackArticles.forEach((items, slug) => {
          if (representedCategorySlugs.has(slug)) return;

          items.forEach((article) => {
            const key = article?.id || article?.slug;
            if (!key || seen.has(key)) return;
            seen.add(key);
            uniqueArticles.push(article);
          });
        });

        const filtered = uniqueArticles
          .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0))
          .slice(0, MAX_TOTAL_ARTICLES);

        const recentFallback = allArticles
          .filter((article) => article && (article.id || article.slug))
          .slice(0, MAX_TOTAL_ARTICLES);

        if (!ignore) {
          setArticles(filtered.length > 0 ? filtered : recentFallback);
        }
      } catch {
        if (!ignore) {
          setArticles([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadArticles();

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <section className={`mss-root${is4K ? " mss-root-4k" : ""}`}>
        <div className="mss-shell">
          <div className="mss-empty">Loading more stories...</div>
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className={`mss-root${is4K ? " mss-root-4k" : ""}`}>
      <div className="mss-shell">
        <div className="mss-header">
          <div className="mss-header-left">
            <span className="mss-header-bar" />
            <h2 className="mss-header-title">More Stories</h2>
          </div>
        </div>

        <div className="mss-grid">
          {articles.map((article) => (
            <StoryCard key={article.id || article.slug} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
