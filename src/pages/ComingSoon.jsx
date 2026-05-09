import { useEffect, useState } from "react";
import logo from "../assets/NEWS4BHARAT LOGO 01 (4).png";
import { FaFacebookF, FaInstagram, FaYoutube, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { MdOutlineMailOutline } from "react-icons/md";
import { IoCheckmarkCircle } from "react-icons/io5";
import { YOUTUBE_CHANNEL_URL } from "../lib/socialLinks";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxSpSaJe57t9c-rjeiQXTigiJ_Z9JeF1w12Sm4fX_Mb-C5oIebysakUFIHz6aTJG6y3dA/exec";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleNotify = async () => {
    if (!email.includes("@")) { setError("Please enter a valid email address."); return; }
    setError(""); setLoading(true);
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; overflow:hidden; background:#0a0a0f; }

        /* ── KEYFRAME ANIMATIONS ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes scaleIn {
          from { opacity:0; transform:scale(0.88); }
          to   { opacity:1; transform:scale(1);    }
        }
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-18px); }
          to   { opacity:1; transform:translateY(0);     }
        }
        @keyframes orbPulse {
          0%, 100% { opacity:0.14; transform:translateX(-50%) scale(1);   }
          50%       { opacity:0.22; transform:translateX(-50%) scale(1.08); }
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes socialPop {
          0%   { opacity:0; transform:translateY(14px) scale(0.85); }
          100% { opacity:1; transform:translateY(0)    scale(1);    }
        }

        /* ── PAGE ── */
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

        /* ── BACKGROUND ── */
        .bg-photo {
          position: absolute; inset: 0;
          background-image: url('https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&auto=format&fit=crop&q=80');
          background-size: cover; background-position: center;
          filter: brightness(0.16) saturate(0.4);
          z-index: 0;
          animation: fadeIn 1.2s ease forwards;
        }
        .bg-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(160deg, rgba(10,10,15,0.6) 0%, rgba(10,10,15,0.1) 50%, rgba(10,10,15,0.92) 100%);
          z-index: 1;
        }
        .red-orb {
          position: absolute; top: -180px; left: 50%;
          transform: translateX(-50%);
          width: 640px; height: 640px;
          background: radial-gradient(circle, rgba(216,1,0,0.14) 0%, transparent 65%);
          z-index: 1; pointer-events: none;
          animation: orbPulse 6s ease-in-out infinite;
        }

        /* ── TOP LEFT LOGO ── */
        .logo-block {
          position: fixed; top: 24px; left: 32px; z-index: 20;
          animation: slideDown 0.7s ease 0.2s both;
        }
        .logo-img {
          height: 52px; width: auto; max-width: 200px;
          object-fit: contain;
          filter: drop-shadow(0 2px 12px rgba(216,1,0,0.35));
          transition: transform 0.3s ease;
        }
        .logo-img:hover { transform: scale(1.04); }

        /* ── MAIN CONTENT ── */
        .page-inner {
          position: relative; z-index: 2;
          width: 100%; max-width: 640px;
          padding: 48px 36px 70px;
          display: flex; flex-direction: column; align-items: center;
        }

        /* ── DIVIDER ── */
        .divider {
          width: 44px; height: 2px;
          background: linear-gradient(to right, transparent, #D80100, transparent);
          margin-bottom: 20px;
          animation: scaleIn 0.6s ease 0.4s both;
        }

        /* ── HEADLINE ── */
        .headline {
          font-family: 'Poppins', sans-serif;
          font-size: clamp(22px, 4vw, 42px);
          font-weight: 800;
          color: #fff;
          text-align: center;
          line-height: 1.15;
          letter-spacing: -0.5px;
          margin-bottom: 20px;
          animation: fadeUp 0.8s ease 0.5s both;
          width: 100%;
          max-width: 600px;
        }
        .headline span { color: #D80100;
    font-style: italic;
    padding: 2px;
    font-size: 35px;}

        /* ── CENTER LOGO ── */
        .center-logo {
          margin-bottom: 22px;
          animation: scaleIn 0.7s ease 0.5s both;
        }
        .center-logo-img {
          height: 56px; width: auto; max-width: 220px;
          object-fit: contain;
          filter: drop-shadow(0 2px 16px rgba(216,1,0,0.3));
          transition: transform 0.3s ease;
        }
        .center-logo-img:hover { transform: scale(1.03); }

        /* ── DESCRIPTION ── */
        .description {
          font-family: 'Poppins', sans-serif;
          font-size: clamp(12px, 1.8vw, 14px);
          font-weight: 400;
          color: rgba(255,255,255,0.75);
          text-align: center;
          line-height: 1.9;
          width: 100%;
          max-width: 560px;
          margin-bottom: 20px;
          animation: fadeUp 0.8s ease 0.7s both;
        }

        /* ── EMAIL ── */
        .email-wrap {
          display: flex;
          width: 100%; max-width: 420px;
          border-radius: 50px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(14px);
          margin-bottom: 6px;
          animation: fadeUp 0.8s ease 1s both;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .email-wrap:focus-within {
          border-color: rgba(216,1,0,0.5);
          box-shadow: 0 0 0 3px rgba(216,1,0,0.1);
        }
        .mail-icon {
          display: flex; align-items: center;
          padding-left: 17px;
          color: rgba(255,255,255,0.28);
          font-size: 17px; flex-shrink: 0;
        }
        .email-input {
          flex: 1; padding: 14px 10px;
          background: transparent; border: none; outline: none;
          color: #fff; font-size: 12.5px;
          font-family: 'Poppins', sans-serif; font-weight: 400;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.26); }
        .notify-btn {
          padding: 13px 22px; background: #D80100; border: none;
          color: #fff; font-weight: 600; font-size: 12px;
          cursor: pointer; font-family: 'Poppins', sans-serif;
          letter-spacing: 0.3px; border-radius: 0 50px 50px 0;
          transition: background 0.2s, transform 0.15s;
          white-space: nowrap; min-width: 100px;
        }
        .notify-btn:hover  { background: #b50000; transform: scale(1.02); }
        .notify-btn:active { transform: scale(0.98); }
        .notify-btn:disabled { background: #666; cursor: not-allowed; transform: none; }

        .error-msg {
          font-family: 'Poppins', sans-serif;
          font-size: 11.5px; color: #f87171;
          margin-bottom: 4px;
          animation: fadeIn 0.3s ease;
        }

        .success-row {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Poppins', sans-serif;
          font-size: 13px; font-weight: 500; color: #4ade80;
          padding: 12px 0;
          animation: scaleIn 0.4s ease;
        }

        /* ── SOCIAL ICONS ── */
        .social-row {
          display: flex; gap: 10px;
          margin-top: 18px;
        }
        .s-link {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.8);
          text-decoration: none; font-size: 15px;
          transition: background 0.2s, color 0.2s, transform 0.25s, border-color 0.2s, box-shadow 0.2s;
          opacity: 0;
          animation: socialPop 0.5s ease forwards;
        }
        .s-link:nth-child(1) { animation-delay: 1.1s; }
        .s-link:nth-child(2) { animation-delay: 1.2s; }
        .s-link:nth-child(3) { animation-delay: 1.3s; }
        .s-link:nth-child(4) { animation-delay: 1.4s; }
        .s-link:nth-child(5) { animation-delay: 1.5s; }
        .s-link:hover {
          background: #D80100; border-color: #D80100;
          color: #fff; transform: translateY(-4px) scale(1.1);
          box-shadow: 0 6px 20px rgba(216,1,0,0.35);
        }

        /* ── TICKER ── */
        .ticker {
          position: fixed; bottom: 0; left: 0; right: 0;
          z-index: 10;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(14px);
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center;
          overflow: hidden;
          padding: 0;
          height: 36px;
          animation: slideDown 0.5s ease 1.6s both;
        }
        .ticker-badge {
          font-family: 'Poppins', sans-serif;
          font-size: 9px; font-weight: 700;
          background: #D80100; color: #fff;
          padding: 0 14px; height: 100%;
          display: flex; align-items: center;
          letter-spacing: 2px; text-transform: uppercase;
          white-space: nowrap; flex-shrink: 0;
          z-index: 1;
        }
        .ticker-track {
          flex: 1; overflow: hidden; position: relative;
          height: 100%;
        }
        .ticker-inner {
          display: flex; align-items: center;
          white-space: nowrap;
          animation: tickerScroll 18s linear infinite;
          height: 100%;
        }
        .ticker-text {
          font-family: 'Poppins', sans-serif;
          font-size: 11.5px; font-weight: 300;
          color: rgba(255,255,255,0.42);
          padding: 0 60px;
        }

        /* ── RESPONSIVE ── */

        /* Small phones — max 480px */
        @media (max-width: 480px) {
          .logo-block  { top: 12px; left: 14px; }
          .logo-img    { height: 32px; }
          .page-inner  { padding: 70px 16px 55px; }
          .center-logo-img { height: 38px; }
          .headline    { font-size: 18px; }
          .description { font-size: 11px; line-height: 1.75; }
          .email-wrap  { max-width: 100%; }
          .notify-btn  { padding: 13px 14px; font-size: 11px; min-width: 80px; }
          .s-link      { width: 34px; height: 34px; font-size: 13px; }
          .social-row  { gap: 7px; }
          .ticker      { height: 30px; }
          .ticker-badge { font-size: 8px; padding: 0 10px; }
          .ticker-text  { font-size: 10px; }
          .headline span {font-size: 20px; }
        }

        /* Large phones — 481px to 767px */
        @media (min-width: 481px) and (max-width: 767px) {
          .logo-block  { top: 16px; left: 20px; }
          .logo-img    { height: 40px; }
          .page-inner  { padding: 80px 24px 60px; }
          .center-logo-img { height: 46px; }
          .headline    { font-size: 26px; }
          .description { font-size: 12.5px; }
          .email-wrap  { max-width: 100%; }
          .ticker      { height: 30px; }
          .ticker-text { font-size: 10.5px; }
        }

        /* Tablets — 768px to 1024px */
        @media (min-width: 768px) and (max-width: 1024px) {
          .logo-img        { height: 46px; }
          .page-inner      { padding: 60px 30px 60px; max-width: 580px; }
          .center-logo-img { height: 50px; }
          .headline        { font-size: 32px; }
          .description     { font-size: 13.5px; max-width: 520px; }
          .s-link          { width: 44px; height: 44px; }
          .ticker-text     { font-size: 10px; }
          .ticker-badge    { font-size: 10px; }
          .headline span   {font-size: 30px;}
      }

        /* Desktop — 1025px to 1439px */
        @media (min-width: 1025px) and (max-width: 1439px) {
          .page-inner  { max-width: 660px; }
          .description { font-size: 14px; max-width: 580px; }
          .headline    { font-size: 38px; }
        }

        /* Large screens — 1440px+ */
        @media (min-width: 1440px) {
          .page-inner      { max-width: 720px; }
          .description     { font-size: 16px; max-width: 650px; }
          .logo-img        { height: 60px; }
          .center-logo-img { height: 64px; }
          .headline        { font-size: 38px; }
        .headline span {
  font-size: 40px !important;
}
      }


        /* 4K — 2560px+ */
        @media (min-width: 2560px) {
          .page-inner      { max-width: 1000px; }
          .description     { font-size: 22px; max-width: 900px; }
          .headline        { font-size: 37px; }
          .logo-img        { height: 80px; }
          .center-logo-img { height: 80px; }
          .ticker-text     { font-size: 16px; }
          .ticker-badge    { font-size: 13px; }
          .ticker          { height: 48px; }
                  .headline span {
  font-size: 40px !important;
}
        }
      `}</style>

      <div className="cs-page">
        <div className="bg-photo" />
        <div className="bg-overlay" />
        <div className="red-orb" />

        {/* TOP LEFT LOGO */}
        <div className="logo-block">
          <img src={logo} alt="News4Bharat" className="logo-img" />
        </div>

        <div className="page-inner">

          <div className="divider" />

          {/* HEADLINE */}
          <h1 className="headline">
            Something <span> Big </span> is Coming Soon
          </h1>

          {/* DESCRIPTION */}
          <p className="description">
            News4Bharat is an upcoming digital news platform dedicated to delivering
            credible, noise-free, and insightful news from India and around the world.
          </p>

          {/* EMAIL */}
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
                <button className="notify-btn" onClick={handleNotify} disabled={loading}>
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

          {/* SOCIAL */}
          <div className="social-row">
            <a href="https://www.facebook.com/share/1GxJQvxefr/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="s-link" title="Facebook"><FaFacebookF /></a>
            <a href="https://www.instagram.com/news4_bharat?igsh=MWlxem53bjNobHl2Zw%3D%3D&utm_source=qr" target="_blank" rel="noreferrer" className="s-link" title="Instagram"><FaInstagram /></a>
            <a href="https://x.com/news4_bharat?s=21&t=QmL3UuRgMMfwt2JDGmB3mQ" target="_blank" rel="noreferrer" className="s-link" title="X / Twitter"><FaXTwitter /></a>
            <a href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noreferrer" className="s-link" title="YouTube"><FaYoutube /></a>
            <a href="https://www.linkedin.com/company/news4bharat/" target="_blank" rel="noreferrer" className="s-link" title="LinkedIn"><FaLinkedin /></a>
          </div>

        </div>

        {/* SCROLLING TICKER */}
        <div className="ticker">
          <span className="ticker-badge">Breaking</span>
          <div className="ticker-track">
            <div className="ticker-inner">
              <span className="ticker-text">
               Follow us for updates and be among the first to experience News4Bharat – News That Connects India.
               |
               Follow us for updates and be among the first to experience News4Bharat – News That Connects India.
        
              </span>

            </div>
          </div>
        </div>

      </div>
    </>
  );
}
