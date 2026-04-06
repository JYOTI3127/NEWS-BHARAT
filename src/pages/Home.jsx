import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import NewsBanner from '../components/Banner'
import TrendingNews from '../components/Trendingnews'

const VisualStoriesWithScore = lazy(() => import('../components/Visualstories'))
const NewsPortalSection = lazy(() => import('../components/Newsportalsection'))
const StateNews = lazy(() => import('../components/Statenews'))
const Newsletter = lazy(() => import('../components/Newsletter'))
const HomeCategorySections = lazy(() => import('../components/HomeCategorySections'))
const MoreStoriesSection = lazy(() => import('../components/MoreStoriesSection'))

function DeferredSection({ children, minHeight = 320, rootMargin = '300px 0px', background = 'transparent' }) {
  const [shouldRender, setShouldRender] = useState(false)
  const placeholderRef = useRef(null)

  useEffect(() => {
    const node = placeholderRef.current
    if (!node || shouldRender) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldRender(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [rootMargin, shouldRender])

  if (shouldRender) {
    return (
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            style={{ minHeight, width: '100%', background }}
          />
        }
      >
        {children}
      </Suspense>
    )
  }

  return (
    <div
      ref={placeholderRef}
      aria-hidden="true"
      style={{ minHeight, width: '100%', background }}
    />
  )
}

const Home = () => {
  useEffect(() => {
    const emitReady = () => {
      document.dispatchEvent(new Event('prerender-ready'))
    }

    const handleBannerReady = () => {
      emitReady()
    }

    document.addEventListener('news-banner-ready', handleBannerReady, { once: true })

    const timer = setTimeout(() => {
      emitReady()
    }, 7000)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('news-banner-ready', handleBannerReady)
    }
  }, [])

  return (
    <>
      <NewsBanner />
      <TrendingNews />
      <DeferredSection minHeight={360} rootMargin="500px 0px">
        <VisualStoriesWithScore />
      </DeferredSection>
      <DeferredSection minHeight={520}>
        <NewsPortalSection />
      </DeferredSection>
      <DeferredSection minHeight={560}>
        <StateNews />
      </DeferredSection>
      <DeferredSection minHeight={980}>
        <HomeCategorySections />
      </DeferredSection>
      <DeferredSection minHeight={760} rootMargin="900px 0px">
        <MoreStoriesSection />
      </DeferredSection>
      <DeferredSection minHeight={220}>
        <Newsletter />
      </DeferredSection>
    </>
  )
}

export default Home
