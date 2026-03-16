import { useState, useRef } from "react";

// ── Icons ──────────────────────────────────────────────────────
const ChevronLeft = () => (
  <span className="text-[16px] text-white leading-none font-bold">&#8249;</span>
);
const ChevronRight = () => (
  <span className="text-[16px] text-white leading-none font-bold">&#8250;</span>
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
          <span className="inline-flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border border-white/90 bg-red-600 overflow-hidden ml-[30%]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      {/* Main Layout */}
      <div className="sn-main">

        {/* LEFT + MIDDLE — grid layout */}
        <div className="sn-left-mid">

          {/* Featured big card — top left */}
          <div className="sn-featured-wrap">
            <div className="sn-big-card">
              <img src={featuredCard.img} alt="featured" />
              <div className="sn-big-overlay">
                <div className="sn-big-badge">{featuredCard.tag}</div>
                <p className="sn-big-title">{featuredCard.title}</p>
                <span className="sn-big-date">{featuredCard.date}</span>
              </div>
            </div>
          </div>

          {/* Small card — bottom left */}
          <div className="sn-small-card">
            <div className="sn-sc-img">
              <img src={bottomLeftCard.img} alt="news" />
            </div>
            <div className="sn-sc-text">
              <span className="sn-card-tag">{bottomLeftCard.tag}</span>
              <p className="sn-sc-title">{bottomLeftCard.title}</p>
              <span className="sn-card-date">{bottomLeftCard.date}</span>
            </div>
          </div>

          {/* Middle 3 cards — right column, spans both rows */}
          <div className="sn-mid">
            {midCards.map(card => (
              <div className="sn-mid-card" key={card.id}>
                <div className="sn-mid-img">
                  <img src={card.img} alt={card.title} />
                  {card.label && <div className="sn-mov-label">{card.label}</div>}
                  {card.hd && <span className="sn-hd-badge">HD</span>}
                  {card.teaser && <span className="sn-teaser-badge">TEASER</span>}
                </div>
                <div className="sn-mid-text">
                  <span className="sn-card-tag">{card.tag}</span>
                  <p className="sn-mid-title">{card.title}</p>
                  <span className="sn-card-date">{card.date}</span>
                </div>
              </div>
            ))}
          </div>

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
                <div className="sn-di-text-wrap">
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