import { useState, useEffect, useRef } from "react";
import { FiCheck, FiMinus, FiFeather, FiEdit3 } from "react-icons/fi";
import PageSeo from "../components/PageSeo";
import { STATIC_PAGE_SEO } from "../lib/staticPageSeo";
import AdvertisementSlot from "../components/AdvertisementSlot";
import "../style.css";
import founderBg from "../assets/founder-img.png";

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
  const delayClass = `delay-[${delay}s]`;
  return (
    <div
      ref={ref}
      className={`fn-fade-in ${dirClass} ${visible ? "fn-visible" : ""} ${delayClass} ${className}`}
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
    <>
      {/* <PageSeo
        title="Founder’s Note | Vision Behind News4Bharat"
        description="Read the founder’s note to understand the vision, purpose, and inspiration behind launching News4Bharat."
        keywords="founder message news website, News4Bharat vision, founder story India media"
        path="/founders-note"
      /> */}
      <PageSeo
        {...STATIC_PAGE_SEO["/founders-note"]}
      />
      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot page="home" placement="home_side_left" variant="sideRail" className="home-side-ad home-side-ad--left" dismissible minWidth={1024} />
      </aside>
      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot page="home" placement="home_side_right" variant="sideRail" className="home-side-ad home-side-ad--right" dismissible minWidth={1024} />
      </aside>
      <AdvertisementSlot page="founders_note" placement="home_top" variant="leaderboard" className="home-top-ad home-top-ad--desktop" minWidth={769} />
      <AdvertisementSlot page="founders_note" placement="home_top_mobile" variant="mobileStrip" className="home-top-ad home-top-ad--mobile" maxWidth={768} />
      <div className="fn-page">

        {/* ══════════ HERO BANNER ══════════ */}
        <section className="fn-hero relative w-full max-[768px]:!h-auto max-[768px]:!min-h-0 max-[768px]:aspect-[3/2]">

          {/* Background image + gradient overlay via CSS */}
          <img
            src={founderBg}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
          />
          <div className="fn-hero-overlay max-[425px]:hidden" />
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
                    <p className="fn-founder-role">News4Bharat</p>
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
                    When I started News4Bharat, the goal was simple — restore audiences faith in news.
                  </p>
                </FadeIn>

                <FadeIn direction="up" delay={0.18}>
                  <p className="fn-body">
                    In a time when speed often overtakes accuracy, when headlines shout louder than facts, and when opinions blur into reporting, the need for responsible journalism has never been greater.
                  </p>
                </FadeIn>

                <FadeIn direction="up" delay={0.24}>
                  <p className="fn-body">
                    News4Bharat was born from a belief that journalism must serve the public — not power, not propaganda, not profit alone.
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
                  <p className="fn-body">We may not always be the loudest voice in the room. But we aim to be one of the most reliable.</p>
                  <p className="fn-body">Trust is earned daily. And we intend to earn it every single day.</p>
                </FadeIn>

                <FadeIn direction="up" delay={0.48}>
                  <p className="fn-thankyou">Thank you for being part of this journey.</p>
                  <div className="fn-signature">
                    <span className="fn-sig-icon"><FiMinus size={16} /></span>
                    <span className="fn-sig-text">Srajan Agarwal, Founder, News4Bharat</span>
                  </div>
                </FadeIn>

              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
