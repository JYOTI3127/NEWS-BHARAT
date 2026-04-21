import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAbsoluteArticleUrl, getArticlePath } from "../lib/articleUrl";
import { formatArticleDateTimeIST, getArticleDateValue } from "../lib/api";

const getCategoryLabel = (article) => {
  if (article?.primary_category?.name) return article.primary_category.name;

  const details = Array.isArray(article?.category_details) ? article.category_details : [];
  const rawCategory = article?.category;
  const directCategory =
    rawCategory && typeof rawCategory === "object"
      ? String(rawCategory?.name || rawCategory?.slug || "").trim()
      : String(rawCategory || "").trim();

  const breakingCategory = details.find((cat) => {
    const slug = String(cat?.slug || "").trim().toLowerCase();
    const name = String(cat?.name || "").trim().toLowerCase();
    return slug === "breaking-news" || name === "breaking news";
  });

  if (breakingCategory?.name) return breakingCategory.name;
  if (details[0]?.name) return details[0].name;
  if (directCategory) return directCategory;
  return "News";
};

const timeAgo = (article) => {
  const dateStr = getArticleDateValue(article);
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  if (mins > 0) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  return "Just now";
};

const isTodayArticle = (article) => {
  const dateStr = getArticleDateValue(article);
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const ArrowCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="10 8 14 12 10 16" />
  </svg>
);

const ShareCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <g transform="translate(5.5, 5.5) scale(0.54)">
      <circle cx="18" cy="5" r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <circle cx="6" cy="12" r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <circle cx="18" cy="19" r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeWidth="2" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeWidth="2" />
    </g>
  </svg>
);

