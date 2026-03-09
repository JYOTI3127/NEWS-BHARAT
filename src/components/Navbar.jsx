import { useState, useEffect, useRef } from "react";
import logoBig from "../assets/NEWS4BHARAT LOGO 2.png";
import logoSmall from "../assets/NEWS4BHARAT.png";
import { Link } from "react-router-dom";

import {
  BarChart2, Search, Mic, Menu, X, Radio, FileText,
  TrendingUp, TrendingDown, ChevronDown, Flame, Globe,
  Trophy, Cpu, Film, Heart, PenLine, Zap, GraduationCap,
  Leaf, Video, Camera, MoreHorizontal, Newspaper, CloudSun,
} from "lucide-react";
import "../Navbar.css";

// ─────────────────────────────────────────────
//  NAV_SECTIONS  — 
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  navLinks (desktop top nav — unchanged)
// ─────────────────────────────────────────────
const navLinks = [
  { label: "Breaking News",   path: "/" },
  { label: "States of Bharat",       path: "" },
  { label: "Bharat Explainers",     path: "" },
  { label: "Bharat in Numbers",     path: "" },
  { label: "Bharat's Startups",       path: "" },
  { label: "60-Second Read",           path: "" },
  { label: "Sports",                path: "" },
  { label: "World News",            path: "" },
  { label: "Entertainment",         path: "" },
  { label: "Founter's note",       path: "/founders-note" },
  { label: "Editorial Policy",           path: "/editorial-policy" },
  { label: "Career",                path: "/careers" },
  { label: "Contact Us",            path: "/contact" },
    { label: "Comming Soon",            path: "/CommingSoon" },
];

// ─────────────────────────────────────────────
//  Logo components — unchanged
// ─────────────────────────────────────────────
const LogoFull = () => (
  <div className="logo-full">
    <Link to="/"><img src={logoBig} alt="News4Bharat Logo" /></Link>
  </div>
);

const LogoScroll = () => (
  <div className="logo-scroll">
    <Link to="/"><img src={logoSmall} alt="News4Bharat Logo Small" /></Link>
  </div>
);

