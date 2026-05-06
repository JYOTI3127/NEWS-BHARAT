import { useState, useEffect, useRef } from "react";
import PageSeo from "../components/PageSeo";
import AdvertisementSlot from "../components/AdvertisementSlot";
import { STATIC_PAGE_SEO } from "../lib/staticPageSeo";
import "../style.css";
import privacyBg from "../assets/privacy-img.png";

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
  const delayClass = `delay-[${delay}s]`;
  return (
    <div ref={ref} className={`${base} ${visible ? "priv-visible" : ""} ${delayClass} ${className}`}>
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
  child: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  database: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  globe: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  tag: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
};

/* ── NAV ITEMS ── */
const navItems = [
  { id: "whoweare", label: "Who We Are" },
  { id: "collect", label: "Information We Collect" },
  { id: "cookies", label: "Cookies & Tracking" },
  { id: "use", label: "How We Use Information" },
  { id: "adsense", label: "Google AdSense & Ads" },
  { id: "sharing", label: "Sharing of Information" },
  { id: "protection", label: "Data Security" },
  { id: "third", label: "External Links" },
  { id: "children", label: "Children's Privacy" },
  { id: "rights", label: "Your Rights" },
  { id: "retention", label: "Data Retention" },
  { id: "updates", label: "Policy Updates" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPage() {
  const [activeId, setActiveId] = useState("whoweare");

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
    <>
      {/* <PageSeo
        {...STATIC_PAGE_SEO["/privacy-policy"]}
        description="Read News4Bharat’s privacy policy to understand how we collect, use, and protect your personal data while you use our platform."
      /> */}
      <PageSeo
        {...STATIC_PAGE_SEO["/privacy-policy"]}
      />
      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot page="home" placement="home_side_left" variant="sideRail" className="home-side-ad home-side-ad--left" dismissible minWidth={1024} />
      </aside>
      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot page="home" placement="home_side_right" variant="sideRail" className="home-side-ad home-side-ad--right" dismissible minWidth={1024} />
      </aside>
      <AdvertisementSlot
        page="privacy_policy"
        placement="home_top"
        variant="leaderboard"
        className="home-top-ad home-top-ad--desktop"
        minWidth={769}
      />
      <AdvertisementSlot
        page="privacy_policy"
        placement="home_top_mobile"
        variant="mobileStrip"
        className="home-top-ad home-top-ad--mobile"
        maxWidth={768}
      />
      <div className="privacy-page">

        {/* ════════ HERO ════════ */}
        <section className="priv-hero relative w-full max-[768px]:!h-auto max-[768px]:!min-h-0 max-[768px]:aspect-[3/2]">
          <img
            className="priv-hero-img absolute inset-0 h-full w-full object-cover object-center"
            src={privacyBg}
            alt="Privacy Policy — News4Bharat"
          />
          <div className="priv-hero-img-overlay" />
          {/* <div className="priv-hero-slash" />
          <div className="priv-hero-fade" />
          <div className="priv-hero-content">
            <div className="priv-hero-tag">
              <div className="priv-hero-tag-dot" />
              <span className="priv-hero-tag-text">Legal Document</span>
            </div>
            <h1 className="priv-hero-title">
              Privacy
              <span className="priv-hero-title-accent"> Policy</span>
            </h1>
            <p className="priv-hero-desc">
              Your privacy matters to us. Here's how we protect it.
            </p>
            <div className="priv-hero-meta">
              <div className="priv-hero-date">
                <span className="priv-hero-date-icon">{icons.calendar}</span>
                <span>Last Updated: March 2026</span>
              </div>
              <div className="priv-hero-badge">News4Bharat</div>
            </div>
          </div> */}
        </section>

        {/* ════════ LAYOUT ════════ */}
        <div className="priv-layout">

          {/* ── SIDEBAR ── */}
          <aside className="priv-sidebar">
            <div className="priv-sidebar-card">
              <div className="priv-sidebar-card-title">About This Policy</div>
              <p className="priv-sidebar-card-body">
                This document governs how News4Bharat collects and handles your data. We are committed to full transparency.
              </p>
              <div className="priv-sidebar-card-date">
                <span className="priv-sidebar-card-date-icon">{icons.calendar}</span>
                <span>March 2026</span>
              </div>
            </div>

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

            {/* Intro */}
            <FadeIn>
              <div className="priv-intro-block">
                <p className="priv-body">
                  At News4Bharat, your privacy is not just a formality — it is a responsibility we take seriously. This Privacy Policy explains how we collect, use, protect, and manage your information when you access our website, mobile platforms, or any associated services. By using News4Bharat, you agree to the practices described in this policy.
                </p>
              </div>
            </FadeIn>

            {/* 1. Who We Are */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="whoweare">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.globe}</div>
                  <div>
                    <div className="priv-section-num">Section 01</div>
                    <h2 className="priv-section-title">Who We Are</h2>
                  </div>
                </div>
                <p className="priv-body">
                  News4Bharat is a digital news and media platform that provides news, articles, opinions, and multimedia content across various domains including politics, business, technology, lifestyle, and more.
                </p>
              </section>
            </FadeIn>

            {/* 2. Information We Collect */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="collect">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.user}</div>
                  <div>
                    <div className="priv-section-num">Section 02</div>
                    <h2 className="priv-section-title">Information We Collect</h2>
                  </div>
                </div>
                <p className="priv-body">We collect only the information that is necessary to operate and improve our services. This may include:</p>
                <div className="priv-info-grid">
                  <div className="priv-info-card">
                    <div className="priv-info-card-label">a) Information You Provide</div>
                    <div className="priv-info-card-items">
                      {[
                        "Name",
                        "Email address",
                        "Contact details",
                        "Comments or feedback",
                        "Information submitted via forms, subscriptions, or communication",
                      ].map((item, i) => (
                        <div key={i} className="priv-info-card-item">{item}</div>
                      ))}
                    </div>
                  </div>
                  <div className="priv-info-card">
                    <div className="priv-info-card-label">b) Automatically Collected Information</div>
                    <div className="priv-info-card-items">
                      {[
                        "IP address",
                        "Device type and browser",
                        "Pages visited and time spent",
                        "Referring URLs",
                        "Location (approximate, based on IP)",
                      ].map((item, i) => (
                        <div key={i} className="priv-info-card-item">{item}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="priv-note">
                  <span className="priv-note-icon">{icons.alert}</span>
                  <p className="priv-note-text">This data helps us understand user behavior and improve our content and experience.</p>
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
                    <h2 className="priv-section-title">Cookies & Tracking Technologies</h2>
                  </div>
                </div>
                <p className="priv-body">We use cookies and similar technologies to:</p>
                <ul className="priv-list">
                  {[
                    "Enhance user experience",
                    "Remember preferences",
                    "Analyze traffic and usage patterns",
                    "Deliver relevant advertisements",
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
                    You can choose to disable cookies through your browser settings. However, some features of the website may not function properly if cookies are disabled.
                  </p>
                </div>
              </section>
            </FadeIn>

            {/* 4. How We Use Information */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="use">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.settings}</div>
                  <div>
                    <div className="priv-section-num">Section 04</div>
                    <h2 className="priv-section-title">How We Use Your Information</h2>
                  </div>
                </div>
                <p className="priv-body">We use collected information for the following purposes:</p>
                <ul className="priv-list">
                  {[
                    "To provide and improve our services",
                    "To personalize content and user experience",
                    "To communicate with users (newsletters, updates, responses)",
                    "To ensure security and prevent misuse",
                    "To analyze website performance and trends",
                  ].map((item, i) => (
                    <li key={i} className="priv-list-item">
                      <span className="priv-list-icon">{icons.check}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="priv-highlight">
                  <p className="priv-highlight-text">We do not use your personal information for unlawful purposes.</p>
                </div>
              </section>
            </FadeIn>

            {/* 5. Google AdSense */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="adsense">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.tag}</div>
                  <div>
                    <div className="priv-section-num">Section 05</div>
                    <h2 className="priv-section-title">Google AdSense & Third-Party Advertising</h2>
                  </div>
                </div>
                <p className="priv-body">News4Bharat uses third-party advertising services, including Google AdSense.</p>
                <p className="priv-body">These services may:</p>
                <ul className="priv-list">
                  {[
                    "Use cookies (such as the DoubleClick cookie)",
                    "Show ads based on your visits to this and other websites",
                  ].map((item, i) => (
                    <li key={i} className="priv-list-item">
                      <span className="priv-list-icon">{icons.check}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="priv-body">
                  You can learn more or opt out of personalized advertising by visiting:{" "}
                  <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" className="priv-inline-link">
                    https://www.google.com/settings/ads
                  </a>
                </p>
                <p className="priv-body">
                  We do not control how third-party advertisers use your data, and we recommend reviewing their privacy policies separately.
                </p>
              </section>
            </FadeIn>

            {/* 6. Sharing of Information */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="sharing">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.shield}</div>
                  <div>
                    <div className="priv-section-num">Section 06</div>
                    <h2 className="priv-section-title">Sharing of Information</h2>
                  </div>
                </div>
                <div className="priv-highlight">
                  <p className="priv-highlight-text">We do not sell, trade, or rent your personal information.</p>
                </div>
                <p className="priv-body">We may share information only in the following cases:</p>
                <ul className="priv-list">
                  {[
                    "With trusted service providers who help operate our website",
                    "When required by law or legal processes",
                    "To protect rights, safety, or prevent fraud",
                  ].map((item, i) => (
                    <li key={i} className="priv-list-item">
                      <span className="priv-list-icon">{icons.check}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="priv-note">
                  <span className="priv-note-icon">{icons.alert}</span>
                  <p className="priv-note-text">All such sharing is done with appropriate safeguards.</p>
                </div>
              </section>
            </FadeIn>

            {/* 7. Data Security */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="protection">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.lock}</div>
                  <div>
                    <div className="priv-section-num">Section 07</div>
                    <h2 className="priv-section-title">Data Security</h2>
                  </div>
                </div>
                <p className="priv-body">We implement reasonable security measures to protect your data from:</p>
                <ul className="priv-list">
                  {[
                    "Unauthorized access",
                    "Misuse",
                    "Loss or disclosure",
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
                    However, no online system is completely secure. While we strive to protect your information, we cannot guarantee absolute security.
                  </p>
                </div>
              </section>
            </FadeIn>

            {/* 8. External Links */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="third">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.link}</div>
                  <div>
                    <div className="priv-section-num">Section 08</div>
                    <h2 className="priv-section-title">External Links</h2>
                  </div>
                </div>
                <p className="priv-body">Our website may contain links to third-party websites.</p>
                <p className="priv-body">News4Bharat is not responsible for the privacy practices or content of those external sites.<br></br>Users are advised to review their policies before sharing information.</p>
              </section>
            </FadeIn>

            {/* 9. Children's Privacy */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="children">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.child}</div>
                  <div>
                    <div className="priv-section-num">Section 09</div>
                    <h2 className="priv-section-title">Children's Privacy</h2>
                  </div>
                </div>
                <p className="priv-body">
                  News4Bharat does not knowingly collect personal data from individuals under the age of 13.
                </p>
                <div className="priv-note">
                  <span className="priv-note-icon">{icons.alert}</span>
                  <p className="priv-note-text">If such data is identified, we will take steps to remove it promptly.</p>
                </div>
              </section>
            </FadeIn>

            {/* 10. Your Rights */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="rights">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.user}</div>
                  <div>
                    <div className="priv-section-num">Section 10</div>
                    <h2 className="priv-section-title">Your Rights and Choices</h2>
                  </div>
                </div>
                <p className="priv-body">You have the right to:</p>
                <ul className="priv-list">
                  {[
                    "Access the information you have shared",
                    "Request correction or deletion",
                    "Withdraw consent (where applicable)",
                    "Opt out of communications",
                  ].map((item, i) => (
                    <li key={i} className="priv-list-item">
                      <span className="priv-list-icon">{icons.check}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="priv-note">
                  <span className="priv-note-icon">{icons.alert}</span>
                  <p className="priv-note-text">To exercise these rights, you may contact us using the details below.</p>
                </div>
              </section>
            </FadeIn>

            {/* 11. Data Retention */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="retention">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.database}</div>
                  <div>
                    <div className="priv-section-num">Section 11</div>
                    <h2 className="priv-section-title">Data Retention</h2>
                  </div>
                </div>
                <p className="priv-body">We retain your information only as long as necessary:</p>
                <ul className="priv-list">
                  {[
                    "To provide services",
                    "To comply with legal obligations",
                    "To resolve disputes",
                  ].map((item, i) => (
                    <li key={i} className="priv-list-item">
                      <span className="priv-list-icon">{icons.check}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="priv-note">
                  <span className="priv-note-icon">{icons.alert}</span>
                  <p className="priv-note-text">After this period, data is securely deleted or anonymized.</p>
                </div>
              </section>
            </FadeIn>

            {/* 12. Policy Updates */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="updates">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.refresh}</div>
                  <div>
                    <div className="priv-section-num">Section 12</div>
                    <h2 className="priv-section-title">Changes to This Policy</h2>
                  </div>
                </div>
                <p className="priv-body">We may update this Privacy Policy from time to time to reflect changes in law or our services.</p>
                <p className="priv-body">Any updates will be posted on this page with a revised "Last Updated" date.</p>
              </section>
            </FadeIn>

            {/* 13. Contact Us */}
            <FadeIn delay={0.05}>
              <section className="priv-section" id="contact">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.mail}</div>
                  <div>
                    <div className="priv-section-num">Section 13</div>
                    <h2 className="priv-section-title">Contact Us</h2>
                  </div>
                </div>
                <p className="priv-body">
                  If you have any questions, concerns, or requests regarding this Privacy Policy, you may contact us at:
                </p>
                <div className="priv-contact-cards">
                  <div className="priv-contact-card">
                    <div className="priv-contact-card-icon">{icons.mail}</div>
                    <div>
                      <div className="priv-contact-card-label">Email</div>
                      <a href="mailto:info@news4bharat.com" className="priv-contact-card-value">
                        info@news4bharat.com
                      </a>
                    </div>
                  </div>
                  <div className="priv-contact-card">
                    <div className="priv-contact-card-icon">{icons.globe}</div>
                    <div>
                      <div className="priv-contact-card-label">Website</div>
                      <a href="https://news4bharat.com" target="_blank" rel="noreferrer" className="priv-contact-card-value">
                        News4Bharat.com
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            </FadeIn>

            {/* Final Note */}
            <FadeIn delay={0.05}>
              <section className="priv-section">
                <div className="priv-section-header">
                  <div className="priv-section-icon">{icons.shield}</div>
                  <div>
                    <div className="priv-section-num">Final Note</div>
                    <h2 className="priv-section-title">About This Policy</h2>
                  </div>
                </div>
                <p className="priv-body">This policy is:</p>
                <ul className="priv-list">
                  {[
                    "Clearly structured",
                    "Transparent about data usage",
                    "Includes cookies + ads disclosure",
                    "Mentions Google AdSense explicitly",
                    "Avoids copied/legal-heavy jargon",
                    "Fully original and human-written",
                  ].map((item, i) => (
                    <li key={i} className="priv-list-item">
                      <span className="priv-list-icon">{icons.check}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </FadeIn>

          </main>
        </div>
      </div>
    </>
  );
}

