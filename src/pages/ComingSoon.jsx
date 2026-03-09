import { useEffect, useState, useRef } from "react";
import logo from "../assets/NEWS4BHARAT LOGO 5 (1).png";
import { FaFacebookF, FaInstagram, FaYoutube, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { MdOutlineMailOutline } from "react-icons/md";
import { IoCheckmarkCircle } from "react-icons/io5";

const TARGET_DATE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 30 * 60 * 1000 + 40 * 1000);
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzsyO3DPAG2G-3dvQ01zh6J_oWMpCILOs5ICV-pf6_FQhXebgFpn17JMa2spQFTXxEYGQ/exec";

function getTimeLeft() {
  const now = new Date();
  const diff = TARGET_DATE - now;
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60),
    secs: Math.floor((diff / 1000) % 60),
  };
}

function TimerBox({ value, label }) {
  const [pop, setPop] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      setPop(true);
      const t = setTimeout(() => { setPop(false); prev.current = value; }, 300);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px" }}>
      <div style={{
        width: "82px",
        height: "82px",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.13)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        transform: pop ? "scale(0.92)" : "scale(1)",
        transition: "transform 0.15s ease",
      }}>
        <span style={{
          fontSize: "34px",
          fontFamily: "'Poppins', sans-serif",
          fontWeight: "700",
          color: "#fff",
          lineHeight: 1,
        }}>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span style={{
        fontSize: "10px",
        fontFamily: "'Poppins', sans-serif",
        fontWeight: "500",
        color: "rgba(255,255,255,0.4)",
        letterSpacing: "3px",
        textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  );
}

