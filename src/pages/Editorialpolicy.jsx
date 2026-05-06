import { useState, useEffect, useRef } from "react";
import { FiCheck, FiShield, FiEye, FiUsers, FiAlertCircle, FiHeart, FiRefreshCw, FiSearch, FiFileText, FiMail } from "react-icons/fi";
import PageSeo from "../components/PageSeo";
import AdvertisementSlot from "../components/AdvertisementSlot";
import { STATIC_PAGE_SEO } from "../lib/staticPageSeo";
import "../style.css";
import editorialBg from "../assets/editorial-policy.png";

/* ── FADE IN HOOK ── */
const useInView = (threshold = 0.12) => {
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
    const dirClass = { up: "ep-fade-up", left: "ep-fade-left", right: "ep-fade-right", none: "" }[direction];
    const delayClass = `delay-[${delay}s]`;
    return (
        <div ref={ref} className={`ep-fade-in ${dirClass} ${visible ? "ep-visible" : ""} ${delayClass} ${className}`}>
            {children}
        </div>
    );
};

/* ── DATA ── */
const policyItems = [
    {
        num: "01",
        icon: <FiCheck size={22} strokeWidth={2} />,
        title: "Accuracy & Verification",
        points: [
            "All factual information must be verified through credible and reliable sources.",
            "We prioritize primary sources, official data, and on-record statements.",
            "Anonymous sources are used only when necessary and with editorial approval.",
            "Headlines must reflect the content accurately and avoid sensationalism.",
        ],
    },
    {
        num: "02",
        icon: <FiShield size={22} strokeWidth={2} />,
        title: "Independence",
        points: [
            "Editorial decisions are made independently of advertisers, sponsors, political entities, or external pressures.",
            "No advertiser or sponsor influences newsroom coverage.",
            "Sponsored content is clearly labeled.",
        ],
    },
    {
        num: "03",
        icon: <FiUsers size={22} strokeWidth={2} />,
        title: "Fairness & Balance",
        points: [
            "We aim to present multiple perspectives on significant issues.",
            "Individuals or organizations facing allegations are given an opportunity to respond.",
            "Opinion pieces are clearly distinguished from news reports.",
        ],
    },
    {
        num: "04",
        icon: <FiAlertCircle size={22} strokeWidth={2} />,
        title: "Conflict of Interest",
        points: [
            "Journalists must disclose any personal, financial, or professional relationships that may affect impartiality.",
            "Staff members are prohibited from accepting gifts, favors, or benefits that may compromise editorial independence.",
        ],
    },
    {
        num: "05",
        icon: <FiHeart size={22} strokeWidth={2} />,
        title: "Ethical Reporting",
        points: [
            "Sensitive subjects such as crime, children, sexual assault, and vulnerable communities are handled with care and dignity.",
            "We respect privacy unless public interest justifies disclosure.",
        ],
    },
    {
        num: "06",
        icon: <FiRefreshCw size={22} strokeWidth={2} />,
        title: "Corrections & Updates",
        points: [
            "Errors are corrected transparently and promptly.",
            "Significant corrections are acknowledged within the article.",
        ],
    },
];

const correctionsApproach = [
    "Minor errors (spelling, formatting) are corrected without notice.",
    "Substantive factual errors are corrected promptly with a clear correction note.",
    "If an article requires major revision, an editor's note will be added explaining the update.",
];

const factCheckSteps = [
    { num: "01", text: "Cross-verification from multiple independent sources." },
    { num: "02", text: "Review of official documents, data reports, and government releases." },
    { num: "03", text: "Confirmation of quotes from primary sources." },
    { num: "04", text: "Reverse image checks and digital verification for visual content." },
];

