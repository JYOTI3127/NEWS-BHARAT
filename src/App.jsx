import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

// Seedhe load honge — har page pe zaroori hain
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import ScrollToTop from "./components/ScrollToTop";
import "../src/style.css";
import DisclaimerPage from "./pages/Disclaimer";

// Lazy load — sirf tab load honge jab user us page pe jaaye
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const TermsPage = lazy(() => import("./pages/Termspage"));
const FoundersNote = lazy(() => import("./pages/Foundersnote"));
const EditorialPolicy = lazy(() => import("./pages/Editorialpolicy"));
const CareersPage = lazy(() => import("./pages/Careerspage"));
const ContactPage = lazy(() => import("./pages/Contactpage"));
const CommingSoon = lazy(() => import("./pages/ComingSoon"));
const ArticleDetails = lazy(() => import("./pages/ArticleDetails"));
const SixtySecondsPage = lazy(() => import("./pages/SixtySecondsPage"));
const CategoryPage = lazy(() => import("./pages/Categorypage"));
// const NewsletterAgent = lazy(() => import("./pages/news4bharat-agent"));

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

function Layout() {
  const location = useLocation();
  const hideLayout = location.pathname === "/CommingSoon";

  return (
    <>
      {!hideLayout && <Navbar />}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/terms-of-service" element={<TermsPage />} />
          <Route path="/founders-note" element={<FoundersNote />} />
          <Route path="/editorial-policy" element={<EditorialPolicy />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/CommingSoon" element={<CommingSoon />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/article/:slug" element={<ArticleDetails />} />
          <Route path="/60-seconds/:slug" element={<SixtySecondsPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />

          {/* <Route path="/NewsletterAgent" element={<NewsletterAgent />} /> */}

          {/* Quick Links — CategoryPage pe redirect */}
          <Route path="/breaking-news" element={<Navigate to="/category/breaking-news" replace />} />
          <Route path="/state-of-bharat" element={<Navigate to="/category/state-of-bharat" replace />} />
          <Route path="/bharat-explainers" element={<Navigate to="/category/bharat-explainers" replace />} />
          <Route path="/bharat-numbers" element={<Navigate to="/category/bharat-in-numbers" replace />} />
          <Route path="/bharat-startups" element={<Navigate to="/category/bharats-startups" replace />} />
          <Route path="/60-second-read" element={<Navigate to="/category/60-second-read" replace />} />
          <Route path="/sports" element={<Navigate to="/category/sports" replace />} />
          <Route path="/world-news" element={<Navigate to="/category/world-news" replace />} />
          <Route path="/entertainment" element={<Navigate to="/category/entertainment" replace />} />
          <Route path="/bharat-opinions" element={<Navigate to="/category/bharat-opinions" replace />} />
        </Routes>
      </Suspense>

      {!hideLayout && <Footer />}
      {!hideLayout && (
        <div className="block md:hidden">
          <BottomNav />
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