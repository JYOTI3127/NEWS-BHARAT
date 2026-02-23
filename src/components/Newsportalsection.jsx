import { useState, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────
const visualStories = [
  { 
    id: 1, 
    img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=300&q=80", 
    caption: "In the discussion around speed reaching 1,500, the newspaper editorial." 
  },
  { 
    id: 2, 
    img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&q=80", 
    caption: "In the discussion around speed reaching 1,500, the newspaper editorial." 
  },
  { 
    id: 3, 
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80", 
    caption: "In the discussion around speed reaching 1,500, the newspaper editorial." 
  },
  { 
    id: 4, 
    img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&q=80", 
    caption: "In the discussion around speed reaching 1,500, the newspaper editorial." 
  },
  { 
    id: 5, 
    img: "https://images.unsplash.com/photo-1479615201589-f23d8ebf12b0?w=300&q=80", 
    caption: "In the discussion around speed reaching 1,500, the newspaper editorial." 
  },
  { 
    id: 6, 
    img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&q=80", 
    caption: "In the discussion around speed reaching 1,500, the newspaper editorial." 
  },
  { 
    id: 7, 
    img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=300&q=80", 
    caption: "In the discussion around speed reaching 1,500, the newspaper editorial." 
  },
];

const entMidCards = [
  {
    id: 1,
    img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80",
    label: "TritiyaBishwa",
    hd: false,
    teaser: false,
    title: "Lorem Ipsum has been the industry's standard dummy text survived to the principal.",
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80",
    label: "REBOOT",
    hd: false,
    teaser: false,
    title: "Lorem Ipsum has been the industry's standard dummy text survived to the principal.",
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&q=80",
    label: "Golmaal",
    hd: true,
    teaser: true,
    title: "Lorem Ipsum has been the industry's standard dummy text survived to the principal.",
  },
];


const healthNews = [
  { 
    id: 1, 
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80", 
    text: "Lorem Ipsum has been the industry's standard dummy." 
  },
  { 
    id: 2, 
    img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&q=80", 
    text: "Lorem Ipsum has been the industry's standard dummy." 
  },
  { 
    id: 3, 
    img: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&q=80", 
    text: "Lorem Ipsum has been the industry's standard dummy." 
  },
  { 
    id: 4, 
    img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&q=80", 
    text: "Lorem Ipsum has been the industry's standard dummy." 
  },
  { 
    id: 5, 
    img: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&q=80", 
    text: "Lorem Ipsum has been the industry's standard dummy." 
  },
  { 
    id: 6, 
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80", 
    text: "Lorem Ipsum has been the industry's standard dummy." 
  },
  { 
    id: 7, 
    img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&q=80", 
    text: "Lorem Ipsum has been the industry's standard dummy." 
  },
  { 
    id: 8, 
    img: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&q=80", 
    text: "Lorem Ipsum has been the industry's standard dummy." 
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

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "4px", height: "20px", background: "#cc0000", borderRadius: "2px", flexShrink: 0 }} />
        <span style={{
          fontWeight: "bold", fontSize: "18px", color: "#111",
          fontFamily: "'Poppins', sans-serif",
          textTransform: "uppercase",
        }}>{title}</span>
      </div>
      <a href="#" style={{
        fontSize: "12px", color: "#cc0000", textDecoration: "none",
        fontFamily: "'Poppins', sans-serif", fontWeight: "600",
        borderBottom: "1px solid transparent", transition: "border-color 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#cc0000"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
      >Read More›</a>
    </div>
  );
}

// ── Live Score Card ────────────────────────────────────────────
function LiveScoreCard() {
  const [tab, setTab] = useState("LIVE");
  const tabs = ["LIVE", "UPCOMING", "RECENT"];
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "10px", overflow: "hidden",height: "328px" }}>
      <div style={{ display: "flex", gap: "10px", padding: "10px", background: "#D80100" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "7px 4px", border: "none",
            background: "#D80100",
            color: tab === t ? "#fff" : "rgba(255,255,255,0.7)",
            fontSize: "11px", fontWeight: "700", cursor: "pointer", marginTop: "5px",
            fontFamily: "'Poppins', sans-serif", letterSpacing: "0.04em",
            borderBottom: tab === t ? "2px solid #fff" : "2px solid transparent",
            transition: "all 0.15s",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ padding: "30px 12px" }}>
        <p style={{ fontSize: "11px", color: "#555", fontFamily: "'Poppins', sans-serif", marginBottom: "4px" }}>
       Feb 29, ICC Test & T20 World Cup, 2026
        </p>
        <p style={{ fontSize: "11px", color: "#D80100", fontFamily: "'Poppins', sans-serif", fontWeight: "700", marginBottom: "10px" }}>
          Feb 16, 15:00 (IST) | <span style={{ color: "#27ae60" }}>खेल जारी है</span>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ border: "1.5px solid #ddd", borderRadius: "4px", padding: "8px 4px", marginBottom: "4px", background: "#fafafa" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", fontFamily: "'Poppins', sans-serif", color: "#111" }}>ITALY</span>
            </div>
            <p style={{ fontSize: "15px", fontWeight: "900", color: "#111", fontFamily: "'Poppins', sans-serif", margin: 0 }}>43/3</p>
            <p style={{ fontSize: "10px", color: "#888", margin: "2px 0 0", fontFamily: "'Poppins', sans-serif" }}>(5.5 OV)</p>
          </div>
          <div style={{ fontWeight: "900", fontSize: "13px", color: "#D80100", fontFamily: "'Poppins', sans-serif", flexShrink: 0 }}>VS</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ border: "1.5px solid #ddd", borderRadius: "4px", padding: "8px 4px", marginBottom: "4px", background: "#fafafa" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", fontFamily: "'Poppins', sans-serif", color: "#111" }}>ENGLAND</span>
            </div>
            <p style={{ fontSize: "15px", fontWeight: "900", color: "#111", fontFamily: "'Poppins', sans-serif", margin: 0 }}>202/7</p>
            <p style={{ fontSize: "10px", color: "#888", margin: "2px 0 0", fontFamily: "'Poppins', sans-serif" }}>(20.0 OV)</p>
          </div>
        </div>
        <div style={{ marginTop: "10px", padding: "6px 8px", background: "#fff8f8", borderRadius: "3px", border: "1px solid #fdd" }}>
          <p style={{ fontSize: "11px", color: "#cc0000", margin: 0, fontFamily: "'Poppins', sans-serif", lineHeight: 1.4, fontWeight: "600" }}>
           Italy need 160 runs in 44 matches at 11.25 RPO.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Visual Stories + LiveScore side by side ────────────────────