// ─────────────────────────────────────────────
//  Header component
// ─────────────────────────────────────────────
const Header = () => {
  const [isScrolled, setIsScrolled]         = useState(false);
  const [isOpen, setIsOpen]                 = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  // NEW — tracks which subcategory is expanded inside a section
  const [expandedSubcat, setExpandedSubcat] = useState(null);

  const [weather, setWeather]   = useState(null);
  const [metals, setMetals]     = useState(null);
  const [markets, setMarkets]   = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dateTime, setDateTime] = useState({ date: "", time: "" });
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [showResults, setShowResults]     = useState(false);
  const searchRef       = useRef(null);
  const searchDebounceRef = useRef(null);

  // ── resize ──
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── date / time ──
  useEffect(() => {
    const getLocal = () => ({
      date: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
    const fetchDate = async () => {
      try {
        const res  = await fetch("http://localhost:8000/api/datetime/");
        const data = await res.json();
        setDateTime({ date: data.date || data.formatted_date || getLocal().date, time: getLocal().time });
      } catch { setDateTime(getLocal()); }
    };
    fetchDate();
    const iv = setInterval(() => {
      setDateTime(prev => ({ ...prev, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // ── search ──
  const fetchSearchResults = async (query) => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    setIsSearching(true);
    try {
      const res     = await fetch(`http://localhost:8000/api/search/?q=${encodeURIComponent(query)}`);
      const data    = await res.json();
      const results = Array.isArray(data) ? data : (data.results || data.articles || []);
      setSearchResults(results);
      setShowResults(true);
    } catch { setSearchResults([]); }
    finally { setIsSearching(false); }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) { setSearchResults([]); setShowResults(false); return; }
    searchDebounceRef.current = setTimeout(() => fetchSearchResults(val), 400);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter")  { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); fetchSearchResults(searchQuery); }
    if (e.key === "Escape") setShowResults(false);
  };

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── weather ──
  useEffect(() => {
    const fetch_ = async () => {
      try { const r = await fetch("http://127.0.0.1:8000/api/weather/?city=Delhi"); setWeather(await r.json()); } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // ── metals ──
  useEffect(() => {
    const fetch_ = async () => {
      try { const r = await fetch("http://127.0.0.1:8000/api/metal-ticker/"); setMetals(await r.json()); } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // ── markets ──
  useEffect(() => {
    const fetch_ = async () => {
      try { const r = await fetch("http://127.0.0.1:8000/api/market-indices/"); setMarkets(await r.json()); } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // ── scroll ──
useEffect(() => {
  if (window.innerWidth <= 768) {
    setIsScrolled(false);
    return;
  }

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll);

  return () => window.removeEventListener("scroll", handleScroll);
}, []);

  // ── body overflow when drawer open ──
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ── drawer toggle helpers ──
  const toggleSection = (label) => {
    setExpandedSection(prev => prev === label ? null : label);
    setExpandedSubcat(null); // reset subcat when section changes
  };

  const toggleSubcat = (e, label) => {
    e.stopPropagation(); // don't close the section
    setExpandedSubcat(prev => prev === label ? null : label);
  };

  // ── market data shortcuts ──
  const sensexPrice = markets?.sensex?.price ?? null;
  const sensexChange = markets?.sensex?.change ?? null;
  const sensexTrend  = markets?.sensex?.trend  ?? "up";
  const niftyPrice   = markets?.nifty?.price   ?? null;
  const niftyChange  = markets?.nifty?.change  ?? null;
  const niftyTrend   = markets?.nifty?.trend   ?? "up";
  const goldPrice    = metals?.gold?.price     ?? null;
  const goldChange   = metals?.gold?.change    ?? null;
  const silverPrice  = metals?.silver?.price   ?? null;
  const silverChange = metals?.silver?.change  ?? null;

  // ── style helpers ──
  const tickerStyle = isMobile
    ? { display: "flex", padding: "5px 10px", borderBottom: "1px solid #ebebeb" }
    : {
        maxHeight:    isScrolled ? "0px"   : "200px",
        opacity:      isScrolled ? 0       : 1,
        overflow:     "hidden",
        padding:      isScrolled ? "0 18px": "5px 15px",
        borderBottom: isScrolled ? "none"  : "1px solid #ebebeb",
        transition:   "max-height 0.3s ease, opacity 0.3s ease",
      };

  const topBarStyle = isMobile
    ? { display: "none" }
    : {
        maxHeight:    isScrolled ? "0px"   : "200px",
        opacity:      isScrolled ? 0       : 1,
        overflow:     "hidden",
        padding:      isScrolled ? "0 18px": "6px 18px",
        borderBottom: isScrolled ? "none"  : "1px solid #ebebeb",
        transition:   "max-height 0.3s ease, opacity 0.3s ease",
      };

  // ── ticker content ──
  const TickerContent = () => (
    <>
      <span className="ticker-item">
        Sensex&nbsp;<strong>{sensexPrice ? Number(sensexPrice).toLocaleString("en-IN") : "..."}</strong>
        {sensexChange !== null && (
          <span className={sensexTrend === "up" ? "up" : "down"}>
            {sensexTrend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {sensexTrend === "up" ? "+" : "-"}{Math.abs(sensexChange)}
          </span>
        )}
      </span>
      <span className="ticker-sep">|</span>
      <span className="ticker-item">
        Nifty 50&nbsp;<strong>{niftyPrice ? Number(niftyPrice).toLocaleString("en-IN") : "..."}</strong>
        {niftyChange !== null && (
          <span className={niftyTrend === "up" ? "up" : "down"}>
            {niftyTrend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {niftyTrend === "up" ? "+" : "-"}{Math.abs(niftyChange)}
          </span>
        )}
      </span>
      <span className="ticker-sep">|</span>
      <span className="ticker-item">
        USD/INR&nbsp;<strong>83.42</strong>
        <span className="down"><TrendingDown size={11} /> -0.05</span>
      </span>
      <span className="ticker-sep">|</span>
      <span className="ticker-item commodity gold">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#c8a400"><circle cx="12" cy="12" r="10" /></svg>
        GOLD
        {goldPrice && <strong style={{ marginLeft: 2 }}>₹{Number(goldPrice).toLocaleString("en-IN")}</strong>}
        {goldChange !== null && (
          <span className={goldChange >= 0 ? "up" : "down"}>
            {goldChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {goldChange >= 0 ? "+" : ""}{goldChange}%
          </span>
        )}
      </span>
      <span className="ticker-sep">|</span>
      <span className="ticker-item commodity silver">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#aaaaaa"><circle cx="12" cy="12" r="10" /></svg>
        SILVER
        {silverPrice && <strong style={{ marginLeft: 2 }}>₹{Number(silverPrice).toLocaleString("en-IN")}</strong>}
        {silverChange !== null && (
          <span className={silverChange >= 0 ? "up" : "down"}>
            {silverChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {silverChange >= 0 ? "+" : ""}{silverChange}%
          </span>
        )}
      </span>
      <span className="ticker-sep" style={{ marginRight: 0 }}>|</span>
    </>
  );

  // ─────────────────────────────────────────────
  return (
    <>
      <div className={`drawer-overlay${isOpen ? " open" : ""}`} onClick={() => setIsOpen(false)} />

      {/* ══ DRAWER ══ */}
      <aside className={`nav-drawer${isOpen ? " open" : ""}`}>
        <div className="drawer-head">
          <button className="drawer-close" onClick={() => setIsOpen(false)} aria-label="Close menu">
            <X size={16} color="white" />
          </button>
        </div>

        <div className="drawer-ticker">
          <span className="drawer-live-badge">LIVE</span>
          Breaking: Sensex surges 600 pts —
        </div>

        <div className="drawer-search-wrap">
          <div className="drawer-search-box">
            <Search size={14} color="#aa9988" />
            <input
              type="text"
              placeholder="Search news, topics..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        </div>

        <div className="drawer-scroll">
          {NAV_SECTIONS.map(({ label, Icon, links, subcategories }) => {
            const sectionOpen = expandedSection === label;
            const hasSubcats  = subcategories && subcategories.length > 0;
            const hasLinks    = links && links.length > 0;

            return (
              <div className="drawer-section" key={label}>

                {/* ── Section header ── */}
                <div className="drawer-section-head" onClick={() => toggleSection(label)}>
                  <span className="drawer-section-label">
                    <Icon size={15} color="#D80100" strokeWidth={2} />
                    {label}
                  </span>
                  {(hasSubcats || hasLinks) && (
                    <ChevronDown
                      size={14}
                      color="#aa9977"
                      style={{
                        transition: "transform 0.24s ease",
                        transform: sectionOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  )}
                </div>

                {/* ── Section body: subcategories OR plain links ── */}
                <div className={`drawer-sub-links${sectionOpen ? " open" : ""}`}>
                  {hasSubcats ? (
                    /* ── 2-level: subcategory → topics ── */
                    subcategories.map((sub) => {
                      const subcatOpen = expandedSubcat === `${label}__${sub.label}`;
                      return (
                        <div key={sub.label} className="drawer-subcat-group">

                          {/* subcategory row */}
                          <div
                            className="drawer-subcat-head"
                            onClick={(e) => toggleSubcat(e, `${label}__${sub.label}`)}
                            style={{
                              display:        "flex",
                              alignItems:     "center",
                              justifyContent: "space-between",
                              padding:        "8px 16px 8px 28px",
                              cursor:         "pointer",
                              fontSize:       13,
                              fontWeight:     500,
                              fontFamily:     "Poppins, sans-serif",
                              color:          subcatOpen ? "#D80100" : "#333",
                              borderBottom:   "1px solid #f0ece8",
                              background:     subcatOpen ? "#fff4f3" : "transparent",
                              transition:     "background 0.15s",
                            }}
                          >
                            <span>{sub.label}</span>
                            <ChevronDown
                              size={12}
                              color={subcatOpen ? "#D80100" : "#bbb"}
                              style={{
                                transition: "transform 0.2s",
                                transform:  subcatOpen ? "rotate(180deg)" : "rotate(0deg)",
                              }}
                            />
                          </div>

                          {/* topics list */}
                          {subcatOpen && (
                            <div className="drawer-topics-list">
                              {sub.topics.map((topic) => (
                                <a
                                  key={topic}
                                  href="#"
                                  className="drawer-topic-link"
                                  onClick={(e) => e.preventDefault()}
                                  style={{
                                    display:      "block",
                                    padding:      "6px 16px 6px 44px",
                                    fontSize:     12.5,
                                    color:        "#555",
                                    textDecoration:"none",
                                    borderBottom: "1px solid #f8f4f0",
                                    transition:   "color 0.15s, background 0.15s",
                                    fontFamily:   "Poppins, sans-serif",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = "#D80100"; e.currentTarget.style.background = "#fff8f7"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = "#555";    e.currentTarget.style.background = "transparent"; }}
                                >
                                  › {topic}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : hasLinks ? (
                    /* ── 1-level: plain links (fallback) ── */
                    links.map((link) => (
                      <a
                        key={link}
                        href="#"
                        className="drawer-sub-link"
                        onClick={(e) => e.preventDefault()}
                      >
                        {link}
                      </a>
                    ))
                  ) : null}
                </div>

              </div>
            );
          })}
        </div>

        <div className="drawer-foot">
          <div className="drawer-foot-title">Quick Access</div>
          <div className="drawer-foot-pills">
            {["E-Paper", "Live TV", "Newsletter", "Podcast", "60 Second","Bharat Opinion"].map((t) => (
              <span key={t} className="drawer-foot-pill">{t}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* ══ HEADER ══ */}
      <header className={`header-wrapper${isScrolled ? " scrolled" : ""}`}>

        {/* TOP TICKER BAR */}
        <div className="ticker-bar" style={tickerStyle}>
          <div className="ticker-left">
            <BarChart2 size={14} className="ticker-icon" />
            <span className="ticker-label">Markets :</span>
          </div>
          <div className="ticker-scroll-track">
            <div className="ticker-scroll-inner">
              <TickerContent />
              <TickerContent />
            </div>
          </div>
          <div className="ticker-right">
            <button className="btn-flag">
              <svg width="16" height="11" viewBox="0 0 16 11">
                <rect width="16" height="3.67" fill="#FF9933" />
                <rect y="3.67" width="16" height="3.67" fill="white" />
                <rect y="7.33" width="16" height="3.67" fill="#138808" />
                <circle cx="8" cy="5.5" r="1.5" fill="#000080" />
              </svg>
              हिंदी
            </button>
            <button className="btn-live"><Radio size={11} /> Live TV</button>
            <button className="btn-epaper"><FileText size={11} /> E-Paper</button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="top-bar" style={topBarStyle}>
          <div className="search-row">
            <div className="search-box" ref={searchRef} style={{ position: "relative" }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search news..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
              />
              <Mic size={14} className="mic-icon" />
              {showResults && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: "360px", overflowY: "auto" }}>
                  {isSearching ? (
                    <div style={{ padding: "14px 16px", color: "#888", fontSize: 13 }}>Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: "14px 16px", color: "#888", fontSize: 13 }}>No results found for "{searchQuery}"</div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url || item.link || "#"}
                        style={{ display: "flex", flexDirection: "column", padding: "10px 16px", borderBottom: idx < searchResults.length - 1 ? "1px solid #f0f0f0" : "none", textDecoration: "none", color: "#222", transition: "background 0.15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fef4f4"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        onClick={() => setShowResults(false)}
                      >
                        {(item.category || item.tag || item.type) && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#D80100", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>
                            {item.category || item.tag || item.type}
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{item.title || item.headline || item.name || "Untitled"}</span>
                        {(item.description || item.summary || item.excerpt) && (
                          <span style={{ fontSize: 11, color: "#666", marginTop: 3, lineHeight: 1.4 }}>{(item.description || item.summary || item.excerpt).slice(0, 100)}...</span>
                        )}
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN NAVBAR */}
        <nav className="main-nav">
          <div className="nav-left">
            <button className="hamburger" aria-label="Menu" onClick={() => setIsOpen(true)}>
              <Menu size={22} color="white" />
            </button>
            <div className="logo-area">
              {isMobile ? <LogoScroll /> : (!isScrolled ? <LogoFull /> : <LogoScroll />)}
            </div>
          </div>

          <ul className="nav-links">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} className="nav-link">
                {link.label}
              </Link>
            ))}
          </ul>

          <div className="mobile-nav-actions">
            <button className="btn-flag">
              <svg width="14" height="10" viewBox="0 0 16 11">
                <rect width="16" height="3.67" fill="#FF9933" />
                <rect y="3.67" width="16" height="3.67" fill="white" />
                <rect y="7.33" width="16" height="3.67" fill="#138808" />
                <circle cx="8" cy="5.5" r="1.5" fill="#000080" />
              </svg>
              हिंदी
            </button>
            <button className="btn-live"><Radio size={11} /> Live TV</button>
            <button className="btn-epaper"><FileText size={11} /> E-Paper</button>
            <button className="btn-signin">Sign In</button>
          </div>
        </nav>

      </header>
    </>
  );
};

export default Header;