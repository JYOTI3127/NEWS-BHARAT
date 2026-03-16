import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, TrendingUp, PenLine, Cpu, Flame,
  ChevronDown, ChevronRight, X,
} from "lucide-react";
import logo from "../assets/NEWS4BHARAT LOGO 5 (1).png"; // change filename agar alag logo chahiye

// ── All nav links from Navbar ──
const navLinks = [
  { label: "Breaking News",      path: "/" },
  { label: "States of Bharat",   path: "" },
  { label: "Bharat Explainers",  path: "" },
  { label: "Bharat in Numbers",  path: "" },
  { label: "Bharat's Startups",  path: "" },
  { label: "60-Second Read",     path: "" },
  { label: "Sports",             path: "" },
  { label: "World News",         path: "" },
  { label: "Entertainment",      path: "" },
  { label: "Founder's Note",     path: "/founders-note" },
  { label: "Editorial Policy",   path: "/editorial-policy" },
  { label: "Career",             path: "/careers" },
  { label: "Contact Us",         path: "/contact" },
  { label: "Coming Soon",        path: "/CommingSoon" },
];

// ── NAV_SECTIONS from Navbar ──
const NAV_SECTIONS = [
  {
    label: "Bharat Economy & Business",
    Icon: TrendingUp,
    links: ["Macro Economy", "Government Policy", "Industry & Sectors", "Corporate & Companies", "MSME & Entrepreneurship"],
    subcategories: [
      {
        label: "Macro Economy",
        topics: ["GDP & Growth", "Inflation", "Fiscal & Monetary", "Employment & Labour Market"],
      },
      {
        label: "Government Policy",
        topics: ["Union Budget", "Economic Reforms", "PLI & Policies", "PSU"],
      },
      {
        label: "Industry & Sectors",
        topics: ["Manufacturing", "Agriculture", "Rural Economy", "Infrastructure & Construction", "Energy & Power", "Telecom & Digital"],
      },
      {
        label: "Corporate & Companies",
        topics: ["Corporate News", "Mergers & Acquisitions", "Company Results", "Business Leaders & Interviews"],
      },
      {
        label: "MSME & Entrepreneurship",
        topics: ["MSME Policies", "Small Business Stories"],
      },
    ],
  },
  {
    label: "Bharat's BFSI",
    Icon: BarChart2,
    links: ["Banking", "NBFCs", "Fintech", "Stock Market", "Insurance"],
  },
  {
    label: "Bharat Opinions",
    Icon: PenLine,
    links: ["Editorials", "Expert Opinions", "Industry Voices", "Articles", "Interviews", "Debates & Counterpoints", "Policy Perspective"],
  },
  {
    label: "Technology",
    Icon: Cpu,
  },
  {
    label: "Artificial Intelligence",
    Icon: Cpu,
  },
  {
    label: "Bharat By 2047",
    Icon: Flame,
  },
];

