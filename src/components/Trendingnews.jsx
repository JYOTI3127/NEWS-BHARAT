import { useState, useEffect, useRef } from "react";

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
  { id: 5, title: "Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc: "Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id: 6, title: "Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc: "Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id: 7, title: "Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc: "Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id: 8, title: "Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc: "Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
];

const featureCards = [
  { id: 1, image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80", title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." },
  { id: 2, image: "https://images.unsplash.com/photo-1482731215275-a1f151646268?w=600&q=80", title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." },
  { id: 3, image: "https://images.unsplash.com/photo-1578496781379-7dcfb995293d?w=600&q=80", title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." },
];

const liveUpdates = [
  { id: 1, title: "Markets Open", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 2, title: "Sensex Surges", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 3, title: "Oil Prices Steady", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 4, title: "Rupee Strengthens", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 5, title: "IT Sector Update", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 6, title: "Gold Retreats", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 7, title: "Bond Yields Rise", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 8, title: "FII Activity", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
];
const bannerSlides = [
  {
    leftBgClass: "bg-[#1e5c42]",
    brand1: "PRATIYOGITA", brand2: "DARPAN",
    price: "PRICE ₹125.00", date: "FEBRUARY 2024",
    tagline: "WHERE EXCELLENCE GUIDES THE SUCCESS",
    midBgClass: "bg-[#f5a000]", midTag: "Semi Annual", midBoxBgClass: "bg-[#6a1fa2]",
    midL1: "Current", midL2: "Affairs", midL3: "Special",
    rightBgClass: "bg-[#f5e000]", rl: "MOST USEFUL FOR", rb: "UNION & STATE", rs: "CIVIL SERVICES EXAM",
  },
  {
    leftBgClass: "bg-[#0d3b6e]",
    brand1: "COMPETITION", brand2: "TIMES",
    price: "PRICE ₹150.00", date: "MARCH 2024",
    tagline: "YOUR GATEWAY TO SUCCESS",
    midBgClass: "bg-[#e53935]", midTag: "Annual", midBoxBgClass: "bg-[#b71c1c]",
    midL1: "General", midL2: "Knowledge", midL3: "Special",
    rightBgClass: "bg-[#b2fab4]", rl: "BEST RESOURCE FOR", rb: "SSC & BANKING", rs: "EXAMINATION PREP",
  },
  {
    leftBgClass: "bg-[#1a1a2e]",
    brand1: "CAREER", brand2: "LAUNCHER",
    price: "PRICE ₹99.00", date: "APRIL 2024",
    tagline: "LAUNCHING CAREERS SINCE 1995",
    midBgClass: "bg-[#7b1fa2]", midTag: "Monthly", midBoxBgClass: "bg-[#4a148c]",
    midL1: "Reasoning", midL2: "& Aptitude", midL3: "Special",
    rightBgClass: "bg-[#ffe082]", rl: "TOP CHOICE FOR", rb: "UPSC & STATE PSC", rs: "ASPIRANTS NATIONWIDE",
  },
];

// ── Circle Arrow Icon ─────────────────────────────────────────
const ArrowBtn = ({ direction, disabled, onClick }) => {
  const baseClass = "w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center box-border select-none";
  const stateClass = disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer";

  return (
    <div onClick={disabled ? undefined : onClick} className={`${baseClass} ${stateClass}`}>
      <svg
        width="32" height="32" viewBox="0 0 32 32"
        fill="none" xmlns="http://www.w3.org/2000/svg"
        className="block overflow-visible"
      >
        <circle cx="16" cy="16" r="15" fill="#ffffff" stroke="#999999" strokeWidth="1" />
        {direction === "left" ? (
          <path d="M19 10L13 16L19 22" stroke={disabled ? "#c0c0c0" : "#999999"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M13 10L19 16L13 22" stroke={disabled ? "#c0c0c0" : "#999999"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
};

const FlameSvg = () => (
  <svg width={22} height={30} viewBox="0 0 22 30">
    <path d="M11 2C11 2 5 9 5 16a6 6 0 0 0 12 0C17 9 11 2 11 2z" fill="#f9a825" />
    <path d="M11 20a2.5 2.5 0 0 1-2.5-2.5C8.5 15.5 11 12 11 12s2.5 3.5 2.5 5A2.5 2.5 0 0 1 11 20z" fill="#fff" />
  </svg>
);

if (typeof document !== "undefined" && !document.getElementById("poppins-font")) {
  const link = document.createElement("link");
  link.id   = "poppins-font";
  link.rel  = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap";
  document.head.appendChild(link);
}

// ── Trending Bar ──────────────────────────────────────────────
function TrendingBar() {
  const GAP = 8;
  const [startIdx, setStartIdx] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const itemRefs = useRef([]);
  const outerRef = useRef(null);

  // startIdx ya items mount hone ke baad recalculate karo
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    // translateX calculate karo
    let px = 0;
    for (let i = 0; i < startIdx; i++) {
      const el = itemRefs.current[i];
      if (el) px += el.offsetWidth + GAP;
    }
    setTranslateX(px);

    // canPrev
    setCanPrev(startIdx > 0);

    // canNext: startIdx se aage ke items ki total width > outer visible width?
    const outerWidth = outer.clientWidth;
    let remaining = 0;
    for (let i = startIdx; i < trendingTopics.length; i++) {
      const el = itemRefs.current[i];
      if (el) remaining += el.offsetWidth + GAP;
    }
    setCanNext(remaining - GAP > outerWidth);

  }, [startIdx]);

  // Mount ke baad bhi ek baar run karo (itemRefs populate hone ke liye)
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const outerWidth = outer.clientWidth;
    let total = 0;
    for (let i = 0; i < trendingTopics.length; i++) {
      const el = itemRefs.current[i];
      if (el) total += el.offsetWidth + GAP;
    }
    setCanNext(total - GAP > outerWidth);
  }, []); // only on mount

  return (
    <div className="tn-trending-bar">
      <div className="tn-trending-label">
        <div className="tn-trending-label-line">TRENDING NEWS :</div>
      </div>

      <ArrowBtn direction="left" disabled={!canPrev} onClick={() => setStartIdx(i => i - 1)} />

      <div ref={outerRef} style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: `${GAP}px`,
            transform: `translateX(-${translateX}px)`,
            transition: "transform 0.35s ease",
            width: "max-content",
          }}
        >
          {trendingTopics.map((t, i) => (
            <button
              key={i}
              ref={el => { itemRefs.current[i] = el; }}
              className="tn-topic-btn"
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <ArrowBtn direction="right" disabled={!canNext} onClick={() => setStartIdx(i => i + 1)} />
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
      <div className="tn-latest-scroll">
        {latestNews.map((n) => (
          <div key={n.id} className="tn-latest-item">
            <div className="tn-latest-item-title">{n.title}</div>
            <div className="tn-latest-item-desc">{n.desc}</div>
          </div>
        ))}
      </div>
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

// ── 60 Seconds ──────────────────────────────────────────────
function LiveUpdates() {
  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;

    const step = () => {
      if (autoScrollRef.current) {
        frame++;
        if (frame % 3 === 0) {
          el.scrollTop += 1;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
            el.scrollTop = 0;
          }
        }
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="tn-live-updates">
      <SecHeader title="60 SECONDS" />
      <div
        className="tn-live-scroll"
        ref={scrollRef}
        onMouseEnter={() => { autoScrollRef.current = false; }}
        onMouseLeave={() => { autoScrollRef.current = true; }}
      >
        {liveUpdates.map((item) => (
          // 👇 group add kiya — taaki hover pe child elements color change kar sakein
          <div key={item.id} className="tn-live-item group cursor-pointer">

            {/* Dot: hover pe red ho jaye */}
            <div className="tn-live-dot group-hover:bg-[#D80100] transition-colors duration-300" />

            <div>
              {/* Title: hover pe red */}
              <div className="tn-live-item-title group-hover:text-[#D80100] transition-colors duration-300">
                {item.title}
              </div>

              {/* Text: hover pe red (thoda light) */}
              <div className="tn-live-item-text group-hover:text-[#D80100] transition-colors duration-300">
                {item.text}
              </div>
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
        className={`tn-banner-slide transition-all duration-300 ease-out ${fading ? "opacity-0 translate-y-[6px]" : "opacity-100 translate-y-0"}`}
      >
        <div className={`tn-banner-left ${s.leftBgClass}`}>
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
        <div className={`tn-banner-mid ${s.midBgClass}`}>
          <div className="tn-banner-mid-tag">{s.midTag}</div>
          <div className={`tn-banner-mid-box ${s.midBoxBgClass}`}>
            <div className="tn-banner-mid-line">{s.midL1}</div>
            <div className="tn-banner-mid-line">{s.midL2}</div>
            <div className="tn-banner-mid-line">{s.midL3}</div>
          </div>
        </div>
        <div className={`tn-banner-right ${s.rightBgClass}`}>
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