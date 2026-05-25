import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getArticlePath } from "../lib/articleUrl";
import {
  getArticleAuthorName,
  getArticleDateLabel,
  getArticleReadTime,
  getArticleSummary,
} from "../lib/articlePresentation";

const preferredTokens = [
  "explainer",
  "opinion",
  "bharat-2047",
  "governance",
  "economy",
  "business",
  "policy",
];

const getCategoryLabel = (article) => {
  const details = Array.isArray(article?.category_details)
    ? article.category_details
    : article?.category_details
      ? [article.category_details]
      : [];
  const value =
    details[0]?.name ||
    article?.category?.name ||
    article?.category_name ||
    article?.category_slug ||
    "Editor's Pick";
  return String(value).replace(/[-_]+/g, " ").trim().toUpperCase();
};

const getSearchText = (article) =>
  [
    article?.title,
    article?.headline,
    article?.slug,
    article?.category_slug,
    article?.primary_category_slug,
    article?.focus_keyword,
    ...(Array.isArray(article?.category_details) ? article.category_details.map((item) => `${item?.name || ""} ${item?.slug || ""}`) : []),
  ]
    .join(" ")
    .toLowerCase();

export default function EditorsPicksSection({ articles = [] }) {
  const picks = useMemo(() => {
    const source = Array.isArray(articles) ? articles.filter(Boolean) : [];
    const curated = source.filter((article) =>
      preferredTokens.some((token) => getSearchText(article).includes(token))
    );
    return (curated.length > 0 ? curated : source).slice(0, 4);
  }, [articles]);

  if (picks.length === 0) return null;

  return (
    <section className="editors-picks" aria-labelledby="editors-picks-title">
      <div className="editors-picks__header">
        <div>
          <span className="editors-picks__eyebrow">Curated by News4Bharat</span>
          <h2 id="editors-picks-title">Editor&apos;s Picks</h2>
        </div>
        <Link to="/category/bharat-explainers" className="editors-picks__link">
          View Explainers
        </Link>
      </div>

      <div className="editors-picks__grid">
        {picks.map((article, index) => {
          const path = getArticlePath(article);
          const image = article?.image_url || article?.image || "";
          const title = article?.title || article?.headline || "News4Bharat story";
          const card = (
            <>
              <div className="editors-picks__image-wrap">
                {image ? (
                  <img src={image} alt={title} className="editors-picks__image" loading="lazy" decoding="async" />
                ) : (
                  <div className="editors-picks__fallback">News4Bharat</div>
                )}
                <span className="editors-picks__tag">{getCategoryLabel(article)}</span>
              </div>
              <div className="editors-picks__body">
                <h3>{title}</h3>
                <p>{getArticleSummary(article, 118)}</p>
                <div className="editors-picks__meta">
                  <span>By {getArticleAuthorName(article)}</span>
                  <span>{getArticleReadTime(article)}</span>
                  {getArticleDateLabel(article, { compact: true }) ? (
                    <span>Updated {getArticleDateLabel(article, { compact: true })}</span>
                  ) : null}
                </div>
              </div>
            </>
          );

          return path ? (
            <Link key={article?.id || article?.slug || index} to={path} className="editors-picks__card">
              {card}
            </Link>
          ) : (
            <article key={article?.id || article?.slug || index} className="editors-picks__card">
              {card}
            </article>
          );
        })}
      </div>
    </section>
  );
}
