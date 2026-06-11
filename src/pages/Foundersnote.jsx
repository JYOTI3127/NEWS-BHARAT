import PageSeo from "../components/PageSeo";
import { STATIC_PAGE_SEO } from "../lib/staticPageSeo";
import AdvertisementSlot from "../components/AdvertisementSlot";
import "../style.css";
import founderBg from "../assets/founder-img.png";

const founderNoteParagraphs = [
  "News4Bharat was created with a simple yet important belief: citizens deserve news that prioritizes facts over noise, context over sensationalism, and public interest over clicks.",
  "In a rapidly evolving information environment, our objective is not only to report events but also to explain their significance and impact on people's lives. We believe journalism should empower citizens with knowledge, encourage informed discussions, and strengthen democratic values.",
  "Every story published on News4Bharat is guided by our commitment to accuracy, fairness, transparency, and accountability. We continuously strive to build a platform that readers can trust.",
  "Thank you for being part of our journey.",
];

export default function FoundersNote() {
  return (
    <>
      <PageSeo {...STATIC_PAGE_SEO["/founders-note"]} />
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
        page="founders_note"
        placement="home_top"
        variant="leaderboard"
        className="home-top-ad home-top-ad--desktop"
        minWidth={769}
      />
      <AdvertisementSlot
        page="founders_note"
        placement="home_top_mobile"
        variant="mobileStrip"
        className="home-top-ad home-top-ad--mobile"
        maxWidth={768}
      />

      <main className="fn-page">
        <section className="fn-hero relative w-full max-[768px]:!h-auto max-[768px]:!min-h-0 max-[768px]:aspect-[3/2]">
          <img
            src={founderBg}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
          />
          <div className="fn-hero-overlay max-[425px]:hidden" />
        </section>

        <section className="fn-section">
          <div className="fn-container">
            <article className="fn-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
              <div className="fn-right">
                <span className="fn-label">Founder&apos;s Note</span>
                <h1 className="fn-heading">Founder&apos;s Note</h1>
                <div className="fn-heading-divider" />

                {founderNoteParagraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className={index === 0 ? "fn-opening" : "fn-body"}
                  >
                    {paragraph}
                  </p>
                ))}

                <div className="fn-signature">
                  <span className="fn-sig-text">
                    Founder,
                    <br />
                    Srajan Agarwal
                    <br />
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
