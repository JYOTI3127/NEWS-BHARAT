import { useState, useEffect, useRef } from "react";
import { FiCheck, FiMinus, FiFeather, FiEdit3 } from "react-icons/fi";
import "./FoundersNote.css";

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
  const dirClass = {
    up: "fn-fade-up",
    left: "fn-fade-left",
    right: "fn-fade-right",
    none: "",
  }[direction];
  return (
    <div
      ref={ref}
      className={`fn-fade-in ${dirClass} ${visible ? "fn-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

const commitments = [
  "Verified before published",
  "Balanced before amplified",
  "Responsible before viral",
];

export default function FoundersNote() {
  return (
    <div className="fn-page">

      {/* ══════════ HERO BANNER ══════════ */}
      <section className="fn-hero">

        {/* Background image + gradient overlay via CSS */}
        <div className="fn-hero-overlay" />




        <div className="fn-hero-container">

          {/* Left — main text */}
          <div className="fn-hero-left">

            <FadeIn direction="none" delay={0.1}>
              <div className="fn-hero-eyebrow">
                <span className="fn-eyebrow-icon"><FiEdit3 size={12} /></span>
                <span className="fn-eyebrow-text">A Personal Message</span>
              </div>
            </FadeIn>

            <FadeIn direction="left" delay={0.2}>
              <h1 className="fn-hero-title">
                Founder's
                <span className="fn-hero-title-accent"> Note.</span>
              </h1>
            </FadeIn>

            <FadeIn direction="left" delay={0.3}>
              <p className="fn-hero-quote">
                "Restore audiences' faith in news."
              </p>
            </FadeIn>

            <FadeIn direction="left" delay={0.38}>
              <p className="fn-hero-desc">
                Why News 4 Bharat was built — and what we stand for, every single day.
              </p>
            </FadeIn>

            <FadeIn direction="none" delay={0.46}>
              <div className="fn-hero-pills">
                {["Accuracy over speed", "Facts over opinions", "Public over power"].map((t, i) => (
                  <span key={i} className="fn-hero-pill">
                    <FiCheck size={11} strokeWidth={3} />
                    {t}
                  </span>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right — founder card */}
          <div className="fn-hero-right">

          </div>

        </div>
      </section>

      {/* ══════════ CONTENT SECTION ══════════ */}
      <section className="fn-section">
        <div className="fn-container">
          <div className="fn-layout">

            {/* Left sticky panel */}
            <FadeIn direction="left">
              <div className="fn-left">
                <span className="fn-label">A Message</span>
                <h2 className="fn-heading">Founder's Note</h2>
                <div className="fn-heading-divider" />

                <div className="fn-founder-card">
                  <div className="fn-card-top-bar" />
                  <div className="fn-card-icon">
                    <FiFeather size={22} strokeWidth={1.5} />
                  </div>
                  <p className="fn-founder-name">Founder</p>
                  <p className="fn-founder-role">News 4 Bharat</p>
                  <div className="fn-founder-tag">
                    <span className="fn-founder-dot" />
                    <span className="fn-founder-tag-text">Independent Media</span>
                  </div>
                </div>

                <div className="fn-side-note">
                  <p className="fn-side-note-text">
                    Journalism must serve the public — not power, not propaganda, not profit alone.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Right content */}
            <div className="fn-right">

              <FadeIn direction="right" delay={0.1}>
                <p className="fn-opening">
                  When I started News 4 Bharat, the goal was simple — restore audiences faith in news.
                </p>
              </FadeIn>

              <FadeIn direction="up" delay={0.18}>
                <p className="fn-body">
                 In a time when speed often overtakes accuracy, when headlines shout louder than facts, and when opinions blur into reporting, the need for responsible journalism has never been greater.
                </p>
              </FadeIn>

              <FadeIn direction="up" delay={0.24}>
                <p className="fn-body">
                News 4 Bharat was born from a belief that journalism must serve the public — not power, not propaganda, not profit alone.
                </p>
              </FadeIn>

              <FadeIn direction="up" delay={0.3}>
                <div className="fn-commitments">
                  <p className="fn-commitments-label">We are committed to reporting that is:</p>
                  {commitments.map((item, i) => (
                    <div key={i} className="fn-commitment-item">
                      <span className="fn-commitment-icon">
                        <FiCheck size={13} strokeWidth={3} />
                      </span>
                      <span className="fn-commitment-text">{item}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>

              <FadeIn direction="up" delay={0.36}>
                <p className="fn-body">
India is evolving rapidly — economically, technologically, socially. This transformation deserves journalism that is thoughtful, rigorous, and grounded.
                </p>
                <p className ="fn-body">We may not always be the loudest voice in the room. But we aim to be one of the most reliable.</p>
                <p className="fn-body">Trust is earned daily. And we intend to earn it every single day.</p> 
              </FadeIn>

              <FadeIn direction="up" delay={0.48}>
                <p className="fn-thankyou">Thank you for being part of this journey.</p>
                <div className="fn-signature">
                  <span className="fn-sig-icon"><FiMinus size={16} /></span>
                  <span className="fn-sig-text">Founder, News 4 Bharat</span>
                </div>
              </FadeIn>

            </div>
          </div>
        </div>
      </section>

    </div>
  );
}