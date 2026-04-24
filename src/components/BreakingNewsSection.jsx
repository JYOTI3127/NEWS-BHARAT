import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getArticlePath } from '../lib/articleUrl';

const BREAKING_NEWS_PATH = '/category/breaking-news';

const getArticleDateValue = (article) =>
  article?.published_at ||
  article?.created_at ||
  article?.updated_at ||
  article?.date ||
  article?.publishedOn ||
  article?.published_date ||
  article?.publish_date ||
  article?.post_date ||
  '';

const formatArticleDate = (article) => {
  const value = getArticleDateValue(article);
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const datePart = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timePart = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${datePart} | ${timePart}`.replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());
};

const normalizeArticles = (articles) => {
  const list = Array.isArray(articles) ? articles : articles?.results || [];

  return list
    .filter((article) => article && (article.title || article.headline))
    .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));
};

const getArticleImage = (article) => article?.image_url || article?.image || '';
const getArticleTitle = (article) => article?.title || article?.headline || 'Untitled';

const isBreakingArticle = (article) => {
  const categoryDetails = Array.isArray(article?.category_details) ? article.category_details : [];

  if (
    categoryDetails.some((category) => {
      const slug = String(category?.slug || '').toLowerCase();
      const name = String(category?.name || '').toLowerCase();
      return slug === 'breaking-news' || name.includes('breaking');
    })
  ) {
    return true;
  }

  return String(article?.category || '').toLowerCase().includes('breaking');
};

const dedupeArticles = (articles) => {
  const seen = new Set();

  return articles.filter((article) => {
    const key = article?.id || article?.slug || getArticleTitle(article);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const StoryCard = memo(function StoryCard({ article, className, children }) {
  const path = getArticlePath(article);

  if (!path) {
    return <article className={className}>{children}</article>;
  }

  return (
    <Link to={path} className={`breaking-news-link ${className}`} style={{ textDecoration: 'none' }}>
      {children}
    </Link>
  );
});

const StoryImage = memo(function StoryImage({ article, className, alt }) {
  const src = getArticleImage(article);

  if (!src) {
    return (
      <div
        className={`${className} grid place-items-center bg-[linear-gradient(135deg,rgba(217,4,41,0.12),rgba(0,0,0,0.04)),linear-gradient(180deg,#fafafa,#ececec)] text-[0.82rem] font-semibold uppercase tracking-[0.04em] text-[#7a7a7a] font-[Poppins,sans-serif]`}
      >
        No Image
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
});

export default function BreakingNewsSection({ articles = [] }) {
  const sectionArticles = useMemo(() => {
    const normalized = normalizeArticles(articles);
    const breakingArticles = normalized.filter(isBreakingArticle);

    return dedupeArticles([...breakingArticles, ...normalized]).slice(0, 9);
  }, [articles]);

  if (sectionArticles.length === 0) return null;

  const featuredArticle = sectionArticles[0];
  const leftSecondaryArticle = sectionArticles[1];
  const headlineArticles = sectionArticles.slice(2, 9);

  return (
    <section
      className="
        mx-auto mt-7 mb-9 w-[min(1180px,calc(100%-72px))] rounded-[14px] border-t-2 border-dotted border-[#8d8d8d] pt-3
        font-[Poppins,sans-serif]
        min-[1441px]:max-[2560px]:w-[min(1660px,calc(100%-180px))]
        max-[1024px]:w-[min(100%,calc(100%-48px))]
        max-[768px]:w-[calc(100%-40px)]
        max-[425px]:w-[calc(100%-32px)]
        max-[375px]:w-[calc(100%-28px)]
        max-[320px]:w-[calc(100%-24px)]
        max-[640px]:mt-[22px] max-[640px]:mb-7
      "
      aria-labelledby="breaking-news-heading"
    >
      <div className="mb-[18px] flex items-end justify-between gap-4 max-[640px]:mb-3.5 max-[640px]:flex-row max-[640px]:items-end max-[640px]:gap-3">
        <div>
          <span className="mb-2 inline-flex items-center gap-2 font-[Poppins,sans-serif] text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[#b91c1c] before:h-[9px] before:w-[9px] before:rounded-full before:bg-[#d90429] before:shadow-[0_0_0_4px_rgba(217,4,41,0.12)] before:content-['']">
            Live Desk
          </span>
          <h2
            id="breaking-news-heading"
            className="m-0 font-[Poppins,sans-serif] text-[18px] font-bold leading-none text-[#111] min-[1441px]:text-[20px] max-[425px]:text-[17px]"
          >
            Trending Today
          </h2>
        </div>

        <Link
          to={BREAKING_NEWS_PATH}
          className="breaking-news-link shrink-0 whitespace-nowrap font-[Poppins,sans-serif] text-[0.92rem] font-bold text-[#b91c1c] no-underline transition-colors duration-200 hover:text-[#7f1d1d] max-[425px]:text-[0.84rem] max-[375px]:text-[0.78rem]"
          style={{ textDecoration: 'none' }}
        >
          View All
        </Link>
      </div>

      <div
        className="
          grid grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] items-stretch gap-5
          max-[1024px]:grid-cols-1
        "
      >
        <div className="grid grid-rows-[auto_auto] gap-4">
          {featuredArticle ? (
            <StoryCard article={featuredArticle} className="group block text-inherit no-underline">
              <div className="relative overflow-hidden rounded-[12px] bg-[#111]">
                <StoryImage
                  article={featuredArticle}
                  alt={getArticleTitle(featuredArticle)}
                  className="
                    block w-full object-cover object-center transition duration-200 group-hover:brightness-105
                    aspect-[16/8.8]
                    max-[1024px]:aspect-[16/9.4]
                    max-[768px]:aspect-[16/10]
                    max-[425px]:aspect-[16/11]
                    max-[375px]:aspect-[16/12]
                    max-[320px]:aspect-[16/13]
                  "
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.72)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 z-[1] p-[18px_16px_16px] max-[640px]:p-[16px_12px_14px] max-[425px]:p-3">
                  <h3 className="m-0 line-clamp-3 font-[Poppins,sans-serif] text-[clamp(1.12rem,1.35vw,1.7rem)] font-semibold leading-[1.12] text-white max-[425px]:text-[1rem] max-[375px]:text-[0.92rem]">
                    {getArticleTitle(featuredArticle)}
                  </h3>
                  {formatArticleDate(featuredArticle) ? (
                    <p className="mt-2.5 font-[Poppins,sans-serif] text-[0.82rem] font-semibold leading-[1.35] text-white/85 max-[425px]:text-[0.72rem]">
                      {formatArticleDate(featuredArticle)}
                    </p>
                  ) : null}
                </div>
              </div>
            </StoryCard>
          ) : null}

          {leftSecondaryArticle ? (
            <StoryCard
              article={leftSecondaryArticle}
              className="
                group grid grid-cols-[135px_minmax(0,1fr)] items-start gap-[9px] rounded-[10px] border-t border-dotted border-[#9a9a9a] p-[6px_2px_2px]
                min-[1441px]:grid-cols-[150px_minmax(0,1fr)]
                max-[768px]:grid-cols-[128px_minmax(0,1fr)]
                max-[640px]:grid-cols-1 max-[640px]:h-auto
                max-[425px]:gap-2 max-[425px]:p-[6px_0_0]
              "
            >
              <StoryImage
                article={leftSecondaryArticle}
                alt={getArticleTitle(leftSecondaryArticle)}
                className="
                  block h-[68px] min-h-[68px] w-full rounded-[10px] object-cover bg-[#f4f4f4]
                  min-[1441px]:h-[76px] min-[1441px]:min-h-[76px]
                  max-[640px]:h-auto max-[640px]:aspect-[16/10]
                "
              />
              <div className="flex min-h-[68px] min-w-0 flex-col justify-start gap-0.5 min-[1441px]:min-h-[76px] max-[640px]:min-h-0 max-[640px]:gap-2">
                <h3 className="m-0 line-clamp-3 font-[Poppins,sans-serif] text-[clamp(0.86rem,0.9vw,1.02rem)] font-semibold leading-[1.2] text-[#111] transition-colors duration-200 group-hover:text-[#D80100] max-[425px]:text-[0.82rem]">
                  {getArticleTitle(leftSecondaryArticle)}
                </h3>
                {formatArticleDate(leftSecondaryArticle) ? (
                  <p className="mt-0 font-[Poppins,sans-serif] text-[0.82rem] font-semibold leading-[1.35] text-[#6b7280] max-[425px]:text-[0.72rem]">
                    {formatArticleDate(leftSecondaryArticle)}
                  </p>
                ) : null}
              </div>
            </StoryCard>
          ) : null}
        </div>

        <div className="grid content-start">
          {headlineArticles.map((article, index) => (
            <StoryCard
              key={article.id || article.slug || getArticleTitle(article)}
              article={article}
              className={`
                group grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 rounded-[10px] border-b border-dotted border-[#9a9a9a] py-[9px]
                first:pt-0 last:border-b-0 last:pb-0
                min-[1441px]:grid-cols-[minmax(0,1fr)_130px]
                max-[1024px]:grid-cols-[minmax(0,1fr)_132px]
                max-[768px]:gap-[11px]
                max-[640px]:grid-cols-[minmax(0,1fr)_100px] max-[640px]:gap-3
                max-[425px]:grid-cols-[minmax(0,1fr)_88px] max-[425px]:gap-2.5 max-[425px]:py-2
                max-[375px]:grid-cols-[minmax(0,1fr)_82px]
                max-[320px]:grid-cols-[minmax(0,1fr)_72px]
                ${index >= 4 ? 'max-[1440px]:hidden' : ''}
                ${index >= 5 ? 'min-[1441px]:max-[2560px]:hidden' : ''}
              `}
            >
              <div className="min-w-0">
                <h3 className="m-0 line-clamp-3 font-[Poppins,sans-serif] text-[clamp(0.92rem,1.02vw,1.22rem)] font-medium leading-[1.14] text-[#111] transition-colors duration-200 group-hover:text-[#D80100] max-[425px]:text-[0.84rem] max-[375px]:text-[0.78rem] max-[320px]:text-[0.72rem]">
                  {getArticleTitle(article)}
                </h3>
                {formatArticleDate(article) ? (
                  <p className="mt-2.5 font-[Poppins,sans-serif] text-[0.82rem] font-semibold leading-[1.35] text-[#6b7280] max-[425px]:mt-1.5 max-[425px]:text-[0.72rem] max-[320px]:text-[0.68rem]">
                    {formatArticleDate(article)}
                  </p>
                ) : null}
              </div>
              <StoryImage
                article={article}
                alt={getArticleTitle(article)}
                className="block w-full rounded-[10px] aspect-[16/9] object-cover bg-[#f4f4f4]"
              />
            </StoryCard>
          ))}
        </div>
      </div>
    </section>
  );
}
