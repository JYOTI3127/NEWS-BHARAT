import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://api.news4bharat.com/api";

// ── State List ────────────────────────────────────────────────
const stateList = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const imgSrc = (a) => a?.image_url || a?.image || null;

const stripHtml = (html = "") => html.replace(/<[^>]*>/g, "").trim();

// ── Breakpoint Hook ───────────────────────────────────────────
const useBreakpoint = () => {
  const [bp, setBp] = useState(() => {
    if (typeof window === "undefined") return "laptop";
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    if (w < 1440) return "laptop";
    return "large";
  });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      if (w < 768) setBp("mobile");
      else if (w < 1024) setBp("tablet");
      else if (w < 1440) setBp("laptop");
      else setBp("large");
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

// ── Image with fallback ───────────────────────────────────────
function ArticleImg({ src, alt, style }) {
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
      src={src} alt={alt}
      style={{ ...style, objectFit: "cover", display: "block" }}
      onError={() => setErr(true)}
    />
  );
}

// ── Main Component ────────────────────────────────────────────
export default function StateNews() {
  const [activeState, setActiveState] = useState("Andhra Pradesh");
  const [stateArticles, setStateArticles] = useState([]);
  const [startupArticles, setStartupArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabsRef  = useRef(null);
  const navigate = useNavigate();
  const bp       = useBreakpoint();

  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  // ── Fetch all articles once ───────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/articles/`)
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : (data.results || []);

        // States of Bharat — slug: state-of-bharat
        const states = all
          .filter((a) =>
            Array.isArray(a.category_details) &&
            a.category_details.some((c) => c.slug === "state-of-bharat")
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Bharat's Startups — slug: bharat-startups
        const startups = all
          .filter((a) =>
            Array.isArray(a.category_details) &&
            a.category_details.some((c) => c.slug === "bharat-startups")
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setStateArticles(states);
        setStartupArticles(startups);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── State tab filter ──────────────────────────────────────
  // Backend mein selected_subcategories nahi hai abhi,
  // toh activeState se title/content mein match karo
  const filteredByState = stateArticles.filter((a) => {
    const text = `${a.title} ${a.subtitle || ""} ${stripHtml(a.content || "")}`.toLowerCase();
    return text.includes(activeState.toLowerCase());
  });

  // Agar koi match nahi toh saare state articles dikhao
  const displayArticles = filteredByState.length > 0 ? filteredByState : stateArticles;

  const featuredCard   = displayArticles[0] || null;
  const bottomLeftCard = displayArticles[1] || null;
  const midCards       = displayArticles.slice(2, 5);
  const sidebarItems   = startupArticles.slice(0, 6);

  const scroll = (dir) => {
    if (tabsRef.current) tabsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="sn-wrap">
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
          <span className="inline-flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border border-white/90 bg-red-600 overflow-hidden">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6L8 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <div className="sn-tabs-scroll-area" ref={tabsRef}>
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
            className="inline-flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border border-white/90 bg-red-600 overflow-hidden"
            style={{ marginLeft: isMobile ? "0" : "11%" }}
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
          gap: isMobile ? "12px" : "16px",
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
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gridTemplateRows: isMobile ? "auto" : "auto auto",
          }}
        >
          {/* Featured big card */}
          <div
            className="sn-featured-wrap"
            style={{ gridColumn: isMobile ? "1" : "1", gridRow: isMobile ? "auto" : "1" }}
          >
            {loading ? (
              <div style={{
                borderRadius: 8, overflow: "hidden",
                height: isMobile ? "200px" : isTablet ? "220px" : "260px",
                background: "#f0ece8",
                animation: "shimmer 1.4s infinite",
              }} />
            ) : featuredCard ? (
              <div
                className="sn-big-card"
                style={{
                  position: "relative", borderRadius: "8px", overflow: "hidden",
                  height: isMobile ? "200px" : isTablet ? "220px" : "260px",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/article/${featuredCard.slug}`)}
              >
                <ArticleImg
                  src={imgSrc(featuredCard)}
                  alt={featuredCard.title}
                  style={{ width: "100%", height: "100%" }}
                />
                <div className="sn-big-overlay" style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
                  padding: "12px",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end",
                }}>
                  <div className="sn-big-badge">
                    {featuredCard.category_details?.[0]?.name || "STATE NEWS"}
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
                  No articles for {activeState} yet
                </span>
              </div>
            )}
          </div>

          {/* Middle 3 cards — right column */}
          <div
            className="sn-mid"
            style={{
              gridColumn: isMobile ? "1" : "2",
              gridRow: isMobile ? "auto" : "1 / 3",
              display: "flex", flexDirection: "column", gap: "10px",
            }}
          >
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
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
                    onClick={() => navigate(`/article/${card.slug}`)}
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
                      <span className="sn-card-tag">
                        {card.category_details?.[0]?.name || "STATE"}
                      </span>
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
              onClick={() => bottomLeftCard && navigate(`/article/${bottomLeftCard.slug}`)}
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
                    <span className="sn-card-tag">{bottomLeftCard.category_details?.[0]?.name || "STATE"}</span>
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
              onClick={() => navigate(`/article/${bottomLeftCard.slug}`)}
            >
              <div style={{ flexShrink: 0, width: "90px", height: "70px", borderRadius: "6px", overflow: "hidden" }}>
                <ArticleImg src={imgSrc(bottomLeftCard)} alt={bottomLeftCard.title} style={{ width: "100%", height: "100%" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="sn-card-tag">{bottomLeftCard.category_details?.[0]?.name || "STATE"}</span>
                <p className="sn-sc-title">{bottomLeftCard.title}</p>
                <span className="sn-card-date">{formatDate(bottomLeftCard.published_at || bottomLeftCard.created_at)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Bharat's Startups ── */}
        <div
          className="sn-defence"
          style={{ width: isMobile ? "100%" : isTablet ? "200px" : "220px", flexShrink: 0 }}
        >
          <div
            className="sn-defence-head"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/category/bharat-startups")}
          >
            Bharat's Startups
          </div>
          <div className="sn-defence-scroll" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {loading
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
                    onClick={() => navigate(`/article/${item.slug}`)}
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