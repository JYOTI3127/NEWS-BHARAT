import { useState, useEffect } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🎨  STYLES — Sirf yahan se edit karo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const C = {
  sectionBg:       "#D80100",   // Poore section ka background (red)
  white:           "#ffffff",
  thumbBorder:     "white",  
  thumbBorderActive:"#ffffff",                 // Active card border
  playBtnBg:       "rgba(0,0,0,0.25)",         // Play button background
  playBtnBorder:   "rgba(255,255,255,0.85)",   // Play button ring
  durationBg:      "rgba(0,0,0,0.7)",          // Duration badge background
  titleColor:      "#ffffff",                  // Card title color
  headerColor:     "#ffffff",                  // Section header text
  headerBarColor:  "#FFD24D",                  // Header left/right bar
  featuredBorder:  "rgba(255,255,255,0.85)",   
  featuredGradient:"linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
};

const F = {
  hindi:   "'Noto Sans Devanagari', 'Arial', sans-serif",
  base:    "poppins",
  mono:    "'Arial', sans-serif",
};

const STYLES = {

  // ── Outer wrapper ──────────────────────────────────────────
  wrap: {
    background: C.sectionBg,
    padding: "20px 16px 24px",
    fontFamily: F.base,
    height: "450px",
  },
  inner: {
    maxWidth: "1120px",
    margin: "0 auto",
  },

  // ── Section Header ─────────────────────────────────────────
  headerWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "14px",
  },
  headerBar: {
    width: "4px",
    height: "18px",
    background: C.headerBarColor,
    borderRadius: "2px",
  },
  headerText: {
    color: C.headerColor,
    fontWeight: "bold",
    fontSize: "16px",
    fontFamily: F.base,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  // ── Small Card ─────────────────────────────────────────────
  smallCard: {
    cursor: "pointer",
    marginBottom: "18px",
    transition: "opacity 0.2s",
  },
  smallThumbWrap: {
    position: "relative",
    borderRadius: "8px",
    overflow: "hidden",
    aspectRatio: "16/9",
    background: "transparent",
    boxSizing: "border-box",
    transition: "border-color 0.2s, background 0.2s",
  },
  smallThumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "opacity 0.25s",
    borderRadius: "6px",
  },
  smallPlayOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: "5px",
    right: "6px",
    background: C.durationBg,
    color: C.white,
    fontSize: "10px",
    padding: "1px 5px",
    borderRadius: "3px",
    fontFamily: F.mono,
    fontWeight: "600",
  },
  smallCardTitle: {
    color: C.titleColor,
    fontSize: "12px",
    margin: "6px 0 0 0",
    fontFamily: F.hindi,
    lineHeight: 1.45,
  },

  // ── Play Button ────────────────────────────────────────────
  playBtnWrap: (size) => ({
    width: size,
    height: size,
    borderRadius: "50%",
    border: `2px solid white`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: C.playBtnBg,
    backdropFilter: "blur(2px)",
    flexShrink: 0,
    transition: "background 0.2s, transform 0.2s",
  }),

  // ── Featured Player ────────────────────────────────────────
  featuredWrap: {
    position: "relative",
    borderRadius: "12px",
    overflow: "hidden",
    border: `2px solid ${C.featuredBorder}`,
    aspectRatio: "16/9",
    maxHeight: "320px",
    width: "100%",
    maxWidth: "640px",
    margin: "0 auto",
    cursor: "pointer",
    background: "#a00",
    boxShadow: "0 6px 28px rgba(0,0,0,0.35)",
    transition: "border-color 0.2s",
  },
  featuredImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "opacity 0.3s",
  },
  featuredPlayOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    background: C.featuredGradient,
    padding: "20px 14px 10px",
  },
  featuredTitle: {
    color: C.white,
    fontSize: "13px",
    margin: 0,
    fontFamily: F.hindi,
    fontWeight: "600",
    lineHeight: 1.4,
  },
  featuredDuration: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "11px",
    fontFamily: F.mono,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const videos = [
  { id:1, title:"प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद", thumb:"https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=400&q=80", duration:"2:34" },
  { id:2, title:"प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद", thumb:"https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80", duration:"4:12" },
  { id:3, title:"प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद", thumb:"https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80", duration:"1:58", featured:true },
  { id:4, title:"प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद", thumb:"https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=80", duration:"3:45" },
  { id:5, title:"प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद", thumb:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80", duration:"5:20" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

function PlayBtn({ size = 44 }) {
  return (
    <div style={STYLES.playBtnWrap(size)}>
      <svg width={size * 0.38} height={size * 0.38} viewBox="0 0 12 14" fill="white">
        <path d="M1 1l10 6L1 13V1z" />
      </svg>
    </div>
  );
}

function SmallCard({ video, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...STYLES.smallCard, opacity: isActive ? 1 : 0.88 }}
    >
      <div style={{
        ...STYLES.smallThumbWrap,
        border: isActive
          ? `2px solid ${C.thumbBorderActive}`
          : `2px solid ${C.thumbBorder}`,
        boxShadow: isActive ? "0 0 0 2px rgba(255,255,255,0.4)" : "none",
      }}>
        <img
          src={video.thumb} alt={video.title}
          style={{ ...STYLES.smallThumbImg, opacity: hovered ? 0.75 : 0.55 }}
        />
        <div style={STYLES.smallPlayOverlay}>
          <div style={{ transform: hovered ? "scale(1.12)" : "scale(1)", transition: "transform 0.2s" }}>
            <PlayBtn size={36} />
          </div>
        </div>
        <span style={STYLES.durationBadge}>{video.duration}</span>
      </div>
      <p style={{ ...STYLES.smallCardTitle, fontWeight: isActive ? "700" : "400" }}>
        {video.title}
      </p>
    </div>
  );
}

