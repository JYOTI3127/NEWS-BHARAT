import { useState, useRef } from "react";

const ChevronLeft = () => (
  <span style={{ fontSize: '16px', color: '#fff', lineHeight: 1, fontWeight: 'bold' }}>&#8249;</span>
);
const ChevronRight = () => (
  <span style={{ fontSize: '16px', color: '#fff', lineHeight: 1, fontWeight: 'bold' }}>&#8250;</span>
);
const Clock = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const Shield = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const stateList = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// Left big featured card
const featuredCard = {
  img: "https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=700&q=80",
  title: "Four arrested from Haryana in firing incident at Rohit Shetty’s house; shooter linked to Bishnoi gang",
  tag: "BREAKING",
};

// Bottom left small card (img + text)
const bottomLeftCard = {
  img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80",
  title: "Lorem Ipsum has been the industry's standard dummy text and has survived for over five centuries.",
};

// Middle 3 vertical cards (img + text)
const midCards = [
  {
    id: 1,
    img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80",
    label: "TritiyaBishwa",
    hd: false,
    teaser: false,
    title: "Lorem Ipsum has been the industry's standard dummy text and has survived for over five centuries.",
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80",
    label: "REBOOT",
    hd: false,
    teaser: false,
    title: "Lorem Ipsum has been the industry's standard dummy text and has survived for over five centuries.",
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&q=80",
    label: "Golmaal",
    hd: true,
    teaser: true,
    title: "Lorem Ipsum has been the industry's standard dummy text and has survived for over five centuries.",
  },
];

