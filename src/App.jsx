import React, { lazy, Suspense, useEffect, useState, Profiler } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { apiUrl } from "./lib/api";
import { getArticlePath, isArticlePath } from "./lib/articleUrl";

// Seedhe load honge — har page pe zaroori hain
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ScrollToTop from "./components/ScrollToTop";
import "./style.css"

// ✅ Profiler Callback — 50ms se zyada = SLOW warning
const onRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration > 50) {
    console.warn(`🐢 SLOW: ${id} | ${phase} | ${actualDuration.toFixed(1)}ms`);
  } else {
    console.log(`✅ OK: ${id} | ${phase} | ${actualDuration.toFixed(1)}ms`);
  }
};

// Lazy load — sirf tab load honge jab user us page pe jaaye
const Footer = lazy(() => import("./components/Footer"));
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const TermsPage = lazy(() => import("./pages/Termspage"));
const DisclaimerPage = lazy(() => import("./pages/Disclaimer"));

const FoundersNote = lazy(() => import("./pages/Foundersnote"));
const EditorialPolicy = lazy(() => import("./pages/Editorialpolicy"));
const CareersPage = lazy(() => import("./pages/Careerspage"));
const ContactPage = lazy(() => import("./pages/Contactpage"));
const NewsletterPage = lazy(() => import("./pages/NewsletterPage"));
const CommingSoon = lazy(() => import("./pages/ComingSoon"));
const ArticleDetails = lazy(() => import("./pages/ArticleDetails"));
const SixtySecondsPage = lazy(() => import("./pages/Sixtysecondspage"));
const CategoryPage = lazy(() => import("./pages/Categorypage"));
const NewsletterAgent = lazy(() => import("./pages/news4bharat-agent"));
const TagPage = lazy(() => import("./pages/TagPage"));
const AuthorPage = lazy(() => import("./pages/AuthorPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
// const WeatherPage = lazy(() => import("./pages/WeatherPage"));
// const MarketPage = lazy(() => import("./pages/MarketPage"));
// const MetalPage = lazy(() => import("./pages/MetalPage"));
// const CricketPage = lazy(() => import("./pages/CricketPage"));

// Loading Spinner
function PageLoader() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
      gap: 12,
    }}>
      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        width: 36,
        height: 36,
        border: "3px solid #f0ece8",
        borderTop: "3px solid #D80100",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "#aaa", fontSize: 13, fontFamily: "Poppins, sans-serif" }}>
        Loading...
      </p>
    </div>
  );
}

