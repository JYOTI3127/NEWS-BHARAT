import { useState, useEffect } from "react";

const slides = [
  {
    id: 1,
    author: "Grace Eliza Goodwin",
    title: "Bondi Criticised After Saying All Epstein Files Have Been Released",
    category: "Politics",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&q=80",
  },
  {
    id: 2,
    author: "James Mitchell",
    title: "Climate Summit Reaches Historic Agreement on Carbon Emissions",
    category: "Environment",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80",
  },
  {
    id: 3,
    author: "Sarah Chen",
    title: "Tech Giants Face New Antitrust Regulations Across Europe",
    category: "Technology",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
  },
  {
    id: 4,
    author: "Ahmed Al-Rashid",
    title: "Middle East Peace Talks Resume After Years of Stalemate",
    category: "World",
    image: "https://images.unsplash.com/photo-1479615201589-f23d8ebf12b0?w=1200&q=80",
  },
];

const bottomNews = [
  {
    id: 1,
    title: "What Is The Dart Frog Toxin Allegedly Used To Kill Alexei Navalny?",
    time: "1 hr ago",
    region: "Europe",
  },
  {
    id: 2,
    title: "Female Israeli soldiers rescued after being chased by ultra-Orthodox men",
    time: "2 hrs ago",
    region: "Middle East",
  },
  {
    id: 3,
    title: "'Dragged out and set on fire' – the Bangladesh mob killing that shocked the world",
    time: "1 hr ago",
    region: "Asia",
  },
];

/* ── Read More Icon: circle + right arrow ── */
const ArrowCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="10 8 14 12 10 16" />
  </svg>
);

/* ── Watch Video Icon: circle + play triangle inside ── */
const PlayCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8"
      fill="rgba(255,255,255,0.82)" stroke="none" />
  </svg>
);

/* ── Share Icon: circle + 3-node network ── */
const ShareCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="15.5" cy="9" r="1.1" fill="rgba(255,255,255,0.82)" stroke="none" />
    <circle cx="8.5" cy="12" r="1.1" fill="rgba(255,255,255,0.82)" stroke="none" />
    <circle cx="15.5" cy="15" r="1.1" fill="rgba(255,255,255,0.82)" stroke="none" />
    <line x1="9.9" y1="11.3" x2="14.1" y2="9.7" strokeWidth="1.2" />
    <line x1="9.9" y1="12.7" x2="14.1" y2="14.3" strokeWidth="1.2" />
  </svg>
);

export default function NewsBanner() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState("next");

  useEffect(() => {
    const interval = setInterval(() => {
      goTo((current + 1) % slides.length, "next");
    }, 5000);
    return () => clearInterval(interval);
  }, [current]);

  const goTo = (index, dir = "next") => {
    if (animating || index === current) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 600);
  };

  const slide = slides[current];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .nb-root {
          width: 100%;
          display: flex;
          justify-content: center;
          background: #000;
        }

        .nb-container {
          width: 100%;
          max-width: 1400px;
          position: relative;
          overflow: hidden;
          height: 450px;
        }

      /* ── FULL background image — covers entire banner including bottom news ── */
.nb-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center top;
  z-index: 0;
}
.nb-overlay-left {
  position: absolute;
  top: 0;
  left: 0;
  width: 20%;
  height: 100%;
  z-index: 1;

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  /* MAGIC */
  mask-image: linear-gradient(
    to right,
    black 0%,
    black 40%,
    rgba(0,0,0,0.6) 65%,
    rgba(0,0,0,0.2) 80%,
    transparent 100%
  );

  -webkit-mask-image: linear-gradient(
    to right,
    black 0%,
    black 40%,
    rgba(0,0,0,0.6) 65%,
    rgba(0,0,0,0.2) 80%,
    transparent 100%
  );
}

