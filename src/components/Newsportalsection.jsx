import { useState, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────
const visualStories = [
  { id: 1, img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=300&q=80", caption: "In the discussion around speed reaching 1,500, the newspaper editorial." },
  { id: 2, img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&q=80", caption: "In the discussion around speed reaching 1,500, the newspaper editorial." },
  { id: 3, img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80", caption: "In the discussion around speed reaching 1,500, the newspaper editorial." },
  { id: 4, img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&q=80", caption: "In the discussion around speed reaching 1,500, the newspaper editorial." },
  { id: 5, img: "https://images.unsplash.com/photo-1479615201589-f23d8ebf12b0?w=300&q=80", caption: "In the discussion around speed reaching 1,500, the newspaper editorial." },
  { id: 6, img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&q=80", caption: "In the discussion around speed reaching 1,500, the newspaper editorial." },
  { id: 7, img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=300&q=80", caption: "In the discussion around speed reaching 1,500, the newspaper editorial." },
];

const entMidCards = [
  { id: 1, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80", label: "TritiyaBishwa", hd: false, teaser: false, title: "Lorem Ipsum has been the industry's standard dummy text survived to the principal." },
  { id: 2, img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80", label: "REBOOT", hd: false, teaser: false, title: "Lorem Ipsum has been the industry's standard dummy text survived to the principal." },
  { id: 3, img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&q=80", label: "Golmaal", hd: true, teaser: true, title: "Lorem Ipsum has been the industry's standard dummy text survived to the principal." },
];

const healthNews = [
  { id: 1, img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80", text: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 2, img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&q=80", text: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 3, img: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&q=80", text: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 4, img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&q=80", text: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 5, img: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&q=80", text: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 6, img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80", text: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 7, img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&q=80", text: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 8, img: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&q=80", text: "Lorem Ipsum has been the industry's standard dummy." },
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
    <div className="nps-section-header">
      <div className="nps-section-header-left">
        <div className="nps-section-bar" />
        <span className="nps-section-title">{title}</span>
      </div>
      <a href="#" className="nps-read-more-link">Read More›</a>
    </div>
  );
}

// ── Live Score Card ────────────────────────────────────────────
function LiveScoreCard() {
  const [tab, setTab] = useState("LIVE");
  const tabs = ["LIVE", "UPCOMING", "RECENT"];

  return (
    <div className="nps-live-score-card">
      <div className="nps-score-tabs">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`nps-score-tab-btn${tab === t ? " active" : ""}`}
          >{t}</button>
        ))}
      </div>
      <div className="nps-score-body">
        <p className="nps-score-date">Feb 29, ICC Test &amp; T20 World Cup, 2026</p>
        <p className="nps-score-status">
          Feb 16, 15:00 (IST) | <span className="nps-score-status-live">खेल जारी है</span>
        </p>
        <div className="nps-score-teams">
          <div className="nps-score-team">
            <div className="nps-score-team-box"><span className="nps-score-team-name">ITALY</span></div>
            <p className="nps-score-runs">43/3</p>
            <p className="nps-score-overs">(5.5 OV)</p>
          </div>
          <div className="nps-score-vs">VS</div>
          <div className="nps-score-team">
            <div className="nps-score-team-box"><span className="nps-score-team-name">ENGLAND</span></div>
            <p className="nps-score-runs">202/7</p>
            <p className="nps-score-overs">(20.0 OV)</p>
          </div>
        </div>
        <div className="nps-score-summary">
          <p className="nps-score-summary-text">Italy need 160 runs in 44 matches at 11.25 RPO.</p>
        </div>
      </div>
    </div>
  );
}

// ── Visual Stories + LiveScore ─────────────────────────────────
function VisualStoriesRow() {
  const [offset, setOffset] = useState(0);
  const isMobile = window.innerWidth <= 768;
  const visible = isMobile ? 2 : 5;
  const max = visualStories.length - visible;

  const prev = () => setOffset(o => Math.max(0, o - 1));
  const next = () => setOffset(o => Math.min(max, o + 1));

  return (
    <div className="nps-stories-row">
      <SectionHeader title="VISUAL STORIES" />
      <div className="nps-stories-live-flex">

        {/* Slider */}
        <div className="nps-stories-slider-wrap">
          <div className="nps-stories-slider-inner">
            <button onClick={prev} disabled={offset === 0} className="nps-stories-prev-btn"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                lineHeight: 0,
                cursor: offset === 0 ? "default" : "pointer",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  minWidth: "28px",
                  maxWidth: "28px",
                  minHeight: "28px",
                  maxHeight: "28px",
                  boxSizing: "border-box",
                  borderRadius: "50%",
                  border: "1.5px solid #999999",
                  background: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M8 2L4 6L8 10" stroke="#999999" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            <div className="nps-stories-list">
              {visualStories.slice(offset, offset + visible).map((s) => (
                <div key={s.id} className="nps-story-card">
                  <div className="nps-story-thumb">
                    <img src={s.img} alt="" />
                    <div className="nps-story-thumb-gradient" />
                  </div>
                  <p className="nps-story-caption">{s.caption}</p>
                </div>
              ))}
            </div>
            <button onClick={next} disabled={offset >= max} className="nps-stories-next-btn"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                lineHeight: 0,
                cursor: offset >= max ? "default" : "pointer",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  minWidth: "28px",
                  maxWidth: "28px",
                  minHeight: "28px",
                  maxHeight: "28px",
                  boxSizing: "border-box",
                  borderRadius: "50%",
                  border: "1.5px solid #999999",
                  background: "#ffffff",
                  overflow: "hidden",
                  marginRight: "5px",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2L8 6L4 10" stroke="#999999" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Live Score sidebar */}
        <div className="nps-live-score-sidebar">
          <LiveScoreCard />
        </div>

      </div>
    </div>
  );
}

// ── Entertainment Section ──────────────────────────────────────
function EntertainmentSection() {
  return (
    <div className="nps-entertainment">
      <SectionHeader title="ENTERTAINMENT" />
      <div className="nps-ent-layout">

        {/* Left + Middle */}
        <div className="nps-ent-left-mid">

          {/* Left */}
          <div className="nps-ent-left">
            <div className="nps-ent-featured-img-wrap">
              <img src="https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=700&q=80" alt="featured" />
              <div className="nps-ent-featured-overlay">
                <p className="nps-ent-featured-title">
                  रोहित शेट्टी के घर फायरिंग में हरियाणा से 4 अरेस्ट,<br />
                  बिश्नोई गैंग के संपर्क में था शूटर
                </p>
              </div>
            </div>

            <div className="nps-ent-small-card">
              <div className="nps-ent-small-img">
                <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80" alt="concert" />
              </div>
              <p className="nps-ent-small-title">
                लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है
              </p>
            </div>
          </div>

          {/* Middle */}
          <div className="nps-ent-mid">
            {entMidCards.map((card) => (
              <div key={card.id} className="nps-ent-mid-card">
                <div className="nps-ent-mid-img">
                  <img src={card.img} alt={card.title} />
                  {card.label && <div className="nps-ent-mid-label">{card.label}</div>}
                  {card.hd && <span className="nps-ent-hd-badge">HD</span>}
                  {card.teaser && <span className="nps-ent-teaser-badge">TEASER</span>}
                </div>
                <p className="nps-ent-mid-title">{card.title}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Health Sidebar */}
        <div className="nps-health-sidebar">
          <div className="nps-health-header">
            <span className="nps-health-header-text">HEALTH</span>
          </div>
          <div className="nps-health-scroll">
            {healthNews.map((item) => (
              <div key={item.id} className="nps-health-item">
                <div className="nps-health-img">
                  <img src={item.img} alt="health" />
                </div>
                <p className="nps-health-text">{item.text}</p>
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
  return (
    <div className="nps-wrap">
      <div className="nps-inner">
        <div className="nps-layout">
          <VisualStoriesRow />
          <EntertainmentSection />
        </div>
      </div>
    </div>
  );
}