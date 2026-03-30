import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://news4bharat.cloud/api";

// ✅ Fix 1 — Category slug se seedha fetch, saare articles nahi
function useCategoryArticles(slug) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/articles/?category=${slug}&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : (data.results || []);
        const sorted = all.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setArticles(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  return { articles, loading };
}

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).replace(/am|pm/i, (match) => match.toUpperCase())
    : "";

const imgSrc = (a) => a?.image_url || a?.image || null;

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
export function EntertainmentSection() {
  const navigate = useNavigate();
  const is4K = useIs4K();

  const { articles: explainers, loading: explainersLoading } = useCategoryArticles("bharat-explainers");
  const { articles: numbers, loading: numbersLoading } = useCategoryArticles("bharat-numbers");

  const featured     = explainers[0] || null;
  const smallCard    = explainers[1] || null;
  const midCards     = explainers.slice(2, 6);
  const sidebarItems = numbers.slice(0, 5);

  return (
    <div className={`nps-entertainment${is4K ? " nps-4k" : ""}`}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      <SectionHeader title="BHARAT EXPLAINERS" slug="bharat-explainers" />

      <div className="nps-ent-layout">

        {/* ── LEFT + MIDDLE ── */}
        <div className="nps-ent-left-mid">

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
              onClick={() => navigate(`/article/${featured.slug}`)}
            >
              <div className="hs-featured-img-wrap">
                <ArticleImg
                  src={imgSrc(featured)}
                  alt={featured.title}
                  className="w-full h-full object-cover"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  priority={true}
                />
                <div className="hs-featured-overlay">
                  <CategoryTag label={featured.category_details?.[0]?.name || "EXPLAINER"} />
                  <p className="hs-featured-title">{featured.title}</p>
                  <DateLabel date={formatDate(featured.published_at || featured.created_at)} />
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

          {/* Small card — lazy load */}
          {explainersLoading ? (
            <div className="hs-small-card">
              <div className="hs-small-img" style={{ background: "#f0ece8" }} />
              <div className="hs-small-text">
                <Sk h="11px" w="60px" mb="6px" />
                <Sk h="13px" w="90%" mb="4px" />
                <Sk h="11px" w="50px" mb="0" />
              </div>
            </div>
          ) : smallCard ? (
            <div
              className="hs-small-card"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/article/${smallCard.slug}`)}
            >
              <div className="hs-small-img">
                <ArticleImg
                  src={imgSrc(smallCard)}
                  alt={smallCard.title}
                  className="w-full h-full object-cover"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div className="hs-small-text">
                <CategoryTag label={smallCard.category_details?.[0]?.name || "EXPLAINER"} />
                <p className="hs-small-title">{smallCard.title}</p>
                <DateLabel date={formatDate(smallCard.published_at || smallCard.created_at)} />
              </div>
            </div>
          ) : null}

          {/* Middle: 4 horizontal cards — lazy load */}
          <div className="hs-mid-col">
            {explainersLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="hs-mid-card">
                    <div className="hs-mid-img" style={{ background: "#f0ece8" }} />
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
                    onClick={() => navigate(`/article/${card.slug}`)}
                  >
                    <div className="hs-mid-img">
                      <ArticleImg
                        src={imgSrc(card)}
                        alt={card.title}
                        className="w-full h-full object-cover"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div className="hs-mid-text">
                      <CategoryTag label={card.category_details?.[0]?.name || "EXPLAINER"} />
                      <p className="hs-mid-title">{card.title}</p>
                      <DateLabel date={formatDate(card.published_at || card.created_at)} />
                    </div>
                  </div>
                ))}
          </div>

        </div>

        {/* ── SIDEBAR: Bharat in Numbers ── */}
        <div className="nps-health-sidebar">
          <div
            className="nps-health-header"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/category/bharat-numbers")}
          >
            <span className="nps-health-header-text">BHARAT IN NUMBERS</span>
          </div>
          <div className="nps-health-scroll">
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
                    onClick={() => navigate(`/article/${item.slug}`)}
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
                      <span className="hs-sidebar-cat">
                        {item.category_details?.[0]?.name || "NUMBERS"}
                      </span>
                      <p className="nps-health-text">{item.title}</p>
                      <span className="hs-sidebar-date">
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

export default EntertainmentSection;