.nb-overlay-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20%;
  z-index: 1;

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  /* MAGIC */
  mask-image: linear-gradient(
    to top,
    black 0%,
    black 40%,
    rgba(0,0,0,0.6) 65%,
    rgba(0,0,0,0.2) 80%,
    transparent 100%
  );

  -webkit-mask-image: linear-gradient(
    to top,
    black 0%,
    black 40%,
    rgba(0,0,0,0.6) 65%,
    rgba(0,0,0,0.2) 80%,
    transparent 100%
  );
}


        /* All content sits above overlays */
        .nb-inner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
        }

        /* ── Hero text area ── */
        .nb-hero {
          min-height: 310px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 28px 32px 22px 32px;
        }

        .nb-author-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .nb-redbar {
          width: 3px;
          height: 16px;
          background: #e60000;
          border-radius: 1px;
          flex-shrink: 0;
        }

        .nb-author-name {
          color: #fff;
          font-size: 13px;
          font-family: 'Poppins-Regular';
          font-weight: 400; 
          letter-spacing: 0.02em;
          opacity: 0.92;
        }

        .nb-headline {
          color: #fff;
          line-height: 1.25;
          max-width: 560px;
          font-size: 33px;
           font-family: "Montserrat", sans-serif;
          font-weight: 100;
          font-style: normal;
          text-shadow: 0 2px 12px rgba(0,0,0,0.5);
          margin-bottom: 20px;
        }

        /* Buttons row */
        .nb-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          padding-top: 3%;
        }

        /* Read More & Share — gol border pill */
        .nb-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          border-radius: 50px;
          color: rgba(255,255,255,0.88);
          padding: 6px 15px 6px 9px;
          font-size: 12px;
          font-family: 'Arial', sans-serif;
          letter-spacing: 0.04em;
          cursor: pointer;
          white-space: nowrap;
          transition: border-color 0.2s, background 0.2s;
          line-height: 1;
        }
        .nb-pill:hover {
          border-color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.08);
        }

        /* Watch Video — plain text only, no border */
        .nb-ghost {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.80);
          font-size: 12px;
          font-family: 'Arial', sans-serif;
          letter-spacing: 0.04em;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.2s;
          padding: 0;
          line-height: 1;
        }
        .nb-ghost:hover { color: #fff; }

        /* ── Thin horizontal separator line — exactly like screenshot ── */
        .nb-separator {
          width: 100%;
          height: 1px;
          background: rgba(255,255,255,0.18);
        }

        /* ── Bottom news — ON TOP of same background image ── */
        .nb-bottom {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 0;
        }

        .nb-news-card {
          padding: 14px 35px;
          cursor: pointer;
          transition: background 0.2s;
          /* NO border between cards */
        }

        .nb-news-title {
          color: rgba(255,255,255,0.88);
          font-size: 12.5px;
          font-family: 'Georgia', serif;
          line-height: 1.5;
          margin-bottom: 6px;
          font-weight: 400;
        }

        .nb-news-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          color: rgba(255,255,255,0.45);
          font-size: 10.5px;
          font-family: 'Arial', sans-serif;
        }
        .nb-meta-sep { color: rgba(255,255,255,0.25); margin: 0 1px; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .nb-hero { min-height: 240px; padding: 22px 24px 18px; }
        }
        @media (max-width: 640px) {
          .nb-hero    { min-height: 190px; padding: 16px 18px 14px; }
          .nb-headline { font-size: 17px; margin-bottom: 14px; }
          .nb-actions  { gap: 10px; }
          .nb-bottom   { grid-template-columns: 1fr; }
          .nb-news-card { padding: 12px 18px; }
        }
        @media (max-width: 420px) {
          .nb-hero { min-height: 160px; }
          .nb-pill span { display: none; }
          .nb-pill { padding: 6px 9px; }
        }
      `}</style>

      <div className="nb-root">
        <div className="nb-container">

          {/* Full background image — covers everything */}
          <div
            key={current}
            className="nb-bg"
            style={{
              backgroundImage: `url(${slide.image})`,
              opacity: animating ? 0 : 1,
              transform: animating
                ? direction === "next"
                  ? "translateX(30px) scale(1.02)"
                  : "translateX(-30px) scale(1.02)"
                : "translateX(0) scale(1)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          />

          {/* Overlays */}
          <div className="nb-overlay-left" />
          <div className="nb-overlay-bottom" />

          {/* All content above overlays */}
          <div
            className="nb-inner"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(10px)" : "translateY(0)",
              transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
            }}
          >
            {/* ── Hero section ── */}
            <div className="nb-hero">



              {/* Author */}
              <div className="nb-author-row">
                <div className="nb-redbar" />
                <span className="nb-author-name">{slide.author}</span>
              </div>

              {/* Headline */}
              <h1 className="nb-headline">{slide.title}</h1>

              {/* ── Thin separator line ── */}
              <div className="nb-separator" />

              {/* Buttons */}
              <div className="nb-actions">
                <button className="nb-pill">
                  <ArrowCircleIcon />
                  <span>Read More</span>
                </button>

                <button className="nb-pill">
                  <PlayCircleIcon />
                  <span>Watch Video</span>
                </button>

                <button className="nb-pill">
                  <ShareCircleIcon />
                  <span>Share</span>
                </button>
              </div>
            </div>



            {/* ── Bottom news on same background ── */}
            <div className="nb-bottom">
              {bottomNews.map((item) => (
                <div key={item.id} className="nb-news-card">
                  <p className="nb-news-title">{item.title}</p>
                  <div className="nb-news-meta">
                    <span>{item.time}</span>
                    <span className="nb-meta-sep">|</span>
                    <span>{item.region}</span>
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