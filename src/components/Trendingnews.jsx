
import { useState, useEffect, useRef } from "react";

// ── DATA ──────────────────────────────────────────────────────
const trendingTopics = [
  "Breaking News",
  "Top Headlines",
  "India News",
  "World News",
  "Politics",
  "Business",
  "Technology",
  "Entertainment",
  "Sports",
  "Health",
  "Education",
  "Lifestyle"
]

const latestNews = [
  {
    id: 1,
    title: "Lorem Ipsum Dolor Sit Amet Consectetur Sadipscing",
    desc: "Elit Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore",
  },
  {
    id: 2,
    title: "Lorem Ipsum Dolor Sit Amet Consectetur Sadipscing",
    desc: "Elit Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore",
  },
  {
    id: 3,
    title: "Lorem Ipsum Dolor Sit Amet Consectetur Sadipscing",
    desc: "Elit Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore",
  },
  {
    id: 4,
    title: "Lorem Ipsum Dolor Sit Amet Consectetur Sadipscing",
    desc: "Elit Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore",
  },
];

const featureCards = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80",
    title: "निखिल गुप्ता की कहानी तो धुंध में है, लेकिन जब दुनिया में धराए CIA एजेंट...",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1482731215275-a1f151646268?w=400&q=80",
    title: "निखिल गुप्ता की कहानी तो धुंध में है, लेकिन जब दुनिया में धराए CIA एजेंट...",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1578496781379-7dcfb995293d?w=400&q=80",
    title: "निखिल गुप्ता की कहानी तो धुंध में है, लेकिन जब दुनिया में धराए CIA एजेंट...",
  },
    {
    id: 4,
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80",
    title: "निखिल गुप्ता की कहानी तो धुंध में है, लेकिन जब दुनिया में धराए CIA एजेंट...",
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1482731215275-a1f151646268?w=400&q=80",
    title: "निखिल गुप्ता की कहानी तो धुंध में है, लेकिन जब दुनिया में धराए CIA एजेंट...",
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1578496781379-7dcfb995293d?w=400&q=80",
    title: "निखिल गुप्ता की कहानी तो धुंध में है, लेकिन जब दुनिया में धराए CIA एजेंट...",
  },
    {
    id: 7,
    image: "https://images.unsplash.com/photo-1578496781379-7dcfb995293d?w=400&q=80",
    title: "निखिल गुप्ता की कहानी तो धुंध में है, लेकिन जब दुनिया में धराए CIA एजेंट...",
  },
];

const liveUpdates = [
  { id: 1, time: "3:19 PM", text: "छोटा प्रश्न था फिर भी 3 हजार लोग आए थे। आए थे। आए थे।" },
  { id: 2, time: "3:19 PM", text: "छोटा प्रश्न था फिर भी 3 हजार लोग आए थे। आए थे। आए थे।" },
  { id: 3, time: "3:19 PM", text: "छोटा प्रश्न था फिर भी 3 हजार लोग आए थे। आए थे। आए थे।" },
  { id: 4, time: "3:19 PM", text: "छोटा प्रश्न था फिर भी 3 हजार लोग आए थे। आए थे। आए थे।" },
  { id: 5, time: "3:19 PM", text: "छोटा प्रश्न था फिर भी 3 हजार लोग आए थे। आए थे। आए थे।" },
  { id: 6, time: "3:19 PM", text: "छोटा प्रश्न था फिर भी 3 हजार लोग आए थे। आए थे। आए थे।" },
];