export default function ComingSoon() {
  const [time, setTime] = useState(getTimeLeft());
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    const timer = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => { clearInterval(timer); clearTimeout(t); };
  }, []);

  const handleNotify = async () => {
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { overflow:hidden; background:#0a0a0f; }

        .cs-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Poppins', sans-serif;
          overflow: hidden;
        }

        .bg-photo {
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&auto=format&fit=crop&q=80');
          background-size: cover;
          background-position: center;
          filter: brightness(0.16) saturate(0.4);
          z-index: 0;
        }

        .bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, rgba(10,10,15,0.55) 0%, rgba(10,10,15,0.15) 50%, rgba(10,10,15,0.9) 100%);
          z-index: 1;
        }

        .red-orb {
          position: absolute;
          top: -180px;
          left: 50%;
          transform: translateX(-50%);
          width: 640px;
          height: 640px;
          background: radial-gradient(circle, rgba(216,1,0,0.14) 0%, transparent 65%);
          z-index: 1;
          pointer-events: none;
        }

        .page-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 680px;
          padding: 48px 36px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? "translateY(0px)" : "translateY(22px)"};
          transition: opacity 0.75s ease, transform 0.75s ease;
        }

        .logo-block {
          position: fixed;
          top: 24px;
          left: 32px;
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .logo-img {
          height: 52px;
          width: auto;
          max-width: 200px;
          object-fit: contain;
          filter: drop-shadow(0 2px 12px rgba(216,1,0,0.3));
        }

        .logo-tagline {
          font-family: 'Poppins', sans-serif;
          font-size: 8.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.28);
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .divider {
          width: 44px;
          height: 2px;
          background: linear-gradient(to right, transparent, #D80100, transparent);
          margin-bottom: 22px;
        }

        .headline {
          font-family: 'Poppins', sans-serif;
          font-size: clamp(34px, 6vw, 50px);
          font-weight: 800;
          color: #fff;
          text-align: center;
          line-height: 1.12;
          letter-spacing: -0.8px;
          margin-bottom: 13px;
        }
        .headline span { color: #D80100; font-style: italic; }

        .subtext {
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.42);
          text-align: center;
          line-height: 1.8;
          max-width: 370px;
          margin-bottom: 32px;
        }

        .timer-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 32px;
        }
        .colon {
          font-family: 'Poppins', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: rgba(255,255,255,0.18);
          line-height: 82px;
        }

        .email-wrap {
          display: flex;
          width: 100%;
          max-width: 400px;
          border-radius: 50px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.11);
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(14px);
          margin-bottom: 6px;
        }
        .mail-icon {
          display: flex;
          align-items: center;
          padding-left: 17px;
          color: rgba(255,255,255,0.28);
          font-size: 17px;
          flex-shrink: 0;
        }
        .email-input {
          flex: 1;
          padding: 14px 10px;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 12.5px;
          font-family: 'Poppins', sans-serif;
          font-weight: 400;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.26); }

        .notify-btn {
          padding: 13px 22px;
          background: #D80100;
          border: none;
          color: #fff;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          letter-spacing: 0.3px;
          border-radius: 0 50px 50px 0;
          transition: background 0.2s;
          white-space: nowrap;
          min-width: 100px;
        }
        .notify-btn:hover { background: #b50000; }
        .notify-btn:disabled { background: #888; cursor: not-allowed; }

        .error-msg {
          font-family: 'Poppins', sans-serif;
          font-size: 11.5px;
          font-weight: 400;
          color: #f87171;
          margin-bottom: 4px;
        }

        .success-row {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: 'Poppins', sans-serif;
          font-size: 12.5px;
          font-weight: 500;
          color: #4ade80;
          padding: 10px 0;
        }

        .social-row {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .s-link {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          font-size: 15px;
          transition: background 0.2s, color 0.2s, transform 0.2s, border-color 0.2s;
        }
        .s-link:hover {
          background: #D80100;
          border-color: #D80100;
          color: #fff;
          transform: translateY(-3px);
        }

        .ticker {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 10;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(14px);
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 20px;
        }
        .ticker-badge {
          font-family: 'Poppins', sans-serif;
          font-size: 9px;
          font-weight: 700;
          background: #D80100;
          color: #fff;
          padding: 3px 10px;
          border-radius: 4px;
          letter-spacing: 2px;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .ticker-text {
          font-family: 'Poppins', sans-serif;
          font-size: 11.5px;
          font-weight: 300;
          color: rgba(255,255,255,0.38);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 480px) {
          .logo-block { top: 16px; left: 16px; }
          .logo-img { height: 40px; }
          .page-inner { padding: 32px 16px 60px; }
          .email-wrap { max-width: 100%; }
          .timer-row { gap: 6px; }
        }
      `}</style>

      <div className="cs-page">
        <div className="bg-photo" />
        <div className="bg-overlay" />
        <div className="red-orb" />

        {/* LOGO — top left fixed */}
        <div className="logo-block">
          <img src={logo} alt="News4Bharat" className="logo-img" />
          {/* <span className="logo-tagline">The Voice of India &nbsp;&middot;&nbsp; Every Story, Every Moment</span> */}
        </div>

        <div className="page-inner">

          <div className="divider" />

          <h1 className="headline">
            Something <span>Big</span><br />is Coming Soon
          </h1>

          <p className="subtext">
            India's most trusted and fast news website is launching very soon.
            Breaking news, live updates, and the voice of truth — only for you.
          </p>

          {/* <div className="timer-row">
            <TimerBox value={time.days} label="Days" />
            <span className="colon">:</span>
            <TimerBox value={time.hours} label="Hours" />
            <span className="colon">:</span>
            <TimerBox value={time.mins} label="Mins" />
            <span className="colon">:</span>
            <TimerBox value={time.secs} label="Secs" />
          </div> */}

          {!submitted ? (
            <>
              <div className="email-wrap">
                <span className="mail-icon"><MdOutlineMailOutline /></span>
                <input
                  className="email-input"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleNotify()}
                />
                <button
                  className="notify-btn"
                  onClick={handleNotify}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Notify Me"}
                </button>
              </div>
              {error && <p className="error-msg">{error}</p>}
            </>
          ) : (
            <div className="success-row">
              <IoCheckmarkCircle size={17} />
              Thank you! We will notify you first when we launch.
            </div>
          )}

          <div className="social-row">
            <a href="https://facebook.com/news4bharat" target="_blank" rel="noreferrer" className="s-link" title="Facebook">
              <FaFacebookF />
            </a>
            <a href="https://instagram.com/news4bharat" target="_blank" rel="noreferrer" className="s-link" title="Instagram">
              <FaInstagram />
            </a>
            <a href="https://x.com/news4bharat" target="_blank" rel="noreferrer" className="s-link" title="X / Twitter">
              <FaXTwitter />
            </a>
            <a href="https://youtube.com/@news4bharat" target="_blank" rel="noreferrer" className="s-link" title="YouTube">
              <FaYoutube />
            </a>
            <a href="https://linkedin.com/company/news4bharat" target="_blank" rel="noreferrer" className="s-link" title="LinkedIn">
              <FaLinkedin />
            </a>
          </div>

        </div>

        <div className="ticker">
          <span className="ticker-badge">Breaking</span>
          <span className="ticker-text">
            News4Bharat is about to launch — India's fastest and most trusted news platform. Stay tuned for the big launch!
          </span>
        </div>
      </div>
    </>
  );
}