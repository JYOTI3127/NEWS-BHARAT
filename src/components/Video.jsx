import { useState, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────
const videos = [
  { id: 1, title: "Samajwadi Party Leader Dies in Accident in Pratapgarh, CCTV Footage Captured", thumb: "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=400&q=80", duration: "2:34" },
  { id: 2, title: "Samajwadi Party Leader Dies in Accident in Pratapgarh, CCTV Footage Captured", thumb: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80", duration: "4:12" },
  { id: 3, title: "Samajwadi Party Leader Dies in Accident in Pratapgarh, CCTV Footage Captured", thumb: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80", duration: "1:58", featured: true },
  { id: 4, title: "Samajwadi Party Leader Dies in Accident in Pratapgarh, CCTV Footage Captured", thumb: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=80", duration: "3:45" },
  { id: 5, title: "Samajwadi Party Leader Dies in Accident in Pratapgarh, CCTV Footage Captured", thumb: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80", duration: "5:20" },
];

// ── HOOK ──────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ── Play Button ────────────────────────────────────────────────
function PlayBtn({ size = 44 }) {
  return (
    <div
      className="vs-play-btn"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.38} height={size * 0.38} viewBox="0 0 12 14" fill="white">
        <path d="M1 1l10 6L1 13V1z" />
      </svg>
    </div>
  );
}

// ── Small Card ─────────────────────────────────────────────────
function SmallCard({ video, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`vs-small-card${isActive ? "" : " vs-small-card--inactive"}`}
    >
      <div className={`vs-small-thumb-wrap${isActive ? " vs-small-thumb-wrap--active" : ""}`}>
        <img
          src={video.thumb}
          alt={video.title}
          style={{ opacity: hovered ? 0.75 : 0.55 }}
        />
        <div className="vs-small-play-overlay">
          <div style={{ transform: hovered ? "scale(1.12)" : "scale(1)", transition: "transform 0.2s" }}>
            <PlayBtn size={36} />
          </div>
        </div>
        <span className="vs-duration-badge">{video.duration}</span>
      </div>
      <p className={`vs-small-card-title${isActive ? " vs-small-card-title--active" : ""}`}>
        {video.title}
      </p>
    </div>
  );
}

// ── Featured Player ────────────────────────────────────────────
function FeaturedPlayer({ video }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="vs-featured-wrap"
    >
      <img
        src={video.thumb}
        alt={video.title}
        style={{ opacity: hovered ? 0.65 : 0.5 }}
      />
      <div className="vs-featured-play-overlay">
        <div style={{ transform: hovered ? "scale(1.08)" : "scale(1)", transition: "transform 0.25s" }}>
          <PlayBtn size={48} />
        </div>
      </div>
      <div className="vs-featured-bottom-bar">
        <p className="vs-featured-title">{video.title}</p>
        <span className="vs-featured-duration">{video.duration}</span>
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ title, align = "left" }) {
  return (
    <div className={`vs-header-wrap${align === "right" ? " vs-header-wrap--right" : ""}`}>
      {align === "left"  && <div className="vs-header-bar" />}
      <span className="vs-header-text">{title}</span>
      {align === "right" && <div className="vs-header-bar" />}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export default function VideoSection() {
  const [activeId, setActiveId] = useState(3);
  const width     = useWindowWidth();
  const isDesktop = width >= 900;

  const leftVideos  = [videos[0], videos[1]];
  const rightVideos = [videos[3], videos[4]];
  const featured    = videos.find(v => v.id === activeId) || videos[2];

  return (
    <div className="vs-wrap">
      <div className="vs-inner">
        <div className="vs-grid">

          {/* Left Column */}
          <div className="vs-side-col">
            <SectionHeader title="VIDEOS" align="left" />
            <div className="vs-side-row">
              {leftVideos.map(v => (
                <SmallCard key={v.id} video={v} isActive={activeId === v.id} onClick={() => setActiveId(v.id)} />
              ))}
            </div>
          </div>

          {/* Center Featured */}
          <div className="vs-featured-col">
            {isDesktop && <div style={{ marginBottom: "48px" }} />}
            <FeaturedPlayer video={featured} />
          </div>

          {/* Right Column */}
          <div className="vs-side-col">
            <SectionHeader title="STILL MORE" align="right" />
            <div className="vs-side-row">
              {rightVideos.map(v => (
                <SmallCard key={v.id} video={v} isActive={activeId === v.id} onClick={() => setActiveId(v.id)} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}