// ── HOOK: window width ─────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ── SUB: Trending Bar ──────────────────────────────────────────
function TrendingBar() {
  const [offset, setOffset] = useState(0);
  const visibleCount = 10;
  const maxOffset = trendingTopics.length - visibleCount;

  const prev = () => setOffset((o) => Math.max(0, o - 1));
  const next = () => setOffset((o) => Math.min(maxOffset, o + 1));

  const visible = trendingTopics.slice(offset, offset + visibleCount);

  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "#fff", borderBottom: "2px solid #e8e8e8",
      padding: "20px 20px", gap: "10px", flexWrap: "wrap",
    }}>
      {/* Label */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start",
        minWidth: "80px",
      }}>
        <span style={{ fontWeight: "800", fontSize: "12px", color: "#D80100", lineHeight: 1.2, fontFamily: "'Georgia',serif" }}>
          TRENDING - NEWS :
        </span>
        {/* <span style={{ fontWeight: "800", fontSize: "12px", color: "#111", fontFamily: "'Georgia',serif" }}>
          NEWS :
        </span> */}
      </div>

      {/* Prev Arrow */}
      <button onClick={prev} disabled={offset === 0} style={{
        width: "26px", height: "26px", borderRadius: "50%",
        border: "1.5px solid #bbb", background: "#fff",
        cursor: offset === 0 ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", color: offset === 0 ? "#ccc" : "#333",
        flexShrink: 0, transition: "all 0.2s",
      }}>‹</button>

      {/* Topics */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1 }}>
        {visible.map((t, i) => (
          <button key={i + offset} style={{
            padding: "5px 14px", border: "1.5px solid #ccc",
            borderRadius: "3px", background: "#fff",
            fontSize: "11px", fontWeight: "600", color: "#222",
            cursor: "pointer", fontFamily: "'Arial',sans-serif",
            letterSpacing: "0.04em", transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#c00"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#c00"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#222"; e.currentTarget.style.borderColor = "#ccc"; }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Next Arrow */}
      <button onClick={next} disabled={offset >= maxOffset} style={{
        width: "26px", height: "26px", borderRadius: "50%",
        border: "1.5px solid #bbb", background: "#fff",
        cursor: offset >= maxOffset ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", color: offset >= maxOffset ? "#ccc" : "#333",
        flexShrink: 0, transition: "all 0.2s",
      }}>›</button>
    </div>
  );
}

// ── SUB: Section Header ────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
      <div style={{ width: "4px", height: "20px", background: "#c00", borderRadius: "2px" }} />
      <span style={{
        fontWeight: "800", fontSize: "14px", color: "#111",
        fontFamily: "'Georgia',serif", letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}>{title}</span>
    </div>
  );
}

// ── SUB: Latest News List ──────────────────────────────────────
function LatestNewsList() {
  return (
    <div>
      <SectionHeader title="LATEST NEWS" />
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {latestNews.map((item, i) => (
          <div key={item.id} style={{
            padding: "10px 0",
            borderBottom: i < latestNews.length - 1 ? "1px solid #e8e8e8" : "none",
            cursor: "pointer",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#111", margin: "0 0 3px 0", fontFamily: "'Georgia',serif", lineHeight: 1.4 }}>
              {item.title}
            </p>
            <p style={{ fontSize: "11.5px", color: "#666", margin: 0, fontFamily: "'Arial',sans-serif", lineHeight: 1.4 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SUB: Feature Card ──────────────────────────────────────────
function FeatureCard({ card }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 180px", minWidth: "140px", maxWidth: "260px",
        cursor: "pointer", overflow: "hidden", borderRadius: "2px",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.18)" : "0 2px 6px rgba(0,0,0,0.1)",
        transition: "box-shadow 0.2s",
      }}
    >
      <div style={{ overflow: "hidden", height: "140px" }}>
        <img
          src={card.image}
          alt={card.title}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: hovered ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.35s ease",
          }}
        />
      </div>
      <div style={{ padding: "10px 10px 12px", background: "#fff" }}>
        <p style={{
          fontSize: "12px", fontWeight: "600", color: "#111",
          margin: 0, fontFamily: "'Georgia',serif", lineHeight: 1.5,
        }}>
          {card.title}
        </p>
      </div>
    </div>
  );
}

// ── SUB: Feature Cards Row ────────────────────────────────────
function FeatureCards() {
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
      {featureCards.map((card) => (
        <FeatureCard key={card.id} card={card} />
      ))}
    </div>
  );
}

// ── SUB: Live Updates ─────────────────────────────────────────
function LiveUpdates() {
  const [activeId, setActiveId] = useState(null);
  return (
    <div style={{ minWidth: "180px" }}>
      <SectionHeader title="LIVE UPDATES" />
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {liveUpdates.map((item, i) => (
          <div
            key={item.id}
            onClick={() => setActiveId(activeId === item.id ? null : item.id)}
            style={{
              display: "flex", gap: "8px", alignItems: "flex-start",
              padding: "8px 0",
              borderBottom: i < liveUpdates.length - 1 ? "1px solid #e8e8e8" : "none",
              cursor: "pointer",
            }}
          >
            {/* Red line indicator */}
            <div style={{
              width: "3px", minHeight: "36px", background: "#c00",
              borderRadius: "2px", flexShrink: 0, marginTop: "2px",
            }} />
            <div>
              <span style={{
                fontSize: "11px", fontWeight: "700", color: "#c00",
                fontFamily: "'Arial',sans-serif", display: "block", marginBottom: "2px",
              }}>{item.time}</span>
              <p style={{
                fontSize: "11.5px", color: "#333", margin: 0,
                fontFamily: "'Arial',sans-serif", lineHeight: 1.45,
              }}>{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SUB: Ad Banner ────────────────────────────────────────────


// ── MAIN COMPONENT ────────────────────────────────────────────
export default function TrendingNews() {
  const width = useWindowWidth();
  const isMobile  = width < 600;
  const isTablet  = width >= 600 && width < 960;
  const isDesktop = width >= 960;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f0f0; }

        .tn-wrap {
          font-family: 'Georgia', serif;
          background: #f0f0f0;
          min-height: 100vh;
          padding: 0 0 24px 0;
        }

        .tn-inner {
          max-width: 1261px;
          padding: 0 12px;
        }

        /* Main content grid */
        .tn-main-grid {
          display: grid;
          gap: 14px;
          align-items: start;
          margin-top: 14px;
        }

        /* Desktop: 3 columns */
        @media (min-width: 960px) {
          .tn-main-grid {
            grid-template-columns: 220px 1fr 200px;
          }
        }

        /* Tablet: 2 columns */
        @media (min-width: 600px) and (max-width: 959px) {
          .tn-main-grid {
            grid-template-columns: 1fr 1fr;
          }
          .tn-live-col {
            grid-column: 1 / -1;
          }
        }

        /* Mobile: 1 column */
        @media (max-width: 599px) {
          .tn-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .tn-panel {
          background: #fff;
          padding: 14px;
          border: 1px solid #e0e0e0;
        }

        .tn-ad-wrap {
          margin-top: 14px;
        }

        /* Feature cards responsive */
        .tn-cards-wrap {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
      `}</style>

      <div className="tn-wrap">
        {/* ── Trending Bar ── */}
        <TrendingBar />

        <div className="tn-inner">
          {/* ── Main 3-column Grid ── */}
          <div className="tn-main-grid">

            {/* Col 1 — Latest News */}
            <div className="tn-panel">
              <LatestNewsList />
            </div>

            {/* Col 2 — Feature Cards */}
            <div className="tn-panel">
              <div className="tn-cards-wrap">
                {featureCards.map((card) => (
                  <FeatureCard key={card.id} card={card} />
                ))}
              </div>
            </div>

            {/* Col 3 — Live Updates */}
            <div className="tn-panel tn-live-col">
              <LiveUpdates />
            </div>

          </div>

        </div>
      </div>
    </>
  );
}

