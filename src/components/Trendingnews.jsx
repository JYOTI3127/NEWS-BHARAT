import { useState, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────
const trendingTopics = [
  "Breaking News","Politics Today","Latest India News","World Headlines",
  "Business Updates","Stock Market","Technology News","Entertainment Buzz",
  "Bollywood News","Sports Highlights","Cricket Updates","Weather Today","Elections 2026",
];

const latestNews = [
  { id: 1, title: "Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc: "Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id: 2, title: "Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc: "Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id: 3, title: "Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc: "Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id: 4, title: "Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc: "Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
];

const featureCards = [
  { id: 1, image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80", title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." },
  { id: 2, image: "https://images.unsplash.com/photo-1482731215275-a1f151646268?w=600&q=80", title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." },
  { id: 3, image: "https://images.unsplash.com/photo-1578496781379-7dcfb995293d?w=600&q=80", title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." },
];

const liveUpdates = [
  { id: 1, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 2, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 3, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 4, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 5, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 6, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 7, time: "3:20 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 8, time: "3:21 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
];

const bannerSlides = [
  {
    leftBg: "#1e5c42", brand1: "PRATIYOGITA", brand2: "DARPAN",
    price: "PRICE ₹125.00", date: "FEBRUARY 2024",
    tagline: "WHERE EXCELLENCE GUIDES THE SUCCESS",
    midBg: "#f5a000", midTag: "Semi Annual", midBoxBg: "#6a1fa2",
    midL1: "Current", midL2: "Affairs", midL3: "Special",
    rightBg: "#f5e000", rl: "MOST USEFUL FOR", rb: "UNION & STATE", rs: "CIVIL SERVICES EXAM",
  },
  {
    leftBg: "#0d3b6e", brand1: "COMPETITION", brand2: "TIMES",
    price: "PRICE ₹150.00", date: "MARCH 2024",
    tagline: "YOUR GATEWAY TO SUCCESS",
    midBg: "#e53935", midTag: "Annual", midBoxBg: "#b71c1c",
    midL1: "General", midL2: "Knowledge", midL3: "Special",
    rightBg: "#b2fab4", rl: "BEST RESOURCE FOR", rb: "SSC & BANKING", rs: "EXAMINATION PREP",
  },
  {
    leftBg: "#1a1a2e", brand1: "CAREER", brand2: "LAUNCHER",
    price: "PRICE ₹99.00", date: "APRIL 2024",
    tagline: "LAUNCHING CAREERS SINCE 1995",
    midBg: "#7b1fa2", midTag: "Monthly", midBoxBg: "#4a148c",
    midL1: "Reasoning", midL2: "& Aptitude", midL3: "Special",
    rightBg: "#ffe082", rl: "TOP CHOICE FOR", rb: "UPSC & STATE PSC", rs: "ASPIRANTS NATIONWIDE",
  },
];

// ── Circle Arrow Icon — FIXED 32x32, NO layout shift ever ────
const ArrowBtn = ({ direction, disabled, onClick }) => (
  <div
    onClick={disabled ? undefined : onClick}
    style={{
      width: "32px",
      height: "32px",
      minWidth: "32px",
      minHeight: "32px",
      flexShrink: 0,
      flexGrow: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: disabled ? "default" : "pointer",
      userSelect: "none",
      boxSizing: "border-box",
    }}
  >
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Circle background */}
      <circle
        cx="16"
        cy="16"
        r="15"
        fill={disabled ? "#ffffff" : "#ffffff"}
        stroke={disabled ? "#999999" : "#999999"}
        strokeWidth="1"
      />
      {/* Arrow chevron */}
      {direction === "left" ? (
        <path
          d="M19 10L13 16L19 22"
          stroke={disabled ? "#c0c0c0" : "#999999"}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M13 10L19 16L13 22"
          stroke={disabled ? "#c0c0c0" : "#999999"}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  </div>
);

const FlameSvg = () => (
  <svg width={22} height={30} viewBox="0 0 22 30">
    <path d="M11 2C11 2 5 9 5 16a6 6 0 0 0 12 0C17 9 11 2 11 2z" fill="#f9a825" />
    <path d="M11 20a2.5 2.5 0 0 1-2.5-2.5C8.5 15.5 11 12 11 12s2.5 3.5 2.5 5A2.5 2.5 0 0 1 11 20z" fill="#fff" />
  </svg>
);

// ── Inject Poppins font ───────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("poppins-font")) {
  const link = document.createElement("link");
  link.id   = "poppins-font";
  link.rel  = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap";
  document.head.appendChild(link);
}

// ── Trending Bar ──────────────────────────────────────────────
function TrendingBar() {
  const [off, setOff] = useState(0);
  const vis = 8;
  const max = trendingTopics.length - vis;

  return (
    <div className="tn-trending-bar">
      <div className="tn-trending-label">
        <div className="tn-trending-label-line">TRENDING</div>
        <div className="tn-trending-label-line">NEWS :</div>
      </div>

      <ArrowBtn
        direction="left"
        disabled={off === 0}
        onClick={() => setOff(o => Math.max(0, o - 1))}
      />

      <div className="tn-topics-list">
        {trendingTopics.slice(off, off + vis).map((t, i) => (
          <button key={i + off} className="tn-topic-btn">{t}</button>
        ))}
      </div>

      <ArrowBtn
        direction="right"
        disabled={off >= max}
        onClick={() => setOff(o => Math.min(max, o + 1))}
      />
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────
function SecHeader({ title }) {
  return (
    <div className="tn-sec-header">
      <div className="tn-sec-bar" />
      <span className="tn-sec-title">{title}</span>
    </div>
  );
}

// ── Latest News ───────────────────────────────────────────────
function LatestNews() {
  return (
    <div className="tn-latest-news">
      <SecHeader title="LATEST NEWS" />
      {latestNews.map((n) => (
        <div key={n.id} className="tn-latest-item">
          <div className="tn-latest-item-title">{n.title}</div>
          <div className="tn-latest-item-desc">{n.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── Feature Cards ─────────────────────────────────────────────
function FeatureCards() {
  const [hov, setHov] = useState(null);
  return (
    <div className="tn-feature-cards">
      {featureCards.map((c) => (
        <div
          key={c.id}
          onMouseEnter={() => setHov(c.id)}
          onMouseLeave={() => setHov(null)}
          className="tn-feature-card"
        >
          <div className="tn-feature-card-img-wrap">
            <img src={c.image} alt="" />
          </div>
          <div className="tn-feature-card-body">
            <div className="tn-feature-card-title">{c.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Live Updates ──────────────────────────────────────────────
function LiveUpdates() {
  return (
    <div className="tn-live-updates">
      <SecHeader title="LIVE UPDATES" />
      <div className="tn-live-scroll">
        {liveUpdates.map((item) => (
          <div key={item.id} className="tn-live-item">
            <div className="tn-live-dot" />
            <div>
              <div className="tn-live-item-time">{item.time}</div>
              <div className="tn-live-item-text">{item.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Banner ────────────────────────────────────────────────────
function Banner() {
  const [cur, setCur]       = useState(0);
  const [fading, setFading] = useState(false);
  const total = bannerSlides.length;

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setCur(c => (c + 1) % total); setFading(false); }, 350);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const s = bannerSlides[cur];

  return (
    <div className="tn-banner">
      <div
        className="tn-banner-slide"
        style={{
          opacity:   fading ? 0 : 1,
          transform: fading ? "translateY(6px)" : "translateY(0)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        <div className="tn-banner-left" style={{ background: s.leftBg }}>
          <div className="tn-banner-left-redbar" />
          <div className="tn-banner-left-greenbar" />
          <div className="tn-banner-left-content">
            <div className="tn-banner-meta">{s.price}</div>
            <div className="tn-banner-meta">{s.date}</div>
            <div className="tn-banner-brands">
              <div>
                <div className="tn-banner-brand-name">{s.brand1}</div>
                <div className="tn-banner-brand-name">{s.brand2}</div>
              </div>
              <FlameSvg />
            </div>
            <div className="tn-banner-tagline">{s.tagline}</div>
          </div>
        </div>
        <div className="tn-banner-mid" style={{ background: s.midBg }}>
          <div className="tn-banner-mid-tag">{s.midTag}</div>
          <div className="tn-banner-mid-box" style={{ background: s.midBoxBg }}>
            <div className="tn-banner-mid-line">{s.midL1}</div>
            <div className="tn-banner-mid-line">{s.midL2}</div>
            <div className="tn-banner-mid-line">{s.midL3}</div>
          </div>
        </div>
        <div className="tn-banner-right" style={{ background: s.rightBg }}>
          <div className="tn-banner-right-label">{s.rl}</div>
          <div className="tn-banner-right-main">{s.rb}</div>
          <div className="tn-banner-right-sub">{s.rs}</div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function TrendingNews() {
  return (
    <div className="tn-page">
      <TrendingBar />
      <div className="tn-inner">
        <div className="tn-grid">
          <div className="col-news"><LatestNews /></div>
          <div className="col-cards"><FeatureCards /></div>
          <div className="col-live"><LiveUpdates /></div>
        </div>
        <Banner />
      </div>
    </div>
  );
}