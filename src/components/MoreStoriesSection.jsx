import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./MoreStoriesSection.css";
import { API_BASE, fetchArticles } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const CATEGORY_API = `${API_BASE}/categories/`;

const HOME_VISIBLE_SECTIONS = [
  { slugs: ["world-news", "worldnews"], visibleCount: 5 },
  { slugs: ["sports", "sport"], visibleCount: 5 },
  { slugs: ["entertainment", "entertainmnet"], visibleCount: 5 },
  { slugs: ["technology"], visibleCount: 4 },
  { slugs: ["automobile", "auto"], visibleCount: 6 },
  { slugs: ["health"], visibleCount: 4 },
  { slugs: ["ai", "artificial-intelligence"], visibleCount: 5 },
  { slugs: ["bharat-explainers"], visibleCount: 7 },
  { slugs: ["bharat-in-numbers"], visibleCount: 5 },
];

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
const getArticleIdentityKeys = (article) => {
  const keys = [];
  const id = String(article?.id || "").trim();
  const slug = String(article?.slug || "").trim().toLowerCase();
  if (id) keys.push(`id:${id}`);
  if (slug) keys.push(`slug:${slug}`);
  return keys;
};

const getArticleCategorySlugs = (article) => {
  const slugs = [];
  const addSlug = (value) => {
    const slug = String(value || "").trim().toLowerCase();
    if (slug) slugs.push(slug);
  };

  if (Array.isArray(article?.category_details)) {
    article.category_details.forEach((cat) => addSlug(cat?.slug));
  }

  if (Array.isArray(article?.__mssCategorySlugs)) {
    article.__mssCategorySlugs.forEach(addSlug);
  }

  if (typeof article?.category === "string") {
    addSlug(article.category);
  } else if (article?.category && typeof article.category === "object") {
    addSlug(article.category.slug);
  }

  if (Array.isArray(article?.categories)) {
    article.categories.forEach((cat) => {
      if (cat && typeof cat === "object") addSlug(cat.slug);
    });
  }

  return [...new Set(slugs)];
};

const doesArticleMatchSlugs = (article, sectionSlugs) => {
  const articleSlugs = getArticleCategorySlugs(article);
  return sectionSlugs.some((slug) => articleSlugs.includes(slug));
};

const getHomeVisibleArticleKeys = (articles) => {
  const visibleKeys = new Set();

  HOME_VISIBLE_SECTIONS.forEach((section) => {
    articles
      .filter((article) => doesArticleMatchSlugs(article, section.slugs))
      .slice(0, section.visibleCount)
      .forEach((article) => {
        getArticleIdentityKeys(article).forEach((key) => visibleKeys.add(key));
      });
  });

  return visibleKeys;
};

const hasAnyArticleKey = (article, keySet) =>
  getArticleIdentityKeys(article).some((key) => keySet.has(key));

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

const mergeArticleIntoMap = (articleMap, article, categorySlug = "") => {
  const keys = getArticleIdentityKeys(article);
  const primaryKey = keys[0];
  if (!primaryKey) return;

  const existing = articleMap.get(primaryKey);
  const categorySlugs = new Set([
    ...(existing?.__mssCategorySlugs || []),
    ...(article?.__mssCategorySlugs || []),
  ]);
  const normalizedCategorySlug = String(categorySlug || "").trim().toLowerCase();
  if (normalizedCategorySlug) categorySlugs.add(normalizedCategorySlug);

  articleMap.set(primaryKey, {
    ...(existing || {}),
    ...article,
    __mssCategorySlugs: [...categorySlugs],
  });
};

const fetchCategories = async () => {
  const response = await fetch(CATEGORY_API);
  if (!response.ok) throw new Error("Failed to fetch categories");
  const data = await response.json();
  return Array.isArray(data) ? data : data?.results || [];
};

const fetchCategoryArticles = async (slug) => {
  const response = await fetch(`${API_BASE}/articles/?category=${encodeURIComponent(slug)}&limit=200`);
  if (!response.ok) return [];
  const data = await response.json();
  return normalizeArticles(data);
};

const fetchMergedArticles = async () => {
  const articleMap = new Map();
  const baseArticles = normalizeArticles(await fetchArticles());
  baseArticles.forEach((article) => mergeArticleIntoMap(articleMap, article));

  try {
    const categories = await fetchCategories();
    const categoryResults = await Promise.all(
      categories
        .map((category) => String(category?.slug || "").trim().toLowerCase())
        .filter(Boolean)
        .map(async (slug) => ({
          slug,
          articles: await fetchCategoryArticles(slug),
        }))
    );

    categoryResults.forEach(({ slug, articles }) => {
      articles.forEach((article) => mergeArticleIntoMap(articleMap, article, slug));
    });
  } catch {
    return baseArticles;
  }

  return normalizeArticles([...articleMap.values()]);
};

function StoryCard({ article }) {
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

  const articlePath = getArticlePath(article);

  if (!articlePath) {
    return <article className="mss-card">{content}</article>;
  }

  return (
    <Link to={articlePath} className="mss-card">
      {content}
    </Link>
  );
}

export default function MoreStoriesSection({ articles: passedArticles = [] }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const is4K = useIs4K();

  useEffect(() => {
    let ignore = false;

    async function loadArticles() {
      try {
        const localArticles = normalizeArticles(passedArticles);
        const fetchedArticles = await fetchMergedArticles();
        const sourceArticles = fetchedArticles.length > localArticles.length ? fetchedArticles : localArticles;
        const homeVisibleKeys = getHomeVisibleArticleKeys(sourceArticles);

        if (!ignore) {
          setArticles(sourceArticles.filter((article) => !hasAnyArticleKey(article, homeVisibleKeys)));
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
  }, [passedArticles]);

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
