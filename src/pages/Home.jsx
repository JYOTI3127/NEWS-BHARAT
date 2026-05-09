import React, { Suspense, lazy, useEffect, Profiler } from 'react';
import { Link } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import {
  fetchArticlePage,
  fetchPaginatedArticles,
  fetchCategories,
  fetchHomepageHeroCurrent,
  getHomepageHeroArticlesFromResponse,
  getListFromResponse,
  fetchFreshPopularShowcase,
  getFreshPopularArticlesFromResponse,
} from '../lib/api';

import NewsBanner from '../components/Banner';
import BreakingNewsSection from '../components/BreakingNewsSection';
import HomeCategorySections from '../components/HomeCategorySections';
import AdvertisementSlot from '../components/AdvertisementSlot';
import CategoryMiniCarousel from '../components/CategoryMiniCarousel';
import FreshPopularShowcase from '../components/FreshPopularShowcase';

const VisualStoriesWithScore = lazy(() => import('../components/Visualstories'));
const NewsPortalSection = lazy(() => import('../components/Newsportalsection'));
const StateNews = lazy(() => import('../components/Statenews'));
const MoreStoriesSection = lazy(() => import('../components/MoreStoriesSection'));
const Newsletter = lazy(() => import('../components/Newsletter'));

const BHARAT_NUMBERS_SLUGS = ['bharat-in-numbers'];
const BHARAT_STARTUPS_SLUGS = ['bharat-startups', 'bharats-startups'];
const Q4_CATEGORY_SLUGS = ['q4-results', 'q4-performance-strategic-outlook'];

