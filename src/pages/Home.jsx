import React, { Suspense, lazy, useEffect, Profiler } from 'react';
import { Link } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import {
  fetchPaginatedArticles,
  fetchCategories,
  fetchFreshPopularShowcase,
  fetchLiveUpdates,
  getFreshPopularArticlesFromResponse,
  getLiveUpdatesFromResponse,
} from '../lib/api';

import BreakingNewsSection from '../components/BreakingNewsSection';
import HomeCategorySections from '../components/HomeCategorySections';
import AdvertisementSlot from '../components/AdvertisementSlot';
import CategoryMiniCarousel from '../components/CategoryMiniCarousel';
import FreshPopularShowcase from '../components/FreshPopularShowcase';
import LatestUpdatesRail from '../components/LatestUpdatesRail';

const VisualStoriesWithScore = lazy(() => import('../components/Visualstories'));
const NewsPortalSection = lazy(() => import('../components/Newsportalsection'));
const StateNews = lazy(() => import('../components/Statenews'));
const MoreStoriesSection = lazy(() => import('../components/MoreStoriesSection'));
const Newsletter = lazy(() => import('../components/Newsletter'));

const BHARAT_NUMBERS_SLUGS = ['bharat-in-numbers'];
const BHARAT_STARTUPS_SLUGS = ['bharat-startups', 'bharats-startups'];
const Q4_CATEGORY_SLUGS = ['q4-results', 'q4-performance-strategic-outlook'];
const BREAKING_NEWS_SLUGS = ['breaking-news'];
const EDITORIAL_CATEGORY_SLUGS = ['business', 'bharat-economy'];
const LATEST_NEWS_TAG = 'Us-Iran War';

const getPrerenderData = () => {
  if (typeof window === 'undefined') return {};
  return window.__N4B_PRERENDER_DATA__ || {};
};

const normalizeCategoryToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getArticleCategorySlugs = (article) => {
  const values = [
    article?.category_slug,
    article?.primary_category_slug,
    article?.category?.slug,
    article?.primary_category?.slug,
    article?.primary_category?.name,
  ];

  const details = Array.isArray(article?.category_details)
    ? article.category_details
    : article?.category_details
      ? [article.category_details]
      : [];

  details.forEach((item) => {
    values.push(item?.slug, item?.category_slug, item?.name);
  });

  return values
    .map(normalizeCategoryToken)
    .filter(Boolean);
};

const getSeedArticlesForSlugs = (articles, slugs, limit = 12) => {
  const targetSlugs = new Set(slugs.map(normalizeCategoryToken));
  return (Array.isArray(articles) ? articles : [])
    .filter((article) =>
      getArticleCategorySlugs(article).some((slug) => targetSlugs.has(slug))
    )
    .slice(0, limit);
};

