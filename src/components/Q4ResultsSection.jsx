import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, Newspaper } from "lucide-react";
import { formatArticleDateTimeIST } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const Q4_RESULTS_PATH = "/category/business";

const getArticleTitle = (article) =>
  String(article?.title || article?.headline || "").trim();

const getArticleImage = (article) => article?.image_url || article?.image || "";

const getArticleDateValue = (article) =>
  article?.published_at ||
  article?.created_at ||
  article?.updated_at ||
  article?.date ||
  "";

const getArticleTags = (article) => {
  const tokens = [];
  const pushCsv = (value) => {
    if (!value) return;
    String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => tokens.push(item));
  };

  if (Array.isArray(article?.tags_list)) {
    article.tags_list
      .map((item) => (typeof item === "string" ? item : item?.name || ""))
      .map((item) => String(item).trim())
      .filter(Boolean)
      .forEach((item) => tokens.push(item));
  }

  pushCsv(article?.tags);
  pushCsv(article?.focus_keyword);
  pushCsv(article?.secondary_keywords);

  return tokens;
};

const isQ4ResultArticle = (article) => {
  const haystack = [
    article?.title,
    article?.headline,
    article?.subtitle,
    article?.meta_title,
    article?.meta_description,
    ...getArticleTags(article),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasQ4Token = /\bq[\s-]?4\b|\bfourth quarter\b/.test(haystack);
  const hasResultsToken = /\bresult\b|\bresults\b|\bearnings\b|\bprofit\b/.test(haystack);

  return hasQ4Token && hasResultsToken;
};

const dedupeArticles = (articles) => {
  const seen = new Set();
  return articles.filter((article) => {
    const key = String(article?.id || article?.slug || getArticleTitle(article)).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortByNewest = (articles) =>
  [...articles].sort(
    (a, b) =>
      new Date(getArticleDateValue(b) || 0).getTime() -
      new Date(getArticleDateValue(a) || 0).getTime()
  );

const StoryCard = memo(function StoryCard({ article }) {
  const path = getArticlePath(article);
  const Wrapper = path ? Link : "article";
  const wrapperProps = path ? { to: path } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      style={{ textDecoration: "none" }}
    >
      <div className="h-44 w-full overflow-hidden bg-slate-100">
        {getArticleImage(article) ? (
          <img
            src={getArticleImage(article)}
            alt={getArticleTitle(article) || "Article image"}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <Newspaper size={28} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.3] text-slate-900">
          {getArticleTitle(article)}
        </h3>
        <p className="mt-2 flex items-center gap-1 text-[12px] text-slate-500">
          <Clock size={12} />
          {formatArticleDateTimeIST(article)}
        </p>
      </div>
    </Wrapper>
  );
});

export default function Q4ResultsSection({ articles = [] }) {
  const sectionArticles = useMemo(() => {
    const normalized = Array.isArray(articles) ? articles : [];
    const q4Only = normalized.filter(isQ4ResultArticle);
    return dedupeArticles(sortByNewest(q4Only)).slice(0, 8);
  }, [articles]);

  if (sectionArticles.length === 0) return null;

  return (
    <section
      className="mx-auto my-8 w-[min(1240px,calc(100%-48px))] font-[Poppins,sans-serif] max-[425px]:w-[calc(100%-32px)]"
      aria-labelledby="q4-results-heading"
    >
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">
            Corporate Tracker
          </p>
          <h2 id="q4-results-heading" className="text-[28px] font-extrabold leading-none text-slate-900 max-[425px]:text-[22px]">
            Q4 Results
          </h2>
        </div>
        <Link
          to={Q4_RESULTS_PATH}
          className="text-[13px] font-semibold text-red-600 transition-colors hover:text-red-700"
          style={{ textDecoration: "none" }}
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {sectionArticles.map((article) => (
          <StoryCard
            key={article?.id || article?.slug || getArticleTitle(article)}
            article={article}
          />
        ))}
      </div>
    </section>
  );
}
