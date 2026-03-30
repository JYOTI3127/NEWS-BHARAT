import logo from "../assets/Logo 02.png";
import "../Footer.css";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Linkedin, X, MessageCircle } from "lucide-react";

const WhatsAppIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor">
    <path d="M16 1C7.716 1 1 7.716 1 16c0 2.628.672 5.1 1.845 7.255L1 31l7.959-1.81A14.93 14.93 0 0 0 16 31c8.284 0 15-6.716 15-15S24.284 1 16 1zm0 27.273a12.226 12.226 0 0 1-6.243-1.712l-.447-.265-4.628 1.053 1.087-4.508-.292-.462A12.197 12.197 0 0 1 3.727 16C3.727 9.22 9.22 3.727 16 3.727S28.273 9.22 28.273 16 22.78 28.273 16 28.273z" />
    <path d="M22.805 19.239c-.332-.166-1.963-.968-2.267-1.079-.304-.11-.525-.166-.747.166-.221.332-.856 1.079-1.049 1.3-.193.222-.387.249-.719.083-.332-.166-1.402-.517-2.669-1.647-.986-.88-1.652-1.966-1.845-2.298-.193-.332-.021-.511.145-.677.149-.149.332-.387.498-.581.166-.193.221-.332.332-.553.11-.222.055-.415-.028-.581-.083-.166-.747-1.8-1.022-2.464-.27-.645-.543-.557-.747-.568-.193-.009-.414-.011-.636-.011-.221 0-.581.083-.885.415-.304.332-1.161 1.134-1.161 2.765s1.189 3.208 1.355 3.43c.166.221 2.34 3.572 5.67 5.008.792.342 1.41.546 1.891.699.795.253 1.519.218 2.091.132.638-.095 1.963-.803 2.239-1.578.277-.775.277-1.439.193-1.578-.083-.138-.304-.221-.636-.387z" />
  </svg>
);

const footerLinks = {
  NEWS: [
    "Breaking News",
    "Trending",
    "Sports",
    "World News",
    { name: "Artificial Intelligence", slug: "ai" },
    "Technology"
  ],
  All_About_Bharat: [
    "Bharat Opinions",
    "Bharat Explainers",
    "Bharat in Numbers",
    "Bharat's Startups",
    "Bharat BFSI",
    "Bharat 2047"
  ],
  State_of_Bharat: [
    "Maharashtra",
    "Tamil Nadu",
    "Karnataka",
    "Gujarat",
    "Uttar Pradesh",
    "West Bengal"
  ],
  MORE: [
    "Entertainment",
    "60 Second Read",
    "Health",

  ]
};

const getFinalSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ── Har pill ka apna path ──
const policyLinks = [
  { label: "About Us", path: "/about" },
  { label: "Founter's Note", path: "/founders-note" },
  { label: "Editorial Policy", path: "/editorial-policy" },
  { label: "Career", path: "/careers" },
  { label: "Contact Us", path: "/contact" },
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Terms & Conditions", path: "/terms-of-service" },
  { label: "Disclaimer",   path: "/disclaimer" },
];

const AppleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const PlayStoreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 512 512">
    <linearGradient id="ps-a" x1="91.34" y1="256" x2="420.66" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#32a071" />
      <stop offset=".07" stopColor="#2da771" />
      <stop offset=".48" stopColor="#15cf74" />
      <stop offset=".8" stopColor="#06e775" />
      <stop offset="1" stopColor="#00f076" />
    </linearGradient>
    <linearGradient id="ps-b" x1="246.84" y1="282.6" x2="461.24" y2="67.5" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#ffda00" />
      <stop offset="1" stopColor="#ffbb00" />
    </linearGradient>
    <linearGradient id="ps-c" x1="166.26" y1="318.61" x2="-47.49" y2="105.87" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#ff3a44" />
      <stop offset="1" stopColor="#c31162" />
    </linearGradient>
    <linearGradient id="ps-d" x1="67.6" y1="450.31" x2="164.38" y2="353.53" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#32a071" />
      <stop offset=".07" stopColor="#2da771" />
      <stop offset=".48" stopColor="#15cf74" />
      <stop offset=".8" stopColor="#06e775" />
      <stop offset="1" stopColor="#00f076" />
    </linearGradient>
    <path d="M91.34 56.2a27.4 27.4 0 0 0-6.35 19.5v360.6a27.4 27.4 0 0 0 6.35 19.5l1 1 201.9-201.9v-4.8L92.34 49.2z" fill="url(#ps-a)" />
    <path d="M360.54 325.4l-67.3-67.4v-4.8l67.3-67.4 1.5.9 79.7 45.3c22.8 12.9 22.8 34.1 0 47l-79.7 45.3z" fill="url(#ps-b)" />
    <path d="M362.04 324.5l-68.8-68.9-201.9 201.9c7.5 7.9 19.9 8.9 33.8.9z" fill="url(#ps-c)" />
    <path d="M362.04 187.5l-236.9-134.4c-13.9-8-26.3-7-33.8.9l201.9 201.9z" fill="url(#ps-d)" />
  </svg>
);

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ft-root">

      {/* 3-color top strip */}
      <div className="ft-top-strip">
        <div className="ft-strip-r" />
        <div className="ft-strip-b" />
        <div className="ft-strip-y" />
      </div>

      {/* MAIN ROW */}
      <div className="ft-main">

        {/* LEFT: Brand */}
        <div className="ft-brand">

          <img src={logo} alt="News4Bharat" className="ft-logo" />

          <p className="ft-desc">
            In An Era Where Information Moves Faster Than Verification,
            And Opinions Often Overshadow Facts, News4bharat Was Founded
            With A Clear Purpose: To Restore Clarity, Credibility, And
            Responsibility In News Reporting.
          </p>

          <div className="ft-follow-label">FOLLOW US</div>

          <div className="ft-social-row">
            <a href="https://www.facebook.com/share/1GxJQvxefr/?mibextid=wwXIfr" className="ft-soc"><Facebook size={18} /></a>
            <a href="https://www.instagram.com/news4_bharat?igsh=MWlxem53bjNobHl2Zw%3D%3D&utm_source=qr" className="ft-soc"><Instagram size={18} /></a>
            <a href="https://x.com/news4_bharat?s=21&t=QmL3UuRgMMfwt2JDGmB3mQ" target="_blank" rel="noreferrer" className="ft-soc" title="X">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M18.244 2H21l-6.56 7.5L22 22h-6.828l-5.35-7.002L3.5 22H1l7.02-8.02L2 2h6.9l4.86 6.41L18.244 2zm-2.39 18h1.885L8.15 4H6.2l9.654 16z" />
              </svg>
            </a>
            <a href="https://youtube.com/@news4bharat-p1w?si=IDAN0BepU_mRjB0w" className="ft-soc">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.7 31.7 0 000 12a31.7 31.7 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.7 31.7 0 0024 12a31.7 31.7 0 00-.5-5.8zM9.6 15.5v-7l6.2 3.5-6.2 3.5z" />
              </svg>
            </a>
            <a href="https://whatsapp.com/channel/news4bharat" className="ft-soc">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M20.52 3.48A11.91 11.91 0 0012.06 0C5.48 0 .16 5.32.16 11.9c0 2.1.55 4.16 1.6 5.98L0 24l6.27-1.64a11.9 11.9 0 005.8 1.48h.01c6.58 0 11.9-5.32 11.9-11.9 0-3.18-1.24-6.16-3.46-8.46zM12.07 21.4a9.5 9.5 0 01-4.84-1.32l-.35-.21-3.72.98.99-3.63-.23-.37a9.48 9.48 0 01-1.45-5.04c0-5.24 4.26-9.5 9.5-9.5a9.43 9.43 0 016.73 2.8 9.43 9.43 0 012.78 6.7c0 5.24-4.26 9.49-9.41 9.49zm5.2-7.12c-.28-.14-1.66-.82-1.92-.91-.26-.1-.45-.14-.64.14-.19.28-.73.91-.9 1.1-.17.19-.33.21-.61.07-.28-.14-1.19-.44-2.27-1.4-.84-.75-1.41-1.67-1.58-1.95-.17-.28-.02-.43.13-.57.13-.13.28-.33.42-.49.14-.17.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.47-.64-.48l-.55-.01c-.19 0-.49.07-.75.35-.26.28-1 1-1 2.43s1.03 2.81 1.17 3.01c.14.19 2.02 3.08 4.89 4.31.68.29 1.21.46 1.63.59.68.22 1.3.19 1.79.12.55-.08 1.66-.68 1.9-1.34.23-.66.23-1.22.16-1.34-.07-.12-.26-.19-.54-.33z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/company/news4bharat" className="ft-soc"><Linkedin size={18} /></a>
          </div>

          {/* App buttons — side by side */}
          {/* <div className="ft-app-row">
            <a href="#" className="ft-app-btn">
              <AppleIcon />
              <div className="ft-app-text">
                <span className="ft-app-small">DOWNLOAD ON THE</span>
                <span className="ft-app-big">App Store</span>
              </div>
            </a>
            <a href="#" className="ft-app-btn">
              <PlayStoreIcon />
              <div className="ft-app-text">
                <span className="ft-app-small">GET IT ON</span>
                <span className="ft-app-big">Google Play</span>
              </div>
            </a>
          </div> */}

        </div>

        {/* VERTICAL DIVIDER */}
        <div className="ft-vdivider" />

        {/* RIGHT: columns + line + policy pills */}
        <div className="ft-right">

          {/* 4 link columns */}
          <div className="ft-links-grid">
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div className="ft-col" key={heading}>
                <div className="ft-col-head">
                  <span className="ft-col-title">{heading.replaceAll("_", " ")}</span>
                  <div className="ft-col-underline">
                    <span className="u-r" />
                    <span className="u-b" />
                    <span className="u-y" />
                  </div>
                </div>
                <ul className="ft-col-list">
                  {links.map((item, index) => {
                    const name = typeof item === "string" ? item : item.name;

                    const slug =
                      typeof item === "string"
                        ? getFinalSlug(item)
                        : item.slug;

                    return (
                      <li key={index}>
                        <Link to={`/category/${slug}`} className="ft-col-link">
                          {name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Horizontal line above policy pills */}
          <div className="ft-policy-divider" />

          {/* Policy pills — Link se page navigate hoga */}
          <div className="ft-policy-row">
            {policyLinks.map(({ label, path }) => (
              <Link key={label} to={path} className="ft-pill">
                {label}
              </Link>
            ))}
          </div>

        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="ft-bottom">
        <p className="ft-copy">
          © Copyright {year} <strong>News4Bharat</strong> - All Rights Reserved.
        </p>
      </div>

    </footer>
  );
}