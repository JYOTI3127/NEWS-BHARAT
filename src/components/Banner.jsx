import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://api.news4bharat.com/api";

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hrs > 0)  return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
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

const PlayCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" fill="rgba(255,255,255,0.82)" stroke="none" />
  </svg>
);

const ShareCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <g transform="translate(5.5, 5.5) scale(0.54)">
      <circle cx="18" cy="5"  r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <circle cx="6"  cy="12" r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <circle cx="18" cy="19" r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" strokeWidth="2" />
      <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" strokeWidth="2" />
    </g>
  </svg>
);

export default function NewsBanner() {
  const navigate = useNavigate();

  const [slides,     setSlides]     = useState([]);
  const [bottomNews, setBottomNews] = useState([]);
  const [current,    setCurrent]    = useState(0);
  const [animating,  setAnimating]  = useState(false);
  const [direction,  setDirection]  = useState("next");

  useEffect(() => {
    fetch(`${API_BASE}/articles/`)
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : (data.results || []);

        const sorted = all
          .filter((a) => a.status === "published" || a.image_url)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Top 4 with image → slides
        const withImg   = sorted.filter((a) => a.image_url);
        const slideData = (withImg.length >= 4 ? withImg : sorted).slice(0, 4);

        setSlides(slideData.map((a) => ({
          id:       a.id,
          slug:     a.slug,
          author:   a.category_details?.[0]?.name || "News",
          title:    a.title,
          category: a.category_details?.[0]?.name || "News",
          image:    a.image_url || a.image || newsImg,
        })));

        // Bottom news — pehle 3 articles (slides se alag)
        const bottomArticles = sorted.slice(0, 3);
        setBottomNews(bottomArticles.map((a) => ({
          id:     a.id,
          slug:   a.slug,
          title:  a.title,
          desc:   a.subtitle || "",
          time:   timeAgo(a.published_at || a.created_at),
          region: a.category_details?.[0]?.name || "News",
        })));
      })
      .catch(() => {
        // API fail → kuch nahi dikhega
        setSlides([]);
        setBottomNews([]);
      });
  }, []);

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

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <div className="nb-root">
      <div className="nb-container">

        <img
          key={current}
          src={slide.image}
          alt={slide.title}
          className={`nb-bg absolute inset-0 w-full h-full object-cover object-top z-0 transform transition-all duration-500 ease-linear ${animating ? "opacity-0" : "opacity-100"} ${animating ? (direction === "next" ? "translate-x-8 scale-[1.02]" : "-translate-x-8 scale-[1.02]") : "translate-x-0 scale-100"}`}
          onError={(e) => { e.target.src = newsImg; }}
        />

        <div className="nb-gradient-overlay" />

        <div className={`nb-inner transform transition-all duration-500 delay-100 ease-linear ${animating ? "opacity-0 translate-y-[10px]" : "opacity-100 translate-y-0"}`}>

          <div className="nb-hero">
            <div className="nb-author-row">
              <div className="nb-redbar" />
              <span className="nb-author-name">{slide.author}</span>
            </div>
            <h1 className="nb-headline">{slide.title}</h1>
            <div className="nb-separator" />
            <div className="nb-actions">
              <button className="nb-pill" onClick={() => { if (slide.slug) navigate(`/article/${slide.slug}`); }}>
                <ArrowCircleIcon /><span>Read More</span>
              </button>
              <button className="nb-pill"><PlayCircleIcon /><span>Watch Video</span></button>
              <button className="nb-pill" onClick={() => navigator.clipboard?.writeText(window.location.origin + `/article/${slide.slug}`)}>
                <ShareCircleIcon /><span>Share</span>
              </button>
            </div>
          </div>

          <div className="nb-bottom">
            {bottomNews.map((item) => (
              <div
                key={item.id}
                className="nb-news-card"
                style={{ cursor: item.slug ? "pointer" : "default" }}
                onClick={() => { if (item.slug) navigate(`/article/${item.slug}`); }}
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

        </div>
      </div>
    </div>
  );
}