import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, formatArticleDateTimeIST, getArticleDateValue } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const PRERENDER_UA_PATTERN = /HeadlessChrome|prerender/i;

const getCategorySlugsFromArticle = (article) => {
  const details = Array.isArray(article?.category_details) ? article.category_details : [];
  const detailSlugs = details
    .map((item) => String(item?.slug || "").trim().toLowerCase())
    .filter(Boolean);
  const direct = String(article?.category || article?.category_slug || "").trim().toLowerCase();
  return direct ? [...detailSlugs, direct] : detailSlugs;
};

const isPrerenderUserAgent = () => {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator?.userAgent || "";
  return PRERENDER_UA_PATTERN.test(userAgent);
};

// ✅ Fix 1 — Category slug se seedha fetch, saare articles nahi
function useCategoryArticles(slug, seededPool = []) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const slugKey = String(slug || "").trim().toLowerCase();
  const seededArticles = useMemo(() => {
    if (!slugKey || !Array.isArray(seededPool) || seededPool.length === 0) return [];
    return seededPool
      .filter((article) => getCategorySlugsFromArticle(article).includes(slugKey))
      .sort(
        (a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0)
      );
  }, [seededPool, slugKey]);

  useEffect(() => {
    let ignore = false;

    if (seededArticles.length > 0) {
      setArticles(seededArticles);
      setLoading(false);
      if (isPrerenderUserAgent()) return () => { ignore = true; };
    }

    fetch(`${API_BASE}/articles/?category=${slug}&page=1&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        if (ignore) return;
        const all = Array.isArray(data) ? data : (data.results || []);
        const sorted = all.sort(
          (a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0)
        );
        setArticles(sorted);
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [seededArticles, slug]);

  return { articles, loading };
}

// ── Helpers ───────────────────────────────────────────────────
const imgSrc = (a) => a?.image_url || a?.image || null;
const getArticleSummary = (article) =>
  String(
    article?.subtitle ||
    article?.description ||
    article?.excerpt ||
    article?.summary ||
    ""
  )
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const useIs4K = () => {
  const getValue = () => (typeof window !== "undefined" ? window.innerWidth > 2560 : false);
  const [is4K, setIs4K] = useState(getValue);

  useEffect(() => {
    const onResize = () => setIs4K(getValue());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return is4K;
};

const useIs2K = () => {
  const getValue = () =>
    typeof window !== "undefined" ? window.innerWidth >= 1441 && window.innerWidth <= 2560 : false;
  const [is2K, setIs2K] = useState(getValue);

  useEffect(() => {
    const onResize = () => setIs2K(getValue());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return is2K;
};

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ title, slug }) {
  const navigate = useNavigate();
  return (
    <div className="nps-section-header">
      <div className="nps-section-header-left">
        <div className="nps-section-bar" />
        <span className="nps-section-title">{title}</span>
      </div>
      <button
        onClick={() => navigate(`/category/${slug}`)}
        className="nps-read-more-link"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        Read More›
      </button>
    </div>
  );
}

function CategoryTag({ label }) {
  return <span className="hs-cat-tag">{label}</span>;
}

function DateLabel({ date }) {
  return <span className="hs-date">{date}</span>;
}

// ── Skeleton ──────────────────────────────────────────────────
function Sk({ h = "14px", w = "100%", mb = "6px", radius = "4px" }) {
  return (
    <div style={{
      height: h, width: w, marginBottom: mb, borderRadius: radius,
      background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ✅ Fix 2 — ArticleImg mein lazy loading add kiya
function ArticleImg({ src, alt, className, style, priority = false }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div
        className={className}
        style={{ ...style, background: "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <span style={{ fontSize: 11, color: "#bbb" }}>No Image</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setErr(true)}
    />
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export function EntertainmentSection({ articles: passedArticles = [] }) {
  const navigate = useNavigate();
  const is4K = useIs4K();
  const is2K = useIs2K();
  const sortedPool = useMemo(() => {
    if (!Array.isArray(passedArticles) || passedArticles.length === 0) return [];
    return [...passedArticles].sort(
      (a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0)
    );
  }, [passedArticles]);

  const { articles: explainers, loading: explainersLoading } = useCategoryArticles("bharat-explainers", sortedPool);
  const { articles: numbers, loading: numbersLoading } = useCategoryArticles("bharat-in-numbers", sortedPool);

  const featured = explainers[0] || null;
  const desiredRightCards = 5;
  const availableAfterFeatured = Math.max(0, explainers.length - 1);
  const leftStackCount = Math.min(2, availableAfterFeatured);
  const leftStackCards = explainers.slice(1, 1 + leftStackCount);
  const midCards = explainers.slice(
    1 + leftStackCards.length,
    1 + leftStackCards.length + desiredRightCards
  );
  const sidebarItems = numbers.slice(0, 5);

  const rootStyle = is2K
    ? {
        width: "min(1660px, calc(100% - 180px))",
        margin: "0 auto 24px",
      }
    : undefined;
  const layoutStyle = is2K ? { display: "block" } : undefined;
  const leftMidStyle = is2K
    ? {
        display: "grid",
        gridTemplateColumns: "720px minmax(0, 1fr)",
        gridTemplateRows: "auto",
        gap: 18,
        alignItems: "stretch",
      }
    : { gridTemplateRows: "auto", alignItems: "stretch" };
  const featuredStyle = is2K ? { height: 360, borderRadius: 10, width: "100%" } : undefined;
  const midColStyle = is2K
    ? { height: 470, paddingLeft: 18, gridRow: "auto", gridColumn: "auto" }
    : { gridRow: "auto", gridColumn: "auto" };
  const sidebarStyle = { display: "none" };
  const sidebarScrollStyle = undefined;

  return (
    <div className={`nps-entertainment${is4K ? " nps-4k" : ""}`} style={rootStyle}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      <SectionHeader title="BHARAT EXPLAINERS" slug="bharat-explainers" />

      <div className="nps-ent-layout" style={layoutStyle}>

        {/* ── LEFT + MIDDLE ── */}
        <div className="nps-ent-left-mid" style={leftMidStyle}>
          <div className="hs-left-col">
            {/* Featured big card — priority load */}
            {explainersLoading ? (
              <div className="hs-featured-card">
                <div className="hs-featured-img-wrap" style={{ background: "#f0ece8" }}>
                  <Sk h="100%" w="100%" mb="0" radius="0" />
                </div>
              </div>
            ) : featured ? (
              <div
                className="hs-featured-card"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  const articlePath = getArticlePath(featured);
                  if (articlePath) navigate(articlePath);
                }}
              >
                <div className="hs-featured-img-wrap" style={featuredStyle}>
                  <ArticleImg
                    src={imgSrc(featured)}
                    alt={featured.title}
                    className="w-full h-full object-cover"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    priority={true}
                  />
                  <div className="hs-featured-overlay">
                    <p className="hs-featured-title">{featured.title}</p>
                    {getArticleSummary(featured) ? (
                      <p
                        style={{
                          margin: "6px 0 4px",
                          color: "rgba(255,255,255,0.92)",
                          fontSize: "12px",
                          lineHeight: 1.35,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {getArticleSummary(featured)}
                      </p>
                    ) : null}
                    <DateLabel date={formatArticleDateTimeIST(featured)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="hs-featured-card">
                <div className="hs-featured-img-wrap" style={{ background: "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#bbb", fontSize: 13 }}>No articles yet</span>
                </div>
              </div>
            )}

            <div className="hs-small-stack">
              {explainersLoading
                ? Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="hs-small-card">
                      <div className="hs-small-img" style={{ background: "#f0ece8" }} />
                      <div className="hs-small-text">
                        <Sk h="11px" w="60px" mb="6px" />
                        <Sk h="13px" w="90%" mb="4px" />
                        <Sk h="11px" w="50px" mb="0" />
                      </div>
                    </div>
                  ))
                : leftStackCards.map((card) => (
                    <div
                      key={card.id || card.slug || card.title}
                      className="hs-small-card"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        const articlePath = getArticlePath(card);
                        if (articlePath) navigate(articlePath);
                      }}
                    >
                      <div className="hs-small-img">
                        <ArticleImg
                          src={imgSrc(card)}
                          alt={card.title}
                          className="w-full h-full object-cover"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <div className="hs-small-text">
                        <p className="hs-small-title">{card.title}</p>
                        {getArticleSummary(card) ? (
                          <p
                            style={{
                              margin: "4px 0",
                              color: "#666",
                              fontSize: "11px",
                              lineHeight: 1.35,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {getArticleSummary(card)}
                          </p>
                        ) : null}
                        <DateLabel date={formatArticleDateTimeIST(card)} />
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Middle: 4 horizontal cards — lazy load */}
          <div className="hs-mid-col" style={midColStyle}>
            {explainersLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="hs-mid-card">
                    <div className="hs-mid-img hs-mid-img--right" style={{ background: "#f0ece8" }} />
                    <div className="hs-mid-text">
                      <Sk h="11px" w="60px" mb="5px" />
                      <Sk h="13px" w="95%" mb="4px" />
                      <Sk h="11px" w="50px" mb="0" />
                    </div>
                  </div>
                ))
              : midCards.map((card) => (
                  <div
                    key={card.id}
                    className="hs-mid-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const articlePath = getArticlePath(card);
                      if (articlePath) navigate(articlePath);
                    }}
                  >
                    <div className="hs-mid-img hs-mid-img--right">
                      <ArticleImg
                        src={imgSrc(card)}
                        alt={card.title}
                        className="w-full h-full object-cover"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div className="hs-mid-text">
                      <p className="hs-mid-title">{card.title}</p>
                      {getArticleSummary(card) ? (
                        <p
                          style={{
                            margin: "4px 0",
                            color: "#666",
                            fontSize: "11px",
                            lineHeight: 1.35,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {getArticleSummary(card)}
                        </p>
                      ) : null}
                      <DateLabel date={formatArticleDateTimeIST(card)} />
                    </div>
                  </div>
                ))}
          </div>

        </div>

        {/* ── SIDEBAR: Bharat in Numbers ── */}
        <div className="nps-health-sidebar" style={sidebarStyle}>
          <div
            className="nps-health-header"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/category/bharat-in-numbers")}
          >
            <span className="nps-health-header-text">BHARAT IN NUMBERS</span>
          </div>
          <div className="nps-health-scroll" style={sidebarScrollStyle}>
            {numbersLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="nps-health-item">
                    <div className="nps-health-img" style={{ background: "#f0ece8" }} />
                    <div className="nps-health-text-wrap">
                      <Sk h="10px" w="50px" mb="5px" />
                      <Sk h="12px" w="95%" mb="4px" />
                      <Sk h="10px" w="40px" mb="0" />
                    </div>
                  </div>
                ))
              : sidebarItems.length === 0
              ? (
                  <div style={{ padding: "16px", color: "#bbb", fontSize: 12, textAlign: "center" }}>
                    No articles yet
                  </div>
                )
              : sidebarItems.map((item) => (
                  <div
                    key={item.id}
                    className="nps-health-item"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const articlePath = getArticlePath(item);
                      if (articlePath) navigate(articlePath);
                    }}
                  >
                    <div className="nps-health-img">
                      <ArticleImg
                        src={imgSrc(item)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div className="nps-health-text-wrap">
                      <p className="nps-health-text">{item.title}</p>
                      <span className="hs-sidebar-date">
                        {formatArticleDateTimeIST(item)}
                      </span>
                    </div>
                  </div>
                ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default EntertainmentSection;
