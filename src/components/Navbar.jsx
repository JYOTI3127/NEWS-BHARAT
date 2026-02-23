import { useState, useEffect } from "react";
import logoBig from "../assets/NEWS4BHARAT LOGO 2.png";
import logoSmall from "../assets/NEWS4BHARAT.png";

import {
  BarChart2,
  Search,
  Mic,
  Menu,
  X,
  Radio,
  FileText,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Flame,
  Globe,
  Trophy,
  Cpu,
  Film,
  Heart,
  PenLine,
  Zap,
  GraduationCap,
  Leaf,
  Video,
  Camera,
  MoreHorizontal,
  Newspaper,
} from "lucide-react";
import "../Navbar.css";

// ── Nav Drawer Sections ───────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "TOP STORIES",
    Icon: Flame,
    links: ["Breaking News", "Latest Updates", "Most Read", "Editor's Pick", "Trending Now"],
  },
  {
    label: "INDIA",
    Icon: Newspaper,
    links: ["National", "Politics", "Economy", "Law & Order", "States", "Delhi", "Mumbai"],
  },
  {
    label: "WORLD",
    Icon: Globe,
    links: ["South Asia", "Middle East", "USA & Canada", "Europe", "China", "UK", "Africa"],
  },
  {
    label: "BUSINESS",
    Icon: TrendingUp,
    links: ["Markets", "Stocks & Sensex", "Real Estate", "Banking", "Startups", "Budget", "Trade"],
  },
  {
    label: "SPORTS",
    Icon: Trophy,
    links: ["Cricket", "Football", "Hockey", "Tennis", "IPL", "Olympics", "Athletics"],
  },
  {
    label: "TECHNOLOGY",
    Icon: Cpu,
    links: ["AI & Machine Learning", "Mobile & Gadgets", "Cybersecurity", "Social Media", "Space Tech"],
  },
  {
    label: "ENTERTAINMENT",
    Icon: Film,
    links: ["Bollywood", "Hollywood", "OTT", "Music", "TV Shows", "Celebrity News", "Reviews"],
  },
  {
    label: "HEALTH",
    Icon: Heart,
    links: ["COVID Updates", "Mental Health", "Nutrition", "Fitness", "Medical Research"],
  },
  {
    label: "OPINION",
    Icon: PenLine,
    links: ["Editorials", "Columns", "Analysis", "Letters", "Fact Check"],
  },
  {
    label: "LIFESTYLE",
    Icon: Zap,
    links: ["Fashion", "Food & Recipes", "Travel", "Parenting", "Home & Decor"],
  },
  {
    label: "EDUCATION",
    Icon: GraduationCap,
    links: ["Higher Education", "School News", "Results & Exams", "Scholarships", "Study Abroad"],
  },
  {
    label: "ENVIRONMENT",
    Icon: Leaf,
    links: ["Climate Change", "Natural Disasters", "Conservation", "Pollution", "Water Crisis"],
  },
  {
    label: "VIDEOS",
    Icon: Video,
    links: ["Live TV", "News Clips", "Documentaries", "Interviews", "Press Conferences"],
  },
  {
    label: "PHOTOS",
    Icon: Camera,
    links: ["Photo Stories", "In Focus", "Galleries", "Infographics"],
  },
  {
    label: "GOLD & SILVER",
    Icon: TrendingUp,
    links: ["Gold Rates", "Silver Rates", "Commodities", "MCX", "Bullion News"],
  },
  {
    label: "MORE",
    Icon: MoreHorizontal,
    links: ["Weather", "Horoscope", "Science", "Archives", "About Us", "Contact", "Advertise", "Newsletter"],
  },
];

// ── Logos ─────────────────────────────────────────────────────
const LogoFull = () => (
  <div className="logo-full">
    <img src={logoBig} alt="News4Bharat Logo" />
  </div>
);

const LogoScroll = () => (
  <div className="logo-scroll">
    <img src={logoSmall} alt="News4Bharat Logo Small" />
  </div>
);

// ── navLinks ──────────────────────────────────────────────────
const navLinks = [
  "Home", "Breaking News", "India", "World", "Business",
  "Markets", "Gold & Silver", "Weather", "Sports",
  "Entertainment", "Technology", "Opinion", "Videos",
];