export default function MenuDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedSubcat, setExpandedSubcat] = useState(null);

  const handleNav = (path) => {
    if (!path) return;
    onClose();
    setTimeout(() => navigate(path), 280);
  };

  const toggleSection = (label) => {
    setExpandedSection(prev => prev === label ? null : label);
    setExpandedSubcat(null);
  };

  const toggleSubcat = (e, key) => {
    e.stopPropagation();
    setExpandedSubcat(prev => prev === key ? null : key);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        .md-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 1100;
          transition: opacity 0.3s ease;
        }

        .md-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 300px;
          background: #fff;
          z-index: 1101;
          transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 32px rgba(0,0,0,0.18);
          font-family: 'Poppins', sans-serif;
          overflow: hidden;
        }

        /* Header */
        .md-header {
          background: #D80100;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .md-logo {
          display: flex;
          align-items: stretch;
          border-radius: 6px;
          overflow: hidden;
        }
        .md-logo-left {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: #fff;
          background: #D80100;
          padding: 4px 10px;
          border: 1.5px solid #fff;
          border-right: none;
          border-radius: 6px 0 0 6px;
        }
        .md-logo-right {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: #D80100;
          background: #fff;
          padding: 4px 10px;
          border-radius: 0 6px 6px 0;
        }
        .md-close {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #fff;
          transition: background 0.2s;
        }
        .md-close:hover { background: rgba(255,255,255,0.35); }

        .md-tagline {
          background: #b50000;
          padding: 5px 16px;
          font-family: 'Poppins', sans-serif;
          font-size: 9px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          letter-spacing: 2.5px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        /* Scrollable body */
        .md-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .md-section-title {
          font-size: 9.5px;
          font-weight: 600;
          color: #aaa;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 14px 16px 4px;
        }

        .md-divider {
          height: 1px;
          background: #f0f0f0;
          margin: 6px 16px;
        }

        /* Quick nav links */
        .md-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 16px;
          cursor: pointer;
          transition: background 0.15s;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-family: 'Poppins', sans-serif;
          color: #222;
          border-bottom: 1px solid #f5f5f5;
        }
        .md-link:hover { background: #fff5f5; color: #D80100; }
        .md-link-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #D80100;
          flex-shrink: 0;
          opacity: 0.5;
        }
        .md-link:hover .md-link-dot { opacity: 1; }
        .md-link-label {
          font-size: 13px;
          font-weight: 500;
          flex: 1;
        }
        .md-link-arrow { color: #ddd; transition: color 0.15s; }
        .md-link:hover .md-link-arrow { color: #D80100; }

        /* Sections */
        .md-sec-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-family: 'Poppins', sans-serif;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.15s;
        }
        .md-sec-head:hover { background: #fff5f5; }
        .md-sec-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #fff0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .md-sec-label {
          font-size: 13px;
          font-weight: 600;
          color: #222;
          flex: 1;
        }

        /* Sub links */
        .md-sub-body {
          overflow: hidden;
          transition: max-height 0.3s ease;
          background: #fafafa;
        }

        /* Plain links inside section */
        .md-sub-link {
          display: block;
          padding: 9px 16px 9px 40px;
          font-size: 12.5px;
          font-weight: 400;
          color: #555;
          border-bottom: 1px solid #f0ece8;
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
          text-decoration: none;
          font-family: 'Poppins', sans-serif;
        }
        .md-sub-link:hover { color: #D80100; background: #fff8f7; }

        /* Subcategory head */
        .md-subcat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 16px 9px 32px;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 500;
          color: #333;
          border-bottom: 1px solid #f0ece8;
          background: transparent;
          transition: background 0.15s;
          font-family: 'Poppins', sans-serif;
          border: none;
          width: 100%;
          text-align: left;
        }
        .md-subcat-head:hover { background: #fff4f3; color: #D80100; }
        .md-subcat-head.active { color: #D80100; background: #fff4f3; }

        /* Topics */
        .md-topic-link {
          display: block;
          padding: 7px 16px 7px 52px;
          font-size: 12px;
          color: #666;
          border-bottom: 1px solid #f8f4f0;
          text-decoration: none;
          font-family: 'Poppins', sans-serif;
          transition: color 0.15s, background 0.15s;
        }
        .md-topic-link:hover { color: #D80100; background: #fff8f7; }

        /* Footer */
        .md-footer {
          padding: 14px 16px;
          border-top: 1px solid #f0f0f0;
          flex-shrink: 0;
          background: #fff;
        }
        .md-footer-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .md-pill {
          font-size: 11px;
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 20px;
          background: #f5f5f5;
          color: #555;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          border: none;
        }
        .md-pill:hover { background: #ffe5e5; color: #D80100; }
        .md-footer-text {
          font-size: 10.5px;
          color: black;
          text-align: center;
          font-family: 'Poppins', sans-serif;
        }
        .md-footer-text span { color: #D80100; font-weight: 600; }
      `}</style>

      {/* Overlay */}
      {open && (
        <div className="md-overlay opacity-100" onClick={onClose} />
      )}

      {/* Drawer */}
      <div className={`md-drawer transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Header */}
        <div className="md-header">
          <img
            src={logo}
            alt="News4Bharat"
            className="h-8 w-auto object-contain filter brightness-0 invert"
          />
          <button className="md-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="md-tagline">The Voice of India</div>

        {/* Scrollable Body */}
        <div className="md-body">

          {/* ── Quick Links (navLinks) ── */}
          <div className="md-section-title">Quick Links</div>

          {navLinks.map(({ label, path }) => (
            <button
              key={label}
              className="md-link"
              onClick={() => handleNav(path || "/")}
            >
              <span className="md-link-dot" />
              <span className="md-link-label">{label}</span>
              <span className="md-link-arrow">
                <ChevronRight size={14} />
              </span>
            </button>
          ))}

          <div className="md-divider" />

          {/* ── NAV_SECTIONS ── */}
          <div className="md-section-title">Categories</div>

          {NAV_SECTIONS.map(({ label, Icon, links, subcategories }) => {
            const sectionOpen = expandedSection === label;
            const hasSubcats  = subcategories && subcategories.length > 0;
            const hasLinks    = links && links.length > 0;

            return (
              <div key={label}>

                {/* Section Header */}
                <button className="md-sec-head" onClick={() => toggleSection(label)}>
                  <span className="md-sec-icon">
                    <Icon size={15} color="#D80100" strokeWidth={2} />
                  </span>
                  <span className="md-sec-label">{label}</span>
                  {(hasSubcats || hasLinks) && (
                    <ChevronDown
                      size={14}
                      color="#aaa"
                      className={`transition-transform duration-200 ease-out ${sectionOpen ? "rotate-180" : "rotate-0"}`}
                    />
                  )}
                </button>

                {/* Section Body */}
                <div
                  className={`md-sub-body overflow-hidden transition-[max-height] duration-300 ${sectionOpen ? "max-h-[600px]" : "max-h-0"}`}
                >
                  {hasSubcats ? (
                    subcategories.map((sub) => {
                      const key = `${label}__${sub.label}`;
                      const subcatOpen = expandedSubcat === key;
                      return (
                        <div key={sub.label}>
                          <button
                            className={`md-subcat-head${subcatOpen ? " active" : ""}`}
                            onClick={(e) => toggleSubcat(e, key)}
                          >
                            <span>{sub.label}</span>
                            <ChevronDown
                              size={12}
                              color={subcatOpen ? "#D80100" : "#bbb"}
                              className={`transition-transform duration-200 ease-out ${subcatOpen ? "rotate-180" : "rotate-0"}`}
                            />
                          </button>
                          {subcatOpen && sub.topics.map((topic) => (
                            <a key={topic} href="#" className="md-topic-link"
                              onClick={(e) => e.preventDefault()}>
                              › {topic}
                            </a>
                          ))}
                        </div>
                      );
                    })
                  ) : hasLinks ? (
                    links.map((link) => (
                      <a key={link} href="#" className="md-sub-link"
                        onClick={(e) => e.preventDefault()}>
                        › {link}
                      </a>
                    ))
                  ) : null}
                </div>

              </div>
            );
          })}

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="md-footer">
          <div className="md-footer-pills">
            {["E-Paper", "Live TV", "Newsletter", "Podcast", "60 Second", "Bharat Opinion"].map((t) => (
              <button key={t} className="md-pill">{t}</button>
            ))}
          </div>
          <p className="md-footer-text">
            &copy; 2025 <span>News4Bharat</span>. All rights reserved.
          </p>
        </div>

      </div>
    </>
  );
}