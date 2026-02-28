import { useState, useEffect, useRef } from "react";
import "./AboutPage.css";

/* ── FADE IN HOOK ── */
const useInView = (threshold = 0.15) => {
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

const FadeIn = ({ children, delay = 0, direction = "up", className = "" }) => {
  const [ref, visible] = useInView();
  const dirClass = { up: "fade-up", left: "fade-left", right: "fade-right", none: "" }[direction];
  return (
    <div
      ref={ref}
      className={`fade-in ${dirClass} ${visible ? "visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

/* ── ICONS ── */
const icons = {
  shield: (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  eye: (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  globe: (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  users: (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  newspaper: (
    <svg width="80" height="80" fill="none" stroke="currentColor" strokeWidth="0.8" viewBox="0 0 24 24">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6z" />
    </svg>
  ),
  scale: (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 3v18M3 9l9-7 9 7M5 21h14" />
      <path d="M3 9l4 7H3l4-7zM21 9l-4 7h4l-4-7z" />
    </svg>
  ),
  target: (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  mic: (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  zap: (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  star: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

/* ── DATA ── */
const stats = [
  { num: "100%", label: "Verified Reporting" },
  { num: "Zero", label: "Paid News" },
  { num: "Multi", label: "Source Attribution" },
  { num: "All", label: "of Bharat Covered" },
];

const pillars = [
  { icon: icons.shield, title: "Clear source attribution", desc: "Every story undergoes rigorous multi-source verification. We prioritize fact-checking over virality." },
  { icon: icons.scale, title: "Ethical Journalism", desc: "We maintain a strict separation between news, opinion, and sponsored content at all times." },
  { icon: icons.eye, title: "Evidence-Based Analysis", desc: "Our journalism is driven by data, documents, and credible sources — never by speculation." },
  { icon: icons.mic, title: "Multi-Perspective Storytelling", desc: "We amplify voices from urban centers, rural regions, and underrepresented communities." },
  { icon: icons.globe, title: "Responsible Digital Publishing", desc: "We understand that journalism influences perception. We seek to be reliable, not just loud." },
  { icon: icons.users, title: "Citizen-First Journalism", desc: "Journalism must serve citizens before institutions. That is our non-negotiable commitment." },
];

const missions = [
  { icon: icons.target, title: "Deliver Accurate & Verified Journalism", desc: "Every story undergoes multi-source verification. We prioritize fact-checking over virality and context over sensationalism." },
  { icon: icons.shield, title: "Strengthen Democratic Discourse", desc: "By presenting balanced perspectives and policy-driven analysis, we aim to elevate public debate and promote informed citizenship." },
  { icon: icons.zap, title: "Combat Misinformation", desc: "In the digital age, misinformation spreads rapidly. News 4 Bharat is committed to identifying false narratives, clarifying misleading claims, and promoting media literacy." },
  { icon: icons.globe, title: "Represent All of Bharat", desc: "India's diversity is its strength. We strive to amplify voices from urban centers, rural regions, and underrepresented communities alike." },
  { icon: icons.globe, title: "Promote Ethical Reporting Standards", desc: "We adhere to principles of fairness, transparency, accountability, and public responsibility in every aspect of reporting." },
  { icon: icons.globe, title: "Provide Context, & Not Just Headlines", desc: "We go beyond breaking news to offer analysis, explainers, background insights, and impact-driven reporting." },
];

const visions = [
  { icon: icons.star, title: "A Credible Digital News Brand", desc: "A platform known for reliability and fact-based reporting, where readers return not for noise — but for clarity." },
  { icon: icons.shield, title: "A Responsible Media Institution", desc: "An organization that sets standards in ethical journalism and transparent digital publishing." },
  { icon: icons.globe, title: "A National Platform with Regional Depth", desc: "While rooted in Bharat's national identity, we aim to provide strong state and grassroots coverage to reflect the true pulse of the country." },
  { icon: icons.mic, title: "A Global Voice of Modern Bharat", desc: "As India's global influence grows, News 4 Bharat aims to present credible narratives to international audiences about the country's progress, challenges, and transformation." },
  { icon: icons.zap, title: "A Future-Ready Newsroom", desc: "By embracing technology, data journalism, multimedia storytelling, and fact-checking systems, we aim to evolve with changing media landscapes without compromising core values." },
];

const differentiators = [
  "Clear source attribution",
  "Transparent corrections policy",
  "No paid news",
  "Clearly labeled sponsored content",
  "Protection of journalistic independence",
  "Respect for privacy and dignity",
];

const editorials = [
  "Clear source attribution",
  "Transparent corrections policy",
  "No paid news",
  "Clearly labeled sponsored content",
  "Protection of journalistic independence",
  "Respect for privacy and dignity",
];

const topics = [
  "National & State Governance",
  "Public Policy & Administration",
  "Bharat's Opinion",
  "Bharat Explainers",
  "States of Bharat",
  "Bharat's Economy & Business",
  "Bharat's Education & Innovation",
  "Bharat's Technology & Digital Transformation",
  "Social Justice & Civic Issues",
  "Culture, Society & Human Interest Stories",
];

const philosophies = [
  "News must inform, not inflame.",
  "Speed must never replace accuracy.",
  "Debate must be rooted in facts.",
  "Journalism must serve citizens before institutions.",
];

/* ── MAIN COMPONENT ── */
export default function AboutPage() {
  return (
    <div className="about-page">

      {/* ════════ HERO BANNER ════════ */}
      <section className="hero">
        <img
          className="hero-img"
          src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1800&q=85&fit=crop"
          alt="News 4 Bharat — Indian journalism newsroom"
        />
        <div className="hero-overlay" />
        <div className="hero-grid-texture" />

        <div className="hero-content">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            <span className="source-sans hero-badge-text">About News 4 Bharat</span>
          </div>

          <h1 className="playfair hero-title">
            News,
            <span className="hero-title-accent"> As It Is.</span>
          </h1>

          <p className="source-sans hero-subtitle">
            News 4 Bharat An independent digital news platform committed to delivering factual, balanced, and public-interest journalism across India.
          </p>

          <div className="hero-tags">
            {["Accurate reporting", "Accurate reporting", "Evidence-based analysis", "Multi-perspective storytelling", "Responsible digital publishing"].map((t, i) => (
              <div key={i} className="source-sans hero-tag">
                <span className="hero-tag-icon">{icons.check}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-fade-bottom" />
      </section>

      {/* ════════ WHO WE ARE ════════ */}
      <section className="who-section">
        <div className="who-grid">
          <FadeIn direction="left">
            <div className="who-card-wrapper">
              <div className="who-card-border" />
              <div className="who-card">
                <div className="who-card-bg-icon">{icons.newspaper}</div>
                <div className="who-card-divider" />
                <h2 className="playfair who-card-title">
We believe journalism is not merely about breaking stories — it is about building understanding.
                </h2>
                {/* <p className="source-sans who-card-body">
News 4 Bharat is a professionally driven newsroom dedicated to
                </p> */}
                <div className="who-card-quote">
                  <p className="playfair who-card-quote-text">
We cover a wide spectrum of issues that shape modern Bharat, including:
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn direction="right">
            <div>
              <span className="source-sans who-text-label">Who We Are</span>
              <h2 className="playfair who-text-title">News 4 Bharat</h2>
              <p className="source-sans who-text-body">
                In an era where information moves faster than verification, and opinions often overshadow facts, News 4 Bharat was founded with a clear purpose: to restore clarity, credibility, and responsibility in news reporting.
              </p>
              <p className="source-sans who-text-body">
             We cover a wide spectrum of issues that shape modern Bharat, including:
              </p>
              <div className="who-topics-list">
                {topics.map((topic, i) => (
                  <div key={i} className="who-topic-item">
                    <div className="who-topic-dot" />
                    <span className="source-sans who-topic-text">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ════════ STATS ════════ */}
      {/* <section className="stats-section">
        <div className="stats-grid">
          {stats.map((s, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div>
                <div className="playfair stat-number">{s.num}</div>
                <div className="source-sans stat-label">{s.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section> */}

      {/* ════════ PHILOSOPHY ════════ */}
      <section className="philosophy-section">
        <div className="philosophy-inner">
          <FadeIn>
            <div className="section-header">
              <span className="source-sans section-label">Our Philosophy</span>
              <h2 className="playfair section-title">We maintain a strict separation between news, opinion, and sponsored content. Transparency and accountability are not optional for us — they are foundational</h2>
              <div className="section-divider" />
            </div>
          </FadeIn>
          <div className="philosophy-grid">
            {philosophies.map((p, i) => (
              <FadeIn key={i} delay={i * 0.12}>
                <div className="philosophy-card">
                  <div className="philosophy-icon">{icons.star}</div>
                  <p className="playfair philosophy-text">{p}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>



      {/* ════════ MISSION ════════ */}
      <section className="mission-section">
        <div className="mission-inner">
          <FadeIn>
            <div className="section-header">
              <span className="source-sans section-label">Our Mission</span>
              <h2 className="playfair section-title">Our mission is to build a trusted, transparent, and responsible news ecosystem that empowers citizens with verified information.</h2>
              <p className="source-sans section-subtitle">
                Specifically, we aim to:
              </p>
            </div>
          </FadeIn>
          <div className="mission-grid">
            {missions.map((m, i) => (
              <FadeIn key={i} delay={i * 0.12} direction={i % 2 === 0 ? "left" : "right"}>
                <div className="mission-card">
                  <div className="mission-icon-wrap">{m.icon}</div>
                  <div>
                    <h3 className="playfair mission-title">{m.title}</h3>
                    <p className="source-sans mission-desc">{m.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ VISION ════════ */}
      <section className="vision-section">
        <div className="vision-texture" />
        <div className="vision-inner">
          <FadeIn>
            <div className="section-header">
              <span className="source-sans section-label">Our Vision</span>
              <h2 className="playfair section-title">Our vision is to become one of India’s most respected and trusted digital news platforms — recognized for integrity, independence, and fearless journalism.</h2>
              <div className="section-divider" />
            </div>
          </FadeIn>
          <div className="vision-grid">
            {visions.map((v, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div className="vision-card">
                  <div className="vision-card-icon">{v.icon}</div>
                  <h3 className="playfair vision-card-title">{v.title}</h3>
                  <p className="source-sans vision-card-desc">{v.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

                  {/* ════════ SIX PILLARS ════════ */}
      <section className="pillars-section">
        <div className="pillars-inner">
          <FadeIn>
            <div className="section-header">
              <span className="source-sans section-label">Our Editorial Commitments</span>
              <h2 className="playfair section-title">At News 4 Bharat, we commit to:</h2>
              <div className="section-divider" />
            </div>
          </FadeIn>
          <div className="pillars-grid">
            {pillars.map((p, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="pillar-card">
                  <div className="pillar-icon-wrap">{p.icon}</div>
                  <h3 className="playfair pillar-title">{p.title}</h3>
                  <p className="source-sans pillar-desc">{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ WHAT MAKES US DIFFERENT ════════ */}
      <section className="different-section">
        <div className="different-inner">

          {/* Header Row — Title left, tagline right */}
          <FadeIn>
            <div className="different-header">
              <div className="different-header-left">
                <span className="source-sans different-label">Our Editorial Commitments</span>
                <h2 className="playfair different-title">
                  At News 4 Bharat, we commit to:
                </h2>
              </div>
            </div>
          </FadeIn>

          {/* 5 Numbered Cards in a row */}
          <FadeIn delay={0.1}>
            <div className="diff-list">
              {differentiators.map((d, i) => (
                <div key={i} className="diff-item">
                  <div className="playfair diff-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="diff-icon">{icons.check}</div>
                  <span className="source-sans diff-text">{d}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Bottom Statement Bar */}
          <FadeIn delay={0.2}>
            <div className="different-statement">
              <div className="different-statement-icon">{icons.star}</div>
              <p className="source-sans different-statement-text">
                Trust is earned daily — and we strive to earn it with every story we publish.
              </p>
            </div>
          </FadeIn>

        </div>
      </section>

      {/* ════════ EDITORIAL COMMITMENTS ════════ */}
      <section className="editorial-section">
        <div className="editorial-inner">
          <FadeIn>
            <span className="source-sans section-label">Our Responsibility</span>
            <h2 className="playfair section-title">We understand that journalism influences perception, public discourse, and policy conversations. With that responsibility comes discipline.</h2>
            <p className="source-sans section-subtitle">
              We do not seek to be the loudest platform.
              We seek to be one of the most reliable.
            </p>
          </FadeIn>
          <div className="editorial-grid">
            {editorials.map((e, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="editorial-card">
                  <div className="editorial-icon">{icons.check}</div>
                  <span className="source-sans editorial-text">{e}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>





    </div>
  );
}