// ✅ API fetch function — alag rakha taaki sab components share kar sakein
export default function NewsBanner({ articles = [], loading = false }) {
  const navigate = useNavigate();
  const touchStartX = useRef(null);
  const touchCurrentX = useRef(null);
  const isSwipeRef = useRef(false);
  const hasDispatchedReadyRef = useRef(false);

  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [is320, setIs320] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 320 : false
  );
  const supportsPointerEvents = typeof window !== "undefined" && !!window.PointerEvent;

  // ✅ useEffect + fetch HATAYA — useQuery lagaya
  // Ab yeh data cache hoga — doosre components bhi same data use karenge
  // Data process karo
  const all = Array.isArray(articles) ? articles : (articles?.results || []);
  const sorted = [...all]
    .filter((a) => a.status === "published" || a.image_url)
    .sort((a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0));

  const todayArticles = sorted.filter((a) => isTodayArticle(a));

  const featuredArticles =
    todayArticles.length >= 6
      ? todayArticles
      : [
          ...todayArticles,
          ...sorted.filter((a) => !todayArticles.includes(a)).slice(0, 6 - todayArticles.length),
        ];
  const topSix = featuredArticles.slice(0, 6);

  const usedImages = new Set();
  const slides = [];
  for (const a of topSix) {
    const img = a.image_url || a.image || "";
    if (!img) continue;
    if (usedImages.has(img)) continue;
    usedImages.add(img);
    slides.push({
      id: a.id,
      slug: a.slug,
      author: getCategoryLabel(a),
      title: a.title,
      category: getCategoryLabel(a),
      image: img,
      image_alt: a.image_alt,
      public_url: a.public_url,
      published_date: a.published_date,
      published_at: a.published_at,
      created_at: a.created_at,
      primary_category: a.primary_category,
      category_details: a.category_details,
      categories: a.categories,
      canonical_url: a.canonical_url,
    });
    if (slides.length >= 3) break;
  }

  const bottomNews = topSix.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    time: formatArticleDateTimeIST(a) || timeAgo(a) || "—",
    region: getCategoryLabel(a),
    public_url: a.public_url,
    published_at: a.published_at,
    published_date: a.published_date,
    created_at: a.created_at,
    primary_category: a.primary_category,
    category_details: a.category_details,
    categories: a.categories,
    canonical_url: a.canonical_url,
  }));

  const goTo = (index) => {
    if (animating || index === current || slides.length === 0) return;
    setAnimating(true);
    setTimeout(() => { setCurrent(index); setAnimating(false); }, 600);
  };

  useEffect(() => {
    if (slides.length === 0 || animating) return;
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
        setAnimating(false);
      }, 600);
    }, 5000);
    return () => clearInterval(interval);
  }, [animating, slides.length]);

  useEffect(() => {
    const handleResize = () => {
      setIs320(window.innerWidth <= 320);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navigateToArticle = (article) => {
    const path = getArticlePath(article);
    if (path) navigate(path);
  };

  const handlePointerStart = (e) => {
    const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
    touchStartX.current = clientX ?? null;
    touchCurrentX.current = null;
  };

  const handlePointerMove = (e) => {
    if (touchStartX.current == null) return;
    const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
    if (clientX != null) {
      touchCurrentX.current = clientX;
      if (Math.abs(clientX - touchStartX.current) > 10) {
        isSwipeRef.current = true;
      }
    }
  };

  const handlePointerEnd = () => {
    if (slides.length === 0 || touchStartX.current == null || touchCurrentX.current == null) {
      touchStartX.current = null;
      touchCurrentX.current = null;
      return;
    }

    const diff = touchStartX.current - touchCurrentX.current;
    const threshold = 45;

    if (Math.abs(diff) >= threshold) {
      if (diff > 0) {
        const nextIndex = (current + 1) % slides.length;
        goTo(nextIndex, "next");
      } else {
        const prevIndex = (current - 1 + slides.length) % slides.length;
        goTo(prevIndex, "prev");
      }
    }

    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  const getVisibleDotIndexes = () => {
    const total = slides.length;
    if (total <= 5) return slides.map((_, index) => index);

    if (current <= 2) return [0, 1, 2, 3, 4];
    if (current >= total - 3) return [total - 5, total - 4, total - 3, total - 2, total - 1];

    return [current - 2, current - 1, current, current + 1, current + 2];
  };

  if (loading || slides.length === 0) return null;

  const slide = slides[current];
  const currentBottomNews = bottomNews
    .filter((item) => String(item.id || item.slug) !== String(slide.id || slide.slug))
    .slice(0, is320 ? 2 : 3);
  const visibleDotIndexes = getVisibleDotIndexes();

  const emitBannerReady = () => {
    if (hasDispatchedReadyRef.current) return;
    hasDispatchedReadyRef.current = true;
    document.dispatchEvent(new Event("news-banner-ready"));
  };

  return (
    <div className="nb-root">
      <div
        className="nb-container"
        onClick={() => {
          if (isSwipeRef.current) {
            isSwipeRef.current = false;
            return;
          }
          navigateToArticle(slide);
        }}
        onPointerDown={supportsPointerEvents ? handlePointerStart : undefined}
        onPointerMove={supportsPointerEvents ? handlePointerMove : undefined}
        onPointerUp={supportsPointerEvents ? handlePointerEnd : undefined}
        onPointerCancel={supportsPointerEvents ? handlePointerEnd : undefined}
        onTouchStart={!supportsPointerEvents ? handlePointerStart : undefined}
        onTouchMove={!supportsPointerEvents ? handlePointerMove : undefined}
        onTouchEnd={!supportsPointerEvents ? handlePointerEnd : undefined}
        style={{ cursor: "pointer", touchAction: "pan-y" }}
      >
        <img
          // key={current}
          src={slide.image}
          alt={slide.image_alt || slide.title}

          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={1600}
          height={900}

          className={`nb-bg absolute inset-0 w-full h-full object-cover object-top z-0
  ${current === 0 ? "" : "transform transition-all duration-500 ease-linear"}
  ${animating ? "opacity-0" : "opacity-100"}
`}

          onLoad={() => {
            if (current === 0) emitBannerReady();
          }}
          onError={(e) => { e.target.style.display = "none"; }}
        />

        <div className="nb-gradient-overlay" style={{ pointerEvents: "none" }} />

        <div
          className={`nb-inner transform transition-all duration-500 delay-100 ease-linear
            ${animating ? "opacity-0 translate-y-[10px]" : "opacity-100 translate-y-0"}`}
          style={{ position: "relative", zIndex: 2 }}
        >
          <div className="nb-hero">
            <div className="nb-author-row">
              <div className="nb-redbar" />
              <span className="nb-author-name">{slide.category}</span>
            </div>

            <h1 className="nb-headline">{slide.title}</h1>

            <div className="nb-separator" />

            <div className="nb-actions">
              <button
                className="nb-pill"
                onClick={(e) => { e.stopPropagation(); navigateToArticle(slide); }}
              >
                <ArrowCircleIcon /><span>Read More</span>
              </button>

              <button
                className="nb-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText(getAbsoluteArticleUrl(slide));
                }}
              >
                <ShareCircleIcon /><span>Share</span>
              </button>
            </div>
          </div>

          <div
            className="nb-bottom"
            style={is320 ? { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } : undefined}
          >
            {currentBottomNews.map((item) => (
              <div
                key={item.id}
                className="nb-news-card"
                style={{ cursor: item.slug ? "pointer" : "default" }}
                onClick={(e) => { e.stopPropagation(); navigateToArticle(item); }}
              >
                <p className="nb-news-title" style={{ color: "#ffffff" }}>{item.title}</p>
                <div className="nb-news-meta" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <span>{item.time}</span>
                  <span className="nb-meta-sep">|</span>
                  <span>{item.region}</span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="nb-dots"
            onClick={(e) => e.stopPropagation()}
          >
            {visibleDotIndexes.map((index) => (
              <button
                key={slides[index]?.id || index}
                type="button"
                className={`nb-dot ${index === current ? "active" : ""}`}
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => goTo(index, index > current ? "next" : "prev")}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
