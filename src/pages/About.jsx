import { useState, useEffect, useRef } from "react";
import PageSeo from "../components/PageSeo";
import { STATIC_PAGE_SEO } from "../lib/staticPageSeo";
import AdvertisementSlot from "../components/AdvertisementSlot";
import "../style.css";
import heroBg from "../assets/about-img.jpeg";

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
  const delayClass = `delay-[${delay}s]`;
  return (
    <div ref={ref} className={`fade-in ${dirClass} ${visible ? "visible" : ""} ${delayClass} ${className}`}>
      {children}
    </div>
  );
};

/* ── SVG ICONS ONLY ── */
const icons = {
  shield: (<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  globe: (<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>),
  check: (<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>),
  newspaper: (<svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="0.9" viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6z" /></svg>),
  target: (<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>),
  mic: (<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>),
  zap: (<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>),
  star: (<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>),
  book: (<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>),
  award: (<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>),
};

/* ── DATA ── */
const pillars = [
  { title: "Clear source attribution" },
  { title: "Transparent corrections policy" },
  { title: "No paid news" },
  { title: "Clearly labeled sponsored content" },
  { title: "Protection of journalistic independence" },
  { title: "Respect for privacy and dignity" },
];

const missions = [
  { icon: icons.target, title: "Deliver Accurate & Verified Journalism", desc: "Every story undergoes multi-source verification. We prioritize fact-checking over virality and context over sensationalism." },
  { icon: icons.shield, title: "Strengthen Democratic Discourse", desc: "By presenting balanced perspectives and policy-driven analysis, we aim to elevate public debate and promote informed citizenship." },
  { icon: icons.zap, title: "Combat Misinformation", desc: "In the digital age, misinformation spreads rapidly. News4Bharat is committed to identifying false narratives, clarifying misleading claims, and promoting media literacy." },
  { icon: icons.globe, title: "Represent All of Bharat", desc: "India's diversity is its strength. We strive to amplify voices from urban centers, rural regions, and underrepresented communities alike." },
  { icon: icons.award, title: "Promote Ethical Reporting Standards", desc: "We adhere to principles of fairness, transparency, accountability, and public responsibility in every aspect of reporting." },
  { icon: icons.book, title: "Provide Context, & Not Just Headlines", desc: "We go beyond breaking news to offer analysis, explainers, background insights, and impact-driven reporting." },
];

const visions = [
  { icon: icons.star, title: "A Credible Digital News Brand", desc: "A platform known for reliability and fact-based reporting, where readers return not for noise — but for clarity." },
  { icon: icons.shield, title: "A Responsible Media Institution", desc: "An organization that sets standards in ethical journalism and transparent digital publishing." },
  { icon: icons.globe, title: "A National Platform with Regional Depth", desc: "While rooted in Bharat's national identity, we aim to provide strong state and grassroots coverage to reflect the true pulse of the country." },
  { icon: icons.mic, title: "A Global Voice of Modern Bharat", desc: "As India's global influence grows, News4Bharat aims to present credible narratives to international audiences about the country's progress, challenges, and transformation." },
  { icon: icons.zap, title: "A Future-Ready Newsroom", desc: "By embracing technology, data journalism, multimedia storytelling, and fact-checking systems, we aim to evolve with changing media landscapes without compromising core values." },
];

const differentiators = [
  "Fact-Checked Reporting",
  "Clear Source Attribution",
  "Balanced Perspective",
  "Responsible Headlines",
  "Zero Tolerance for Fake News",
];

const editorialPhilosophy = [
  "Multi-source verification before publishing.",
  "Clear distinction between news and opinion.",
  "Corrections policy for factual errors.",
  "No paid news.",
  "Transparent disclosure of sponsored content.",
];

const topics = [
  "National & State Governance",
  "Public Policy & Administration",
  "Bharat's Opinion",
  "Bharat Explainers",
  "States of Bharat",
  "Bharat in Numbers",
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

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function AboutPage() {
  return (
    <>
      <PageSeo
        {...STATIC_PAGE_SEO["/about-us"]}
      />
      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot page="home" placement="home_side_left" variant="sideRail" className="home-side-ad home-side-ad--left" dismissible minWidth={768} />
      </aside>
      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot page="home" placement="home_side_right" variant="sideRail" className="home-side-ad home-side-ad--right" dismissible minWidth={768} />
      </aside>
      <AdvertisementSlot page="about" placement="home_top" variant="leaderboard" className="home-top-ad home-top-ad--desktop" minWidth={769} />
      <AdvertisementSlot page="about" placement="home_top_mobile" variant="mobileStrip" className="home-top-ad home-top-ad--mobile" maxWidth={768} />
      <div className="about-page">

        {/* ══════════ HERO ══════════ */}
        <section className="hero">
          <div className="hero-bg" style={{ position: "relative", overflow: "hidden" }}>

            {/* Background Image */}
            <img
              src={heroBg}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                // objectFit: "cover",
                objectPosition: "center",
                zIndex: 0,
              }}
            />
          </div>{/* ← hero-bg band */}

          <div className="hero-content">
            <FadeIn direction="none" delay={0.1}>
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                <span className="hero-badge-text">About News4Bharat</span>
              </div>
            </FadeIn>
            <FadeIn direction="up" delay={0.2}>
              <h1 className="hero-title">News,<span className="hero-title-accent"> As It Is.</span></h1>
            </FadeIn>
            <FadeIn direction="up" delay={0.3}>
              <p className="hero-subtitle">
                News4Bharat — An independent digital news platform committed to delivering factual, balanced, and public-interest journalism across India.
              </p>
            </FadeIn>
            <FadeIn direction="up" delay={0.4}>
              <div className="hero-tags">
                {["Accurate reporting", "Ethical journalism", "Evidence-based analysis", "Multi-perspective storytelling", "Responsible digital publishing"].map((t, i) => (
                  <div key={i} className="hero-tag">
                    <span className="hero-tag-icon">{icons.check}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ══════════ WHO WE ARE ══════════ */}
        <section className="who-section">
          <div className="container">
            <div className="who-grid">
              <FadeIn direction="left">
                <div className="who-card-wrapper">
                  <div className="who-card">

                    {/* Image Top */}
                    <div className="who-card-image">
                      <img
                        src="https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80"
                        alt="Newspaper concept"
                      />
                    </div>

                    {/* Text Bottom */}
                    <div className="who-card-text">
                      <div className="who-card-bg-icon">{icons.newspaper}</div>

                      <h2 className="who-card-title">
                        We believe journalism is not merely about breaking stories —
                        it is about building understanding.
                      </h2>
                    </div>

                  </div>
                </div>
              </FadeIn>
              <FadeIn direction="right">
                <div>
                  <span className="section-label">Who We Are</span>
                  <h2 className="who-text-title">News4Bharat</h2>
                  <p className="who-text-body">In an era where information moves faster than verification, and opinions often overshadow facts, News4Bharat was founded with a clear purpose: to restore clarity, credibility, and responsibility in news reporting.</p>
                  <p className="who-text-body">We cover a wide spectrum of issues that shape modern Bharat, including:</p>
                  <div className="topics-grid">
                    {topics.map((topic, i) => (
                      <div key={i} className="topic-item">
                        <div className="topic-dot" />
                        <span>{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ══════════ PHILOSOPHY ══════════ */}
        <section className="philosophy-section">
          <div className="container">
            <FadeIn>
              <div className="section-header center">
                <span className="section-label">Our Philosophy</span>
                <h2 className="section-title">We maintain a strict separation between news, opinion, and sponsored content. Transparency and accountability are not optional for us — they are foundational</h2>
                <div className="section-divider" />
              </div>
            </FadeIn>
            <div className="philosophy-grid">
              {philosophies.map((p, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="philosophy-card">
                    <div className="philo-num">{String(i + 1).padStart(2, "0")}</div>
                    <p className="philosophy-text">{p}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ MISSION ══════════ */}
        <section className="mission-section">
          <div className="container">
            <FadeIn>
              <div className="section-header center">
                <span className="section-label">Our Mission</span>
                <h2 className="section-title">Our mission is to build a trusted, transparent, and responsible news ecosystem that empowers citizens with verified information.</h2>
                <p className="section-subtitle">Specifically, we aim to:</p>
              </div>
            </FadeIn>
            <div className="mission-grid">
              {missions.map((m, i) => (
                <FadeIn key={i} delay={i * 0.1} direction={i % 2 === 0 ? "left" : "right"}>
                  <div className="mission-card">
                    <div className="mission-icon-wrap">{m.icon}</div>
                    <div>
                      <h3 className="mission-title">{m.title}</h3>
                      <p className="mission-desc">{m.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ VISION ══════════ */}
        <section className="vision-section">
          <div className="container">
            <FadeIn>
              <div className="section-header center">
                <span className="section-label">Our Vision</span>
                <h2 className="section-title">Our vision is to become one of India's most respected and trusted digital news platforms — recognized for integrity, independence, and fearless journalism.</h2>
                <div className="section-divider" />
              </div>
            </FadeIn>
            <div className="vision-grid">
              {visions.slice(0, 3).map((v, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="vision-card">
                    <div className="vision-icon">{v.icon}</div>
                    <h3 className="vision-title">{v.title}</h3>
                    <p className="vision-desc">{v.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
            <div className="vision-grid-bottom">
              {visions.slice(3).map((v, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="vision-card">
                    <div className="vision-icon">{v.icon}</div>
                    <h3 className="vision-title">{v.title}</h3>
                    <p className="vision-desc">{v.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ EDITORIAL COMMITMENTS ══════════ */}
        <section className="pillars-section">
          <div className="container">
            <FadeIn>
              <div className="section-header center">
                <span className="section-label">Our Editorial Commitments</span>
                <h2 className="section-title">At News4Bharat, we commit to:</h2>
                <div className="section-divider" />
              </div>
            </FadeIn>
            <div className="pillars-grid">
              {pillars.map((p, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div className="pillar-card">
                    <div className="pillar-check">{icons.check}</div>
                    <span className="pillar-title">{p.title}</span>
                  </div>
                </FadeIn>
              ))}
            </div>
            <FadeIn delay={0.3}>
              <div className="tagline-bar">
                <span className="tagline-bar-icon">{icons.star}</span>
                <p className="tagline-bar-text">Trust is earned daily — and we strive to earn it with every story we publish.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ══════════ OUR RESPONSIBILITY ══════════ */}
        <section className="responsibility-section">
          <div className="container">
            <FadeIn>
              <div className="responsibility-layout">
                <div className="responsibility-left">
                  <span className="section-label">Our Responsibility</span>
                  <h2 className="responsibility-heading">
                    We understand that journalism influences perception, public discourse, and policy conversations. With that responsibility comes discipline.
                  </h2>
                </div>
                <div className="responsibility-right">
                  <div className="resp-point">
                    <span className="resp-num">01</span>
                    <p className="resp-text">We do not seek to be the loudest platform.</p>
                  </div>
                  <div className="resp-divider" />
                  <div className="resp-point">
                    <span className="resp-num">02</span>
                    <p className="resp-text">We seek to be one of the most reliable.</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ══════════ WHAT MAKES US DIFFERENT ══════════ */}
        <section className="different-section">
          <div className="container">
            <FadeIn>
              <div className="section-header left">
                <span className="section-label">What Makes Us Different</span>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="diff-grid">
                {differentiators.slice(0, 4).map((d, i) => (
                  <div key={i} className="diff-card">
                    <div className="diff-num">{String(i + 1).padStart(2, "0")}</div>
                    <div className="diff-icon">{icons.check}</div>
                    <span className="diff-text">{d}</span>
                  </div>
                ))}
              </div>
              <div className="diff-grid-bottom">
                {differentiators.slice(4).map((d, i) => (
                  <div key={i} className="diff-card">
                    <div className="diff-num">{String(i + 5).padStart(2, "0")}</div>
                    <div className="diff-icon">{icons.check}</div>
                    <span className="diff-text">{d}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="tagline-bar">
                <span className="tagline-bar-icon">{icons.star}</span>
                <p className="tagline-bar-text">We do not chase sensationalism. We pursue substance.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ══════════ EDITORIAL PHILOSOPHY ══════════ */}
        <section className="ephilosophy-section">
          <div className="container">
            <FadeIn>
              <div className="section-header center">
                <span className="section-label">Our Editorial Philosophy</span>
                <h2 className="section-title">At News4Bharat, we follow:</h2>
                <div className="section-divider" />
              </div>
            </FadeIn>
            <div className="ephilosophy-list">
              {editorialPhilosophy.slice(0, 4).map((item, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div className="ephilosophy-item">
                    <span className="ephilosophy-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ephilosophy-icon">{icons.check}</span>
                    <span className="ephilosophy-text">{item}</span>
                  </div>
                </FadeIn>
              ))}
            </div>
            <div className="ephilosophy-list-bottom">
              {editorialPhilosophy.slice(4).map((item, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div className="ephilosophy-item">
                    <span className="ephilosophy-num">{String(i + 5).padStart(2, "0")}</span>
                    <span className="ephilosophy-icon">{icons.check}</span>
                    <span className="ephilosophy-text">{item}</span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ CONTACT CTA ══════════ */}
        <section className="contact-cta-section">
          <div className="container">
            <FadeIn direction="up">
              <div className="contact-cta-box">
                <span className="section-label">Get In Touch</span>
                <h2 className="contact-cta-title">Have a story tip, feedback, or query?</h2>
                <p className="contact-cta-sub">We'd love to hear from you. Reach out to the News4Bharat team directly.</p>
                <a href="/contact-us" className="contact-cta-btn">
                  Contact Us →
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

      </div>
    </>
  );
}
