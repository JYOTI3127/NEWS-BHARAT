
import { useState, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────
const videos = [
  {
    id: 1,
    title: "प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद",
    thumb: "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=400&q=80",
    duration: "2:34",
  },
  {
    id: 2,
    title: "प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद",
    thumb: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80",
    duration: "4:12",
  },
  {
    id: 3,
    title: "प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद",
    thumb: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80",
    duration: "1:58",
    featured: true,
  },
  {
    id: 4,
    title: "प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद",
    thumb: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=80",
    duration: "3:45",
  },
  {
    id: 5,
    title: "प्रतापगढ़ में समाजवादी पार्टी नेता की हादसे में मौत CCTV में कैद",
    thumb: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
    duration: "5:20",
  },
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

// ── Play Button SVG ───────────────────────────────────────────
function PlayBtn({ size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid rgba(255,255,255,0.85)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.25)",
      backdropFilter: "blur(2px)",
      flexShrink: 0,
      transition: "background 0.2s, transform 0.2s",
    }}>
      <svg width={size * 0.38} height={size * 0.38} viewBox="0 0 12 14" fill="white">
        <path d="M1 1l10 6L1 13V1z" />
      </svg>
    </div>
  );
}

// ── Small Video Card ──────────────────────────────────────────
function SmallCard({ video, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        marginBottom: "14px",
        opacity: isActive ? 1 : 0.88,
        transition: "opacity 0.2s",
      }}
    >
      {/* Thumbnail */}
      <div style={{
        position: "relative", borderRadius: "6px", overflow: "hidden",
        border: isActive ? "2px solid #fff" : "2px solid rgba(255,255,255,0.25)",
        aspectRatio: "16/9",
        background: "#c00",
        transition: "border-color 0.2s",
        boxShadow: isActive ? "0 0 0 2px rgba(255,255,255,0.4)" : "none",
      }}>
        <img
          src={video.thumb}
          alt={video.title}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            opacity: hovered ? 0.75 : 0.55,
            transition: "opacity 0.25s",
          }}
        />
        {/* Play overlay */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ transform: hovered ? "scale(1.12)" : "scale(1)", transition: "transform 0.2s" }}>
            <PlayBtn size={36} />
          </div>
        </div>
        {/* Duration badge */}
        <span style={{
          position: "absolute", bottom: "5px", right: "6px",
          background: "rgba(0,0,0,0.7)", color: "#fff",
          fontSize: "10px", padding: "1px 5px", borderRadius: "3px",
          fontFamily: "'Arial',sans-serif", fontWeight: "600",
        }}>{video.duration}</span>
      </div>

      {/* Title */}
      <p style={{
        color: "#fff", fontSize: "12px", margin: "6px 0 0 0",
        fontFamily: "'Noto Sans Devanagari','Arial',sans-serif",
        lineHeight: 1.45, fontWeight: isActive ? "700" : "400",
      }}>
        {video.title}
      </p>
    </div>
  );
}

// ── Featured Player ───────────────────────────────────────────
function FeaturedPlayer({ video }) {
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Main player box */}
      <div
        onClick={() => setPlaying(!playing)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative", borderRadius: "10px", overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.35)",
          aspectRatio: "16/9", cursor: "pointer",
          background: "#a00",
          boxShadow: "0 6px 28px rgba(0,0,0,0.35)",
          transition: "border-color 0.2s",
        }}
      >
        <img
          src={video.thumb}
          alt={video.title}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            opacity: hovered ? 0.65 : 0.5,
            transition: "opacity 0.3s",
          }}
        />

        {/* Play / Pause center */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            transform: hovered ? "scale(1.1)" : "scale(1)",
            transition: "transform 0.25s",
          }}>
            <PlayBtn size={62} />
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
          padding: "20px 14px 10px",
        }}>
          <p style={{
            color: "#fff", fontSize: "13px", margin: 0,
            fontFamily: "'Noto Sans Devanagari','Arial',sans-serif",
            fontWeight: "600", lineHeight: 1.4,
          }}>{video.title}</p>
          <span style={{
            color: "rgba(255,255,255,0.7)", fontSize: "11px",
            fontFamily: "'Arial',sans-serif",
          }}>{video.duration}</span>
        </div>
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ title, align = "left" }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: align === "right" ? "flex-end" : "flex-start",
      gap: "8px",
      marginBottom: "14px",
    }}>
      {align === "left" && (
        <div style={{ width: "4px", height: "18px", background: "#fff", borderRadius: "2px" }} />
      )}
      <span style={{
        color: "#fff", fontWeight: "800", fontSize: "14px",
        fontFamily: "'Georgia',serif", letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>{title}</span>
      {align === "right" && (
        <div style={{ width: "4px", height: "18px", background: "#fff", borderRadius: "2px" }} />
      )}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export default function VideoSection() {
  const [activeId, setActiveId] = useState(3); // featured by default
  const width = useWindowWidth();

  const isMobile  = width < 600;
  const isTablet  = width >= 600 && width < 900;
  const isDesktop = width >= 900;

  const leftVideos  = [videos[0], videos[1]];
  const rightVideos = [videos[3], videos[4]];
  const featured    = videos.find((v) => v.id === activeId) || videos[2];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .vs-wrap {
          background: #cc0000;
          padding: 20px 16px 24px;
          font-family: 'Georgia', serif;
        }

        .vs-inner {
          max-width: 1100px;
          margin: 0 auto;
        }

        /* Desktop 3-col layout */
        .vs-grid {
          display: grid;
          gap: 16px;
          align-items: start;
        }

        @media (min-width: 900px) {
          .vs-grid {
            grid-template-columns: 200px 1fr 200px;
          }
        }

        @media (min-width: 600px) and (max-width: 899px) {
          .vs-grid {
            grid-template-columns: 1fr 1fr;
          }
          .vs-featured-col {
            grid-column: 1 / -1;
            order: -1;
          }
        }

        @media (max-width: 599px) {
          .vs-grid {
            grid-template-columns: 1fr;
          }
          .vs-featured-col {
            order: -1;
          }
          .vs-side-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
        }

        .vs-side-col { display: flex; flex-direction: column; }
      `}</style>

      <div className="vs-wrap">
        <div className="vs-inner">
          <div className="vs-grid">

            {/* ── Left Column ── */}
            <div className="vs-side-col">
              <SectionHeader title="VIDEOS" align="left" />
              <div className="vs-side-row">
                {leftVideos.map((v) => (
                  <SmallCard
                    key={v.id}
                    video={v}
                    isActive={activeId === v.id}
                    onClick={() => setActiveId(v.id)}
                  />
                ))}
              </div>
            </div>

            {/* ── Center Featured ── */}
            <div className="vs-featured-col">
              {/* Spacer to align with side headers on desktop */}
              {isDesktop && <div style={{ marginBottom: "32px" }} />}
              <FeaturedPlayer video={featured} />
            </div>

            {/* ── Right Column ── */}
            <div className="vs-side-col">
              <SectionHeader title="STILL MORE" align="right" />
              <div className="vs-side-row">
                {rightVideos.map((v) => (
                  <SmallCard
                    key={v.id}
                    video={v}
                    isActive={activeId === v.id}
                    onClick={() => setActiveId(v.id)}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