function LegacyArticleRedirect() {
  const { slug } = useParams();
  const [targetPath, setTargetPath] = useState("");

  useEffect(() => {
    let cancelled = false;

    const resolveLegacyPath = async () => {
      const pathParts =
        typeof window !== "undefined"
          ? window.location.pathname.split("/").filter(Boolean)
          : [];
      const articleSlug = String(
        pathParts[pathParts.length - 1] || slug || ""
      ).trim();

      if (!articleSlug) {
        setTargetPath("/");
        return;
      }

      try {
        const response = await fetch(
          apiUrl(`/articles/slug/${encodeURIComponent(articleSlug)}/`),
          { cache: "no-store" }
        );

        if (response.ok) {
          const data = await response.json();
          const article = Array.isArray(data) ? data[0] : data;
          const nextPath = getArticlePath(article);

          if (!cancelled && nextPath) {
            setTargetPath(nextPath);
          }
          return;
        }
      } catch {
        // Fall back below.
      }

      if (!cancelled) {
        setTargetPath("/");
      }
    };

    resolveLegacyPath();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  return <PageLoader />;
}

const TOP_LEVEL_CATEGORY_ALIASES = {
  "market": "bharat-economy",
  "markets": "bharat-economy",
  "bharat-bfsi": "bfsi",
  "artificial-intelligence": "ai",
  "bharat-numbers": "bharat-in-numbers",
  "bharats-startups": "bharat-startups",
  "states-of-bharat": "state-of-bharat",
  "political": "politics",
  "bharat-by-2047": "bharat-2047",
};

const NON_CATEGORY_TOP_LEVEL_PATHS = new Set([
  "",
  "about",
  "about-us",
  "privacy-policy",
  "terms-and-conditions",
  "terms-conditions",
  "terms-of-service",
  "founders-note",
  "editorial-policy",
  "careers",
  "career",
  "contact-us",
  "contact",
  "newsletter",
  "commingsoon",
  "disclaimer",
  "news",
  "article",
  "category",
  "tag",
  "author",
  "60-seconds",
]);

function TopLevelCategoryRedirect() {
  const { topLevelSlug } = useParams();
  const rawSlug = String(topLevelSlug || "").trim().toLowerCase();

  if (!rawSlug || NON_CATEGORY_TOP_LEVEL_PATHS.has(rawSlug)) {
    return <NotFound />;
  }

  const canonicalSlug = TOP_LEVEL_CATEGORY_ALIASES[rawSlug] || rawSlug;
  return <Navigate to={`/category/${canonicalSlug}`} replace />;
}

function Layout() {
  const location = useLocation();
  const hideLayout = location.pathname === "/CommingSoon";
  const [showFooter, setShowFooter] = useState(false);

  useEffect(() => {
    if (hideLayout) return;

    setShowFooter(false);

    let timeoutId = 0;
    let idleId = 0;

    const revealFooter = () => setShowFooter(true);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(revealFooter, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(revealFooter, 2500);
    }

    return () => {
      if (idleId && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [hideLayout, location.pathname]);

  useEffect(() => {
    if (hideLayout) return;
    if (isArticlePath(location.pathname)) return;

    const rafId = window.requestAnimationFrame(() => {
      document.dispatchEvent(new Event("prerender-ready"));
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [hideLayout, location.pathname]);

  return (
    <>
      {/* Navbar */}
      {!hideLayout && (
        <Profiler id="Navbar" onRender={onRenderCallback}>
          <Navbar />
        </Profiler>
      )}

      {/* Main Page Routes */}
      <Suspense fallback={<PageLoader />}>
        <Profiler id="MainRoutes" onRender={onRenderCallback}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<About />} />
            <Route path="/about" element={<Navigate to="/about-us" replace />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms-and-conditions" element={<TermsPage />} />
            <Route path="/terms-conditions" element={<Navigate to="/terms-and-conditions" replace />} />
            <Route path="/terms-of-service" element={<Navigate to="/terms-and-conditions" replace />} />
            <Route path="/founders-note" element={<FoundersNote />} />
            <Route path="/editorial-policy" element={<EditorialPolicy />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/career" element={<Navigate to="/careers" replace />} />
            <Route path="/contact-us" element={<ContactPage />} />
            <Route path="/contact" element={<Navigate to="/contact-us" replace />} />
            <Route path="/newsletter" element={<NewsletterPage />} />
            <Route path="/CommingSoon" element={<CommingSoon />} />
            <Route path="/category/bharats-startups" element={<Navigate to="/category/bharat-startups" replace />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/tag/:tagName" element={<TagPage />} />
            <Route path="/author/:slug" element={<AuthorPage />} />
            {/* <Route path="/weather" element={<WeatherPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/metal" element={<MetalPage />} />
            <Route path="/cricket" element={<CricketPage />} /> */}
            <Route path="/news/:categorySlug/:slug" element={<LegacyArticleRedirect />} />
            <Route path="/news/:slug" element={<LegacyArticleRedirect />} />
            <Route path="/article/:categorySlug/:slug" element={<LegacyArticleRedirect />} />
            <Route path="/article/:slug" element={<LegacyArticleRedirect />} />
            <Route path="/:categorySlug/:slug" element={<ArticleDetails />} />
            <Route path="/60-seconds/:slug" element={<SixtySecondsPage />} />
            <Route path="/disclaimer" element={<DisclaimerPage />} />

            {/* <Route path="/NewsletterAgent" element={<NewsletterAgent />} /> */}

            {/* Quick Links — CategoryPage pe redirect */}
            <Route path="/breaking-news" element={<Navigate to="/category/breaking-news" replace />} />
            <Route path="/state-of-bharat" element={<Navigate to="/category/state-of-bharat" replace />} />
            <Route path="/bharat-explainers" element={<Navigate to="/category/bharat-explainers" replace />} />
            <Route path="/bharat-numbers" element={<Navigate to="/category/bharat-in-numbers" replace />} />
            <Route path="/bharat-startups" element={<Navigate to="/category/bharat-startups" replace />} />
            <Route path="/bharats-startups" element={<Navigate to="/category/bharat-startups" replace />} />
            <Route path="/60-second-read" element={<Navigate to="/category/60-second-read" replace />} />
            <Route path="/sports" element={<Navigate to="/category/sports" replace />} />
            <Route path="/world-news" element={<Navigate to="/category/world-news" replace />} />
            <Route path="/entertainment" element={<Navigate to="/category/entertainment" replace />} />
            <Route path="/market" element={<Navigate to="/category/bharat-economy" replace />} />
            <Route path="/markets" element={<Navigate to="/category/bharat-economy" replace />} />
            <Route path="/bfsi" element={<Navigate to="/category/bfsi" replace />} />
            <Route path="/bharat-bfsi" element={<Navigate to="/category/bfsi" replace />} />
            <Route path="/ai" element={<Navigate to="/category/ai" replace />} />
            <Route path="/artificial-intelligence" element={<Navigate to="/category/ai" replace />} />
            <Route path="/bharat-opinions" element={<Navigate to="/category/bharat-opinions" replace />} />
            <Route path="/q4-results" element={<Navigate to="/category/q4-results" replace />} />
            <Route path="/:topLevelSlug" element={<TopLevelCategoryRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Profiler>
      </Suspense>

      {/* Footer */}
      {!hideLayout && showFooter && (
        <Suspense fallback={null}>
          <Profiler id="Footer" onRender={onRenderCallback}>
            <Footer />
          </Profiler>
        </Suspense>
      )}

      {/* Bottom Nav (mobile only) */}
      {!hideLayout && (
        <div className="block md:hidden">
          <Profiler id="BottomNav" onRender={onRenderCallback}>
            <BottomNav />
          </Profiler>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout />
    </BrowserRouter>
  );
}

export default App;
