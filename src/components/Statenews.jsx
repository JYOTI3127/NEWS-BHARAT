import { useState, useRef, useEffect } from "react";

// ── Data ───────────────────────────────────────────────────────
const stateList = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const featuredCard = {
  img: "https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=700&q=80",
  title: "Four arrested from Haryana in firing incident at Rohit Shetty's house; shooter linked to Bishnoi gang",
  tag: "BREAKING",
  date: "Mar 6, 2026",
};

const bottomLeftCard = {
  img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80",
  tag: "ENTERTAINMENT",
  date: "Mar 5, 2026",
  title: "Lorem Ipsum has been the industry's standard dummy text and has survived.",
};

const midCards = [
  { id: 1, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80", tag: "FILM", date: "Mar 4, 2026", label: "TritiyaBishwa", hd: false, teaser: false, title: "Lorem Ipsum has been the industry's standard dummy text and has centuries." },
  { id: 2, img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80", tag: "OTT", date: "Mar 3, 2026", label: "REBOOT", hd: false, teaser: false, title: "Lorem Ipsum has been the industry's standard dummy text and has centuries." },
  { id: 3, img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&q=80", tag: "MOVIES", date: "Mar 2, 2026", label: "Golmaal", hd: true, teaser: true, title: "Lorem Ipsum has been the industry's standard dummy text and has centuries." },
];

const defenceNews = [
  { id: 1, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&q=80", date: "Mar 6", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 2, img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&q=80", date: "Mar 5", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 3, img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=200&q=80", date: "Mar 4", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 4, img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80", date: "Mar 3", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 5, img: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=200&q=80", date: "Mar 2", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 6, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&q=80", date: "Mar 1", title: "Lorem Ipsum has been the industry's standard dummy." },
];

// ── Breakpoint Hook ───────────────────────────────────────────
const useBreakpoint = () => {
  const [bp, setBp] = useState(() => {
    if (typeof window === "undefined") return "laptop";
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    if (w < 1440) return "laptop";
    return "large";
  });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      if (w < 768) setBp("mobile");
      else if (w < 1024) setBp("tablet");
      else if (w < 1440) setBp("laptop");
      else setBp("large");
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return bp;
};

// ── Component ─────────────────────────────────────────────────
export default function StateNews() {
  const [activeState, setActiveState] = useState("Andhra Pradesh");
  const tabsRef = useRef(null);
  const bp = useBreakpoint();

  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isLaptop = bp === "laptop";
  const isLarge = bp === "large";

  const scroll = (dir) => {
    if (tabsRef.current) tabsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="sn-wrap">

      {/* Heading */}
      <div className="sn-heading-row">
        <div className="sn-heading-bar" />
        <span className="sn-heading-text">State News</span>
      </div>

      {/* State Tabs */}
      <div className="sn-tabs-container">
        <button
          className="sn-arrow sn-arrow-left bg-transparent border-none p-0 leading-none cursor-pointer flex-shrink-0"
          onClick={() => scroll(-1)}
        >
          <span className="inline-flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border border-white/90 bg-red-600 overflow-hidden">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6L8 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <div className="sn-tabs-scroll-area" ref={tabsRef}>
          {stateList.map(s => (
            <button
              key={s}
              className={`sn-tab-btn${activeState === s ? " active" : ""}`}
              onClick={() => setActiveState(s)}
            >{s}</button>
          ))}
        </div>

        <button
          className="sn-arrow sn-arrow-right bg-transparent border-none p-0 leading-none cursor-pointer flex-shrink-0"
          onClick={() => scroll(1)}
        >
          <span
            className="inline-flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border border-white/90 bg-red-600 overflow-hidden"
            style={{ marginLeft: isMobile ? "0" : "30%" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div
        className="sn-main"
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "12px" : "16px",
          alignItems: "flex-start",
        }}
      >

        {/* ── LEFT + MIDDLE ── */}
        <div
          className="sn-left-mid"
          style={{
            flex: 1,
            minWidth: 0,
            display: "grid",
            gap: "12px",
            // Mobile: single column stack
            // Tablet: 2 col (featured | mid), small card below featured
            // Laptop+: same as tablet but more space
            gridTemplateColumns: isMobile
              ? "1fr"
              : "1fr 1fr",
            gridTemplateRows: isMobile
              ? "auto"
              : "auto auto",
          }}
        >
          {/* Featured big card */}
          <div
            className="sn-featured-wrap"
            style={{
              gridColumn: isMobile ? "1" : "1",
              gridRow: isMobile ? "auto" : "1",
            }}
          >
            <div
              className="sn-big-card"
              style={{
                position: "relative",
                borderRadius: "8px",
                overflow: "hidden",
                height: isMobile ? "200px" : isTablet ? "220px" : "260px",
              }}
            >
              <img
                src={featuredCard.img}
                alt="featured"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div className="sn-big-overlay" style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
                padding: "12px",
                display: "flex", flexDirection: "column", justifyContent: "flex-end",
              }}>
                <div className="sn-big-badge">{featuredCard.tag}</div>
                <p className="sn-big-title" style={{ fontSize: isMobile ? "12px" : "14px" }}>{featuredCard.title}</p>
                <span className="sn-big-date">{featuredCard.date}</span>
              </div>
            </div>
          </div>

          {/* Middle 3 cards — right column */}
          <div
            className="sn-mid"
            style={{
              gridColumn: isMobile ? "1" : "2",
              gridRow: isMobile ? "auto" : "1 / 3",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              overflowX: "visible",
            }}
          >
            {midCards.map(card => (
              <div
                className="sn-mid-card"
                key={card.id}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "8px",
                  width: "100%",
                }}
              >
                <div
                  className="sn-mid-img"
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    width: "100px",
                    height: "78px",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <img src={card.img} alt={card.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {card.label && <div className="sn-mov-label">{card.label}</div>}
                  {card.hd && <span className="sn-hd-badge">HD</span>}
                  {card.teaser && <span className="sn-teaser-badge">TEASER</span>}
                </div>
                <div className="sn-mid-text" style={{ flex: 1, minWidth: 0 }}>
                  <span className="sn-card-tag">{card.tag}</span>
                  <p className="sn-mid-title">{card.title}</p>
                  <span className="sn-card-date">{card.date}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Small card — bottom left (hidden on mobile, shown on tablet+) */}
          {!isMobile && (
            <div
              className="sn-small-card"
              style={{
                gridColumn: "1",
                gridRow: "2",
                display: "flex",
                flexDirection: "row",
                gap: "8px",
              }}
            >
              <div style={{
                flexShrink: 0, width: "100px", height: "78px",
                borderRadius: "6px", overflow: "hidden",
              }}>
                <img src={bottomLeftCard.img} alt="news" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div className="sn-sc-text" style={{ flex: 1, minWidth: 0 }}>
                <span className="sn-card-tag">{bottomLeftCard.tag}</span>
                <p className="sn-sc-title">{bottomLeftCard.title}</p>
                <span className="sn-card-date">{bottomLeftCard.date}</span>
              </div>
            </div>
          )}

          {/* Mobile: small card shown below mid cards as full row */}
          {isMobile && (
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{
                flexShrink: 0, width: "90px", height: "70px",
                borderRadius: "6px", overflow: "hidden",
              }}>
                <img src={bottomLeftCard.img} alt="news" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="sn-card-tag">{bottomLeftCard.tag}</span>
                <p className="sn-sc-title">{bottomLeftCard.title}</p>
                <span className="sn-card-date">{bottomLeftCard.date}</span>
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT: Defence panel ── */}
        <div
          className="sn-defence"
          style={{
            width: isMobile ? "100%" : isTablet ? "200px" : "220px",
            flexShrink: 0,
          }}
        >
          <div className="sn-defence-head">डिफेंस न्यूज़</div>
          <div
            className="sn-defence-scroll"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              overflowX: "visible",
              overflowY: "auto",
            }}
          >
            {defenceNews.map((item) => (
              <div
                className="sn-defence-item"
                key={item.id}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "8px",
                  width: "100%",
                }}
              >
                <div style={{
                  flexShrink: 0,
                  width: "64px",
                  height: "50px",
                  borderRadius: "5px",
                  overflow: "hidden",
                }}>
                  <img src={item.img} alt="news" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div className="sn-di-text-wrap" style={{ flex: 1, minWidth: 0 }}>
                  <p className="sn-di-title">{item.title}</p>
                  <span className="sn-di-date">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}