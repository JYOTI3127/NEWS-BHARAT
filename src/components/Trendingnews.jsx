import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = "https://news4bharat.cloud/api/articles/";
const CATEGORIES_URL = "https://news4bharat.cloud/api/categories/";

// ── Helpers ───────────────────────────────────────────────────
const stripHtml = (html = "") => html.replace(/<[^>]*>/g, "").trim();

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

// ── Icons ─────────────────────────────────────────────────────
const ArrowBtn = ({ direction, disabled, onClick }) => (
  <div
    onClick={disabled ? undefined : onClick}
    className={`w-8 h-8 min-w-[32px] flex items-center justify-center select-none ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
  >
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="#ffffff" stroke="#999999" strokeWidth="1" />
      {direction === "left"
        ? <path d="M19 10L13 16L19 22" stroke={disabled ? "#c0c0c0" : "#999999"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M13 10L19 16L13 22" stroke={disabled ? "#c0c0c0" : "#999999"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  </div>
);

const FlameSvg = () => (
  <svg width={22} height={30} viewBox="0 0 22 30">
    <path d="M11 2C11 2 5 9 5 16a6 6 0 0 0 12 0C17 9 11 2 11 2z" fill="#f9a825" />
    <path d="M11 20a2.5 2.5 0 0 1-2.5-2.5C8.5 15.5 11 12 11 12s2.5 3.5 2.5 5A2.5 2.5 0 0 1 11 20z" fill="#fff" />
  </svg>
);

if (typeof document !== "undefined" && !document.getElementById("poppins-font")) {
  const link = document.createElement("link");
  link.id = "poppins-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap";
  document.head.appendChild(link);
}

// ── API Hook ──────────────────────────────────────────────────
function useArticles() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(API_URL).then((r) => { if (!r.ok) throw new Error("Articles API error"); return r.json(); }),
      fetch(CATEGORIES_URL).then((r) => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([articleData, catData]) => {
        const published = Array.isArray(articleData)
          ? articleData
            .filter((a) => a.status === "published" || a.image_url)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          : [];

        setArticles(published);

        const fromApi = Array.isArray(catData)
          ? catData
            .filter((c) => (c.name || c.title) && c.status === "active" && c.slug && c.slug.trim() !== "")
            .map((c) => ({ name: c.name || c.title, slug: c.slug }))
          : [];

        if (fromApi.length > 0) {
          setCategories(fromApi);
        } else {
          const seen = new Set();
          const fromArticles = [];
          published.forEach((a) => {
            (a.category_details || []).forEach((cat) => {
              if (cat.name && !seen.has(cat.name)) {
                seen.add(cat.name);
                fromArticles.push({ name: cat.name, slug: cat.slug || "" });
              }
            });
          });
          setCategories(fromArticles);
        }

        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  return { articles, categories, loading, error };
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ h = "16px", w = "100%", mb = "8px" }) {
  return (
    <div style={{
      height: h, width: w, marginBottom: mb, borderRadius: 4,
      background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ── Section Header ────────────────────────────────────────────
function SecHeader({ title }) {
  return (
    <div className="tn-sec-header">
      <div className="tn-sec-bar" />
      <span className="tn-sec-title">{title}</span>
    </div>
  );
}

// ── Trending Bar ──────────────────────────────────────────────
function TrendingBar({ categories }) {
  const navigate = useNavigate();
  const GAP = 8;
  const [startIdx, setStartIdx] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const itemRefs = useRef([]);
  const outerRef = useRef(null);

  const topics = categories.length > 0 ? categories : [{ name: "Loading...", slug: "" }];

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    let px = 0;
    for (let i = 0; i < startIdx; i++) {
      const el = itemRefs.current[i];
      if (el) px += el.offsetWidth + GAP;
    }
    setTranslateX(px);
    setCanPrev(startIdx > 0);
    const outerWidth = outer.clientWidth;
    let remaining = 0;
    for (let i = startIdx; i < topics.length; i++) {
      const el = itemRefs.current[i];
      if (el) remaining += el.offsetWidth + GAP;
    }
    setCanNext(remaining - GAP > outerWidth);
  }, [startIdx, topics.length]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const outerWidth = outer.clientWidth;
    let total = 0;
    for (let i = 0; i < topics.length; i++) {
      const el = itemRefs.current[i];
      if (el) total += el.offsetWidth + GAP;
    }
    setCanNext(total - GAP > outerWidth);
  }, [topics.length]);

  return (
    <div className="tn-trending-bar">
      <div className="tn-trending-label">
        <div className="tn-trending-label-line">TRENDING NEWS :</div>
      </div>
      <ArrowBtn direction="left" disabled={!canPrev} onClick={() => setStartIdx((i) => i - 1)} />
      <div ref={outerRef} style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", gap: `${GAP}px`,
          transform: `translateX(-${translateX}px)`,
          transition: "transform 0.35s ease", width: "max-content",
        }}>
          {topics.map((cat, i) => (
            <button
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className="tn-topic-btn"
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
              onClick={() => { if (cat.slug) navigate(`/category/${cat.slug}`); }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <ArrowBtn direction="right" disabled={!canNext} onClick={() => setStartIdx((i) => i + 1)} />
    </div>
  );
}

// ── Latest News ───────────────────────────────────────────────
function LatestNews({ articles, loading }) {
  const [startIdx, setStartIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [exitIdx, setExitIdx] = useState(null);
  const [tick, setTick] = useState(0);
  const pausedRef = useRef(false);
  const timerRef = useRef(null);

  const VISIBLE = 3;

  const getVisible = (from) => {
    if (articles.length === 0) return [];
    return Array.from({ length: VISIBLE }, (_, i) => articles[(from + i) % articles.length]);
  };

  const visibleArticles = getVisible(startIdx);

  useEffect(() => {
    if (loading || articles.length <= VISIBLE) return;
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        if (pausedRef.current) { schedule(); return; }
        setExitIdx(0);
        setAnimating(true);
        setTimeout(() => {
          setStartIdx((prev) => (prev + 1) % articles.length);
          setTick((t) => t + 1);
          setExitIdx(null);
          setAnimating(false);
          schedule();
        }, 500);
      }, 3000);
    };
    schedule();
    return () => clearTimeout(timerRef.current);
  }, [loading, articles.length]);

  return (
    <div className="tn-latest-news">
      <SecHeader title="LATEST NEWS" />
      <style>{`
        @keyframes slideOutUp {
          from { opacity: 1; transform: translateY(0); max-height: 120px; }
          to   { opacity: 0; transform: translateY(-20px); max-height: 0; padding-top: 0; padding-bottom: 0; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes leftLineGrow {
          from { height: 0%; }
          to   { height: 100%; }
        }
        .news-item-exit { animation: slideOutUp 0.45s ease forwards; overflow: hidden; }
        .news-item-enter { animation: slideInUp 0.45s ease forwards; }
        .news-ticker-item:hover .news-ticker-title { color: #D80100 !important; }
        .news-ticker-title { transition: color 0.2s ease; }
        .tn-article-link {
          text-decoration: none;
          color: inherit;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          width: 100%;
        }
      `}</style>

      {loading ? (
        <div className="tn-latest-scroll">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0" }}>
              <Skeleton h="13px" w="85%" mb="7px" />
              <Skeleton h="11px" w="65%" mb="0" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div style={{ padding: 16, color: "#999", fontSize: 13 }}>No articles found.</div>
      ) : (
        <div
          className="tn-latest-scroll"
          style={{ overflowY: "auto", position: "relative" }}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "#f0f0f0", zIndex: 1 }}>
            <div key={tick} style={{ width: "100%", background: "#D80100", animation: "leftLineGrow 3s linear forwards" }} />
          </div>

          {visibleArticles.map((article, i) => {
            const desc = article.subtitle ? article.subtitle : stripHtml(article.content);
            const isTop = i === 0;
            const isExiting = animating && i === exitIdx;
            const isEntering = animating && i === VISIBLE - 1;
            const hasImage = !!article.image_url;

            // ✅ Link component — same tab click + right click "Open in new tab" + Ctrl+Click dono
            const Wrapper = hasImage
              ? ({ children }) => (
                  <Link
                    to={`/article/${article.slug}`}
                    className={`tn-article-link news-ticker-item${isExiting ? " news-item-exit" : isEntering ? " news-item-enter" : ""}`}
                    style={{
                      padding: "11px 14px 11px 18px",
                      borderBottom: i < VISIBLE - 1 ? "1px solid #f0f0f0" : "none",
                      background: isTop ? "#fff8f8" : "#fff",
                    }}
                  >
                    {children}
                  </Link>
                )
              : ({ children }) => (
                  <div
                    className={`news-ticker-item${isExiting ? " news-item-exit" : isEntering ? " news-item-enter" : ""}`}
                    style={{
                      padding: "11px 14px 11px 18px",
                      borderBottom: i < VISIBLE - 1 ? "1px solid #f0f0f0" : "none",
                      display: "flex", gap: 12, alignItems: "flex-start",
                      background: isTop ? "#fff8f8" : "#fff",
                      cursor: "default",
                    }}
                  >
                    {children}
                  </div>
                );

            return (
              <Wrapper key={`${article.id}-${startIdx}-${i}`}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#D80100", fontFamily: "Poppins, sans-serif", lineHeight: "1.4", flexShrink: 0, marginTop: 1 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="news-ticker-title tn-latest-item-title" style={{ fontWeight: isTop ? 700 : 600, color: isTop ? "#111" : "#222", lineHeight: "1.4" }}>
                    {article.title || "Untitled"}
                  </div>
                  <div className="tn-latest-item-desc" style={{ marginTop: 4, lineHeight: "1.5" }}>
                    {desc.slice(0, 120)}{desc.length > 120 ? "..." : ""}
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Feature Cards ─────────────────────────────────────────────
function FeatureCards({ articles, loading }) {
  const [page, setPage] = useState(0);
  const [animDir, setAnimDir] = useState(null);
  const timerRef = useRef(null);

  const withImage = articles.filter((a) => a.image_url);
  const totalPages = Math.ceil(withImage.length / 3);

  useEffect(() => {
    if (loading || withImage.length === 0) return;
    timerRef.current = setInterval(() => {
      setPage((prev) => {
        const next = (prev + 1) % totalPages;
        setAnimDir("out");
        setTimeout(() => { setPage(next); setAnimDir("in"); setTimeout(() => setAnimDir(null), 400); }, 300);
        return prev;
      });
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [loading, withImage.length, totalPages]);

  const cards = withImage.slice(page * 3, page * 3 + 3);

  const transitionStyle = {
    opacity: animDir === "out" ? 0 : 1,
    transform: animDir === "out" ? "translateY(10px)" : "translateY(0px)",
    transition: "opacity 0.35s ease, transform 0.35s ease",
  };

  if (loading) {
    return (
      <div className="tn-feature-cards">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="tn-feature-card">
            <div className="tn-feature-card-img-wrap" style={{ background: "#e8e8e8" }} />
            <div className="tn-feature-card-body" style={{ padding: "10px 12px" }}>
              <Skeleton h="13px" w="90%" mb="4px" />
              <Skeleton h="11px" w="70%" mb="0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="tn-feature-cards" style={transitionStyle}>
        {cards.map((card) => (
          // ✅ Link component — same tab + right click new tab + Ctrl+Click dono
          <Link
            key={card.id}
            to={`/article/${card.slug}`}
            className="tn-feature-card"
            style={{ textDecoration: "none", color: "inherit", display: "block", cursor: "pointer" }}
          >
            <div className="tn-feature-card-img-wrap">
              <img
                src={card.image_url}
                alt={card.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
            <div className="tn-feature-card-body">
              <div className="tn-feature-card-title">{card.title}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── 60 Seconds ────────────────────────────────────────────────
function LiveUpdates({ articles, loading }) {
  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const autoScrollRef = useRef(true);

  const sixtyArticles = articles.filter((a) =>
    Array.isArray(a.category_details) &&
    a.category_details.some((c) => c.slug === "60-second-read")
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const step = () => {
      if (autoScrollRef.current) {
        frame++;
        if (frame % 3 === 0) {
          el.scrollTop += 1;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight) el.scrollTop = 0;
        }
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="tn-live-updates">
      <SecHeader title="60 SECONDS" />
      <div
        className="tn-live-scroll"
        ref={scrollRef}
        onMouseEnter={() => { autoScrollRef.current = false; }}
        onMouseLeave={() => { autoScrollRef.current = true; }}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
              <Skeleton h="11px" w="50px" mb="6px" />
              <Skeleton h="11px" w="95%" mb="0" />
            </div>
          ))
          : sixtyArticles.length === 0
            ? <div style={{ padding: 16, color: "#999", fontSize: 13 }}>No articles found.</div>
            : sixtyArticles.map((item) => {
              const text = item.subtitle ? item.subtitle : stripHtml(item.content);
              const hasImage = !!item.image_url;
              return hasImage ? (
                // ✅ Link component — same tab + right click new tab + Ctrl+Click dono
                <Link
                  key={item.id}
                  to={`/article/${item.slug}`}
                  className="tn-live-item group cursor-pointer"
                  style={{ textDecoration: "none", color: "inherit", display: "flex" }}
                >
                  <div className="tn-live-dot group-hover:bg-[#D80100] transition-colors duration-300" />
                  <div>
                    <div className="tn-live-item-title group-hover:text-[#D80100] transition-colors duration-300"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.title}
                    </div>
                    <div className="tn-live-item-text group-hover:text-[#D80100] transition-colors duration-300"
                      style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {text}
                    </div>
                  </div>
                </Link>
              ) : (
                <div key={item.id} className="tn-live-item group cursor-default">
                  <div className="tn-live-dot" />
                  <div>
                    <div className="tn-live-item-title"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.title}
                    </div>
                    <div className="tn-live-item-text"
                      style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {text}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ── Banner ────────────────────────────────────────────────────
const bannerSlides = [
  {
    leftBgClass: "bg-[#1e5c42]", brand1: "PRATIYOGITA", brand2: "DARPAN",
    price: "PRICE ₹125.00", date: "FEBRUARY 2024", tagline: "WHERE EXCELLENCE GUIDES THE SUCCESS",
    midBgClass: "bg-[#f5a000]", midTag: "Semi Annual", midBoxBgClass: "bg-[#6a1fa2]",
    midL1: "Current", midL2: "Affairs", midL3: "Special",
    rightBgClass: "bg-[#f5e000]", rl: "MOST USEFUL FOR", rb: "UNION & STATE", rs: "CIVIL SERVICES EXAM",
  },
  {
    leftBgClass: "bg-[#0d3b6e]", brand1: "COMPETITION", brand2: "TIMES",
    price: "PRICE ₹150.00", date: "MARCH 2024", tagline: "YOUR GATEWAY TO SUCCESS",
    midBgClass: "bg-[#e53935]", midTag: "Annual", midBoxBgClass: "bg-[#b71c1c]",
    midL1: "General", midL2: "Knowledge", midL3: "Special",
    rightBgClass: "bg-[#b2fab4]", rl: "BEST RESOURCE FOR", rb: "SSC & BANKING", rs: "EXAMINATION PREP",
  },
  {
    leftBgClass: "bg-[#1a1a2e]", brand1: "CAREER", brand2: "LAUNCHER",
    price: "PRICE ₹99.00", date: "APRIL 2024", tagline: "LAUNCHING CAREERS SINCE 1995",
    midBgClass: "bg-[#7b1fa2]", midTag: "Monthly", midBoxBgClass: "bg-[#4a148c]",
    midL1: "Reasoning", midL2: "& Aptitude", midL3: "Special",
    rightBgClass: "bg-[#ffe082]", rl: "TOP CHOICE FOR", rb: "UPSC & STATE PSC", rs: "ASPIRANTS NATIONWIDE",
  },
];

function Banner() {
  const [cur, setCur] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setCur((c) => (c + 1) % bannerSlides.length); setFading(false); }, 350);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const s = bannerSlides[cur];
  return (
    <div className="tn-banner">
      <div className={`tn-banner-slide transition-all duration-300 ease-out ${fading ? "opacity-0 translate-y-[6px]" : "opacity-100 translate-y-0"}`}>
        <div className={`tn-banner-left ${s.leftBgClass}`}>
          <div className="tn-banner-left-redbar" />
          <div className="tn-banner-left-greenbar" />
          <div className="tn-banner-left-content">
            <div className="tn-banner-meta">{s.price}</div>
            <div className="tn-banner-meta">{s.date}</div>
            <div className="tn-banner-brands">
              <div>
                <div className="tn-banner-brand-name">{s.brand1}</div>
                <div className="tn-banner-brand-name">{s.brand2}</div>
              </div>
              <FlameSvg />
            </div>
            <div className="tn-banner-tagline">{s.tagline}</div>
          </div>
        </div>
        <div className={`tn-banner-mid ${s.midBgClass}`}>
          <div className="tn-banner-mid-tag">{s.midTag}</div>
          <div className={`tn-banner-mid-box ${s.midBoxBgClass}`}>
            <div className="tn-banner-mid-line">{s.midL1}</div>
            <div className="tn-banner-mid-line">{s.midL2}</div>
            <div className="tn-banner-mid-line">{s.midL3}</div>
          </div>
        </div>
        <div className={`tn-banner-right ${s.rightBgClass}`}>
          <div className="tn-banner-right-label">{s.rl}</div>
          <div className="tn-banner-right-main">{s.rb}</div>
          <div className="tn-banner-right-sub">{s.rs}</div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export default function TrendingNews() {
  const { articles, categories, loading, error } = useArticles();
  const is4K = useIs4K();

  return (
    <div className={`tn-page${is4K ? " tn-page-4k" : ""}`}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      <TrendingBar categories={categories} />

      {error && (
        <div style={{ background: "#fff3f3", color: "#c00", padding: "8px 16px", fontSize: 13, fontFamily: "Poppins,sans-serif" }}>
          ⚠️ API Error: {error}
        </div>
      )}

      <div className="tn-inner">
        <div className="tn-grid">
          <div className="col-news">
            <LatestNews articles={articles} loading={loading} />
          </div>
          <div className="col-cards">
            <FeatureCards articles={articles} loading={loading} />
          </div>
          <div className="col-live">
            <LiveUpdates articles={articles} loading={loading} />
          </div>
        </div>
        <Banner />
      </div>
    </div>
  );
}
