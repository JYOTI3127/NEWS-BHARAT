import React, { Suspense, lazy, useEffect, Profiler } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchArticles, fetchCategories } from '../lib/api';

import NewsBanner from '../components/Banner';
import TrendingNews from '../components/Trendingnews';
import BreakingNewsSection from '../components/BreakingNewsSection';
import HomeCategorySections from '../components/HomeCategorySections';

const VisualStoriesWithScore = lazy(() => import('../components/Visualstories'));
const NewsPortalSection = lazy(() => import('../components/Newsportalsection'));
const StateNews = lazy(() => import('../components/Statenews'));
const MoreStoriesSection = lazy(() => import('../components/MoreStoriesSection'));
const Newsletter = lazy(() => import('../components/Newsletter'));

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

function DeferredSection({ id, anchorId, children, minHeight = 320, rootMargin = '400px 0px', forceRender = false }) {
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
    <div id={anchorId} ref={ref} style={{ minHeight, scrollMarginTop: '120px' }}>
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
  // ✅ Agar URL mein #newsletter hai toh Newsletter force render karo
  const isNewsletterHash = typeof window !== 'undefined' && window.location.hash === '#newsletter';

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: fetchArticles,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const allArticles = React.useMemo(() => {
    return Array.isArray(articlesData) ? articlesData : articlesData?.results || [];
  }, [articlesData]);

  return (
    <>
      <a
        href="https://whatsapp.com/channel/news4bharat"
        className="home-whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open News4Bharat on WhatsApp"
        title="WhatsApp"
      >
        <WhatsAppFloatingIcon />
      </a>

      <Profiler id="NewsBanner" onRender={onRenderCallback}>
        <NewsBanner articles={allArticles} loading={articlesLoading} />
      </Profiler>

      {/* <section className="w-full px-4 sm:px-6 pt-5">
        <div className="mx-auto max-w-[1240px] rounded-2xl border border-[#ece5dd] bg-white/80 px-4 py-4 text-sm leading-7 text-[#5f5a53] shadow-[0_1px_4px_rgba(0,0,0,0.03)] sm:px-6">
          News4Bharat brings breaking India news, economy coverage, politics updates, startup stories, state reporting, and Bharat explainers with verified reporting and clear context for everyday readers.
        </div>
      </section> */}

      <Profiler id="BreakingNewsSection" onRender={onRenderCallback}>
        <BreakingNewsSection articles={allArticles} />
      </Profiler>

      <Profiler id="TrendingNews" onRender={onRenderCallback}>
        <TrendingNews
          articles={allArticles}
          categories={categoriesData}
          loading={articlesLoading}
        />
      </Profiler>

      <DeferredSection id="VisualStories" minHeight={400} forceRender={isNewsletterHash}>
        <VisualStoriesWithScore articles={allArticles} />
      </DeferredSection>

      <DeferredSection id="NewsPortalSection" forceRender={isNewsletterHash}>
        <NewsPortalSection articles={allArticles} />
      </DeferredSection>

      <DeferredSection id="StateNews" minHeight={560} forceRender={isNewsletterHash}>
        <StateNews articles={allArticles} />
      </DeferredSection>

      <DeferredSection id="HomeCategorySections" minHeight={980} rootMargin="600px 0px" forceRender={isNewsletterHash}>
        <HomeCategorySections articles={allArticles} />
      </DeferredSection>

      <DeferredSection id="MoreStoriesSection" minHeight={760} rootMargin="800px 0px" forceRender={isNewsletterHash}>
        <MoreStoriesSection articles={allArticles} />
      </DeferredSection>

      {/* ✅ #newsletter hash hone par forceRender=true — Newsletter turant DOM mein aayega */}
      <DeferredSection id="Newsletter" anchorId="newsletter" minHeight={220} forceRender={isNewsletterHash}>
        <Newsletter />
      </DeferredSection>
    </>
  );
};

export default Home;