const dedupeArticleList = (articles) => {
  const seen = new Set();
  return (Array.isArray(articles) ? articles : []).filter((article, index) => {
    const key = String(
      article?.id || article?.slug || article?.public_url ||
      article?.url || article?.title || article?.headline || index
    ).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeTag = (value) =>
  String(value || '')
    .replace(/\+/g, ' ')
    .replace(/^#+/, '')
    .replace(/&/g, ' and ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeTagKey = (value) =>
  normalizeTag(value).replace(/[^a-z0-9]+/g, '');

const getArticleTags = (article) => {
  const tags = [];
  const pushTokens = (value) => {
    if (!value) return;
    String(value)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => tags.push(tag));
  };

  if (Array.isArray(article?.tags_list)) {
    article.tags_list
      .map((tag) =>
        typeof tag === 'string'
          ? tag.trim()
          : String(tag?.name || tag?.tag || tag?.title || '').trim()
      )
      .filter(Boolean)
      .forEach((tag) => tags.push(tag));
  }

  pushTokens(article?.tags);
  pushTokens(article?.focus_keyword);
  pushTokens(article?.secondary_keywords);

  return Array.from(new Set(tags));
};

const filterArticlesByTag = (articles, tagName) => {
  const normalizedTag = normalizeTag(tagName);
  const tagFingerprint = normalizeTagKey(tagName);

  return (Array.isArray(articles) ? articles : []).filter((article) =>
    getArticleTags(article).some((tag) => {
      if (normalizeTag(tag) === normalizedTag) return true;
      return normalizeTagKey(tag) === tagFingerprint;
    })
  );
};

const fetchArticlesForCategorySlugs = async (slugs) => {
  const settled = await Promise.allSettled(
    slugs.map((slug) =>
      fetchPaginatedArticles({ category: slug, limit: 30, maxPages: 3 })
    )
  );
  const combined = settled.flatMap((result) =>
    result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
  );
  return dedupeArticleList(combined);
};

const fetchArticlesForTag = async (tagName) => {
  const articles = await fetchPaginatedArticles({ limit: 200, maxPages: 10, full: true });
  return dedupeArticleList(filterArticlesByTag(articles, tagName));
};

const WhatsAppFloatingIcon = () => (
  <svg viewBox="0 0 448 512" width="25" height="25" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M380.9 97.1C339 55.1 283.2 32 223.9 32 101.2 32 1.4 131.8 1.4 254.5c0 39.2 10.2 77.5 29.6 111.3L0 480l116.9-30.7c32.7 17.8 69.5 27.2 107 27.2h.1c122.7 0 222.5-99.8 222.5-222.5 0-59.4-23.1-115.2-65.6-156.9zM224 438.9h-.1c-33.4 0-66.1-9-94.7-26l-6.8-4-69.3 18.2 18.5-67.6-4.4-6.9c-18.7-29.8-28.6-64.3-28.6-99 0-101.6 82.7-184.3 184.4-184.3 49.2 0 95.5 19.2 130.4 54.1 34.9 34.9 54.8 81.2 54.8 130.6 0 101.6-82.7 184.9-184.2 184.9zm101.1-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.5-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.5-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.7 13.2 5.7 23.5 9.1 31.5 11.7 13.2 4.2 25.3 3.6 34.8 2.2 10.6-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.4-5-3.8-10.2-6.5z"
    />
  </svg>
);

const onRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration > 50) {
    console.warn(`SLOW: ${id} | ${phase} | ${actualDuration.toFixed(1)}ms`);
  } else {
    console.log(`OK: ${id} | ${phase} | ${actualDuration.toFixed(1)}ms`);
  }
};

const isPrerenderUserAgent = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator?.userAgent || '';
  return /HeadlessChrome|prerender/i.test(userAgent);
};

function DeferredSection({
  id,
  anchorId,
  children,
  minHeight = 320,
  rootMargin = '400px 0px',
  forceRender = false,
  className = '',
}) {
  const alwaysRender = React.useMemo(() => isPrerenderUserAgent() || forceRender, [forceRender]);
  const [shouldRender, setShouldRender] = React.useState(
    () => alwaysRender || typeof IntersectionObserver === 'undefined'
  );
  const ref = React.useRef(null);

  useEffect(() => {
    if (alwaysRender || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [alwaysRender, rootMargin]);

  return (
    <div id={anchorId} ref={ref} className={className} style={{ minHeight, scrollMarginTop: '120px' }}>
      {shouldRender ? (
        <Suspense fallback={<div style={{ minHeight, background: '#f8f8f8' }} />}>
          <Profiler id={id} onRender={onRenderCallback}>
            {children}
          </Profiler>
        </Suspense>
      ) : null}
    </div>
  );
}

const Home = () => {
  const isPrerender = React.useMemo(() => isPrerenderUserAgent(), []);
  const prerenderData = React.useMemo(() => getPrerenderData(), []);
  const prerenderArticles = React.useMemo(
    () => (Array.isArray(prerenderData.articles) ? prerenderData.articles : []),
    [prerenderData]
  );
  const prerenderCategories = React.useMemo(
    () => (Array.isArray(prerenderData.categories) ? prerenderData.categories : []),
    [prerenderData]
  );
  const isNewsletterHash = typeof window !== 'undefined' && window.location.hash === '#newsletter';
  const shouldForceDeferredRender = isNewsletterHash || isPrerender;

  const [homeCategoriesReady, setHomeCategoriesReady] = React.useState(true);
  const [moreStoriesReady, setMoreStoriesReady] = React.useState(true);
  const prerenderReadyEmittedRef = React.useRef(false);

  const handleHomeCategoriesReady = React.useCallback(() => setHomeCategoriesReady(true), []);
  const handleMoreStoriesReady = React.useCallback(() => setMoreStoriesReady(true), []);

  const [cachedSideArticles, setCachedSideArticles] = React.useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.sessionStorage.getItem('fps-side-articles-cache');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => fetchPaginatedArticles({ limit: 100, maxPages: 5, full: true }),
    initialData: prerenderArticles.length > 0 ? prerenderArticles : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: _categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    initialData: prerenderCategories.length > 0 ? prerenderCategories : undefined,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: freshPopularData, isLoading: freshPopularLoading } = useQuery({
    queryKey: ['fresh-popular-showcase'],
    queryFn: fetchFreshPopularShowcase,
    initialData: prerenderArticles.length > 0
      ? { articles: prerenderArticles.slice(0, 12), display_count: 12 }
      : undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const freshPopularArticles = React.useMemo(
    () => getFreshPopularArticlesFromResponse(freshPopularData),
    [freshPopularData]
  );

  const allArticles = React.useMemo(() => {
    return Array.isArray(articlesData) ? articlesData : articlesData?.results || [];
  }, [articlesData]);

  useEffect(() => {
    if (!Array.isArray(allArticles) || allArticles.length === 0) return;
    setCachedSideArticles(allArticles);
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem('fps-side-articles-cache', JSON.stringify(allArticles));
    } catch {
      // ignore
    }
  }, [allArticles]);

  const sideArticlesForShowcase = React.useMemo(() => {
    if (Array.isArray(allArticles) && allArticles.length > 0) return allArticles;
    return Array.isArray(cachedSideArticles) ? cachedSideArticles : [];
  }, [allArticles, cachedSideArticles]);

  const sidePanelsLoading = articlesLoading && sideArticlesForShowcase.length === 0;

  const { data: q4ArticlesData, isLoading: q4Loading } = useQuery({
    queryKey: ['q4-results-home'],
    queryFn: () => fetchArticlesForCategorySlugs(Q4_CATEGORY_SLUGS),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: editorialArticlesData, isLoading: editorialLoading } = useQuery({
    queryKey: ['editorials-home'],
    queryFn: () => fetchArticlesForCategorySlugs(EDITORIAL_CATEGORY_SLUGS),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: latestNewsTagArticlesData, isLoading: latestNewsTagLoading } = useQuery({
    queryKey: ['latest-updates-tag-home', LATEST_NEWS_TAG],
    queryFn: () => fetchArticlesForTag(LATEST_NEWS_TAG),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: breakingArticlesData, isLoading: breakingLoading } = useQuery({
    queryKey: ['latest-updates-breaking-home'],
    queryFn: () => fetchArticlesForCategorySlugs(BREAKING_NEWS_SLUGS),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: liveUpdatesData, isLoading: liveUpdatesLoading } = useQuery({
    queryKey: ['live-updates-home'],
    queryFn: fetchLiveUpdates,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const q4Articles = React.useMemo(
    () => (Array.isArray(q4ArticlesData) ? q4ArticlesData : []),
    [q4ArticlesData]
  );

  const editorialArticles = React.useMemo(
    () => (Array.isArray(editorialArticlesData) ? editorialArticlesData : []),
    [editorialArticlesData]
  );

  const latestNewsTagArticles = React.useMemo(
    () => (Array.isArray(latestNewsTagArticlesData) ? latestNewsTagArticlesData : []),
    [latestNewsTagArticlesData]
  );

  const breakingArticles = React.useMemo(
    () => (Array.isArray(breakingArticlesData) ? breakingArticlesData : []),
    [breakingArticlesData]
  );

  const liveUpdates = React.useMemo(
    () => getLiveUpdatesFromResponse(liveUpdatesData),
    [liveUpdatesData]
  );

  const renderQ4Section = React.useCallback(() => (
    <div className="home-section-align">
      <Profiler id="Q4ResultsSection" onRender={onRenderCallback}>
        <BreakingNewsSection
          articles={q4Articles}
          mode="q4"
          sectionEyebrow="Corporate Tracker"
          sectionTitle="Q4 Results"
          viewAllPath="/category/q4-results"
          sectionId="q4-results-heading"
        />
      </Profiler>
    </div>
  ), [q4Articles]);

  // ── homeApiReady: loading khatam + data aaya ─────────────────────────────
  const homeApiReady =
    !articlesLoading &&
    !freshPopularLoading &&
    !q4Loading &&
    !editorialLoading &&
    !latestNewsTagLoading &&
    !breakingLoading &&
    !liveUpdatesLoading &&
    allArticles.length > 0 &&
    freshPopularArticles.length > 0;

  // ── useEffect 1: Reset + hard timeout (SIRF EK BAAR) ────────────────────
  useEffect(() => {
    if (!isPrerender) return;

    if (typeof window !== 'undefined') {
      window.prerenderReady = false;
    }
    prerenderReadyEmittedRef.current = false;

    const hardTimeout = window.setTimeout(() => {
      if (!prerenderReadyEmittedRef.current) {
        if (typeof window !== 'undefined') window.prerenderReady = true;
        document.dispatchEvent(new Event('prerender-ready'));
        prerenderReadyEmittedRef.current = true;
      }
    }, 30000);

    return () => window.clearTimeout(hardTimeout);
  }, [isPrerender]);

  // ── useEffect 2: Data ready hone par emit ───────────────────────────────
  useEffect(() => {
    if (!isPrerender) return;
    if (prerenderReadyEmittedRef.current) return;
    if (!homeApiReady) return;

    if (typeof window !== 'undefined') {
      window.prerenderReady = true;
    }
    document.dispatchEvent(new Event('prerender-ready'));
    prerenderReadyEmittedRef.current = true;
  }, [isPrerender, homeApiReady]);

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="home-page-shell">
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

      <main className="home-main-column">
        <a
          href="https://chat.whatsapp.com/GsvvmLgv29GC6TKnhZXlDx"
          className="home-whatsapp-float"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open News4Bharat on WhatsApp"
          title="WhatsApp"
        >
          <WhatsAppFloatingIcon />
        </a>

        <div className="home-section-align home-section-align--latest-updates">
          <LatestUpdatesRail
            articles={latestNewsTagArticles.length > 0 ? latestNewsTagArticles : allArticles}
            tickerArticles={liveUpdates.length > 0 ? liveUpdates : breakingArticles}
          />
        </div>

        <div className="home-section-align home-section-align--fresh-popular">
          <Profiler id="FreshPopularShowcase" onRender={onRenderCallback}>
            <FreshPopularShowcase
              articles={freshPopularArticles}
              sideArticles={sideArticlesForShowcase}
              sidePanelsLoading={sidePanelsLoading}
            />
          </Profiler>
        </div>

        <div className="home-section-align">
          <Profiler id="EditorialSection" onRender={onRenderCallback}>
            <BreakingNewsSection
              articles={editorialArticles}
              mode="q4"
              sectionEyebrow="Business"
              sectionTitle="Business"
              viewAllPath="/category/business"
              sectionId="editorials-heading"
            />
          </Profiler>
        </div>

        <DeferredSection id="VisualStories" minHeight={400} forceRender={shouldForceDeferredRender} className="home-section-align">
          <VisualStoriesWithScore articles={allArticles} />
        </DeferredSection>

        <DeferredSection id="NewsPortalSection" forceRender={shouldForceDeferredRender} className="home-section-align">
          <NewsPortalSection articles={allArticles} />
        </DeferredSection>

        <DeferredSection id="BharatInNumbers" minHeight={260} forceRender={shouldForceDeferredRender} className="home-section-align">
          <CategoryMiniCarousel
            title="Bharat in Numbers"
            slugs={BHARAT_NUMBERS_SLUGS}
            categoryPath="/category/bharat-in-numbers"
            adPlacement="home_bharat_numbers_right"
            articles={allArticles}
          />
        </DeferredSection>

        <DeferredSection id="StateNews" minHeight={500} forceRender={shouldForceDeferredRender} className="home-section-align">
          <StateNews articles={allArticles} />
        </DeferredSection>

        <DeferredSection id="BharatStartups" minHeight={260} forceRender={shouldForceDeferredRender} className="home-section-align">
          <CategoryMiniCarousel
            title="Bharat's of Startups"
            slugs={BHARAT_STARTUPS_SLUGS}
            categoryPath="/category/bharat-startups"
            adPlacement="home_bharat_startups_right"
            articles={allArticles}
          />
        </DeferredSection>

        <DeferredSection id="HomeCategorySections" minHeight={980} rootMargin="600px 0px" forceRender={shouldForceDeferredRender} className="home-section-align">
          <HomeCategorySections
            articles={allArticles}
            onReady={handleHomeCategoriesReady}
            afterSection={(section) => section?.key === 'automobile' ? renderQ4Section() : null}
          />
        </DeferredSection>

        <DeferredSection id="MoreStoriesSection" minHeight={760} rootMargin="800px 0px" forceRender={shouldForceDeferredRender} className="home-section-align">
          <MoreStoriesSection
            articles={allArticles}
            onReady={handleMoreStoriesReady}
          />
        </DeferredSection>

        <div className="home-section-align mb-2 mt-2 px-4 sm:mt-3 sm:mb-4">
          <div className="flex w-full justify-center">
            <Link
              to="/more-articles"
              className="more-articles-cta inline-flex w-auto items-center justify-center rounded-full border border-[#D80100] bg-[#D80100] px-4 py-2 text-[13px] font-semibold leading-none tracking-[0.01em] text-white no-underline transition-colors hover:bg-[#b80000] hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D80100]/40 focus-visible:ring-offset-2 sm:px-5 sm:py-2.5 sm:text-sm"
              style={{ textDecoration: "none" }}
            >
              More Articles
            </Link>
          </div>
        </div>

        <DeferredSection id="Newsletter" anchorId="newsletter" minHeight={220} forceRender={shouldForceDeferredRender} className="home-section-align">
          <Newsletter />
        </DeferredSection>
      </main>

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
};

export default Home;
