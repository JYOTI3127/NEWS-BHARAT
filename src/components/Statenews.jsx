import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";

// ── State List ────────────────────────────────────────────────
const stateList = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const stateNameSet = new Set(stateList.map((state) => state.toLowerCase()));

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      }).replace(/am|pm/i, (match) => match.toUpperCase())
    : "";

const imgSrc = (a) => a?.image_url || a?.image || null;
const categoryLabel = (article, fallback = "STATE NEWS") =>
  article?.category_details?.[0]?.name ||
  article?.categories?.[0]?.name ||
  fallback;

const getSelectedStateName = (article) => {
  const subs = article?.selected_subcategories?.subs;
  if (!subs || typeof subs !== "object") return "";

  for (const values of Object.values(subs)) {
    if (Array.isArray(values) && values.length > 0) {
      const first = values.find((value) => typeof value === "string" && value.trim());
      if (first) return first.trim();
    }
  }

  return "";
};

const hasMappedState = (article) => {
  const stateName = getSelectedStateName(article);
  return Boolean(stateName) && stateNameSet.has(stateName.toLowerCase());
};

const getStateTagLabel = (article, activeState, fallback = "STATE NEWS") =>
  activeState || getSelectedStateName(article) || categoryLabel(article, fallback);

const getSortTimestamp = (article) => {
  const rawDate =
    article?.published_at ||
    article?.created_at ||
    article?.date ||
    null;

  if (!rawDate) return 0;

  const parsed = new Date(rawDate).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

// ── Breakpoint Hook ───────────────────────────────────────────
const useBreakpoint = () => {
  const getBreakpoint = (w) => {
    if (w <= 320) return "s";
    if (w <= 375) return "m";
    if (w <= 425) return "l";
    if (w <= 768) return "mobile";
    if (w <= 1024) return "tablet";
    if (w <= 1440) return "laptop";
    if (w <= 2560) return "laptop-l";
    return "4k";
  };

  const [bp, setBp] = useState(() => {
    if (typeof window === "undefined") return "laptop";
    return getBreakpoint(window.innerWidth);
  });

  useEffect(() => {
    const handler = () => {
      setBp(getBreakpoint(window.innerWidth));
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return bp;
};

// ── Skeleton ──────────────────────────────────────────────────
function Sk({ h = "12px", w = "100%", mb = "5px" }) {
  return (
    <div style={{
      height: h, width: w, marginBottom: mb, borderRadius: 4,
      background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ✅ Fix 2 — lazy loading add kiya
function ArticleImg({ src, alt, style, priority = false }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div style={{
        ...style, background: "#f0ece8",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 10, color: "#bbb" }}>No Image</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      style={{ ...style, objectFit: "cover", display: "block" }}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setErr(true)}
    />
  );
}

// ── Main Component ────────────────────────────────────────────
export default function StateNews() {
  const [activeState,     setActiveState]    = useState(null);
  const [stateArticles,   setStateArticles]  = useState([]);
  const [startupArticles, setStartupArticles] = useState([]);
  const [stateLoading,    setStateLoading]   = useState(true);
  const [startupLoading,  setStartupLoading] = useState(true);

  const tabsRef  = useRef(null);
  const navigate = useNavigate();
  const bp       = useBreakpoint();

  const isMobile = ["s", "m", "l", "mobile"].includes(bp);
  const isTablet = bp === "tablet";
  const is2K = bp === "laptop-l";

  useEffect(() => {
    setStateLoading(true);
    setStateArticles([]);

    const url = activeState
      ? `${API_BASE}/articles/by-state/?state=${encodeURIComponent(activeState)}`
      : `${API_BASE}/articles/?category=state-of-bharat`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const articles = Array.isArray(data) ? data : (data.results || []);
        const filteredArticles = activeState
          ? articles
          : articles.filter(hasMappedState);
        const sorted = [...filteredArticles].sort(
          (a, b) => getSortTimestamp(b) - getSortTimestamp(a)
        );
        setStateArticles(sorted);
        setStateLoading(false);
      })
      .catch(() => {
        setStateArticles([]);
        setStateLoading(false);
      });
  }, [activeState]);

  // ✅ Fix 1 — Startups category filter se fetch
  useEffect(() => {
    fetch(`${API_BASE}/articles/?category=bharat-startups&limit=6`)
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : (data.results || []);
        const sorted = [...all].sort(
          (a, b) => getSortTimestamp(b) - getSortTimestamp(a)
        );
        setStartupArticles(sorted.slice(0, 6));
        setStartupLoading(false);
      })
      .catch(() => setStartupLoading(false));
  }, []);

  const featuredCard   = stateArticles[0] || null;
  const bottomLeftCard = stateArticles[1] || null;
  const midCards       = stateArticles.slice(2, 6);
  const sidebarItems   = startupArticles.slice(0, 6);

  const goToArticle = (article) => {
    if (article?.slug) navigate(`/article/${article.slug}`);
    else if (article?.id) navigate(`/article/${article.id}`);
  };

  const scroll = (dir) => {
    if (tabsRef.current) tabsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  const loading = stateLoading;

  return (
    <div
      className="sn-wrap"
      style={is2K
        ? {
            width: "min(1820px, calc(100% - 96px))",
            maxWidth: "none",
            margin: "0 auto",
            padding: "24px 0",
          }
        : undefined}
    >
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* Heading */}
      <div className="sn-heading-row">
        <div className="sn-heading-bar" />
        <span className="sn-heading-text">State News</span>
      </div>

      {/* State Tabs */}
      <div className="sn-tabs-container">
        <button
          className="sn-arrow sn-arrow-left bg-transparent border-none p-0 leading-none cursor-pointer flex-shrink-0"
          onClick={() => scroll(-1)}
        >
          <span className="inline-flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border border-white/90 bg-[#002765] overflow-hidden">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6L8 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <div className="sn-tabs-scroll-area" ref={tabsRef}>
          <button
            className={`sn-tab-btn${activeState === null ? " active" : ""}`}
            onClick={() => setActiveState(null)}
          >
            All States
          </button>
          {stateList.map((s) => (
            <button
              key={s}
              className={`sn-tab-btn${activeState === s ? " active" : ""}`}
              onClick={() => setActiveState(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          className="sn-arrow sn-arrow-right bg-transparent border-none p-0 leading-none cursor-pointer flex-shrink-0"
          onClick={() => scroll(1)}
        >
          <span
            className="inline-flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border border-white/90 bg-[#002765] overflow-hidden"
            style={{ marginLeft: isMobile || is2K ? "0" : "11%" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div
        className="sn-main"
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "12px" : is2K ? "20px" : "16px",
          alignItems: "flex-start",
        }}
      >
        {/* ── LEFT + MIDDLE ── */}
        <div
          className="sn-left-mid"
          style={{
            flex: 1, minWidth: 0,
            display: "grid",
            gap: "12px",
            gridTemplateColumns: isMobile ? "1fr" : is2K ? "1.08fr minmax(0, 0.92fr)" : "1fr 1fr",
            gridTemplateRows: isMobile ? "auto" : "auto auto",
          }}
        >
          {/* Featured big card — priority load */}
          <div
            className="sn-featured-wrap"
            style={{ gridColumn: isMobile ? "1" : "1", gridRow: isMobile ? "auto" : "1" }}
          >
            {loading ? (
              <div style={{
                borderRadius: 8, overflow: "hidden",
                height: isMobile ? "200px" : isTablet ? "220px" : "260px",
                background: "#f0ece8", animation: "shimmer 1.4s infinite",
              }} />
            ) : featuredCard ? (
              <div
                className="sn-big-card"
                style={{
                  position: "relative", borderRadius: "8px", overflow: "hidden",
                  height: isMobile ? "200px" : isTablet ? "220px" : is2K ? "300px" : "260px",
                  cursor: "pointer",
                }}
                onClick={() => goToArticle(featuredCard)}
              >
                <ArticleImg
                  src={imgSrc(featuredCard)}
                  alt={featuredCard.title}
                  style={{ width: "100%", height: "100%" }}
                  priority={true}
                />
                <div className="sn-big-overlay" style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
                  padding: "12px",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end",
                }}>
                  <div className="sn-big-badge">
                    {getStateTagLabel(featuredCard, activeState)}
                  </div>
                  <p className="sn-big-title" style={{ fontSize: isMobile ? "12px" : "14px" }}>
                    {featuredCard.title}
                  </p>
                  <span className="sn-big-date">
                    {formatDate(featuredCard.published_at || featuredCard.created_at)}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{
                borderRadius: 8, height: isMobile ? "200px" : "260px",
                background: "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#bbb", fontSize: 13 }}>
                  {activeState ? `No articles for ${activeState} yet` : "No articles yet"}
                </span>
              </div>
            )}
          </div>

          {/* Middle 4 cards — lazy load */}
          <div
            className="sn-mid"
            style={{
              gridColumn: isMobile ? "1" : "2",
              gridRow: isMobile ? "auto" : "1 / 3",
              display: "flex", flexDirection: "column", gap: "10px",
            }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="sn-mid-card" style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flexShrink: 0, width: 100, height: 78, borderRadius: 6, background: "#f0ece8", animation: "shimmer 1.4s infinite" }} />
                    <div style={{ flex: 1 }}>
                      <Sk h="10px" w="50px" mb="5px" />
                      <Sk h="12px" w="95%" mb="4px" />
                      <Sk h="10px" w="40px" mb="0" />
                    </div>
                  </div>
                ))
              : midCards.length === 0
              ? <div style={{ color: "#bbb", fontSize: 12, padding: "8px 0" }}>No more articles</div>
              : midCards.map((card) => (
                  <div
                    className="sn-mid-card"
                    key={card.id}
                    style={{ display: "flex", gap: "8px", cursor: "pointer" }}
                    onClick={() => goToArticle(card)}
                  >
                    <div className="sn-mid-img" style={{
                      flexShrink: 0, width: "100px", height: "78px",
                      borderRadius: "6px", overflow: "hidden",
                    }}>
                      <ArticleImg
                        src={imgSrc(card)}
                        alt={card.title}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                    <div className="sn-mid-text" style={{ flex: 1, minWidth: 0 }}>
                      <span className="sn-card-tag">{getStateTagLabel(card, activeState, "STATE")}</span>
                      <p className="sn-mid-title">{card.title}</p>
                      <span className="sn-card-date">
                        {formatDate(card.published_at || card.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
          </div>

          {/* Small card — bottom left (tablet+) */}
          {!isMobile && (
            <div
              className="sn-small-card"
              style={{
                gridColumn: "1", gridRow: "2",
                display: "flex", gap: "8px",
                cursor: bottomLeftCard ? "pointer" : "default",
              }}
              onClick={() => bottomLeftCard && goToArticle(bottomLeftCard)}
            >
              {loading ? (
                <>
                  <div style={{ flexShrink: 0, width: 100, height: 78, borderRadius: 6, background: "#f0ece8", animation: "shimmer 1.4s infinite" }} />
                  <div style={{ flex: 1 }}>
                    <Sk h="10px" w="50px" mb="5px" />
                    <Sk h="12px" w="95%" mb="4px" />
                    <Sk h="10px" w="40px" mb="0" />
                  </div>
                </>
              ) : bottomLeftCard ? (
                <>
                  <div style={{ flexShrink: 0, width: "100px", height: "78px", borderRadius: "6px", overflow: "hidden" }}>
                    <ArticleImg src={imgSrc(bottomLeftCard)} alt={bottomLeftCard.title} style={{ width: "100%", height: "100%" }} />
                  </div>
                  <div className="sn-sc-text" style={{ flex: 1, minWidth: 0 }}>
                    <span className="sn-card-tag">{getStateTagLabel(bottomLeftCard, activeState, "STATE")}</span>
                    <p className="sn-sc-title">{bottomLeftCard.title}</p>
                    <span className="sn-card-date">{formatDate(bottomLeftCard.published_at || bottomLeftCard.created_at)}</span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Mobile small card */}
          {isMobile && bottomLeftCard && !loading && (
            <div
              style={{ display: "flex", gap: "8px", cursor: "pointer" }}
              onClick={() => goToArticle(bottomLeftCard)}
            >
              <div style={{ flexShrink: 0, width: "90px", height: "70px", borderRadius: "6px", overflow: "hidden" }}>
                <ArticleImg src={imgSrc(bottomLeftCard)} alt={bottomLeftCard.title} style={{ width: "100%", height: "100%" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="sn-card-tag">{getStateTagLabel(bottomLeftCard, activeState, "STATE")}</span>
                <p className="sn-sc-title">{bottomLeftCard.title}</p>
                <span className="sn-card-date">
                  {formatDate(
                    bottomLeftCard.published_at ||
                    bottomLeftCard.created_at ||
                    bottomLeftCard.date
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Bharat's Startups ── */}
        <div
          className="sn-defence"
          style={{ width: isMobile ? "100%" : isTablet ? "200px" : is2K ? "260px" : "220px", flexShrink: 0 }}
        >
          <div
            className="sn-defence-head"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/category/bharat-startups")}
          >
            Bharat's Startups
          </div>
          <div className="sn-defence-scroll" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {startupLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="sn-defence-item" style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flexShrink: 0, width: 64, height: 50, borderRadius: 5, background: "#f0ece8", animation: "shimmer 1.4s infinite" }} />
                    <div style={{ flex: 1 }}>
                      <Sk h="11px" w="95%" mb="4px" />
                      <Sk h="10px" w="40px" mb="0" />
                    </div>
                  </div>
                ))
              : sidebarItems.length === 0
              ? <div style={{ padding: "12px 0", color: "#bbb", fontSize: 12, textAlign: "center" }}>No articles yet</div>
              : sidebarItems.map((item) => (
                  <div
                    className="sn-defence-item"
                    key={item.id}
                    style={{ display: "flex", gap: "8px", cursor: "pointer" }}
                    onClick={() => goToArticle(item)}
                  >
                    <div style={{ flexShrink: 0, width: "64px", height: "50px", borderRadius: "5px", overflow: "hidden" }}>
                      <ArticleImg src={imgSrc(item)} alt={item.title} style={{ width: "100%", height: "100%" }} />
                    </div>
                    <div className="sn-di-text-wrap" style={{ flex: 1, minWidth: 0 }}>
                      <p className="sn-di-title">{item.title}</p>
                      <span className="sn-di-date">
                        {formatDate(item.published_at || item.created_at)}
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