// Right defence/news panel
const defenceNews = [
  { 
    id: 1, 
    img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&q=80", 
    title: "Lorem Ipsum has been the industry’s standard dummy text and has lasted for centuries..." 
  },
  { 
    id: 2, 
    img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&q=80", 
    title: "Lorem Ipsum has been the industry’s standard dummy text and has lasted for centuries..." 
  },
  { 
    id: 3, 
    img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=200&q=80", 
    title: "Lorem Ipsum has been the industry’s standard dummy text and has lasted for centuries..." 
  },
  { 
    id: 4, 
    img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80", 
    title: "Lorem Ipsum has been the industry’s standard dummy text and has lasted for centuries..." 
  },
  { 
    id: 5, 
    img: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=200&q=80", 
    title: "Lorem Ipsum has been the industry’s standard dummy text and has lasted for centuries..." 
  },
  { 
    id: 6, 
    img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&q=80", 
    title: "Lorem Ipsum has been the industry’s standard dummy text and has lasted for centuries..." 
  },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .sn-wrap {
    font-family: 'Poppins', sans-serif;
    background: #fff;
    padding: 24px 32px;
    width: 100%;
    margin: 0 auto;
  }

  /* ── HEADING ── */
  .sn-heading-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .sn-heading-bar {
    width: 4px; height: 22px;
    background: #e8001c;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .sn-heading-text {
    font-size: clamp(13px, 1.5vw, 17px);
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #111;
  }

  /* ── TABS ── */
  .sn-tabs-container {
    position: relative;
    margin-bottom: 14px;
    background: #D80100;
    border: 1px solid #e0e0e0;
    border-radius: 30px;
    padding: 4px 44px;
    overflow: hidden;
  }
  .sn-tabs-scroll-area {
    display: flex;
    overflow-x: auto;
    gap: 2px;
    scrollbar-width: none;
    padding: 2px 0;
    scroll-behavior: smooth;
  }
  .sn-tabs-scroll-area::-webkit-scrollbar { display: none; }
  .sn-tab-btn {
    flex-shrink: 0;
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    background: transparent;
    color: white;
    white-space: nowrap;
    font-family: 'Poppins', sans-serif;
    transition: all 0.2s;
  }
  .sn-tab-btn.active {
    border: 1px solid #fff;
    color: #fff;
    font-weight: 600;
    border-radius: 20px;

  }
  .sn-arrow {
    position: absolute;
    top: 50%; transform: translateY(-50%);
    background: #e8001c;
    border: none;
    color: #fff;
    width: 26px; height: 26px;
    border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    z-index: 10;
    border: 1px solid #fff;
     transition: background 0.3s;
  }
  .sn-arrow-left { left: 6px; }
  .sn-arrow-right { right: 6px; }

  /* ── MAIN LAYOUT ──
     Left: big card + small card below
     Middle: 3 vertical cards (img+text)
     Right: Defence/scrollable panel
  */
  .sn-main {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  /* LEFT BLOCK */
  .sn-left {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 310px;
    flex-shrink: 0;
  }

  /* Big featured card */
  .sn-big-card {
    position: relative;
    width: 30rem;
    height: 256px;
    border-radius: 7px;
    overflow: hidden;
    cursor: pointer;
    background: #111;
  }
  .sn-big-card img {
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    opacity: 0.82;
    transition: transform 0.4s ease;
  }
  .sn-big-card:hover img { transform: scale(1.04); }
  .sn-big-overlay {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 50px 13px 13px;
    background: linear-gradient(to top, rgba(0,0,0,0.88), transparent);
  }
  .sn-big-badge {
    display: inline-block;
    background: #e8001c;
    color: #fff;
    font-size: 9px; font-weight: 700;
    padding: 2px 8px; border-radius: 3px;
    letter-spacing: 1px; text-transform: uppercase;
    margin-bottom: 6px;
  }
  .sn-big-title {
    color: #fff;
    font-size: clamp(11px, 1.15vw, 13.5px);
    font-weight: 600;
    line-height: 1.5;
  }

  /* Bottom small card */
  .sn-small-card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    cursor: pointer;
        width: 452px;
  }
  .sn-sc-img {
    width: 211px;
    min-width: 130px;
    height: 100px;
    border-radius: 5px; overflow: hidden;
    flex-shrink: 0; background: #222;
  }
  .sn-sc-img img {
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    transition: transform 0.3s;
  }
  .sn-small-card:hover .sn-sc-img img { transform: scale(1.06); }
  .sn-sc-title {
    font-size: 14px; font-weight: 500;
    color: #1a1a1a; line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    padding: 17px;
  }

  /* MIDDLE BLOCK */
  .sn-mid {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-left: 15%;
  }
  .sn-mid-card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    cursor: pointer;
  }
  .sn-mid-img {
    position: relative;
    width: 175px; min-width: 175px; height: 108px;
    border-radius: 5px; overflow: hidden;
    flex-shrink: 0; background: #222;
  }
  .sn-mid-img img {
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    transition: transform 0.35s;
  }
  .sn-mid-card:hover .sn-mid-img img { transform: scale(1.06); }
  .sn-mov-label {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.30);
    color: #fff; font-size: 13px; font-weight: 700;
    font-style: italic; text-align: center;
    padding: 8px; pointer-events: none;
  }
  .sn-hd-badge {
    position: absolute; top: 5px; right: 5px;
    background: #e8001c; color: #fff;
    font-size: 9px; font-weight: 700;
    padding: 2px 6px; border-radius: 2px;
    letter-spacing: 0.8px; z-index: 3;
  }
  .sn-teaser-badge {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.72); color: #fff;
    font-size: 9px; font-weight: 700;
    text-align: center; padding: 4px 0;
    letter-spacing: 3px; z-index: 3;
  }
  .sn-mid-title {
    font-size: 16px; font-weight: 500;
    color: #1a1a1a; line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
    padding: 19px;
  }

  /* RIGHT: Defence panel */
  .sn-defence {
    width: 210px;
    min-width: 200px;
    flex-shrink: 0;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 6px rgba(0,0,0,0.09);
  }
  .sn-defence-head {
    background: #e8001c;
    color: #fff;
    font-size: 13px; font-weight: 700;
    text-transform: uppercase;
    text-align: center;
    padding: 9px 10px;
  }
  .sn-defence-scroll {
    max-height: 313px;
    overflow-y: auto;
    padding: 4px 8px;
    scrollbar-width: thin;
    scrollbar-color: #e8001c #f5f5f5;
    border-top: 1px solid #999999;
  }
  .sn-defence-scroll::-webkit-scrollbar { width: 4px; }
  .sn-defence-scroll::-webkit-scrollbar-track { background: #f5f5f5; }
  .sn-defence-scroll::-webkit-scrollbar-thumb { background: #e8001c; border-radius: 4px; }
  .sn-defence-item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background 0.15s;
  }
  .sn-defence-item:last-child { border-bottom: none; }
  .sn-defence-item:hover { background: #fafafa; }
  .sn-di-img {
    width: 66px; min-width: 66px; height: 47px;
    border-radius: 4px; overflow: hidden; flex-shrink: 0;
  }
  .sn-di-img img {
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    transition: transform 0.3s;
  }
  .sn-defence-item:hover .sn-di-img img { transform: scale(1.08); }
  .sn-di-title {
    font-size: 10px; color: #333;
    line-height: 1.45; font-weight: 400;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* RESPONSIVE */
  @media (max-width: 1050px) {
    .sn-mid-img { width: 140px; min-width: 140px; height: 90px; }
    .sn-left { width: 260px; }
  }
  @media (max-width: 800px) {
    .sn-main { flex-wrap: wrap; }
    .sn-left { width: 100%; }
    .sn-defence { width: 100%; }
  }
  @media (max-width: 560px) {
    .sn-mid-img { width: 110px; min-width: 110px; height: 76px; }
  }
`;

export default function StateNews() {
  const [activeState, setActiveState] = useState("Andhra Pradesh");
  const tabsRef = useRef(null);
  const scroll = (dir) => {
    if (tabsRef.current) tabsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="sn-wrap">

        {/* Heading */}
        <div className="sn-heading-row">
          <div className="sn-heading-bar" />
          <span className="sn-heading-text">State News</span>
        </div>

        {/* State Tabs */}
        <div className="sn-tabs-container">
          <button className="sn-arrow sn-arrow-left" onClick={() => scroll(-1)}><ChevronLeft /></button>
          <div className="sn-tabs-scroll-area" ref={tabsRef}>
            {stateList.map(s => (
              <button
                key={s}
                className={`sn-tab-btn${activeState === s ? " active" : ""}`}
                onClick={() => setActiveState(s)}
              >{s}</button>
            ))}
          </div>
          <button className="sn-arrow sn-arrow-right" onClick={() => scroll(1)}><ChevronRight /></button>
        </div>

        {/* Main Layout */}
        <div className="sn-main">

          {/* LEFT: Big card + small card below */}
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

          {/* MIDDLE: 3 vertical cards */}
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

          {/* RIGHT: Scrollable defence/news panel */}
          <div className="sn-defence">
            <div className="sn-defence-head">डिफेंस न्यूज़</div>
            <div className="sn-defence-scroll">
              {defenceNews.map((item, i) => (
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
    </>
  );
}