function FeaturedPlayer({ video }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={STYLES.featuredWrap}
    >
      <img
        src={video.thumb} alt={video.title}
        style={{ ...STYLES.featuredImg, opacity: hovered ? 0.65 : 0.5 }}
      />
      <div style={STYLES.featuredPlayOverlay}>
        <div style={{ transform: hovered ? "scale(1.08)" : "scale(1)", transition: "transform 0.25s" }}>
          <PlayBtn size={48} />
        </div>
      </div>
      <div style={STYLES.featuredBottomBar}>
        <p style={STYLES.featuredTitle}>{video.title}</p>
        <span style={STYLES.featuredDuration}>{video.duration}</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, align = "left" }) {
  return (
    <div style={{
      ...STYLES.headerWrap,
      justifyContent: align === "right" ? "flex-end" : "flex-start",
    }}>
      {align === "left"  && <div style={STYLES.headerBar} />}
      <span style={STYLES.headerText}>{title}</span>
      {align === "right" && <div style={STYLES.headerBar} />}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function VideoSection() {
  const [activeId, setActiveId] = useState(3);
  const width = useWindowWidth();
  const isDesktop = width >= 900;

  const leftVideos  = [videos[0], videos[1]];
  const rightVideos = [videos[3], videos[4]];
  const featured    = videos.find(v => v.id === activeId) || videos[2];

  return (
    <>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

        /* ── Desktop: 3 columns ── */
        .vs-grid {
          display: grid;
          gap: 16px;
          align-items: stretch;
        }
        @media (min-width: 900px) {
          /* fixed center column width to reduce featured visual dominance */
          .vs-grid { grid-template-columns: 220px 640px 220px; }
          /* stronger vertical separators and more breathing room */
          .vs-grid > div:nth-child(1) { border-right: 1px solid #ffffff5b; padding-right: 28px; padding-top:12px; padding-bottom:12px; }
          .vs-grid > div:nth-child(3) { border-left: 1px solid #ffffff5b; padding-left: 28px; padding-top:12px; padding-bottom:12px; }
          .vs-grid > div:nth-child(2) { padding: 0 18px; }
        }

        /* ── Tablet: 2 columns, featured on top ── */
        @media (min-width: 600px) and (max-width: 899px) {
          .vs-grid { grid-template-columns: 1fr 1fr; }
          .vs-featured-col { grid-column: 1 / -1; order: -1; }
        }

        /* ── Mobile: 1 column ── */
        @media (max-width: 599px) {
          .vs-grid { grid-template-columns: 1fr; }
          .vs-featured-col { order: -1; }
          .vs-side-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        }

        .vs-side-col { display: flex; flex-direction: column; gap: 12px; }
        .vs-side-row { display: flex; flex-direction: column; gap: 12px; }

        /* make small cards show an inset white rectangle look */
        .vs-side-col img { display:block; }
      `}</style>

      <div style={STYLES.wrap}>
        <div style={STYLES.inner}>
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
              {isDesktop && <div style={{ marginBottom: "40px" }} />}
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
    </>
  );
}