// ── Header Component ──────────────────────────────────────────
const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const toggleSection = (label) =>
    setExpandedSection((prev) => (prev === label ? null : label));

  return (
    <>
      {/* ── DRAWER OVERLAY ── */}
      <div
        className={`drawer-overlay${isOpen ? " open" : ""}`}
        onClick={() => setIsOpen(false)}
      />

      {/* ── DRAWER ── */}
      <aside className={`nav-drawer${isOpen ? " open" : ""}`}>

        {/* Drawer Header */}
        <div className="drawer-head">
          <button className="drawer-close" onClick={() => setIsOpen(false)} aria-label="Close menu"> X
            <X size={16} color="white" />
          </button>
        </div>

        {/* Live Ticker */}
        <div className="drawer-ticker">
          <span className="drawer-live-badge">LIVE</span>
          Breaking: Sensex surges 600 pts — RBI holds repo rate steady
        </div>

        {/* Search */}
        <div className="drawer-search-wrap">
          <div className="drawer-search-box">
            <Search size={14} color="#aa9988" />
            <input type="text" placeholder="Search news, topics..." />
          </div>
        </div>

        {/* Sections */}
        <div className="drawer-scroll">
          {NAV_SECTIONS.map(({ label, Icon, links }) => {
            const expanded = expandedSection === label;
            return (
              <div className="drawer-section" key={label}>
                <div
                  className="drawer-section-head"
                  onClick={() => toggleSection(label)}
                >
                  <span className="drawer-section-label">
                    <Icon size={15} color="#D80100" strokeWidth={2} />
                    {label}
                  </span>
                  <ChevronDown
                    size={14}
                    color="#aa9977"
                    style={{
                      transition: "transform 0.24s ease",
                      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </div>
                <div className={`drawer-sub-links${expanded ? " open" : ""}`}>
                  {links.map((link) => (
                    <a
                      key={link}
                      href="#"
                      className="drawer-sub-link"
                      onClick={(e) => e.preventDefault()}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="drawer-foot">
          <div className="drawer-foot-title">Quick Access</div>
          <div className="drawer-foot-pills">
            {["E-Paper", "Live TV", "Newsletter", "Podcast", "App", "RSS"].map((t) => (
              <span key={t} className="drawer-foot-pill">{t}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* ── MAIN HEADER ── */}
      <header className={`header-wrapper${isScrolled ? " scrolled" : ""}`}>

        {/* TOP TICKER BAR */}
          <div
          className="ticker-bar"
          style={{
            maxHeight: isScrolled ? "0px" : "200px",
            opacity: isScrolled ? 0 : 1,
            overflow: "hidden",
            padding: isScrolled ? "0 18px" : "5px 18px",
              borderBottom: isScrolled ? "none" : "1px solid #ebebeb",
            transition: "max-height 0.3s ease, opacity 0.3s ease",
          }}
        >
          <div className="ticker-left">
            <BarChart2 size={14} className="ticker-icon" />
            <span className="ticker-label">Markets :</span>
            <span className="ticker-item">
              Sensex <strong>73,845</strong>
              <span className="up"><TrendingUp size={11} /> +303</span>
            </span>
            <span className="ticker-sep">|</span>
            <span className="ticker-item">
              Nifty 50 <strong>22,430</strong>
              <span className="up"><TrendingUp size={11} /> +35</span>
            </span>
            <span className="ticker-sep">|</span>
            <span className="ticker-item">
              USD/INR <strong>83.42</strong>
              <span className="down"><TrendingDown size={11} /> -0.05</span>
            </span>
          </div>

                    <div className="commodity-bar">
            <span className="commodity gold">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#c8a400">
                <circle cx="12" cy="12" r="10" />
              </svg>
              GOLD
              <span className="up"><TrendingUp size={11} /> +0.3%</span>
            </span>
            <span className="commodity-sep">|</span>
            <span className="commodity silver">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#aaaaaa">
                <circle cx="12" cy="12" r="10" />
              </svg>
              SILVER
              <span className="down"><TrendingDown size={11} /> -1.2%</span>
            </span>
          </div>
          <div className="ticker-right">
            <div className="ticker-datetime">
              <span className="t-date">Friday, February 2025</span>
              <span className="t-time">12:57:56 PM</span>
            </div>
            <button className="btn-flag">
              <svg width="16" height="11" viewBox="0 0 16 11">
                <rect width="16" height="3.67" fill="#FF9933" />
                <rect y="3.67" width="16" height="3.67" fill="white" />
                <rect y="7.33" width="16" height="3.67" fill="#138808" />
                <circle cx="8" cy="5.5" r="1.5" fill="#000080" />
              </svg>
               हिंदी
            </button>
            <button className="btn-live">
              <Radio size={11} /> Live TV
            </button>
            <button className="btn-epaper">
              <FileText size={11} /> E-Paper
            </button>
          </div>
        </div>

        {/* TOP BAR */}
        <div
          className="top-bar"
          style={{
            maxHeight: isScrolled ? "0px" : "200px",
            opacity: isScrolled ? 0 : 1,
            overflow: "hidden",
             padding: isScrolled ? "0 18px" : "6px 18px", 
               borderBottom: isScrolled ? "none" : "1px solid #ebebeb",
            transition: "max-height 0.3s ease, opacity 0.3s ease",
          }}
        >
          <div className="search-row">
            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input type="text" className="search-input" placeholder="Search news..." />
              <Mic size={14} className="mic-icon" />
            </div>
          </div>
        </div>

        {/* MAIN NAVBAR */}
        <nav className="main-nav">
          <div className="nav-left">
            <button
              className="hamburger"
              aria-label="Menu"
              onClick={() => setIsOpen(true)}
            >
              <Menu size={22} color="white" />
            </button>
            <div className="logo-area">
              {!isScrolled ? <LogoFull /> : <LogoScroll />}
            </div>
          </div>

          <ul className="nav-links">
            {navLinks.map((link) => (
              <li key={link} className="nav-item">
                <a href="#" className="nav-link">{link}</a>
              </li>
            ))}
          </ul>
        </nav>

      </header>
    </>
  );
};

export default Header;