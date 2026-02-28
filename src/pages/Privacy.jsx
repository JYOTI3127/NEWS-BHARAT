import { useState, useEffect, useRef } from "react";
import "./PrivacyPage.css";

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

const FadeIn = ({ children, delay = 0, left = false, className = "" }) => {
  const [ref, visible] = useInView();
  const base = left ? "priv-fade-left" : "priv-fade-in";
  return (
    <div
      ref={ref}
      className={`${base} ${visible ? "priv-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

/* ── ICONS ── */
const icons = {
  shield: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  user: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  settings: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  cookie: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" />
    </svg>
  ),
  lock: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  link: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  refresh: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  bigShield: (
    <svg width="180" height="180" fill="none" stroke="currentColor" strokeWidth="0.6" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

/* ── NAV ITEMS ── */
const navItems = [
  { id: "collect",    label: "Information We Collect" },
  { id: "use",        label: "How We Use Information" },
  { id: "cookies",    label: "Cookies" },
  { id: "protection", label: "Data Protection" },
  { id: "third",      label: "Third-Party Links" },
  { id: "updates",    label: "Policy Updates" },
];

/* ── COMPONENT ── */
export default function PrivacyPage() {
  const [activeId, setActiveId] = useState("collect");

  useEffect(() => {
    const handleScroll = () => {
      for (const item of navItems) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom > 120) {
          setActiveId(item.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="privacy-page">

      {/* ════════ HERO — full width image with text overlay ════════ */}
      <section className="priv-hero">

        {/* Full BG image */}
        <img
          className="priv-hero-img"
          src="https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1800&q=85&fit=crop"
          alt="Privacy Policy — News 4 Bharat"
        />

        {/* Dark overlay */}
        <div className="priv-hero-img-overlay" />

        {/* Grid texture */}
        <div className="priv-hero-slash" />
        
        {/* Bottom fade to white */}
        <div className="priv-hero-fade" />

        {/* Text content on top */}
        <div className="priv-hero-content">
          <div className="priv-hero-tag">
            <div className="priv-hero-tag-dot" />
            <span className="priv-hero-tag-text">Legal Document</span>
          </div>

          <h1 className="priv-hero-title">
            Privacy
            <span className="priv-hero-title-accent">  Policy</span>
          </h1>

          <div className="priv-hero-divider" />

          <p className="priv-hero-desc">
            News 4 Bharat values your privacy. This Privacy Policy outlines how we collect, use, and protect your information when you use our platform.
          </p>

          <div className="priv-hero-meta">
            <div className="priv-hero-date">
              <span className="priv-hero-date-icon">{icons.calendar}</span>
              <span>Effective Date: March 2026</span>
            </div>
            <div className="priv-hero-badge">News 4 Bharat</div>
          </div>
        </div>

      </section>

      {/* ════════ LAYOUT: SIDEBAR + CONTENT ════════ */}
      <div className="priv-layout">

        {/* ── SIDEBAR NAV ── */}
        <aside className="priv-sidebar">

          {/* Info card */}
          <div className="priv-sidebar-card">
            <div className="priv-sidebar-card-title">About This Policy</div>
            <p className="priv-sidebar-card-body">
              This document governs how News 4 Bharat collects and handles your data. We are committed to full transparency.
            </p>
            <div className="priv-sidebar-card-date">
              <span className="priv-sidebar-card-date-icon">{icons.calendar}</span>
              <span>March 2026</span>
            </div>
          </div>

          {/* Key facts */}
          <div className="priv-sidebar-stats">
            <div className="priv-sidebar-stat">
              <div className="priv-sidebar-stat-icon">{icons.shield}</div>
              <div>
                <div className="priv-sidebar-stat-label">Data Selling</div>
                <div className="priv-sidebar-stat-value">Never</div>
              </div>
            </div>
            <div className="priv-sidebar-stat">
              <div className="priv-sidebar-stat-icon">{icons.lock}</div>
              <div>
                <div className="priv-sidebar-stat-label">Security</div>
                <div className="priv-sidebar-stat-value">Encrypted</div>
              </div>
            </div>
            <div className="priv-sidebar-stat">
              <div className="priv-sidebar-stat-icon">{icons.refresh}</div>
              <div>
                <div className="priv-sidebar-stat-label">Last Updated</div>
                <div className="priv-sidebar-stat-value">Mar 2026</div>
              </div>
            </div>
            <div className="priv-sidebar-stat">
              <div className="priv-sidebar-stat-icon">{icons.cookie}</div>
              <div>
                <div className="priv-sidebar-stat-label">Cookies</div>
                <div className="priv-sidebar-stat-value">Opt-out Available</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <p className="priv-nav-label">Contents</p>
          <ul className="priv-nav-list">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`priv-nav-item ${activeId === item.id ? "active" : ""}`}
                  onClick={() => scrollTo(item.id)}
                >
                  <span className="priv-nav-dot" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="priv-content">

          {/* 1. Information We Collect */}
          <FadeIn>
            <section className="priv-section" id="collect">
              <div className="priv-section-header">
                <div className="priv-section-icon">{icons.user}</div>
                <div>
                  <div className="priv-section-num">Section 01</div>
                  <h2 className="priv-section-title">Information We Collect</h2>
                </div>
              </div>

              <div className="priv-info-grid">
                <div className="priv-info-card">
                  <div className="priv-info-card-label">Personal Information</div>
                  <div className="priv-info-card-items">
                    {["Name", "Email address", "Phone number (if submitted)"].map((item, i) => (
                      <div key={i} className="priv-info-card-item">{item}</div>
                    ))}
                  </div>
                </div>
                <div className="priv-info-card">
                  <div className="priv-info-card-label">Non-Personal Information</div>
                  <div className="priv-info-card-items">
                    {["Browser type", "IP address", "Device information", "Cookies & analytics data"].map((item, i) => (
                      <div key={i} className="priv-info-card-item">{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </FadeIn>

          {/* 2. How We Use Information */}
          <FadeIn delay={0.05}>
            <section className="priv-section" id="use">
              <div className="priv-section-header">
                <div className="priv-section-icon">{icons.settings}</div>
                <div>
                  <div className="priv-section-num">Section 02</div>
                  <h2 className="priv-section-title">How We Use Information</h2>
                </div>
              </div>

              <p className="priv-body">We use collected data to deliver a better experience for our readers and to operate our platform effectively:</p>

              <ul className="priv-list">
                {[
                  "Improve website performance and user experience",
                  "Respond to inquiries and reader feedback",
                  "Send newsletters (only if subscribed)",
                  "Analyze readership trends and editorial reach",
                  "Prevent fraudulent activity and protect platform integrity",
                ].map((item, i) => (
                  <li key={i} className="priv-list-item">
                    <span className="priv-list-icon">{icons.check}</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="priv-highlight">
                <p className="priv-highlight-text">We do not sell personal data to third parties — ever.</p>
              </div>
            </section>
          </FadeIn>

          {/* 3. Cookies */}
          <FadeIn delay={0.05}>
            <section className="priv-section" id="cookies">
              <div className="priv-section-header">
                <div className="priv-section-icon">{icons.cookie}</div>
                <div>
                  <div className="priv-section-num">Section 03</div>
                  <h2 className="priv-section-title">Cookies</h2>
                </div>
              </div>

              <p className="priv-body">We use cookies to enhance your experience on our platform. Here's how we use them:</p>

              <ul className="priv-list">
                {[
                  "Enhance user experience and site functionality",
                  "Track analytics to understand readership patterns",
                  "Store user preferences across sessions",
                ].map((item, i) => (
                  <li key={i} className="priv-list-item">
                    <span className="priv-list-icon">{icons.check}</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="priv-note">
                <span className="priv-note-icon">{icons.alert}</span>
                <p className="priv-note-text">
                  Users may disable cookies through their browser settings. Note that disabling cookies may affect some website functionality.
                </p>
              </div>
            </section>
          </FadeIn>

          {/* 4. Data Protection */}
          <FadeIn delay={0.05}>
            <section className="priv-section" id="protection">
              <div className="priv-section-header">
                <div className="priv-section-icon">{icons.lock}</div>
                <div>
                  <div className="priv-section-num">Section 04</div>
                  <h2 className="priv-section-title">Data Protection</h2>
                </div>
              </div>

              <p className="priv-body">
                We implement appropriate security measures to safeguard your information. Our platform follows industry-standard practices to ensure data integrity and confidentiality.
              </p>

              <div className="priv-note">
                <span className="priv-note-icon">{icons.alert}</span>
                <p className="priv-note-text">
                  However, no digital transmission can be guaranteed 100% secure. We encourage users to take precautions when sharing sensitive information online.
                </p>
              </div>
            </section>
          </FadeIn>

          {/* 5. Third-Party Links */}
          <FadeIn delay={0.05}>
            <section className="priv-section" id="third">
              <div className="priv-section-header">
                <div className="priv-section-icon">{icons.link}</div>
                <div>
                  <div className="priv-section-num">Section 05</div>
                  <h2 className="priv-section-title">Third-Party Links</h2>
                </div>
              </div>

              <p className="priv-body">
                Our website may contain links to external websites for reference and informational purposes.
              </p>

              <div className="priv-highlight">
                <p className="priv-highlight-text">
                  News 4 Bharat is not responsible for the privacy practices of any third-party websites. We recommend reviewing their privacy policies before engaging.
                </p>
              </div>
            </section>
          </FadeIn>

          {/* 6. Policy Updates */}
          <FadeIn delay={0.05}>
            <section className="priv-section" id="updates">
              <div className="priv-section-header">
                <div className="priv-section-icon">{icons.refresh}</div>
                <div>
                  <div className="priv-section-num">Section 06</div>
                  <h2 className="priv-section-title">Policy Updates</h2>
                </div>
              </div>

              <p className="priv-body">
                We may update this Privacy Policy periodically to reflect changes in our practices, legal requirements, or platform updates.
              </p>

              <div className="priv-highlight">
                <p className="priv-highlight-text">
                  Continued use of the website after any changes implies acceptance of the updated policy. We encourage users to review this page regularly.
                </p>
              </div>

              {/* Contact block */}
              <div className="priv-contact-block" style={{ marginTop: "2rem" }}>
                <h3 className="priv-contact-title">Questions about this policy?</h3>
                <p className="priv-contact-desc">
                  If you have any questions or concerns about how we handle your data, feel free to reach out to our team.
                </p>
                <a href="careers@news4bharat.com" className="priv-contact-link">
                  {icons.mail}
                  Contact Us
                </a>
              </div>
            </section>
          </FadeIn>

        </main>
      </div>
    </div>
  );
}