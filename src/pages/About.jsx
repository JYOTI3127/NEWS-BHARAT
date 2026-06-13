import PageSeo from "../components/PageSeo";
import { STATIC_PAGE_SEO } from "../lib/staticPageSeo";
import AdvertisementSlot from "../components/AdvertisementSlot";
import "../style.css";
import heroBg from "../assets/about-img.jpeg";

const aboutParagraphs = [
  "News4Bharat is an independent digital news platform committed to delivering factual, balanced, and public-interest journalism that reflects the realities, aspirations, and transformation of modern India.",
  "Built on the belief that news should inform, explain, and empower, News4Bharat goes beyond headlines to provide context, analysis, and meaningful storytelling. Our coverage spans national affairs, public policy, governance, business, economy, startups, technology, education, social impact, and emerging trends shaping the future of Bharat.",
  "Our editorial team follows a rigorous process of research, verification, and review to ensure accuracy and credibility. We rely on official documents, government notifications, public records, expert insights, verified data, and trusted sources to produce reliable journalism.",
  "At News4Bharat, our mission is simple: to deliver trustworthy news, responsible reporting, and meaningful stories that help citizens stay informed and engaged.",
];

export default function AboutPage() {
  return (
    <>
      <PageSeo {...STATIC_PAGE_SEO["/about-us"]} />
      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot
          page="home"
          placement="home_side_left"
          variant="sideRail"
          className="home-side-ad home-side-ad--left"
          dismissible
          minWidth={768}
        />
      </aside>
      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot
          page="home"
          placement="home_side_right"
          variant="sideRail"
          className="home-side-ad home-side-ad--right"
          dismissible
          minWidth={768}
        />
      </aside>
      <AdvertisementSlot
        page="about"
        placement="home_top"
        variant="leaderboard"
        className="home-top-ad home-top-ad--desktop"
        minWidth={769}
      />
      <AdvertisementSlot
        page="about"
        placement="home_top_mobile"
        variant="mobileStrip"
        className="home-top-ad home-top-ad--mobile"
        maxWidth={768}
      />

      <main className="about-page">
        <section className="hero">
          <div className="hero-bg" style={{ position: "relative", overflow: "hidden" }}>
            <img
              src={heroBg}
              alt="About News4Bharat"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectPosition: "center",
                zIndex: 0,
              }}
            />
          </div>

          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              <span className="hero-badge-text">About News4Bharat</span>
            </div>
            <h1 className="hero-title">
              News,<span className="hero-title-accent"> As It Is.</span>
            </h1>
            <p className="hero-subtitle">{aboutParagraphs[0]}</p>
          </div>
        </section>

        <section className="who-section">
          <div className="container">
            <div className="who-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
              <article className="who-card-wrapper">
                <div className="who-card">
                  <div className="who-card-text">
                    <h2 className="who-card-title">News4Bharat</h2>
                    {aboutParagraphs.map((paragraph, index) => (
                      <p key={index} className="who-text-body">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
