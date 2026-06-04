import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Newspaper } from "lucide-react";
import AdvertisementSlot from "../components/AdvertisementSlot";
import {
  fetchCategories,
  fetchPaginatedArticles,
  formatArticleDateTimeIST,
  getArticleDateValue,
} from "../lib/api";
import { getArticlePath, isArticlePath } from "../lib/articleUrl";

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

const getArticleImage = (article) => {
  const candidates = [article?.image_url, article?.image];
  return candidates.find((value) => typeof value === "string" && value.trim().length > 0) || "";
};

const getArticleTitle = (article) => String(article?.title || article?.headline || "Untitled").trim();

const getArticleSummary = (article) =>
  String(article?.subtitle || article?.description || article?.summary || article?.excerpt || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const toLooseCategoryToken = (value) =>
  normalizeSlug(value)
    .replace(/-news$/i, "")
    .replace(/^news-/i, "")
    .replace(/-category$/i, "")
    .trim();

const getCategoryLabel = (category) =>
  String(category?.name || category?.title || category?.label || category?.slug || "")
    .replace(/[-_]+/g, " ")
    .trim();

const getCategorySlug = (category) =>
  normalizeSlug(category?.slug || category?.category_slug || category?.id || getCategoryLabel(category));

const getArticleCategorySlugs = (article) => {
  const slugs = new Set();
  const add = (value) => {
    const slug = normalizeSlug(value);
    if (slug) slugs.add(slug);
  };

  add(article?.category_slug);
  add(article?.primary_category_slug);

  if (article?.category && typeof article.category === "object") {
    add(article.category.slug);
    add(article.category.category_slug);
    add(article.category.name);
  } else if (typeof article?.category === "string") {
    add(article.category);
  }

  if (Array.isArray(article?.category_details)) {
    article.category_details.forEach((category) => {
      add(category?.slug);
      add(category?.category_slug);
      add(category?.name);
    });
  }

  if (Array.isArray(article?.categories)) {
    article.categories.forEach((category) => {
      if (category && typeof category === "object") {
        add(category.slug);
        add(category.category_slug);
        add(category.name);
      } else {
        add(category);
      }
    });
  }

  return [...slugs];
};

const formatDateTimeDisplay = (value) =>
  String(formatArticleDateTimeIST(value) || "")
    .replace(/\s+at\s+/gi, " - ")
    .trim();

const normalizeArticles = (articles) =>
  (Array.isArray(articles) ? articles : [])
    .filter((article) => article && (article.title || article.headline))
    .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));

const normalizeCategories = (categories) => {
  const groupedByName = new Map();

  (Array.isArray(categories) ? categories : []).forEach((category) => {
    const slug = getCategorySlug(category);
    const name = getCategoryLabel(category);
    if (!slug || !name) return;

    const normalizedName = normalizeSlug(name);
    const existing = groupedByName.get(normalizedName);
    if (!existing) {
      groupedByName.set(normalizedName, {
        slug,
        name,
        aliases: [slug, normalizedName],
      });
      return;
    }

    const aliases = new Set([...(existing.aliases || []), slug, normalizedName]);
    groupedByName.set(normalizedName, {
      ...existing,
      aliases: [...aliases],
    });
  });

  return [...groupedByName.values()].sort((a, b) => a.name.localeCompare(b.name, "en-IN"));
};

