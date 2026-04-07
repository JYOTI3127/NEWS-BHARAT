import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchArticles } from "../lib/api";

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  if (mins > 0) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  return "Just now";
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
export default function NewsBanner() {
  const navigate = useNavigate();
  const touchStartX = useRef(null);
  const touchCurrentX = useRef(null);
  const hasDispatchedReadyRef = useRef(false);

  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState("next");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 425);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 425);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ useEffect + fetch HATAYA — useQuery lagaya
  // Ab yeh data cache hoga — doosre components bhi same data use karenge
  const { data, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: fetchArticles,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Data process karo
  const all = Array.isArray(data) ? data : (data?.results || []);
  const sorted = all
    .filter((a) => a.status === "published" || a.image_url)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const usedImages = new Set();
  const slides = [];
  for (const a of sorted) {
    const img = a.image_url || a.image || "";
    if (!img) continue;
    if (usedImages.has(img)) continue;
    usedImages.add(img);
    slides.push({
      id: a.id,
      slug: a.slug,
      author: a.category_details?.[0]?.name || "News",
      title: a.title,
      category: a.category_details?.[0]?.name || "News",
      image: a.image_url || a.image || "",
    });
  }

  const allArticles = sorted.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    time: timeAgo(a.published_at || a.created_at),
    region: a.category_details?.[0]?.name || "News",
  }));

  useEffect(() => {
    if (slides.length === 0) return;
    const interval = setInterval(() => {
      goTo((current + 1) % slides.length, "next");
    }, 5000);
    return () => clearInterval(interval);
  }, [current, slides.length]);

  const goTo = (index, dir = "next") => {
    if (animating || index === current || slides.length === 0) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => { setCurrent(index); setAnimating(false); }, 600);
  };

  const navigateToArticle = (slug) => {
    if (slug) navigate(`/article/${slug}`);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchCurrentX.current = null;
  };

  const handleTouchMove = (e) => {
    touchCurrentX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    if (slides.length === 0 || touchStartX.current == null || touchCurrentX.current == null) return;

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

  const getBottomNews = () => {
    if (allArticles.length === 0) return [];
    const visibleCount = isMobile ? 2 : 3;
    const startIndex = (current * visibleCount) % allArticles.length;
    return Array.from({ length: Math.min(visibleCount, allArticles.length) }, (_, offset) => {
      const idx = (startIndex + offset) % allArticles.length;
      return allArticles[idx];
    });
  };

  const getVisibleDotIndexes = () => {
    const total = slides.length;
    if (total <= 5) return slides.map((_, index) => index);

    if (current <= 2) return [0, 1, 2, 3, 4];
    if (current >= total - 3) return [total - 5, total - 4, total - 3, total - 2, total - 1];

    return [current - 2, current - 1, current, current + 1, current + 2];
  };

  if (isLoading || slides.length === 0) return null;

  const slide = slides[current];
  const currentBottomNews = getBottomNews();
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
        onClick={() => navigateToArticle(slide.slug)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: "pointer" }}
      >
        <img
          // key={current}
          src={slide.image}
          alt={slide.title}

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
              <span className="nb-author-name">{slide.author}</span>
            </div>

            <h1 className="nb-headline">{slide.title}</h1>

            <div className="nb-separator" />

            <div className="nb-actions">
              <button
                className="nb-pill"
                onClick={(e) => { e.stopPropagation(); navigateToArticle(slide.slug); }}
              >
                <ArrowCircleIcon /><span>Read More</span>
              </button>

              <button
                className="nb-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText(
                    window.location.origin + `/article/${slide.slug || slide.id}`
                  );
                }}
              >
                <ShareCircleIcon /><span>Share</span>
              </button>
            </div>
          </div>

          <div className="nb-bottom">
            {currentBottomNews.map((item) => (
              <div
                key={item.id}
                className="nb-news-card"
                style={{ cursor: item.slug ? "pointer" : "default" }}
                onClick={(e) => { e.stopPropagation(); navigateToArticle(item.slug); }}
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
