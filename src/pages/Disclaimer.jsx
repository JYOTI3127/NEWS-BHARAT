import { useState, useEffect, useRef } from "react";
import "../style.css";

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

const FadeIn = ({ children, delay = 0, className = "" }) => {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={`t-fade ${visible ? "t-visible" : ""} delay-[${delay}s] ${className}`.trim()}
    >
      {children}
    </div>
  );
};

/* ── ICONS ── */
const icons = {
  shield: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
  alert: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
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
  user: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  refresh: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
};

/* ── DISCLAIMER SECTIONS ── */
const disclaimerSections = [
  {
    num: "01",
    iconKey: "alert",
    title: "Content Accuracy",
    intro: "While we strive for accuracy:",
    items: [
      { icon: "x", text: "We do not guarantee that all information is complete or up to date" },
      { icon: "x", text: "Any action you take based on our content is at your own risk" },
    ],
  },
  {
    num: "02",
    iconKey: "book",
    title: "Editorial Independence",
    intro: "Opinions expressed in articles or opinion pieces belong to the respective authors and do not necessarily reflect the views of News4Bharat.",
  },
  {
    num: "03",
    iconKey: "globe",
    title: "External Links Disclaimer",
    intro: "Our website may contain links to other websites. We do not control or guarantee:",
    items: [
      { icon: "x", text: "The accuracy of external content" },
      { icon: "x", text: "Their privacy practices" },
    ],
  },
  {
    num: "04",
    iconKey: "tag",
    title: "Advertisement Disclaimer",
    intro: "We use third-party advertising services, including Google AdSense.",
    items: [
      { icon: "check", text: "Ads may be personalized based on user activity" },
      { icon: "check", text: "Clicking on ads may redirect you to third-party websites" },
    ],
    footer: "We are not responsible for the products, services, or claims made in advertisements.",
  },
  {
    num: "05",
    iconKey: "alert",
    title: "Professional Disclaimer",
    intro: "Content on this website does not constitute:",
    items: [
      { icon: "x", text: "Legal advice" },
      { icon: "x", text: "Financial advice" },
      { icon: "x", text: "Medical advice" },
    ],
    footer: "Users should consult professionals before making decisions based on such information.",
  },
  {
    num: "06",
    iconKey: "user",
    title: "Consent",
    intro: "By using our website, you consent to this disclaimer and agree to its terms.",
  },
  {
    num: "07",
    iconKey: "refresh",
    title: "Updates",
    intro: "This disclaimer may be updated without prior notice.",
  },
];

/* ── COMPONENT ── */
export default function DisclaimerPage() {
  return (
    <div className="terms-page">

      {/* ══════ HERO ══════ */}
      <section className="terms-hero">
        <img
          className="terms-hero-img"
          src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1800&q=85&fit=crop"
          alt="Disclaimer — News4Bharat"
        />
        <div className="terms-hero-overlay" />
        <div className="terms-hero-grid" />
        <div className="terms-hero-bottom-fade" />

        <div className="terms-hero-content">
          <div className="terms-hero-eyebrow">
            <div className="terms-hero-eyebrow-line" />
            <span className="terms-hero-eyebrow-text">Legal · Transparency · Liability</span>
          </div>
          <h1 className="terms-hero-title">Disclaimer</h1>
          <p className="terms-hero-desc">
            The information provided on News4Bharat is published in good faith and for general informational purposes only.
          </p>
          <div className="terms-hero-pills">
            <div className="terms-hero-pill">
              <div className="terms-hero-pill-dot" />
              Effective: March 2026
            </div>
          </div>
        </div>
      </section>

      {/* ══════ BODY ══════ */}
      <div className="terms-body">
        <section className="terms-chapter" id="disclaimer">

          <FadeIn>
            <div className="terms-chapter-head">
              <div className="terms-chapter-icon-wrap">{icons.shield}</div>
              <div>
                <div className="terms-chapter-num">News4Bharat</div>
                <h2 className="terms-chapter-title">Disclaimer</h2>
              </div>
            </div>
          </FadeIn>

          <div className="terms-grid">


            {/* All sections */}
            {disclaimerSections.map((sec, i) => (
              <FadeIn
                key={i}
                delay={i * 0.05}
                className="terms-grid-item"
              >
                <div className="terms-block">

                  {/* Title */}
                  <div className="terms-block-title">
                    <span className="terms-block-title-icon">{icons[sec.iconKey]}</span>
                    {sec.num}. {sec.title}
                  </div>

                  {/* Intro */}
                  {sec.intro && (
                    <p className="terms-block-intro">{sec.intro}</p>
                  )}

                  {/* Items */}
                  {sec.items && (
                    <ul className="terms-block-list">
                      {sec.items.map((item, j) => (
                        <li key={j} className="terms-block-list-item">
                          <span className="terms-block-list-icon">
                            {item.icon === "check" ? icons.check : icons.x}
                          </span>
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Footer note */}
                  {sec.footer && (
                    <p className="terms-block-footer">{sec.footer}</p>
                  )}

                </div>
              </FadeIn>
            ))}

          </div>
        </section>
      </div>
    </div>
  );
}