/* ════════════════════════════
   MAIN COMPONENT
════════════════════════════ */
export default function EditorialPolicy() {
    return (
        <>
            {/* <PageSeo
                {...STATIC_PAGE_SEO["/editorial-policy"]}
                description="Explore News4Bharat’s editorial policy, covering our fact-checking process, content guidelines, and commitment to ethical journalism."
            /> */}
            <PageSeo
                {...STATIC_PAGE_SEO["/editorial-policy"]}
            />
            <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
                <AdvertisementSlot page="home" placement="home_side_left" variant="sideRail" className="home-side-ad home-side-ad--left" dismissible minWidth={1024} />
            </aside>
            <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
                <AdvertisementSlot page="home" placement="home_side_right" variant="sideRail" className="home-side-ad home-side-ad--right" dismissible minWidth={1024} />
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
            <div className="ep-page">

                {/* ══════════ HERO ══════════ */}
                <section className="ep-hero relative w-full max-[768px]:!h-auto max-[768px]:!min-h-0 max-[768px]:aspect-[3/2]">
                    <img
                        src={editorialBg}
                        alt=""
                        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
                    />
                    <div className="ep-hero-overlay" />
                </section>

                {/* ══════════ POLICY SECTIONS ══════════ */}
                <section className="ep-section ep-policy-section">
                    <div className="ep-container">

                        <FadeIn>
                            <div className="ep-section-header">
                                <span className="ep-label">Editorial Standards</span>
                                <h2 className="ep-section-title">Our Editorial Policy</h2>
                                <div className="ep-section-divider" />
                            </div>
                        </FadeIn>

                        <div className="ep-policy-grid">
                            {policyItems.map((item, i) => (
                                <FadeIn key={i} delay={i * 0.08} direction={i % 2 === 0 ? "left" : "right"}>
                                    <div className="ep-policy-card">
                                        <div className="ep-policy-card-topbar" />
                                        <div className="ep-policy-card-head">
                                            <div className="ep-policy-icon">{item.icon}</div>
                                            <div>
                                                <span className="ep-policy-num">{item.num}</span>
                                                <h3 className="ep-policy-title">{item.title}</h3>
                                            </div>
                                        </div>
                                        <ul className="ep-policy-list">
                                            {item.points.map((pt, j) => (
                                                <li key={j} className="ep-policy-list-item">
                                                    <span className="ep-policy-dot" />
                                                    <span>{pt}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════ CORRECTIONS POLICY ══════════ */}
                <section className="ep-section ep-corrections-section">
                    <div className="ep-container">
                        <div className="ep-corrections-layout">

                            <FadeIn direction="left">
                                <div className="ep-corrections-left">
                                    <h2 className="ep-corrections-heading">
                                        Corrections Policy
                                    </h2>
                                    <p className="ep-corrections-sub">
                                        At News4Bharat, we are committed to transparency and accountability.
                                    </p>
                                    <div className="ep-corrections-tagline">
                                        <FiEye size={16} />
                                        <span>Accuracy builds trust. We take corrections seriously.</span>
                                    </div>
                                </div>
                            </FadeIn>

                            <FadeIn direction="right" delay={0.1}>
                                <div className="ep-corrections-right">
                                    <p className="ep-corrections-right-label">Our Approach</p>
                                    {correctionsApproach.map((item, i) => (
                                        <div key={i} className="ep-correction-item">
                                            <div className="ep-correction-num">{String(i + 1).padStart(2, "0")}</div>
                                            <p className="ep-correction-text">{item}</p>
                                        </div>
                                    ))}

                                </div>
                            </FadeIn>

                        </div>
                    </div>
                </section>

                {/* ══════════ FACT CHECKING ══════════ */}
                <section className="ep-section ep-factcheck-section">
                    <div className="ep-container">

                        <FadeIn>
                            <div className="ep-section-header ep-section-header-center">
                                <h2 className="ep-section-titlee">Fact-Checking Standards</h2>
                                <p className="ep-section-subtitle">
                                    Misinformation undermines public trust. News4Bharat follows a rigorous fact-verification process.
                                </p>
                                <div className="ep-section-divider ep-divider-center" />
                            </div>
                        </FadeIn>

                        <div className="ep-factcheck-grid">
                            {factCheckSteps.map((step, i) => (
                                <FadeIn key={i} delay={i * 0.1}>
                                    <div className="ep-factcheck-card">
                                        <div className="ep-factcheck-head">
                                            <div className="ep-factcheck-icon">
                                                <FiSearch size={20} strokeWidth={2} />
                                            </div>
                                            <div className="ep-factcheck-num">{step.num}</div>
                                        </div>
                                        <p className="ep-factcheck-text">{step.text}</p>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>

                        {/* Bottom tagline */}
                        <FadeIn delay={0.4}>
                            <div className="ep-factcheck-tagline">
                                <FiFileText size={16} />
                                <span>
                                    Unverified claims are clearly labeled. Rumors are not published as news.
                                </span>
                            </div>
                        </FadeIn>
                    </div>
                </section>

            </div>
        </>
    );
}
