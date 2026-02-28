import { useState, useEffect } from "react";
import newsImg from "../assets/1770841302874.webp";

const slides = [
  { id: 1, author: "Politics",     title: "Bondi Criticised After Saying All Epstein Files Have Been Released", category: "Politics",     image: newsImg },
  { id: 2, author: "Environment",  title: "Climate Summit Reaches Historic Agreement on Carbon Emissions",       category: "Environment",  image: newsImg },
  { id: 3, author: "Technology",   title: "Tech Giants Face New Antitrust Regulations Across Europe",           category: "Technology",   image: newsImg },
  { id: 4, author: "World",        title: "Middle East Peace Talks Resume After Years of Stalemate",            category: "World",        image: newsImg },
];

const bottomNews = [
  { id: 1, title: "What Is The Dart Frog Toxin Allegedly Used To Kill Alexei Navalny?",                        time: "1 hr ago",  region: "Europe"      },
  { id: 2, title: "Female Israeli soldiers rescued after being chased by ultra-Orthodox men",                   time: "2 hrs ago", region: "Middle East" },
  { id: 3, title: "'Dragged out and set on fire' – the Bangladesh mob killing that shocked the world",          time: "1 hr ago",  region: "Asia"        },
];

/* ── Icons ── */
const ArrowCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="10 8 14 12 10 16" />
  </svg>
);

const PlayCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" fill="rgba(255,255,255,0.82)" stroke="none" />
  </svg>
);

const ShareCircleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.82)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <g transform="translate(5.5, 5.5) scale(0.54)">
      <circle cx="18" cy="5"  r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <circle cx="6"  cy="12" r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <circle cx="18" cy="19" r="3" fill="rgba(255,255,255,0.82)" stroke="none" />
      <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" strokeWidth="2" />
      <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" strokeWidth="2" />
    </g>
  </svg>
);

export default function NewsBanner() {
  const [current, setCurrent]   = useState(0);
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
    setTimeout(() => { setCurrent(index); setAnimating(false); }, 600);
  };

  const slide = slides[current];

  return (
    <div className="nb-root">
      <div className="nb-container">

        {/* Background image */}
        <div
          key={current}
          className="nb-bg"
          style={{
            backgroundImage: `url(${slide.image})`,
            opacity:   animating ? 0 : 1,
            transform: animating
              ? direction === "next" ? "translateX(30px) scale(1.02)" : "translateX(-30px) scale(1.02)"
              : "translateX(0) scale(1)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        />

        {/* Gradient overlay */}
        <div className="nb-gradient-overlay" />

        {/* Content */}
        <div
          className="nb-inner"
          style={{
            opacity:   animating ? 0 : 1,
            transform: animating ? "translateY(10px)" : "translateY(0)",
            transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
          }}
        >
          {/* Hero */}
          <div className="nb-hero">
            <div className="nb-author-row">
              <div className="nb-redbar" />
              <span className="nb-author-name">{slide.author}</span>
            </div>
            <h1 className="nb-headline">{slide.title}</h1>
            <div className="nb-separator" />
            <div className="nb-actions">
              <button className="nb-pill"><ArrowCircleIcon /><span>Read More</span></button>
              <button className="nb-pill"><PlayCircleIcon /><span>Watch Video</span></button>
              <button className="nb-pill"><ShareCircleIcon /><span>Share</span></button>
            </div>
          </div>

          {/* Bottom news */}
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
  );
}