const WhatsAppFloatingIcon = () => (
  <svg
    viewBox="0 0 448 512"
    width="25"
    height="25"
    aria-hidden="true"
    focusable="false"
  >
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
  const isNewsletterHash = typeof window !== 'undefined' && window.location.hash === '#newsletter';
  const [homeCategoriesReady, setHomeCategoriesReady] = React.useState(() => !isPrerender);
  const [moreStoriesReady, setMoreStoriesReady] = React.useState(() => !isPrerender);
  const prerenderReadyEmittedRef = React.useRef(false);
  const handleHomeCategoriesReady = React.useCallback(() => {
    setHomeCategoriesReady(true);
  }, []);
  const handleMoreStoriesReady = React.useCallback(() => {
    setMoreStoriesReady(true);
  }, []);
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

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => fetchPaginatedArticles({ limit: 100, maxPages: 5, full: true }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: _categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: heroData, isLoading: heroLoading } = useQuery({
    queryKey: ['homepage-hero-current'],
    queryFn: fetchHomepageHeroCurrent,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ─── FreshPopularShowcase: /homepage/latest_news/current/ ─────────────────
  // Backend display_count + articles control karta hai — frontend kuch nahi
  const { data: freshPopularData, isLoading: freshPopularLoading } = useQuery({
    queryKey: ['fresh-popular-showcase'],
    queryFn: fetchFreshPopularShowcase,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const freshPopularArticles = React.useMemo(
    () => getFreshPopularArticlesFromResponse(freshPopularData),
    [freshPopularData]
  );
  // ──────────────────────────────────────────────────────────────────────────

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
      // ignore cache write failures
    }
  }, [allArticles]);

  const sideArticlesForShowcase = React.useMemo(() => {
    if (Array.isArray(allArticles) && allArticles.length > 0) return allArticles;
    return Array.isArray(cachedSideArticles) ? cachedSideArticles : [];
  }, [allArticles, cachedSideArticles]);

  const sidePanelsLoading = articlesLoading && sideArticlesForShowcase.length === 0;

  const { data: q4ArticlesData, isLoading: q4Loading } = useQuery({
    queryKey: ['q4-results-home'],
    queryFn: async () => {
      const settled = await Promise.allSettled(
        Q4_CATEGORY_SLUGS.map((slug) =>
          fetchPaginatedArticles({ category: slug, limit: 30, maxPages: 3 })
        )
      );

      const combined = settled.flatMap((result) =>
        result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
      );

      const seen = new Set();
      const deduped = combined.filter((article, index) => {
        const key = String(
          article?.id ||
          article?.slug ||
          article?.public_url ||
          article?.url ||
          article?.title ||
          article?.headline ||
          index
        ).trim().toLowerCase();

        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return deduped;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const q4Articles = React.useMemo(
    () => (Array.isArray(q4ArticlesData) ? q4ArticlesData : []),
    [q4ArticlesData]
  );

  const heroArticles = React.useMemo(
    () => {
      const list = getHomepageHeroArticlesFromResponse(heroData);
      const displayCount = Number(heroData?.display_count ?? heroData?.data?.display_count);
      if (Number.isFinite(displayCount) && displayCount > 0) {
        return list.slice(0, displayCount);
      }
      return list;
    },
    [heroData]
  );

  const shouldUseFallbackBanner = !heroLoading && heroArticles.length === 0;

  const { data: bannerArticlesData, isLoading: bannerArticlesLoading } = useQuery({
    queryKey: ['banner-articles'],
    queryFn: () => fetchArticlePage({ page: 1, limit: 5 }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: shouldUseFallbackBanner,
  });

  const fallbackBannerArticles = React.useMemo(
    () => getListFromResponse(bannerArticlesData),
    [bannerArticlesData]
  );

  const bannerArticles = React.useMemo(
    () => (heroArticles.length > 0 ? heroArticles : fallbackBannerArticles),
    [heroArticles, fallbackBannerArticles]
  );

  const bannerLoading = heroLoading || (shouldUseFallbackBanner && bannerArticlesLoading);

  const homeApiReady =
    !articlesLoading &&
    !heroLoading &&
    !freshPopularLoading &&
    !q4Loading &&
    !bannerLoading;

  useEffect(() => {
    if (!isPrerender) return;
    if (typeof window !== 'undefined') {
      window.prerenderReady = false;
    }
    prerenderReadyEmittedRef.current = false;
  }, [isPrerender]);

  useEffect(() => {
    if (!isPrerender) return;
    if (prerenderReadyEmittedRef.current) return;
    if (!homeApiReady || !homeCategoriesReady || !moreStoriesReady) return;

    if (typeof window !== 'undefined') {
      window.prerenderReady = true;
    }
    document.dispatchEvent(new Event('prerender-ready'));
    prerenderReadyEmittedRef.current = true;
  }, [isPrerender, homeApiReady, homeCategoriesReady, moreStoriesReady]);

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

        <div className="home-section-align">
          <Profiler id="NewsBanner" onRender={onRenderCallback}>
            <NewsBanner articles={bannerArticles} loading={bannerLoading} />
          </Profiler>
        </div>

        <AdvertisementSlot
          page="home"
          placement="home_top"
          variant="leaderboard"
          className="home-top-ad home-top-ad--desktop"
          minWidth={769}
        />
        <AdvertisementSlot
          page="home"
          placement="home_top_mobile"
          variant="mobileStrip"
          className="home-top-ad home-top-ad--mobile"
          maxWidth={768}
        />

        <div className="home-section-align">
          <Profiler id="FreshPopularShowcase" onRender={onRenderCallback}>
            {/* Backend /homepage/latest_news/current/ controls articles + count */}
            <FreshPopularShowcase
              articles={freshPopularArticles}
              sideArticles={sideArticlesForShowcase}
              sidePanelsLoading={sidePanelsLoading}
            />
          </Profiler>
        </div>

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

        <DeferredSection id="VisualStories" minHeight={400} forceRender={isNewsletterHash} className="home-section-align">
          <VisualStoriesWithScore articles={allArticles} />
        </DeferredSection>

        <DeferredSection id="NewsPortalSection" forceRender={isNewsletterHash} className="home-section-align">
          <NewsPortalSection articles={allArticles} />
        </DeferredSection>

        <DeferredSection id="BharatInNumbers" minHeight={260} forceRender={isNewsletterHash} className="home-section-align">
          <CategoryMiniCarousel
            title="Bharat in Numbers"
            slugs={BHARAT_NUMBERS_SLUGS}
            categoryPath="/category/bharat-in-numbers"
            adPlacement="home_bharat_numbers_right"
          />
        </DeferredSection>

        <DeferredSection id="StateNews" minHeight={500} forceRender={isNewsletterHash} className="home-section-align">
          <StateNews articles={allArticles} />
        </DeferredSection>

        <DeferredSection id="BharatStartups" minHeight={260} forceRender={isNewsletterHash} className="home-section-align">
          <CategoryMiniCarousel
            title="Bharat of Startups"
            slugs={BHARAT_STARTUPS_SLUGS}
            categoryPath="/category/bharat-startups"
            adPlacement="home_bharat_startups_right"
          />
        </DeferredSection>

        <DeferredSection id="HomeCategorySections" minHeight={980} rootMargin="600px 0px" forceRender={isNewsletterHash} className="home-section-align">
          <HomeCategorySections
            articles={allArticles}
            onReady={handleHomeCategoriesReady}
          />
        </DeferredSection>

        <DeferredSection id="MoreStoriesSection" minHeight={760} rootMargin="800px 0px" forceRender={isNewsletterHash} className="home-section-align">
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

        <DeferredSection id="Newsletter" anchorId="newsletter" minHeight={220} forceRender={isNewsletterHash} className="home-section-align">
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
