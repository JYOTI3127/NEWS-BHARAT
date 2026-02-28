import { useState, useRef } from "react";

// ── Icons ──────────────────────────────────────────────────────
const ChevronLeft = () => (
  <span style={{ fontSize: "16px", color: "#fff", lineHeight: 1, fontWeight: "bold" }}>&#8249;</span>
);
const ChevronRight = () => (
  <span style={{ fontSize: "16px", color: "#fff", lineHeight: 1, fontWeight: "bold" }}>&#8250;</span>
);

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
};

const bottomLeftCard = {
  img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80",
  title: "Lorem Ipsum has been the industry's standard dummy text and has survived.",
};

const midCards = [
  { id: 1, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80", label: "TritiyaBishwa", hd: false, teaser: false, title: "Lorem Ipsum has been the industry's standard dummy text and has centuries." },
  { id: 2, img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80", label: "REBOOT", hd: false, teaser: false, title: "Lorem Ipsum has been the industry's standard dummy text and has centuries." },
  { id: 3, img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&q=80", label: "Golmaal", hd: true, teaser: true, title: "Lorem Ipsum has been the industry's standard dummy text and has centuries." },
];

const defenceNews = [
  { id: 1, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&q=80", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 2, img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&q=80", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 3, img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=200&q=80", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 4, img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 5, img: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=200&q=80", title: "Lorem Ipsum has been the industry's standard dummy." },
  { id: 6, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&q=80", title: "Lorem Ipsum has been the industry's standard dummy." },
];

// ── Component ─────────────────────────────────────────────────
export default function StateNews() {
  const [activeState, setActiveState] = useState("Andhra Pradesh");
  const tabsRef = useRef(null);

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
          className="sn-arrow sn-arrow-left"
          onClick={() => scroll(-1)}
          style={{ background: "none", border: "none", padding: 0, lineHeight: 0, cursor: "pointer", flexShrink: 0 }}
        >
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", minWidth: "28px", maxWidth: "28px",
            minHeight: "28px", maxHeight: "28px", boxSizing: "border-box",
            borderRadius: "50%", border: "1.5px solid #fff", background: "#D80100", overflow: "hidden",
          }}>
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
          className="sn-arrow sn-arrow-right"
          onClick={() => scroll(1)}
          style={{ background: "none", border: "none", padding: 0, lineHeight: 0, cursor: "pointer", flexShrink: 0 }}
        >
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", minWidth: "28px", maxWidth: "28px",
            minHeight: "28px", maxHeight: "28px", boxSizing: "border-box",
            borderRadius: "50%", border: "1.5px solid #fff", background: "#D80100", overflow: "hidden",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      {/* Main Layout */}
      <div className="sn-main">

        {/* LEFT */}
        <div className="sn-left">
          <div className="sn-big-card">
            <img src={featuredCard.img} alt="featured" />
            <div className="sn-big-overlay">
              <div className="sn-big-badge">{featuredCard.tag}</div>
              <p className="sn-big-title">{featuredCard.title}</p>
            </div>
          </div>
          <div className="sn-small-card">
            <div className="sn-sc-img">
              <img src={bottomLeftCard.img} alt="news" />
            </div>
            <p className="sn-sc-title">{bottomLeftCard.title}</p>
          </div>
        </div>

        {/* MIDDLE */}
        <div className="sn-mid">
          {midCards.map(card => (
            <div className="sn-mid-card" key={card.id}>
              <div className="sn-mid-img">
                <img src={card.img} alt={card.title} />
                {card.label && <div className="sn-mov-label">{card.label}</div>}
                {card.hd && <span className="sn-hd-badge">HD</span>}
                {card.teaser && <span className="sn-teaser-badge">TEASER</span>}
              </div>
              <p className="sn-mid-title">{card.title}</p>
            </div>
          ))}
        </div>

        {/* RIGHT: Defence panel */}
        <div className="sn-defence">
          <div className="sn-defence-head">डिफेंस न्यूज़</div>
          <div className="sn-defence-scroll">
            {defenceNews.map((item) => (
              <div className="sn-defence-item" key={item.id}>
                <div className="sn-di-img">
                  <img src={item.img} alt="news" />
                </div>
                <p className="sn-di-title">{item.title}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}