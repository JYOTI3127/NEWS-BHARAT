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
  const [shouldRender, setShouldRender] = React.useState(alwaysRender);
  const ref = React.useRef(null);

  useEffect(() => {
    if (alwaysRender || typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
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
    queryKey: ['allArticles'],
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

      <DeferredSection id="VisualStories" minHeight={400}>
        <VisualStoriesWithScore articles={allArticles} />
      </DeferredSection>

      <DeferredSection id="NewsPortalSection">
        <NewsPortalSection articles={allArticles} />
      </DeferredSection>

      <DeferredSection id="StateNews" minHeight={560}>
        <StateNews articles={allArticles} />
      </DeferredSection>

      <DeferredSection id="HomeCategorySections" minHeight={980} rootMargin="600px 0px">
        <HomeCategorySections articles={allArticles} />
      </DeferredSection>

      <DeferredSection id="MoreStoriesSection" minHeight={760} rootMargin="800px 0px">
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
