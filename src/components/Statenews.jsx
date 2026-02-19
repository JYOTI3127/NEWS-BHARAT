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

const mainNews = {
  id: 1,
  image: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=700&q=80",
  title: "रोहित शेट्टी के घर फायरिंग में हरियाणा से 4 अरेस्ट, बिश्नोई गैंग के संपर्क में था शूटर",
  category: "Crime",
  time: "2 घंटे पहले",
  tag: "ब्रेकिंग"
};

const gridNews = [
  { id: 2, image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", time: "3 घंटे पहले", tag: "बॉलीवुड" },
  { id: 3, image: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", time: "4 घंटे पहले", tag: "मनोरंजन" },
  { id: 4, image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", time: "5 घंटे पहले", tag: "खेल" },
  { id: 5, image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=80", title: "लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है", time: "6 घंटे पहले", tag: "राजनीति" }
];

const defenceNews = [
  { id: 1, image: "https://images.unsplash.com/photo-1569025743873-ea3a9ade89f9?w=200&q=80", title: "भारतीय सेना ने सीमा पर नई चौकी स्थापित की, सुरक्षा बढ़ाई गई", time: "1 घंटे पहले" },
  { id: 2, image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&q=80", title: "वायुसेना ने राफेल विमानों के साथ किया सफल अभ्यास, नई तकनीक का प्रयोग", time: "2 घंटे पहले" },
  { id: 3, image: "https://images.unsplash.com/photo-1562408590-e32931084e23?w=200&q=80", title: "नौसेना ने हिंद महासागर में युद्धाभ्यास किया, 12 देश हुए शामिल", time: "3 घंटे पहले" },
  { id: 4, image: "https://images.unsplash.com/photo-1547448415-e9f5b28e570d?w=200&q=80", title: "रक्षा मंत्रालय ने नई मिसाइल प्रणाली को मंजूरी दी, देश होगा और मजबूत", time: "4 घंटे पहले" },
  { id: 5, image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=80", title: "सीमा सड़क संगठन ने लद्दाख में ऐतिहासिक पुल का निर्माण पूरा किया", time: "5 घंटे पहले" },
  { id: 6, image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=200&q=80", title: "भारत और अमेरिका के बीच रक्षा सहयोग समझौते पर हस्ताक्षर", time: "6 घंटे पहले" },
  { id: 7, image: "https://images.unsplash.com/photo-1551268010-b76e4a7ca5f2?w=200&q=80", title: "DRDO ने स्वदेशी टैंक रोधी मिसाइल का सफल परीक्षण किया", time: "7 घंटे पहले" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:ital@0;1&family=Noto+Sans:wght@400;600;700&family=Bebas+Neue&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Noto Sans', sans-serif;
    background: #0a0a0f;
    color: #e8e8f0;
    min-height: 100vh;
  }

  .sn-wrapper {
    max-width: 1262px;
    padding: 0 16px 40px;
  }

  .sn-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 0 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    margin-bottom: 16px;
  }

  .sn-heading-text {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: #fff;
    position: relative;
  }

  .sn-heading-text::before {
    content: '';
    position: absolute;
    left: -14px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 70%;
    background: linear-gradient(180deg, #D80100, #ff4444);
    border-radius: 2px;
  }

  .sn-tabs-container {
    position: relative;
    margin-bottom: 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 2px 50px;
    overflow: hidden;
  }

  .sn-tabs-scroll-area {
    display: flex;
    overflow-x: auto;
    gap: 4px;
    scrollbar-width: none;
    padding: 6px 0;
    scroll-behavior: smooth;
  }

  .sn-tabs-scroll-area::-webkit-scrollbar {
    display: none;
  }

  .sn-tab-btn {
    flex-shrink: 0;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.25s ease;
    background: transparent;
    color: #aaa;
    white-space: nowrap;
    letter-spacing: 0.3px;
  }

  .sn-tab-btn:hover {
    background: rgba(216,1,0,0.15);
    color: #D80100;
  }

  .sn-tab-btn.sn-tab-active {
    background: linear-gradient(135deg, #D80100, #a30000);
    color: #fff;
    box-shadow: 0 4px 15px rgba(216,1,0,0.4);
  }

  .sn-scroll-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: all 0.2s;
  }

  .sn-scroll-arrow:hover {
    background: #D80100;
  }

  .sn-scroll-arrow-left {
    left: 6px;
  }

  .sn-scroll-arrow-right {
    right: 6px;
  }

  .sn-main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 300px;
    gap: 16px;
    align-items: start;
  }

  .sn-hero-card {
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
  }

  .sn-hero-card img {
    width: 100%;
    height: 320px;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }

  .sn-hero-card:hover img {
    transform: scale(1.04);
  }

  .sn-hero-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.1) 100%);
  }

  .sn-hero-body {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px;
  }

  .sn-category-badge {
    display: inline-block;
    background: linear-gradient(135deg, #D80100, #a30000);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 4px;
    letter-spacing: 1px;
    margin-bottom: 10px;
    text-transform: uppercase;
  }

  .sn-hero-title {
    font-family: 'Tiro Devanagari Hindi', serif;
    font-size: 17px;
    line-height: 1.55;
    color: #fff;
    font-weight: 700;
  }

  .sn-time-label {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .sn-left-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sn-compact-card {
    display: flex;
    gap: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .sn-compact-card:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(216,1,0,0.3);
    transform: translateX(3px);
  }

  .sn-compact-card img {
    width: 100px;
    height: 80px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .sn-compact-card-body {
    padding: 10px 12px 10px 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .sn-compact-card-title {
    font-family: 'Tiro Devanagari Hindi', serif;
    font-size: 13px;
    line-height: 1.5;
    color: #ddd;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .sn-mid-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sn-four-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .sn-grid-card {
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    background: #111;
  }

  .sn-grid-card img {
    width: 100%;
    height: 130px;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;
    opacity: 0.85;
  }

  .sn-grid-card:hover img {
    transform: scale(1.05);
    opacity: 1;
  }

  .sn-grid-card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.85) 40%, transparent);
  }

  .sn-grid-card-body {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px;
  }

  .sn-grid-card-title {
    font-family: 'Tiro Devanagari Hindi', serif;
    font-size: 12px;
    line-height: 1.45;
    color: #eee;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .sn-defence-panel {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: fit-content;
  }

  .sn-defence-panel-header {
    background: linear-gradient(135deg, #001a3d, #002765);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 2px solid #D80100;
  }

  .sn-defence-panel-icon {
    color: #fff;
    display: flex;
    align-items: center;
  }

  .sn-defence-panel-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 20px;
    letter-spacing: 2px;
    color: #fff;
  }

  .sn-defence-list {
    overflow-y: auto;
    max-height: 420px;
    scrollbar-width: thin;
    scrollbar-color: #D80100 rgba(255,255,255,0.05);
    padding: 8px 0;
  }

  .sn-defence-list::-webkit-scrollbar {
    width: 4px;
  }

  .sn-defence-list::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.03);
  }

  .sn-defence-list::-webkit-scrollbar-thumb {
    background: #D80100;
    border-radius: 2px;
  }

  .sn-defence-list-item {
    display: flex;
    gap: 10px;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.2s;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  .sn-defence-list-item:last-child {
    border-bottom: none;
  }

  .sn-defence-list-item:hover {
    background: rgba(216,1,0,0.08);
  }

  .sn-defence-list-item img {
    width: 64px;
    height: 52px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .sn-defence-item-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sn-defence-item-headline {
    font-family: 'Tiro Devanagari Hindi', serif;
    font-size: 12px;
    line-height: 1.45;
    color: #ccc;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .sn-defence-item-timestamp {
    font-size: 10px;
    color: rgba(255,255,255,0.35);
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .sn-live-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 9px;
    color: #4fc3f7;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .sn-live-dot {
    width: 5px;
    height: 5px;
    background: #4fc3f7;
    border-radius: 50%;
    animation: sn-pulse 1.5s infinite;
  }

  @keyframes sn-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @media (max-width: 1024px) {
    .sn-main-grid {
      grid-template-columns: 1fr 1fr;
    }
    .sn-defence-panel {
      grid-column: 1 / -1;
    }
    .sn-defence-list {
      max-height: 260px;
    }
  }

  @media (max-width: 640px) {
    .sn-main-grid {
      grid-template-columns: 1fr;
    }
    .sn-four-grid {
      grid-template-columns: 1fr 1fr;
    }
    .sn-heading-text {
      font-size: 22px;
    }
    .sn-hero-card img {
      height: 240px;
    }
    .sn-hero-title {
      font-size: 15px;
    }
    .sn-defence-panel {
      grid-column: 1;
    }
  }
`;

export default function StateNews() {
  const [activeState, setActiveState] = useState("Andhra Pradesh");
  const tabsRef = useRef(null);

  const scroll = (dir) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="sn-wrapper">
        <div className="sn-heading-row">
          <h2 className="sn-heading-text">STATE NEWS</h2>
        </div>

        <div className="sn-tabs-container">
          <button className="sn-scroll-arrow sn-scroll-arrow-left" onClick={() => scroll(-1)}>
            <ChevronLeft />
          </button>
          <div className="sn-tabs-scroll-area" ref={tabsRef}>
            {stateList.map(s => (
              <button
                key={s}
                className={`sn-tab-btn ${activeState === s ? "sn-tab-active" : ""}`}
                onClick={() => setActiveState(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <button className="sn-scroll-arrow sn-scroll-arrow-right" onClick={() => scroll(1)}>
            <ChevronRight />
          </button>
        </div>

        <div className="sn-main-grid">
          <div className="sn-left-col">
            <div className="sn-hero-card">
              <img src={mainNews.image} alt="main news" />
              <div className="sn-hero-gradient" />
              <div className="sn-hero-body">
                <div className="sn-category-badge">{mainNews.tag}</div>
                <div className="sn-hero-title">{mainNews.title}</div>
                <div className="sn-time-label">
                  <Clock size={10} />
                  {mainNews.time}
                </div>
              </div>
            </div>

            <div className="sn-compact-card">
              <img src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80" alt="" />
              <div className="sn-compact-card-body">
                <span className="sn-category-badge" style={{ width: 'fit-content' }}>मनोरंजन</span>
                <div className="sn-compact-card-title">लोरेम इप्सम उद्योग का मानक डमी टेक्स्ट रहा है। यह न केवल पांच शताब्दियों तक जीवित रहा है</div>
                <div className="sn-time-label" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <Clock size={10} />
                  5 घंटे पहले
                </div>
              </div>
            </div>
          </div>

          <div className="sn-mid-col">
            <div className="sn-four-grid">
              {gridNews.map(n => (
                <div className="sn-grid-card" key={n.id}>
                  <img src={n.image} alt="" />
                  <div className="sn-grid-card-overlay" />
                  <div className="sn-grid-card-body">
                    <div className="sn-category-badge" style={{ fontSize: '9px', padding: '2px 7px', marginBottom: '5px' }}>{n.tag}</div>
                    <div className="sn-grid-card-title">{n.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sn-defence-panel">
            <div className="sn-defence-panel-header">
              <span className="sn-defence-panel-icon">
                <Shield size={20} />
              </span>
              <span className="sn-defence-panel-title">डिफेंस न्यूज़</span>
              <span style={{ marginLeft: 'auto' }}>
                <span className="sn-live-indicator">
                  <span className="sn-live-dot" />
                  Live
                </span>
              </span>
            </div>
            <div className="sn-defence-list">
              {defenceNews.map((item) => (
                <div className="sn-defence-list-item" key={item.id}>
                  <img src={item.image} alt="" />
                  <div className="sn-defence-item-body">
                    <div className="sn-defence-item-headline">{item.title}</div>
                    <div className="sn-defence-item-timestamp">
                      <Clock size={9} />
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}