function VisualStoriesRow() {
  const [offset, setOffset] = useState(0);
  const visible = 5;
  const max = visualStories.length - visible;
  const prev = () => setOffset(o => Math.max(0, o - 1));
  const next = () => setOffset(o => Math.min(max, o + 1));

  return (
    <div style={{ marginBottom: "22px" }}>
      {/* Visual Stories heading */}
      <SectionHeader title="VISUAL STORIES" />

      {/* Stories + LiveScore in same row */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

        {/* Visual Stories slider — takes remaining space */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            position: "relative", border: "1px solid #bbb",
            borderRadius: "10px", padding: "10px", background: "#fff", overflow: "hidden",
          }}>
            <button onClick={prev} disabled={offset === 0} style={{
              position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)",
              width: "32px", height: "29px", borderRadius: "50%",
              border: "1.5px solid #bbb", background: "#fff",
              cursor: offset === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", color: offset === 0 ? "black" : "#333", zIndex: 2,
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            }}>‹</button>

            <div style={{ display: "flex", gap: "10px", overflow: "hidden" }}>
              {visualStories.slice(offset, offset + visible).map((s) => (
                <div key={s.id} style={{ flex: "1 1 0", minWidth: 0, cursor: "pointer", borderRadius: "10px", border: "1px solid grey" }}>
                  <div style={{ borderRadius: "10px", overflow: "hidden", aspectRatio: "3/4", position: "relative" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#cc0000"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                  >
                    <img src={s.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
                  </div>
                  <p style={{
                    fontSize: "11px", color: "#333", padding: "15px", paddingBottom: "13%",
                    fontFamily: "'Poppins', sans-serif", lineHeight: 1.4,
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

        {/* LiveScoreCard — right of stories, fixed width */}
        <div style={{ width: "220px", flexShrink: 0 }}>
          <LiveScoreCard />
        </div>

      </div>
    </div>
  );
}

// ── Entertainment Section ──────────────────────────────────────
function EntertainmentSection() {
  return (
    <div style={{ marginBottom: "22px", paddingTop: "20px" }}>
      <SectionHeader title="ENTERTAINMENT" />

      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>

        {/* LEFT + MIDDLE */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", gap: "14px", alignItems: "flex-start" }}>

          {/* LEFT: Big img + small card below */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "310px", flexShrink: 0 }}>
            <div style={{
              position: "relative", width: "145%", height: "230px",
              borderRadius: "7px", overflow: "hidden", cursor: "pointer", background: "#111",
            }}>
              <img
                src="https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=700&q=80"
                alt="featured"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.82 }}
              />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "50px 13px 13px",
                background: "linear-gradient(to top, rgba(0,0,0,0.88), transparent)",
              }}>
                <p style={{ color: "#fff", fontSize: "13px", fontWeight: 600, lineHeight: 1.5, fontFamily: "'Poppins', sans-serif",borderLeft: "2px solid yellow", paddingLeft: "2%" }}>
                  रोहित शेट्टी के घर फायरिंग में हरियाणा से 4 अरेस्ट,<br />
                  बिश्नोई गैंग के संपर्क में था शूटर
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer", }}>
              <div style={{ width: "196px", minWidth: "130px", height: "110px", borderRadius: "5px", overflow: "hidden", flexShrink: 0, background: "#222" }}>
                <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80" alt="concert"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "14.9px", fontWeight: 500, color: "#1a1a1a", lineHeight: 1.6, width: "225px", padding: "10px", fontFamily: "'Poppins', sans-serif",
                  display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है
                </p>
              </div>
            </div>
          </div>

          {/* MIDDLE: 3 vertical cards */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "12px", paddingLeft: "14%", }}>
            {entMidCards.map((card) => (
              <div key={card.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                <div style={{ position: "relative", width: "191px", minWidth: "175px", height: "108px", borderRadius: "5px", overflow: "hidden", flexShrink: 0, background: "#222" }}>
                  <img src={card.img} alt={card.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {card.label && (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.30)", color: "#fff", fontSize: "13px", fontWeight: 700,
                      fontStyle: "italic", textAlign: "center", padding: "8px", fontFamily: "'Arial',sans-serif", pointerEvents: "none",
                    }}>{card.label}</div>
                  )}
                  {card.hd && <span style={{ position: "absolute", top: 5, right: 5, background: "#e8001c", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "2px", letterSpacing: "0.8px", zIndex: 3 }}>HD</span>}
                  {card.teaser && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.72)", color: "#fff", fontSize: "9px", fontWeight: 700, textAlign: "center", padding: "4px 0", letterSpacing: "3px", zIndex: 3 }}>TEASER</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "15.5px", fontWeight: 500, color: "#1a1a1a", lineHeight: 1.6, fontFamily: "'Poppins', sans-serif", padding: "20px", borderRadius: "5px",
                    display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden",width: "310px" }}>{card.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HEALTH SIDEBAR — scrollable */}
        <div style={{ width: "210px", minWidth: "195px", flexShrink: 0, background: "#fff", borderRadius: "5px", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.09)" }}>
          <div style={{ background: "#cc0000", padding: "8px 12px", textAlign: "center" }}>
            <span style={{ color: "#fff", fontWeight: "800", fontSize: "13px", fontFamily: "'Poppins', sans-serif", letterSpacing: "0.06em" }}>HEALTH</span>
          </div>
          <div style={{ maxHeight: "311px", overflowY: "auto", padding: "4px 8px", scrollbarWidth: "thin", scrollbarColor: "#e8001c #f5f5f5", border: "1px solid #999999" }}>
            {healthNews.map((item, i) => (
              <div key={item.id} style={{ display: "flex", gap: "8px", alignItems: "center", padding: "8px 0",
                borderBottom: i < healthNews.length - 1 ? "1px solid #f0f0f0" : "none", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: "66px", minWidth: "66px", height: "47px", borderRadius: "4px", overflow: "hidden", flexShrink: 0 }}>
                  <img src={item.img} alt="health" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <p style={{ fontSize: "10px", color: "#333", lineHeight: 1.45, fontWeight: 400, fontFamily: "'Poppins', sans-serif",
                  display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

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

        .nps-wrap {
          background: white;
          min-height: 100vh;
          padding: 40px 20px 28px;
          font-family: 'Georgia', serif;
        }
        .nps-inner { max-width: 1261px;
    margin: 0 20px;}

        .nps-layout {
          display: block;
          width: 100%;
        }
      `}</style>

      <div className="nps-wrap">
        <div className="nps-inner">
          <div className="nps-layout">

            {/* ── Main Content ── */}
            <div>
              {/* Visual Stories + LiveScore in same row */}
              <VisualStoriesRow />
              <EntertainmentSection />
            </div>



          </div>
        </div>
      </div>
    </>
  );
}