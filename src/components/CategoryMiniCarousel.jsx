import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchPaginatedArticles,
  formatArticleDateTimeIST,
  getArticleDateValue,
} from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";
import AdvertisementSlot from "./AdvertisementSlot";
const PRERENDER_UA_PATTERN = /HeadlessChrome|prerender/i;

const getArticleImage = (article) => article?.image_url || article?.image || "";
const getArticleTitle = (article) => article?.title || article?.headline || "Untitled";

const normalizeArticles = (data) => {
  return data
    .filter((item) => item && getArticleTitle(item))
    .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));
};

const getCategorySlugsFromArticle = (article) => {
  const details = Array.isArray(article?.category_details) ? article.category_details : [];
  const detailSlugs = details
    .map((item) => String(item?.slug || "").trim().toLowerCase())
    .filter(Boolean);
  const slugs = [
    ...detailSlugs,
    article?.category,
    article?.category_slug,
    article?.primary_category_slug,
    article?.primary_category?.slug,
    article?.primary_category?.name,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(slugs)];
};

const isPrerenderUserAgent = () => {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator?.userAgent || "";
  return PRERENDER_UA_PATTERN.test(userAgent);
};

const useCardsPerPage = () => {
  const getValue = () => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth <= 425) return 1;
    if (window.innerWidth <= 1199) return 2;
    return 3;
  };

  const [cardsPerPage, setCardsPerPage] = useState(getValue);

  useEffect(() => {
    const onResize = () => setCardsPerPage(getValue());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return cardsPerPage;
};

export default function CategoryMiniCarousel({
  title,
  slugs,
  categoryPath,
  adPlacement,
  adPage = "home",
  articles: passedArticles = [],
}) {
  const navigate = useNavigate();
  const cardsPerPage = useCardsPerPage();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const cardRowRef = useRef(null);
  const [cardRowHeight, setCardRowHeight] = useState(0);

  const slugList = useMemo(
    () => (Array.isArray(slugs) ? slugs.filter(Boolean) : [slugs].filter(Boolean)),
    [slugs]
  );
  const seededArticles = useMemo(() => {
    if (!Array.isArray(passedArticles) || passedArticles.length === 0 || slugList.length === 0) return [];
    const slugSet = new Set(slugList.map((slug) => String(slug).trim().toLowerCase()));
    return normalizeArticles(
      passedArticles.filter((article) =>
        getCategorySlugsFromArticle(article).some((slug) => slugSet.has(slug))
      )
    );
  }, [passedArticles, slugList]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (seededArticles.length > 0) {
        setArticles(seededArticles);
        setLoading(false);
        if (isPrerenderUserAgent()) return;
      } else {
        setLoading(true);
        setArticles([]);
      }

      if (seededArticles.length === 0) {
        setLoading(true);
      }

      for (const slug of slugList) {
        try {
          const data = await fetchPaginatedArticles({ category: slug, limit: 10 });
          const nextArticles = normalizeArticles(data);
          if (nextArticles.length > 0) {
            if (!ignore) setArticles(nextArticles);
            break;
          }
        } catch {
          // Try the next possible slug.
        }
      }

      if (!ignore) setLoading(false);
    };

    load();
    return () => {
      ignore = true;
    };
  }, [seededArticles, slugList]);

  const totalPages = Math.max(1, Math.ceil(articles.length / cardsPerPage));
  const safePage = page % totalPages;
  const dotCount = Math.min(totalPages, 5);
  const visibleArticles = articles.slice(
    safePage * cardsPerPage,
    safePage * cardsPerPage + cardsPerPage
  );

  const goPrev = () => setPage((current) => (current - 1 + totalPages) % totalPages);
  const goNext = () => setPage((current) => (current + 1) % totalPages);

  useEffect(() => {
    const rowElement = cardRowRef.current;
    if (!rowElement || typeof window === "undefined") return undefined;

    const updateCardRowHeight = () => {
      setCardRowHeight(Math.ceil(rowElement.getBoundingClientRect().height || 0));
    };

    const initialFrame = window.requestAnimationFrame(updateCardRowHeight);
    window.addEventListener("resize", updateCardRowHeight);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateCardRowHeight);
      observer.observe(rowElement);
      return () => {
        window.cancelAnimationFrame(initialFrame);
        observer.disconnect();
        window.removeEventListener("resize", updateCardRowHeight);
      };
    }

    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.removeEventListener("resize", updateCardRowHeight);
    };
  }, [cardsPerPage, loading, visibleArticles.length]);

  return (
    <section className="cmc-root" aria-label={title}>
      <div className="cmc-shell">
        <div className="cmc-content">
          <div className="cmc-header">
            <div className="cmc-title-wrap">
              <div className="cmc-title-bar" />
              <h2 className="cmc-title">{title}</h2>
            </div>
            <button
              className="cmc-read-more"
              type="button"
              onClick={() => navigate(categoryPath || `/category/${slugList[0] || ""}`)}
            >
              Read More
            </button>
          </div>

          <div className="cmc-card-row" ref={cardRowRef}>
            {loading
              ? Array.from({ length: cardsPerPage }).map((_, index) => (
                  <div className="cmc-card cmc-card--skeleton" key={index}>
                    <div className="cmc-image-skeleton" />
                    <div className="cmc-line cmc-line--wide" />
                    <div className="cmc-line" />
                  </div>
                ))
              : visibleArticles.length === 0
                ? <div className="cmc-empty">No articles yet</div>
                : visibleArticles.map((article, index) => (
                    <Link
                      className="cmc-card"
                      key={article.id || article.slug || index}
                      to={getArticlePath(article) || categoryPath || `/category/${slugList[0] || ""}`}
                    >
                      <div className="cmc-image-wrap">
                        {getArticleImage(article) ? (
                          <img
                            src={getArticleImage(article)}
                            alt={getArticleTitle(article)}
                            loading={index === 0 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        ) : (
                          <div className="cmc-no-image">No Image</div>
                        )}
                      </div>
                      <h3 className="cmc-card-title">{getArticleTitle(article)}</h3>
                      {formatArticleDateTimeIST(article) ? (
                        <div className="cmc-card-date">{formatArticleDateTimeIST(article)}</div>
                      ) : null}
                    </Link>
                  ))}
          </div>

          <div className="cmc-controls">
            <div className="cmc-dots" aria-hidden="true">
              {Array.from({ length: dotCount }).map((_, index) => (
                <span
                  key={index}
                  className={`cmc-dot${index === safePage % dotCount ? " active" : ""}`}
                />
              ))}
            </div>
            <div className="cmc-arrows">
              <button type="button" className="cmc-arrow" onClick={goPrev} aria-label={`Previous ${title}`}>
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                  <path d="M14 4L7 11L14 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className="cmc-arrow" onClick={goNext} aria-label={`Next ${title}`}>
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                  <path d="M8 4L15 11L8 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div
          className="cmc-ad-column"
          aria-label={`${title} advertisement space`}
          style={cardRowHeight > 0 ? { "--cmc-card-row-height": `${cardRowHeight}px` } : undefined}
        >
          {adPlacement ? (
            <AdvertisementSlot
              page={adPage}
              placement={adPlacement}
              variant="mediumRectangle"
              className="cmc-section-ad"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
