import { useState, useEffect, useMemo, useRef, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const SIXTY_SECONDS_URL = apiUrl("/articles/?category=60-second-read");

// ── Helpers ───────────────────────────────────────────────────
const stripHtml = (html = "") => html.replace(/<[^>]*>/g, "").trim();
const getArticleImage         = (a) => a?.image_url || a?.image || "";
const getArticleFallbackImage = (a) => a?.image || a?.image_url || "";
const INDIA_TZ = "Asia/Kolkata";

const getArticleDateValue = (article) => {
  const raw = article?.published_at || article?.created_at || null;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatIndiaDateKey = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(value);

const isArticleFromTodayInIndia = (article) => {
  const articleDate = getArticleDateValue(article);
  if (!articleDate) return false;
  const now = new Date();
  if (articleDate.getTime() > now.getTime()) return false;
  return formatIndiaDateKey(articleDate) === formatIndiaDateKey(now);
};

const formatArticleDateTime = (article) => {
  const date = getArticleDateValue(article);
  if (!date) return "";

  const datePart = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timePart = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${datePart} | ${timePart}`.replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());
};

// ─────────────────────────────────────────────
// ✅ FIX 1: Teen alag hooks → ek hook
// Pehle: 3 alag resize listeners
// Ab: ek listener, ek state
// ─────────────────────────────────────────────
const useScreenSize = () => {
  const getSize = () => {
    if (typeof window === "undefined") return { is4K: false, is2K: false, is320: false };
    const w = window.innerWidth;
    return {
      is4K:  w > 2560,
      is2K:  w >= 1441 && w <= 2560,
      is320: w <= 320,
    };
  };
  const [size, setSize] = useState(getSize);
  useEffect(() => {
    const onResize = () => setSize(getSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
};

// ── Icons ─────────────────────────────────────────────────────
const ArrowBtn = memo(({ direction, disabled, onClick, compact = false }) => (
  <div
    onClick={disabled ? undefined : onClick}
    className={`${compact ? "w-[26px] h-[26px] min-w-[26px]" : "w-8 h-8 min-w-[32px]"} flex items-center justify-center select-none ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
  >
    <svg width={compact ? "26" : "32"} height={compact ? "26" : "32"} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="#ffffff" stroke="#999999" strokeWidth="1" />
      {direction === "left"
        ? <path d="M19 10L13 16L19 22" stroke={disabled ? "#c0c0c0" : "#999999"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M13 10L19 16L13 22" stroke={disabled ? "#c0c0c0" : "#999999"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  </div>
));

const FlameSvg = memo(() => (
  <svg width={22} height={30} viewBox="0 0 22 30">
    <path d="M11 2C11 2 5 9 5 16a6 6 0 0 0 12 0C17 9 11 2 11 2z" fill="#f9a825" />
    <path d="M11 20a2.5 2.5 0 0 1-2.5-2.5C8.5 15.5 11 12 11 12s2.5 3.5 2.5 5A2.5 2.5 0 0 1 11 20z" fill="#fff" />
  </svg>
));

// ── Skeleton ──────────────────────────────────────────────────
const Skeleton = memo(({ h = "16px", w = "100%", mb = "8px" }) => (
  <div style={{
    height: h, width: w, marginBottom: mb, borderRadius: 4,
    background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
    backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
  }} />
));

// ── Section Header ────────────────────────────────────────────
const SecHeader = memo(({ title }) => (
  <div className="tn-sec-header">
    <div className="tn-sec-bar" />
    <span className="tn-sec-title">{title}</span>
  </div>
));

// ── Trending Bar ──────────────────────────────────────────────
const TrendingBar = memo(({ categories, is2K, is320 }) => {
  const navigate  = useNavigate();
  const scrollRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const topics = categories.length > 0 ? categories : [{ name: "Loading...", slug: "" }];

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const updateButtons = () => {
      const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
      setCanPrev(node.scrollLeft > 4);
      setCanNext(node.scrollLeft < maxScrollLeft - 4);
    };
    updateButtons();
    node.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    return () => {
      node.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [topics.length]);

  const scrollTopics = (direction) => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(node.clientWidth * 0.72, 120), behavior: "smooth" });
  };

  return (
    <div
      className="tn-trending-bar"
      style={is2K ? { width: "min(1820px, calc(100% - 96px))", margin: "0 auto", padding: "18px 0 8px", height: "auto", gap: 12 } : undefined}
    >
      <div className="tn-trending-label">
        <div className="tn-trending-label-line">{is320 ? "TRENDING :" : "TRENDING NEWS :"}</div>
      </div>
      <ArrowBtn compact={is320} direction="left" disabled={!canPrev} onClick={() => scrollTopics(-1)} />
      <div ref={scrollRef} style={{ overflowX: "auto", overflowY: "hidden", flex: 1, minWidth: 0, maxWidth: is320 ? "184px" : undefined, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div style={{ display: "flex", gap: `${is320 ? 6 : 8}px`, width: "max-content" }}>
          {topics.map((cat, i) => (
            <button key={i} className="tn-topic-btn" style={{ whiteSpace: "nowrap", flexShrink: 0 }} onClick={() => { if (cat.slug) navigate(`/category/${cat.slug}`); }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div style={is320 ? { marginLeft: "2px" } : undefined}>
        <ArrowBtn compact={is320} direction="right" disabled={!canNext} onClick={() => scrollTopics(1)} />
      </div>
    </div>
  );
});

// ── Latest News ───────────────────────────────────────────────
const LatestNews = memo(({ articles, loading, is2K }) => {
  const visibleArticles = articles.slice(0, 5);

  return (
    <div
      className="tn-latest-news"
      style={is2K ? { maxHeight: 430, padding: 18 } : undefined}
    >
      <SecHeader title="LATEST NEWS" />
      <style>{`
        .news-ticker-item:hover .news-ticker-title { color: #D80100 !important; }
        .news-ticker-title { transition: color 0.2s ease; }
        .tn-article-link { text-decoration: none; color: inherit; display: flex; gap: 12px; align-items: flex-start; width: 100%; }
      `}</style>

      {loading ? (
        <div className="tn-latest-scroll">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0" }}>
              <Skeleton h="13px" w="85%" mb="7px" />
              <Skeleton h="11px" w="65%" mb="0" />
            </div>
          ))}
        </div>
      ) : visibleArticles.length === 0 ? (
        <div style={{ padding: 16, color: "#999", fontSize: 13 }}>No articles found.</div>
      ) : (
        <div className="tn-latest-scroll" style={{ overflowY: "auto", position: "relative", ...(is2K ? { maxHeight: 300 } : {}) }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "#f0f0f0", zIndex: 1 }}>
            <div style={{ width: "100%", height: "100%", background: "#D80100" }} />
          </div>
          {visibleArticles.map((article, i) => {
            const desc =
              article.subtitle ||
              article.summary ||
              article.excerpt ||
              article.description ||
              "";
            const isTop   = i === 0;
            const hasImage = !!article.image_url;
            const itemStyle = {
              padding: "11px 14px 11px 18px",
              borderBottom: i < visibleArticles.length - 1 ? "1px solid #f0f0f0" : "none",
              background: isTop ? "#fff8f8" : "#fff",
            };
            const inner = (
              <>
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
                  {formatArticleDateTime(article) && (
                    <div style={{ marginTop: 4, color: "#6b7280", fontSize: 11, fontWeight: 600, lineHeight: "1.4", fontFamily: "Poppins, sans-serif" }}>
                      {formatArticleDateTime(article)}
                    </div>
                  )}
                </div>
              </>
            );

            return hasImage ? (
              <Link key={article.id || `${article.slug}-${i}`} to={getArticlePath(article)} className="tn-article-link news-ticker-item" style={itemStyle}>
                {inner}
              </Link>
            ) : (
              <div key={article.id || `${article.slug}-${i}`} className="news-ticker-item" style={{ ...itemStyle, display: "flex", gap: 12, alignItems: "flex-start", cursor: "default" }}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Feature Cards ─────────────────────────────────────────────
const FeatureCards = memo(({ articles, loading, is2K }) => {
  const [page, setPage]       = useState(0);
  const [animDir, setAnimDir] = useState(null);
  const timerRef = useRef(null);

  const withImage = useMemo(
    () => articles.filter((a) => getArticleImage(a) && isArticleFromTodayInIndia(a)),
    [articles]
  );
  const totalPages = Math.ceil(withImage.length / 3);

  useEffect(() => { setPage(0); }, [withImage.length]);

  useEffect(() => {
    if (loading || withImage.length === 0) return;
    timerRef.current = setInterval(() => {
      setAnimDir("out");
      setTimeout(() => {
        setPage((prev) => (prev + 1) % totalPages);
        setAnimDir("in");
        setTimeout(() => setAnimDir(null), 400);
      }, 300);
    }, 12000);
    return () => clearInterval(timerRef.current);
  }, [loading, withImage.length, totalPages]);

  const cards = withImage.slice(page * 3, page * 3 + 3);
  const transitionStyle = {
    opacity:   animDir === "out" ? 0 : 1,
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
      {withImage.length === 0 && (
        <div style={{ padding: 16, color: "#999", fontSize: 13 }}>No today posts found.</div>
      )}
      <div className="tn-feature-cards" style={{ ...transitionStyle, ...(is2K ? { height: 430 } : {}) }}>
        {cards.map((card, i) => (
          <Link key={card.id} to={getArticlePath(card)} className="tn-feature-card" style={{ textDecoration: "none", color: "inherit", display: "block", cursor: "pointer" }}>
            <div className="tn-feature-card-img-wrap">
              <img
                src={getArticleImage(card)}
                alt={card.title}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                decoding="async"
                width={360} height={220}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  const fallback = getArticleFallbackImage(card);
                  if (fallback && e.currentTarget.src !== fallback) { e.currentTarget.src = fallback; return; }
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="tn-feature-card-body">
              <div className="tn-feature-card-title">{card.title}</div>
              {formatArticleDateTime(card) && (
                <div style={{ marginTop: 6, color: "#6b7280", fontSize: 11, fontWeight: 600, lineHeight: "1.4", fontFamily: "Poppins, sans-serif" }}>
                  {formatArticleDateTime(card)}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

// ── 60 Seconds ────────────────────────────────────────────────
const LiveUpdates = memo(({ is2K }) => {
  const scrollRef     = useRef(null);
  const animRef       = useRef(null);
  const autoScrollRef = useRef(true);
  const [sixtyArticles, setSixtyArticles] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    let ignore = false;
    fetch(SIXTY_SECONDS_URL)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data) => {
        if (ignore) return;
        const list   = Array.isArray(data) ? data : data?.results || [];
        const sorted = list.sort((a, b) => new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0));
        setSixtyArticles(sorted);
        setLoading(false);
      })
      .catch(() => { if (!ignore) { setSixtyArticles([]); setLoading(false); } });
    return () => { ignore = true; };
  }, []);

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
    <div className="tn-live-updates" style={is2K ? { height: "360px", padding: "18px 14px 18px 16px" } : undefined}>
      <SecHeader title="60 SECONDS" />
      <div
        className="tn-live-scroll"
        ref={scrollRef}
        style={is2K ? { maxHeight: 300, paddingBottom: 14, boxSizing: "border-box" } : undefined}
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
                const text     = item.subtitle ? item.subtitle : stripHtml(item.content);
                const hasImage = !!item.image_url;
                const inner = (
                  <>
                    <div className="tn-live-dot" />
                    <div>
                      <div className="tn-live-item-title" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.title}</div>
                      <div className="tn-live-item-text" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{text}</div>
                      {formatArticleDateTime(item) ? (
                        <div style={{ marginTop: 5, color: "#6b7280", fontSize: 11, fontWeight: 600, lineHeight: "1.4", fontFamily: "Poppins, sans-serif" }}>
                          {formatArticleDateTime(item)}
                        </div>
                      ) : null}
                    </div>
                  </>
                );
                return hasImage ? (
                  <Link key={item.id} to={getArticlePath(item)} className="tn-live-item group cursor-pointer" style={{ textDecoration: "none", color: "inherit", display: "flex" }}>
                    {inner}
                  </Link>
                ) : (
                  <div key={item.id} className="tn-live-item group cursor-default">{inner}</div>
                );
              })}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// ✅ FIX 2: Banner — alag memo component
// Pehle: Banner ke setInterval se poora TrendingNews re-render hota tha
// Ab: sirf Banner re-render hoga har 3 sec mein
// ─────────────────────────────────────────────
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

const Banner = memo(() => {
  const [cur, setCur]       = useState(0);
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
});

// ─────────────────────────────────────────────
// ✅ FIX 3: Main component — props se data lo
// Pehle: useArticles() apna alag useQuery chalaata tha
// Ab: Home.jsx se articles + categories props mein aate hain
// = zero extra API calls!
// ─────────────────────────────────────────────
export default function TrendingNews({ articles: passedArticles = [], categories: passedCategories = [], loading: passedLoading = false }) {
  const { is4K, is2K, is320 } = useScreenSize();

  // ✅ Articles — props se, process karo ek baar
  const articles = useMemo(() => {
    const list = Array.isArray(passedArticles) ? passedArticles : passedArticles?.results || [];
    return list
      .filter((a) => a.status === "published" || a.image_url)
      .sort((a, b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0));
  }, [passedArticles]);

  // ✅ Categories — props se
  const categories = useMemo(() => {
    if (Array.isArray(passedCategories) && passedCategories.length > 0) {
      return passedCategories
        .filter((c) => (c.name || c.title) && c.status === "active" && c.slug?.trim())
        .map((c) => ({ name: c.name || c.title, slug: c.slug }));
    }
    // Fallback: articles se nikalo
    const seen = new Set();
    const result = [];
    articles.forEach((article) => {
      (article.category_details || []).forEach((cat) => {
        if (cat.name && !seen.has(cat.name)) {
          seen.add(cat.name);
          result.push({ name: cat.name, slug: cat.slug || "" });
        }
      });
    });
    return result;
  }, [passedCategories, articles]);

  const twoKInnerStyle = is2K ? { width: "min(1820px, calc(100% - 96px))", maxWidth: "none", margin: "0 auto", padding: "34px 0 38px" } : undefined;
  const twoKGridStyle  = is2K ? { gridTemplateColumns: "560px minmax(0, 1fr) 260px", gap: "18px", height: "360px", alignItems: "stretch" } : undefined;

  return (
    <div className={`tn-page${is2K ? " tn-page-2k" : ""}${is4K ? " tn-page-4k" : ""}`}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      <TrendingBar categories={categories} is2K={is2K} is320={is320} />

      <div className="tn-inner" style={twoKInnerStyle}>
        <div className="tn-grid" style={twoKGridStyle}>
          <div className="col-news">
            <LatestNews articles={articles} loading={passedLoading} is2K={is2K} />
          </div>
          <div className="col-cards">
            <FeatureCards articles={articles} loading={passedLoading} is2K={is2K} />
          </div>
          {!is320 && (
            <div className="col-live">
              <LiveUpdates is2K={is2K} />
            </div>
          )}
        </div>

        {is320 && (
          <div className="tn-live-mobile">
            <LiveUpdates />
          </div>
        )}
      </div>
    </div>
  );
}
