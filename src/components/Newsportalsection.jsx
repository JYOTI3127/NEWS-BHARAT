
import { useState, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────
const visualStories = [
  { id: 1, img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=300&q=80", caption: "1500 की रफ्तार की बात में, इस बात अखबार विचार ने एक प्रकाश को ले..." },
  { id: 2, img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&q=80", caption: "1500 की रफ्तार की बात में, इस बात अखबार विचार ने एक प्रकाश को ले..." },
  { id: 3, img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80", caption: "1500 की रफ्तार की बात में, इस बात अखबार विचार ने एक प्रकाश को ले..." },
  { id: 4, img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&q=80", caption: "1500 की रफ्तार की बात में, इस बात अखबार विचार ने एक प्रकाश को ले..." },
  { id: 5, img: "https://images.unsplash.com/photo-1479615201589-f23d8ebf12b0?w=300&q=80", caption: "1500 की रफ्तार की बात में, इस बात अखबार विचार ने एक प्रकाश को ले..." },
  { id: 6, img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&q=80", caption: "1500 की रफ्तार की बात में, इस बात अखबार विचार ने एक प्रकाश को ले..." },
  { id: 7, img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=300&q=80", caption: "1500 की रफ्तार की बात में, इस बात अखबार विचार ने एक प्रकाश को ले..." },
];

const entertainmentFeatured = {
  id: 1,
  img: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=800&q=80",
  title: "रोहित रेड्डी के घर फायरिंग में हरियाणा से 4 अरेस्ट, बिर्लोई गैंग के संपर्क में था शूटर",
  tag: "ENTERTAINMENT",
  time: "2 घंटे पहले",
};

const entertainmentSmall = [
  { id: 1, img: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", tag: "फ़िल्म", time: "1 घंटे पहले" },
  { id: 2, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", tag: "वेब सीरीज", time: "3 घंटे पहले" },
  { id: 3, img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", tag: "म्यूज़िक", time: "4 घंटे पहले" },
  { id: 4, img: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=300&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", tag: "टीवी", time: "5 घंटे पहले" },
  { id: 5, img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", tag: "बॉलीवुड", time: "6 घंटे पहले" },
  { id: 6, img: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", tag: "OTT", time: "7 घंटे पहले" },
  { id: 7, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", tag: "फ़िल्म", time: "8 घंटे पहले" },
  { id: 8, img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", tag: "अवार्ड्स", time: "9 घंटे पहले" },
];

const healthNews = [
  { id: 1, img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80", text: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है" },
  { id: 2, img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&q=80", text: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है" },
  { id: 3, img: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&q=80", text: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है" },
  { id: 4, img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&q=80", text: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है" },
  { id: 5, img: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&q=80", text: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है" },
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

// ── Tag Badge ──────────────────────────────────────────────────
function TagBadge({ label }) {
  return (
    <span style={{
      background: "#cc0000", color: "#fff",
      fontSize: "9.5px", padding: "2px 7px",
      borderRadius: "2px", fontFamily: "'Arial', sans-serif",
      fontWeight: "700", letterSpacing: "0.05em",
      textTransform: "uppercase", display: "inline-block", flexShrink: 0,
    }}>{label}</span>
  );
}

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "4px", height: "20px", background: "#cc0000", borderRadius: "2px", flexShrink: 0 }} />
        <span style={{
          fontWeight: "800", fontSize: "15px", color: "#111",
          fontFamily: "'Georgia', serif", letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>{title}</span>
      </div>
      <a href="#" style={{
        fontSize: "12px", color: "#cc0000", textDecoration: "none",
        fontFamily: "'Arial', sans-serif", fontWeight: "600",
        borderBottom: "1px solid transparent", transition: "border-color 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#cc0000"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
      >और देखें ›</a>
    </div>
  );
}

// ── Visual Stories Slider ──────────────────────────────────────
function VisualStories() {
  const [offset, setOffset] = useState(0);
  const visible = 5;
  const max = visualStories.length - visible;
  const prev = () => setOffset(o => Math.max(0, o - 1));
  const next = () => setOffset(o => Math.min(max, o + 1));

  return (
    <div style={{ marginBottom: "22px" }}>
      <SectionHeader title="VISUAL STORIES" />
      <div style={{
        position: "relative", border: "1px solid #e0e0e0",
        borderRadius: "4px", padding: "10px 36px", background: "#fff", overflow: "hidden",
      }}>
        <button onClick={prev} disabled={offset === 0} style={{
          position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)",
          width: "26px", height: "26px", borderRadius: "50%",
          border: "1.5px solid #bbb", background: "#fff",
          cursor: offset === 0 ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", color: offset === 0 ? "#ccc" : "#333", zIndex: 2,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}>‹</button>

        <div style={{ display: "flex", gap: "10px", overflow: "hidden" }}>
          {visualStories.slice(offset, offset + visible).map((s) => (
            <div key={s.id} style={{ flex: "1 1 0", minWidth: 0, cursor: "pointer" }}>
              <div style={{
                borderRadius: "4px", overflow: "hidden", aspectRatio: "3/4",
                border: "2px solid transparent", transition: "border-color 0.2s", position: "relative",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#cc0000"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
              >
                <img src={s.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
              </div>
              <p style={{
                fontSize: "11px", color: "#333", marginTop: "5px",
                fontFamily: "'Noto Sans Devanagari','Arial',sans-serif", lineHeight: 1.4,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>{s.caption}</p>
            </div>
          ))}
        </div>

        <button onClick={next} disabled={offset >= max} style={{
          position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)",
          width: "26px", height: "26px", borderRadius: "50%",
          border: "1.5px solid #bbb", background: "#fff",
          cursor: offset >= max ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", color: offset >= max ? "#ccc" : "#333", zIndex: 2,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}>›</button>
      </div>
    </div>
  );
}

// ── Small Scrollable Card ──────────────────────────────────────
function SmallNewsCard({ item, isLast }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", gap: "10px", cursor: "pointer",
        padding: "10px 12px",
        background: hovered ? "#fff9f9" : "#fff",
        borderBottom: isLast ? "none" : "1px solid #f0f0f0",
        borderLeft: hovered ? "3px solid #cc0000" : "3px solid transparent",
        transition: "all 0.18s ease", alignItems: "flex-start",
      }}
    >
      <div style={{ width: "88px", height: "64px", borderRadius: "4px", overflow: "hidden", flexShrink: 0 }}>
        <img src={item.img} alt="" style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: hovered ? "scale(1.06)" : "scale(1)",
          transition: "transform 0.3s ease", display: "block",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <TagBadge label={item.tag} />
          <span style={{ fontSize: "10px", color: "#aaa", fontFamily: "'Arial',sans-serif" }}>{item.time}</span>
        </div>
        <p style={{
          fontSize: "12.5px", color: hovered ? "#cc0000" : "#222", margin: 0,
          fontFamily: "'Noto Sans Devanagari','Arial',sans-serif",
          lineHeight: 1.48, fontWeight: "500",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
          transition: "color 0.18s",
        }}>{item.title}</p>
      </div>
    </div>
  );
}

// ── Entertainment Section (Upgraded) ──────────────────────────
function EntertainmentSection() {
  const PANEL_HEIGHT = 420;
  return (
    <div style={{ marginBottom: "22px" }}>
      <SectionHeader title="ENTERTAINMENT" />
      <div className="ent-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "14px", alignItems: "start" }}>

        {/* LEFT: Featured Card */}
        <div style={{
          position: "relative", borderRadius: "6px", overflow: "hidden",
          cursor: "pointer", height: `${PANEL_HEIGHT}px`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
        }}
          onMouseEnter={e => { const img = e.currentTarget.querySelector("img"); if (img) img.style.transform = "scale(1.04)"; }}
          onMouseLeave={e => { const img = e.currentTarget.querySelector("img"); if (img) img.style.transform = "scale(1)"; }}
        >
          <img src={entertainmentFeatured.img} alt="" style={{
            width: "100%", height: "100%", objectFit: "cover",
            display: "block", transition: "transform 0.4s ease",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)",
          }} />
          {/* Breaking badge */}
          <div style={{ position: "absolute", top: "12px", left: "12px" }}>
            <span style={{
              background: "#cc0000", color: "#fff", fontSize: "10px",
              padding: "3px 8px", borderRadius: "2px",
              fontFamily: "'Arial',sans-serif", fontWeight: "800",
              letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "5px",
            }}>
              <span style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: "#fff", display: "inline-block",
                animation: "blink 1.2s ease-in-out infinite",
              }} />
              BREAKING
            </span>
          </div>
          {/* Bottom content */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <TagBadge label={entertainmentFeatured.tag} />
              <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "10.5px", fontFamily: "'Arial',sans-serif" }}>
                {entertainmentFeatured.time}
              </span>
            </div>
            <p style={{
              color: "#fff", fontSize: "16px", fontWeight: "700", margin: 0,
              fontFamily: "'Noto Sans Devanagari','Georgia',serif",
              lineHeight: 1.45, textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}>{entertainmentFeatured.title}</p>
            <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "#ffcccc", fontSize: "11.5px", fontFamily: "'Arial',sans-serif", fontWeight: "600" }}>पूरी खबर पढ़ें</span>
              <span style={{ color: "#ff9999", fontSize: "14px" }}>›</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Scrollable Panel */}
        <div style={{
          background: "#fff", borderRadius: "6px",
          border: "1px solid #e8e8e8", overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          height: `${PANEL_HEIGHT}px`,
          display: "flex", flexDirection: "column",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "10px 14px", background: "#fff",
            borderBottom: "2px solid #cc0000",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{ width: "3px", height: "16px", background: "#cc0000", borderRadius: "2px" }} />
              <span style={{
                fontSize: "12px", fontWeight: "800", color: "#111",
                fontFamily: "'Georgia',serif", letterSpacing: "0.05em", textTransform: "uppercase",
              }}>ताज़ा खबरें</span>
            </div>
            <span style={{
              background: "#cc0000", color: "#fff", fontSize: "10px",
              padding: "2px 8px", borderRadius: "10px",
              fontFamily: "'Arial',sans-serif", fontWeight: "700",
            }}>{entertainmentSmall.length} News</span>
          </div>

          {/* Scrollable list */}
          <div className="ent-scroll" style={{ overflowY: "auto", flex: 1 }}>
            {entertainmentSmall.map((item, i) => (
              <SmallNewsCard key={item.id} item={item} isLast={i === entertainmentSmall.length - 1} />
            ))}
          </div>

          {/* Load more footer */}
          <div style={{
            padding: "9px 12px", borderTop: "1px solid #f0f0f0",
            flexShrink: 0, background: "#fafafa", textAlign: "center",
          }}>
            <button style={{
              background: "#cc0000", color: "#fff", border: "none",
              borderRadius: "3px", padding: "6px 24px", fontSize: "11.5px",
              fontFamily: "'Arial',sans-serif", fontWeight: "700",
              cursor: "pointer", letterSpacing: "0.04em", width: "100%",
              transition: "background 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#a00000"}
              onMouseLeave={e => e.currentTarget.style.background = "#cc0000"}
            >
              और खबरें लोड करें ↓
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Live Score Card ────────────────────────────────────────────
function LiveScoreCard() {
  const [tab, setTab] = useState("LIVE");
  const tabs = ["LIVE", "UPCOMING", "RECENT"];
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden", marginBottom: "14px" }}>
      <div style={{ display: "flex", gap: "10px",padding: "10px"  }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "7px 4px", border: "none",
            background: tab === t ? "#cc0000" : "#fff",
            color: tab === t ? "#fff" : "#444",
            fontSize: "11px", fontWeight: "700", cursor: "pointer", marginTop: "5px",
            fontFamily: "'Arial',sans-serif", letterSpacing: "0.04em",
            borderBottom: tab === t ? "none" : "2px solid #e0e0e0",
            transition: "background 0.15s",
            
          }}>{t}</button>
        ))}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <p style={{ fontSize: "11px", color: "#555", fontFamily: "'Arial',sans-serif", marginBottom: "4px" }}>
          फ़ेब 29, आईसीसी टेस्ट टी20 वर्ल्ड कप, 2026
        </p>
        <p style={{ fontSize: "11px", color: "#cc0000", fontFamily: "'Arial',sans-serif", fontWeight: "700", marginBottom: "10px" }}>
          Feb 16, 15:00 (IST) | <span style={{ color: "#27ae60" }}>खेल जारी है</span>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ border: "1.5px solid #ddd", borderRadius: "4px", padding: "8px 4px", marginBottom: "4px", background: "#fafafa" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", fontFamily: "'Arial',sans-serif", color: "#111" }}>ITALY</span>
            </div>
            <p style={{ fontSize: "15px", fontWeight: "900", color: "#111", fontFamily: "'Georgia',serif", margin: 0 }}>43/3</p>
            <p style={{ fontSize: "10px", color: "#888", margin: "2px 0 0", fontFamily: "'Arial',sans-serif" }}>(5.5 OV)</p>
          </div>
          <div style={{ fontWeight: "900", fontSize: "13px", color: "#cc0000", fontFamily: "'Georgia',serif", flexShrink: 0 }}>VS</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ border: "1.5px solid #ddd", borderRadius: "4px", padding: "8px 4px", marginBottom: "4px", background: "#fafafa" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", fontFamily: "'Arial',sans-serif", color: "#111" }}>ENGLAND</span>
            </div>
            <p style={{ fontSize: "15px", fontWeight: "900", color: "#111", fontFamily: "'Georgia',serif", margin: 0 }}>202/7</p>
            <p style={{ fontSize: "10px", color: "#888", margin: "2px 0 0", fontFamily: "'Arial',sans-serif" }}>(20.0 OV)</p>
          </div>
        </div>
        <div style={{ marginTop: "10px", padding: "6px 8px", background: "#fff8f8", borderRadius: "3px", border: "1px solid #fdd" }}>
          <p style={{ fontSize: "11px", color: "#cc0000", margin: 0, fontFamily: "'Noto Sans Devanagari','Arial',sans-serif", lineHeight: 1.4, fontWeight: "600" }}>
            इटली को 44 मैच में 11.25 पर्स ओवर और 160 रन चाहिए
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Health Sidebar ─────────────────────────────────────────────
function HealthSidebar() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" , marginTop: "87px" }}>
      <div style={{ background: "#cc0000", padding: "8px 12px" }}>
        <span style={{ color: "#fff", fontWeight: "800", fontSize: "13px", fontFamily: "'Georgia',serif", letterSpacing: "0.06em" }}>HEALTH</span>
      </div>
      <div>
        {healthNews.map((item, i) => (
          <div key={item.id} style={{
            display: "flex", gap: "8px", padding: "8px 10px", cursor: "pointer",
            borderBottom: i < healthNews.length - 1 ? "1px solid #f0f0f0" : "none",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <img src={item.img} alt="" style={{ width: "56px", height: "44px", objectFit: "cover", borderRadius: "3px", flexShrink: 0 }} />
            <p style={{
              fontSize: "11px", color: "#333", margin: 0,
              fontFamily: "'Noto Sans Devanagari','Arial',sans-serif", lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export default function NewsPortalSection() {
  const width = useWindowWidth();
  const isMobile = width < 600;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* Custom scrollbar */
        .ent-scroll::-webkit-scrollbar { width: 4px; }
        .ent-scroll::-webkit-scrollbar-track { background: #f5f5f5; }
        .ent-scroll::-webkit-scrollbar-thumb { background: #cc0000; border-radius: 4px; }
        .ent-scroll::-webkit-scrollbar-thumb:hover { background: #a00000; }

        .nps-wrap {
          background: #f4f4f4;
          min-height: 100vh;
          padding: 40px 20px 28px;
          font-family: 'Georgia', serif;
        }
        .nps-inner {
          max-width: 1200px;
        }
        .nps-layout {
          display: grid;
          gap: 16px;
          align-items: start;
        }
        @media (min-width: 960px) {
          .nps-layout { grid-template-columns: 1fr 220px; }
        }
        @media (max-width: 959px) {
          .nps-layout { grid-template-columns: 1fr; }
          .nps-sidebar { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        }
        @media (max-width: 599px) {
          .nps-sidebar { grid-template-columns: 1fr; }
          .ent-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="nps-wrap">
        <div className="nps-inner">
          <div className="nps-layout">

            {/* ── Main Content ── */}
            <div>
              <VisualStories />
              <EntertainmentSection />
            </div>

            {/* ── Sidebar ── */}
            <div className="nps-sidebar" style={{ marginTop: isMobile ? "36px" : "36px" }}>
              <LiveScoreCard />
              <HealthSidebar />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

