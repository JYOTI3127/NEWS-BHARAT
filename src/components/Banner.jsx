import { useState, useEffect } from "react";


const slides = [
  {
    id: 1,
    author: "Grace Eliza Goodwin",
    title: "Bondi Criticised After Saying All Epstein Files Have Been Released",
    category: "Politics",
    image:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&q=80",
  },
  {
    id: 2,
    author: "James Mitchell",
    title: "Climate Summit Reaches Historic Agreement on Carbon Emissions",
    category: "Environment",
    image:
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80",
  },
  {
    id: 3,
    author: "Sarah Chen",
    title: "Tech Giants Face New Antitrust Regulations Across Europe",
    category: "Technology",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
  },
  {
    id: 4,
    author: "Ahmed Al-Rashid",
    title: "Middle East Peace Talks Resume After Years of Stalemate",
    category: "World",
    image:
      "https://images.unsplash.com/photo-1479615201589-f23d8ebf12b0?w=1200&q=80",
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
    <div
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        background: "white",
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
     
        
    
      }}
    >
      {/* Main Banner */}
      <div
        style={{
          width: "100%",
          maxWidth: "1400px",
          overflow: "hidden",
          borderRadius: "2px",
        }}
      >
        {/* Slide Area */}
        <div
          style={{
            position: "relative",
            height: "389px",
            overflow: "hidden",
            background: "#1a1a1a",
          }}
        >
          {/* Background Image */}
          <div
            key={current}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              opacity: animating ? 0 : 1,
              transform: animating
                ? direction === "next"
                  ? "translateX(30px) scale(1.02)"
                  : "translateX(-30px) scale(1.02)"
                : "translateX(0) scale(1)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          />

          {/* Dark overlay gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.1) 100%)",
            }}
          />

          {/* Content */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "28px 32px",
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(10px)" : "translateY(0)",
              transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
            }}
          >
            {/* Author */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "3px",
                  height: "16px",
                  background: "#e60000",
                  borderRadius: "1px",
                }}
              />
              <span
                style={{
                  color: "#fff",
                  fontSize: "13px",
                  fontFamily: "'Arial', sans-serif",
                  letterSpacing: "0.02em",
                  opacity: 0.9,
                }}
              >
                {slide.author}
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                color: "#fff",
                fontSize: "clamp(22px, 3vw, 30px)",
                fontWeight: "700",
                lineHeight: "1.25",
                margin: "0 0 20px 0",
                maxWidth: "560px",
                fontFamily: "'Georgia', serif",
                textShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              {slide.title}
            </h1>

            {/* Action Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              {/* Read More Button */}
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.6)",
                  borderRadius: "50px",
                  color: "#fff",
                  padding: "7px 16px",
                  fontSize: "13px",
                  fontFamily: "'Arial', sans-serif",
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#fff";
                  e.target.style.background = "rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.6)";
                  e.target.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "1.5px solid rgba(255,255,255,0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                  }}
                >
                  +
                </span>
                Read More
              </button>

              {/* Watch Video */}
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "13px",
                  fontFamily: "'Arial', sans-serif",
                  cursor: "pointer",
                  padding: "0",
                  letterSpacing: "0.03em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ▶ Watch Video
              </button>

              {/* Share */}
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.6)",
                  borderRadius: "50px",
                  color: "#fff",
                  padding: "7px 16px",
                  fontSize: "13px",
                  fontFamily: "'Arial', sans-serif",
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                }}
              >
                <span style={{ fontSize: "12px" }}>⤴</span>
                Share
              </button>
            </div>
          </div>

          {/* Slide Dots */}
          <div
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? "next" : "prev")}
                style={{
                  width: "6px",
                  height: i === current ? "24px" : "6px",
                  borderRadius: "3px",
                  background: i === current ? "#e60000" : "rgba(255,255,255,0.45)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "height 0.35s ease, background 0.3s ease",
                }}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div
            style={{
              position: "absolute",
              bottom: "0",
              left: "0",
              height: "3px",
              background: "#e60000",
              animation: "progress 5s linear infinite",
              width: "100%",
              transformOrigin: "left",
            }}
          />
          <style>{`
            @keyframes progress {
              from { transform: scaleX(0); }
              to { transform: scaleX(1); }
            }
          `}</style>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#2a2a2a" }} />

        {/* Bottom News Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            background: "#111",
          }}
        >
          {bottomNews.map((item, i) => (
            <div
              key={item.id}
              style={{
                padding: "16px 20px",
                borderRight: i < 2 ? "1px solid #222" : "none",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#1a1a1a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <p
                style={{
                  color: "#e8e8e8",
                  fontSize: "13px",
                  fontFamily: "'Georgia', serif",
                  lineHeight: "1.5",
                  margin: "0 0 8px 0",
                  fontWeight: "400",
                }}
              >
                {item.title}
              </p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span
                  style={{
                    color: "#999",
                    fontSize: "11px",
                    fontFamily: "'Arial', sans-serif",
                  }}
                >
                  {item.time}
                </span>
                <span style={{ color: "#555", fontSize: "11px" }}>|</span>
                <span
                  style={{
                    color: "#999",
                    fontSize: "11px",
                    fontFamily: "'Arial', sans-serif",
                  }}
                >
                  {item.region}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}