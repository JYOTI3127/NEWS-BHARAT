import PageSeo from "../components/PageSeo";
import AdvertisementSlot from "../components/AdvertisementSlot";
import { STATIC_PAGE_SEO } from "../lib/staticPageSeo";
import "../style.css";
import editorialBg from "../assets/editorial-policy.png";

const policySections = [
  {
    title: "Accuracy and Verification",
    body: "We strive to ensure that all information published on News4Bharat is accurate and verified before publication. Our editorial team relies on official documents, government notifications, regulatory filings, court records, expert sources, verified data, and credible public information wherever possible.",
  },
  {
    title: "Editorial Independence",
    body: "News4Bharat maintains editorial independence. Editorial decisions are made without influence from advertisers, sponsors, political organizations, or external parties.",
  },
  {
    title: "Transparency",
    body: "We aim to provide context, source attribution, and relevant references whenever appropriate. If information is updated after publication, we make reasonable efforts to reflect those updates accurately.",
  },
  {
    title: "Corrections",
    body: "Despite our editorial processes, errors may occasionally occur. When factual inaccuracies are identified, we review the matter and make necessary corrections promptly. Readers may report errors by contacting our editorial team at editorial@news4bharat.com.",
  },
  {
    title: "Sponsored and Branded Content",
    body: "Sponsored content, advertising, paid partnerships, or promotional material will be clearly identified and distinguished from editorial content.",
  },
  {
    title: "AI-Assisted Content",
    body: "News4Bharat may use artificial intelligence tools for research assistance, formatting, language refinement, transcription, and content workflows. All published content is reviewed by human editors before publication.",
  },
  {
    title: "Reader Feedback",
    body: "We welcome feedback from readers and encourage constructive communication regarding our reporting, editorial standards, and published content. Our commitment remains focused on accuracy, accountability, transparency, and responsible journalism.",
  },
];

export default function EditorialPolicy() {
  return (
    <>
      <PageSeo {...STATIC_PAGE_SEO["/editorial-policy"]} />
      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot
          page="home"
          placement="home_side_left"
          variant="sideRail"
          className="home-side-ad home-side-ad--left"
          dismissible
          minWidth={1024}
        />
      </aside>
      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot
          page="home"
          placement="home_side_right"
          variant="sideRail"
          className="home-side-ad home-side-ad--right"
          dismissible
          minWidth={1024}
        />
      </aside>
      <AdvertisementSlot
        page="editorial_policy"
        placement="home_top"
        variant="leaderboard"
        className="home-top-ad home-top-ad--desktop"
        minWidth={769}
      />
      <AdvertisementSlot
        page="editorial_policy"
        placement="home_top_mobile"
        variant="mobileStrip"
        className="home-top-ad home-top-ad--mobile"
        maxWidth={768}
      />

      <main className="ep-page">
        <section className="ep-hero relative w-full max-[768px]:!h-auto max-[768px]:!min-h-0 max-[768px]:aspect-[3/2]">
          <img
            src={editorialBg}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
          />
          <div className="ep-hero-overlay" />
        </section>

        <section className="ep-section ep-policy-section">
          <div className="ep-container">
            <div className="ep-section-header">
              <span className="ep-label">Editorial Policy</span>
              <h1 className="ep-section-title">Our Editorial Policy</h1>
              <div className="ep-section-divider" />
            </div>

            <article
              style={{
                background: "#fff",
                border: "1px solid #e7eaf0",
                borderRadius: 16,
                boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
                width: "100%",
                margin: 0,
                padding: "clamp(20px, 3vw, 40px)",
              }}
            >
              <p
                style={{
                  color: "#334155",
                  fontSize: "clamp(17px, 1.6vw, 21px)",
                  lineHeight: 1.8,
                  margin: "0 0 28px",
                }}
              >
                At News4Bharat, our editorial mission is to provide accurate,
                balanced, independent, and public-interest journalism that informs
                and empowers readers.
              </p>

              {policySections.map((section) => (
                <section
                  key={section.title}
                  style={{
                    borderTop: "1px solid #edf0f5",
                    paddingTop: 24,
                    marginTop: 24,
                  }}
                >
                  <h2
                    style={{
                      color: "#071b4d",
                      fontSize: "clamp(22px, 2.2vw, 30px)",
                      fontWeight: 800,
                      lineHeight: 1.25,
                      margin: "0 0 10px",
                    }}
                  >
                    {section.title}
                  </h2>
                  <p
                    style={{
                      color: "#475569",
                      fontSize: "clamp(16px, 1.4vw, 19px)",
                      lineHeight: 1.8,
                      margin: 0,
                    }}
                  >
                    {section.body}
                  </p>
                </section>
              ))}
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
