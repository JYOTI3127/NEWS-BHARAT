import { useState, useEffect, useRef } from "react";
import "./TermsPage.css";

/* ── FADE IN HOOK ── */
const useInView = (threshold = 0.1) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

const FadeIn = ({ children, delay = 0, left = false }) => {
  const [ref, visible] = useInView();
  const cls = left ? "t-fade-left" : "t-fade";
  return (
    <div ref={ref} className={`${cls} ${visible ? "t-visible" : ""}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
};

/* ── ICONS ── */
const icons = {
  scroll: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  shield: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  star: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  alert: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  check: (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  book: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  globe: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  tag: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  bigScroll: (
    <svg width="160" height="160" fill="none" stroke="currentColor" strokeWidth="0.7" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
};

/* ── TAB CHAPTERS ── */
const chapters = [
  { id: "terms",    label: "Terms & Conditions", icon: icons.scroll },
  { id: "ethics",   label: "Code of Ethics",     icon: icons.star   },
  { id: "disclaimer", label: "Disclaimer",        icon: icons.shield },
];

/* ── ETHICS DATA ── */
const ethicsItems = [
  { title: "Accuracy",           desc: "Every story is verified through credible sources before publication." },
  { title: "Independence",       desc: "No political or corporate influence determines our editorial direction." },
  { title: "Fairness",           desc: "We present multiple perspectives wherever possible." },
  { title: "Transparency",       desc: "Errors are corrected publicly and promptly." },
  { title: "Accountability",     desc: "We accept responsibility for all published content." },
  { title: "No Paid News",       desc: "Sponsored content is clearly and prominently labeled." },
  { title: "Respect & Sensitivity", desc: "Coverage avoids sensationalism, respects privacy, and follows ethical standards in reporting on vulnerable groups." },
];

/* ── DISCLAIMER CARDS DATA ── */
const disclaimerCards = [
  { icon: icons.alert, text: "We strive for accuracy but do not guarantee completeness or timeliness of information." },
  { icon: icons.book,  text: "Views expressed in opinion articles belong solely to the respective authors." },
  { icon: icons.globe, text: "News 4 Bharat is not liable for any losses resulting from reliance on published content." },
  { icon: icons.tag,   text: "Financial, legal, or health information should not be treated as professional advice." },
];

/* ── COMPONENT ── */
export default function TermsPage() {
  const [activeTab, setActiveTab] = useState("terms");

  /* scroll spy */
  useEffect(() => {
    const handler = () => {
      for (const ch of chapters) {
        const el = document.getElementById(ch.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom > 100) {
          setActiveTab(ch.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTab(id);
  };

  return (
    <div className="terms-page">

      {/* ══════ HERO ══════ */}
      <section className="terms-hero">
        <img
          className="terms-hero-img"
          src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1800&q=85&fit=crop"
          alt="Terms and Conditions — News 4 Bharat"
        />
        <div className="terms-hero-overlay" />
        <div className="terms-hero-grid" />
        <div className="terms-hero-ring" />
        <div className="terms-hero-ring-sm" />
        <div className="terms-hero-float-icon">{icons.bigScroll}</div>
        <div className="terms-hero-bottom-fade" />

        <div className="terms-hero-content">
          <div className="terms-hero-eyebrow">
            <div className="terms-hero-eyebrow-line" />
            <span className="terms-hero-eyebrow-text">Legal · Ethics · Disclaimer</span>
          </div>

          <h1 className="terms-hero-title">Terms & </h1>
          <span className="terms-hero-title-sub"> Conditions</span>

          <p className="terms-hero-desc">
            By accessing News 4 Bharat, you agree to the following terms. Please read them carefully before using our platform.
          </p>

          <div className="terms-hero-pills">
            {["Effective: March 2026", "Governed by Indian Law", "News 4 Bharat"].map((t, i) => (
              <div key={i} className="terms-hero-pill">
                <div className="terms-hero-pill-dot" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ STICKY TABS NAV ══════ */}
      <nav className="terms-tabs-bar">
        <div className="terms-tabs-inner">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              className={`terms-tab-btn ${activeTab === ch.id ? "terms-tab-active" : ""}`}
              onClick={() => scrollTo(ch.id)}
            >
              <span className="terms-tab-icon">{ch.icon}</span>
              {ch.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ══════ BODY ══════ */}
      <div className="terms-body">

        {/* ── CHAPTER 1: TERMS & CONDITIONS ── */}
        <section className="terms-chapter" id="terms">
          <FadeIn>
            <div className="terms-chapter-head">
              <div className="terms-chapter-icon-wrap">{icons.scroll}</div>
              <div>
                <div className="terms-chapter-num">Chapter 01</div>
                <h2 className="terms-chapter-title">Terms & Conditions</h2>
              </div>
            </div>
          </FadeIn>

          <div className="terms-grid">

            {/* Use of Content */}
            <FadeIn delay={0.05}>
              <div className="terms-block">
                <div className="terms-block-title">
                  <span className="terms-block-title-icon">{icons.check}</span>
                  Use of Content
                </div>
                <ul className="terms-block-list">
                  {[
                    "Content is for personal, non-commercial use only.",
                    "Reproduction requires written permission.",
                    "Republishing without attribution is prohibited.",
                  ].map((item, i) => (
                    <li key={i} className="terms-block-list-item">
                      <span className="terms-block-list-icon">{icons.check}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            {/* User Conduct */}
            <FadeIn delay={0.1}>
              <div className="terms-block">
                <div className="terms-block-title">
                  <span className="terms-block-title-icon">{icons.x}</span>
                  User Conduct — Not Allowed
                </div>
                <ul className="terms-block-list">
                  {[
                    "Post defamatory or harmful content.",
                    "Engage in hate speech of any kind.",
                    "Attempt hacking or platform disruption.",
                    "Use automated scraping tools without permission.",
                  ].map((item, i) => (
                    <li key={i} className="terms-block-list-item">
                      <span className="terms-block-list-icon">{icons.x}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            {/* Intellectual Property */}
            <FadeIn delay={0.1}>
              <div className="terms-block">
                <div className="terms-block-title">
                  <span className="terms-block-title-icon">{icons.tag}</span>
                  Intellectual Property
                </div>
                <ul className="terms-block-list">
                  <li className="terms-block-list-item">
                    <span className="terms-block-list-icon">{icons.check}</span>
                    All content, design, logo, and branding are the property of News 4 Bharat unless otherwise stated.
                  </li>
                </ul>
              </div>
            </FadeIn>

            {/* Limitation of Liability */}
            <FadeIn delay={0.15}>
              <div className="terms-block">
                <div className="terms-block-title">
                  <span className="terms-block-title-icon">{icons.alert}</span>
                  Limitation of Liability
                </div>
                <ul className="terms-block-list">
                  {[
                    "Service interruptions",
                    "Technical errors",
                    "Third-party content",
                  ].map((item, i) => (
                    <li key={i} className="terms-block-list-item">
                      <span className="terms-block-list-icon">{icons.check}</span>
                      We are not responsible for: {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            {/* Governing Law — full width */}
            <FadeIn delay={0.2}>
              <div className="terms-block-full">
                <div className="terms-block-title" style={{ marginBottom: 8 }}>
                  <span className="terms-block-title-icon">{icons.globe}</span>
                  Governing Law
                </div>
                <p className="terms-block-full-text">
                  These terms are governed by the laws of <strong>India</strong>. Any disputes arising from the use of this platform shall be subject to the jurisdiction of Indian courts.
                </p>
              </div>
            </FadeIn>

          </div>
        </section>

        {/* ── CHAPTER 2: CODE OF ETHICS ── */}
        <section className="terms-chapter" id="ethics">
          <FadeIn>
            <div className="terms-chapter-head">
              <div className="terms-chapter-icon-wrap">{icons.star}</div>
              <div>
                <div className="terms-chapter-num">Chapter 02</div>
                <h2 className="terms-chapter-title">Code of Ethics</h2>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="ethics-list">
              {ethicsItems.map((item, i) => (
                <div key={i} className="ethics-item">
                  <div className="ethics-num">{String(i + 1).padStart(2, "0")}</div>
                  <div className="ethics-body">
                    <div className="ethics-title">{item.title}</div>
                    <div className="ethics-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* ── CHAPTER 3: DISCLAIMER ── */}
        <section className="terms-chapter" id="disclaimer">
          <FadeIn>
            <div className="terms-chapter-head">
              <div className="terms-chapter-icon-wrap">{icons.shield}</div>
              <div>
                <div className="terms-chapter-num">Chapter 03</div>
                <h2 className="terms-chapter-title">Disclaimer</h2>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <p style={{ fontSize: "0.95rem", color: "#555", lineHeight: 1.8, marginBottom: "1.5rem" }}>
              The information provided on News 4 Bharat is for general informational purposes only.
            </p>
          </FadeIn>

          <div className="disclaimer-grid">
            {disclaimerCards.map((card, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="disclaimer-card">
                  <div className="disclaimer-card-icon">{card.icon}</div>
                  <p className="disclaimer-card-text">{card.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2}>
            <div className="disclaimer-trademark">
              <div className="disclaimer-trademark-icon">{icons.tag}</div>
              <p className="disclaimer-trademark-text">
                All trademarks and logos belong to their respective owners and are used for identification purposes only.
              </p>
            </div>
          </FadeIn>
        </section>
      </div>
    </div>
  );
}