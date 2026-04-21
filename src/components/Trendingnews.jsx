import { useState, useEffect, useMemo, useRef, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const SIXTY_SECONDS_URL = apiUrl("/articles/?category=60-second-read&page=1&limit=10");

// ── Helpers ───────────────────────────────────────────────────
const stripHtml = (html = "") => html.replace(/<[^>]*>/g, "").trim();
const getArticleImage         = (a) => a?.image_url || a?.image || "";
const getArticleFallbackImage = (a) => a?.image || a?.image_url || "";
const INDIA_TZ = "Asia/Kolkata";

const getArticleDateValue = (article) => {
  const raw = article?.published_date || article?.published_at || article?.created_at || null;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatIndiaDateKey = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(value);

const indiaMidnight = (dateKey) => new Date(`${dateKey}T00:00:00+05:30`);

// ✅ This week ka filter — Sunday se aaj tak (India timezone)
const isArticleFromThisWeekInIndia = (article) => {
  const articleDate = getArticleDateValue(article);
  if (!articleDate) return false;
  const now = new Date();
  if (articleDate.getTime() > now.getTime()) return false;

  const todayStr = formatIndiaDateKey(now);
  const todayIndia = indiaMidnight(todayStr);
  const dayOfWeek = todayIndia.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  const weekStart = new Date(todayIndia);
  weekStart.setUTCDate(todayIndia.getUTCDate() - dayOfWeek);

  const articleStr = formatIndiaDateKey(articleDate);
  const articleDay = indiaMidnight(articleStr);

  return articleDay.getTime() >= weekStart.getTime();
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
// ek hook — teen alag resize listeners ki jagah
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

// ── Latest News (All About This Week) ────────────────────────
const LatestNews = memo(({ articles, loading, is2K }) => {
  const visibleArticles = useMemo(
    () => articles.filter(isArticleFromThisWeekInIndia),
    [articles]
  );
  const scrollRef = useRef(null);
  const itemRefs = useRef([]);
  const getDesc = (article) =>
    article?.subtitle ||
    article?.summary ||
    article?.excerpt ||
    article?.description ||
    "";

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, visibleArticles.length);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [visibleArticles.length]);

  useEffect(() => {
    if (loading || visibleArticles.length <= 1) return undefined;

    let currentIndex = 0;
    const timer = window.setInterval(() => {
      currentIndex = (currentIndex + 1) % visibleArticles.length;
      const scrollNode = scrollRef.current;
      const nextItem = itemRefs.current[currentIndex];

      if (!scrollNode || !nextItem) return;
      scrollNode.scrollTo({
        top: nextItem.offsetTop,
        behavior: "smooth",
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [loading, visibleArticles.length]);

  return (
    <div
      className="tn-latest-news"
      style={is2K ? { maxHeight: 430, padding: 18 } : undefined}
    >
      <SecHeader title="All About This Week" />
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
        <div style={{ padding: 16, color: "#999", fontSize: 13 }}>No articles found for this week.</div>
      ) : (
        <div
          ref={scrollRef}
          className="tn-latest-scroll"
          style={{ overflowY: "auto", position: "relative", ...(is2K ? { maxHeight: 300 } : {}) }}
        >
          {visibleArticles.map((article, index) => {
            const articlePath = getArticlePath(article);
            const desc = getDesc(article);

            return (
              <Link
                key={article.id || article.slug || index}
                ref={(node) => { itemRefs.current[index] = node; }}
                to={articlePath || "#"}
                className="tn-latest-item news-ticker-item"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
                onClick={(event) => { if (!articlePath) event.preventDefault(); }}
              >
                <div className="news-ticker-title tn-latest-item-title" style={{ fontWeight: 800, color: "#111", lineHeight: "1.35", fontSize: is2K ? 18 : undefined }}>
                  {article.title || "Untitled"}
                </div>
                {desc ? (
                  <div className="tn-latest-item-desc" style={{ marginTop: 7, lineHeight: "1.55", WebkitLineClamp: 2 }}>
                    {desc.slice(0, 130)}{desc.length > 130 ? "..." : ""}
                  </div>
                ) : null}
                {formatArticleDateTime(article) && (
                  <div style={{ marginTop: 6, color: "#6b7280", fontSize: 11, fontWeight: 700, lineHeight: "1.4", fontFamily: "Poppins, sans-serif" }}>
                    {formatArticleDateTime(article)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Feature Cards ─────────────────────────────────────────────
const FeatureCards = memo(({ articles, loading, is2K }) => {
  const CARDS_PER_PAGE = 2;
  const [page, setPage]       = useState(0);
  const [animDir, setAnimDir] = useState(null);
  const timerRef = useRef(null);

  // ✅ Saare articles dikhao — sirf image filter, today filter nahi
  const withImage = useMemo(
    () => articles.filter((a) => getArticleImage(a)),
    [articles]
  );
  const totalPages = Math.ceil(withImage.length / CARDS_PER_PAGE);
  const safePage = totalPages > 0 ? page % totalPages : 0;

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

  const cards = withImage.slice(
    safePage * CARDS_PER_PAGE,
    safePage * CARDS_PER_PAGE + CARDS_PER_PAGE
  );
  const transitionStyle = {
    opacity:   animDir === "out" ? 0 : 1,
    transform: animDir === "out" ? "translateY(10px)" : "translateY(0px)",
    transition: "opacity 0.35s ease, transform 0.35s ease",
  };

  if (loading) {
    return (
      <div className="tn-feature-cards">
        {Array.from({ length: CARDS_PER_PAGE }).map((_, i) => (
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
        <div style={{ padding: 16, color: "#999", fontSize: 13 }}>No articles found.</div>
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
        const sorted = list.sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));
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

// ── Banner ────────────────────────────────────────────────────
// ── Main Component ────────────────────────────────────────────
export default function TrendingNews({ articles: passedArticles = [], categories: passedCategories = [], loading: passedLoading = false }) {
  const { is4K, is2K, is320 } = useScreenSize();

  const articles = useMemo(() => {
    const list = Array.isArray(passedArticles) ? passedArticles : passedArticles?.results || [];
    return list
      .filter((a) => a.status === "published" || a.image_url)
      .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));
  }, [passedArticles]);

  const categories = useMemo(() => {
    if (Array.isArray(passedCategories) && passedCategories.length > 0) {
      return passedCategories
        .filter((c) => (c.name || c.title) && c.status === "active" && c.slug?.trim())
        .map((c) => ({ name: c.name || c.title, slug: c.slug }));
    }
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