export default function MoreArticlesPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["more-articles-categories"],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ["more-articles-list"],
    queryFn: () => fetchPaginatedArticles({ limit: 100, maxPages: 10, full: true }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const categories = useMemo(() => normalizeCategories(categoriesData), [categoriesData]);
  const allArticles = useMemo(() => normalizeArticles(articlesData), [articlesData]);

  const visibleArticles = useMemo(() => {
    if (activeCategory === "all") return allArticles;
    const selectedCategory = categories.find((category) => category.slug === activeCategory);
    const categoryAliases = [
      activeCategory,
      normalizeSlug(selectedCategory?.name || ""),
      ...(selectedCategory?.aliases || []),
    ].filter(Boolean);
    const strictAliasSet = new Set(categoryAliases.map(normalizeSlug).filter(Boolean));
    const looseAliasSet = new Set(categoryAliases.map(toLooseCategoryToken).filter(Boolean));

    return allArticles.filter((article) => {
      const articleTokens = getArticleCategorySlugs(article);
      if (articleTokens.length === 0) return false;

      const normalizedArticleTokens = articleTokens.map(normalizeSlug).filter(Boolean);
      const looseArticleTokens = normalizedArticleTokens.map(toLooseCategoryToken).filter(Boolean);

      const hasStrictMatch = normalizedArticleTokens.some((token) => strictAliasSet.has(token));
      if (hasStrictMatch) return true;

      const hasLooseMatch = looseArticleTokens.some((token) => looseAliasSet.has(token));
      if (hasLooseMatch) return true;

      return normalizedArticleTokens.some((token) =>
        [...strictAliasSet].some((alias) => token.includes(alias) || alias.includes(token))
      );
    });
  }, [activeCategory, allArticles, categories]);

  const isLoading = categoriesLoading || articlesLoading;

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

      <div className="category-page-align mx-auto w-full px-4 pb-10 pt-[72px] sm:px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 no-underline transition-colors hover:text-red-600 hover:no-underline sm:mb-6"
          style={{ textDecoration: "none" }}
        >
          <ArrowLeft size={13} /> Back to Home
        </Link>

        <div className="rounded-2xl border border-[#e8e1d8] bg-white p-4 shadow-sm sm:p-6 lg:p-7">
          <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111] sm:text-[28px]">
                More Articles
              </h1>
              <p className="mt-1 text-sm text-[#5b5b5b] sm:text-[15px]">
                Browse all categories and all published articles.
              </p>
            </div>
            <div className="text-xs font-medium text-[#777] sm:text-sm">
              {visibleArticles.length} article{visibleArticles.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mb-5">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#7a6a57] sm:text-sm">
              All Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  activeCategory === "all"
                    ? "border-[#D80100] bg-[#D80100] text-white"
                    : "border-[#dfd6cc] bg-[#faf8f4] text-[#4a423b] hover:border-[#D80100]/60 hover:text-[#D80100]"
                }`}
              >
                All
              </button>

              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setActiveCategory(category.slug)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                    activeCategory === category.slug
                      ? "border-[#D80100] bg-[#D80100] text-white"
                      : "border-[#dfd6cc] bg-[#faf8f4] text-[#4a423b] hover:border-[#D80100]/60 hover:text-[#D80100]"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="flex min-h-[220px] items-center justify-center text-sm font-medium text-[#777]">
              Loading articles...
            </div>
          )}

          {!isLoading && visibleArticles.length === 0 && (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center text-[#787878]">
              <Newspaper size={28} />
              <p className="text-sm sm:text-base">No articles found for this category.</p>
            </div>
          )}

          {!isLoading && visibleArticles.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleArticles.map((article, index) => {
                const image = getArticleImage(article);
                const href = getArticleHref(article);
                const categorySlug = getArticleCategorySlugs(article)[0] || "";
                const content = (
                  <article className="group h-full overflow-hidden rounded-xl border border-[#e6ddd3] bg-[#fcfaf7] transition hover:border-[#d6c7b5] hover:shadow-md">
                    <div className="aspect-[16/9] w-full overflow-hidden bg-[#ece7e0]">
                      {image ? (
                        <img
                          src={image}
                          alt={getArticleTitle(article)}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                          decoding="async"
                          width={640}
                          height={360}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#a4a4a4]">
                          <Newspaper size={26} />
                        </div>
                      )}
                    </div>
                    <div className="p-3.5 sm:p-4">
                      {categorySlug && (
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#D80100] sm:text-[11px]">
                          {categorySlug.replace(/-/g, " ")}
                        </p>
                      )}
                      <h3 className="line-clamp-3 text-[15px] font-bold leading-[1.35] text-[#161616] sm:text-[16px]">
                        {getArticleTitle(article)}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-[13px] leading-[1.5] text-[#5f5f5f]">
                        {getArticleSummary(article)}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#7f7f7f] sm:text-xs">
                        <Clock size={12} />
                        {formatDateTimeDisplay(getArticleDateValue(article))}
                      </span>
                    </div>
                  </article>
                );

                if (!href) {
                  return <div key={article.id || article.slug || index}>{content}</div>;
                }

                return (
                  <Link
                    key={article.id || article.slug || index}
                    to={href}
                    className="block h-full no-underline hover:no-underline"
                    style={{ textDecoration: "none" }}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
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
