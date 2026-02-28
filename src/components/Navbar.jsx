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

const NAV_SECTIONS = [
  { label: "TOP STORIES", Icon: Flame, links: ["Breaking News", "Latest Updates", "Most Read", "Editor's Pick", "Trending Now"] },
  { label: "INDIA", Icon: Newspaper, links: ["National", "Politics", "Economy", "Law & Order", "States", "Delhi", "Mumbai"] },
  { label: "WORLD", Icon: Globe, links: ["South Asia", "Middle East", "USA & Canada", "Europe", "China", "UK", "Africa"] },
  { label: "BUSINESS", Icon: TrendingUp, links: ["Markets", "Stocks & Sensex", "Real Estate", "Banking", "Startups", "Budget", "Trade"] },
  { label: "SPORTS", Icon: Trophy, links: ["Cricket", "Football", "Hockey", "Tennis", "IPL", "Olympics", "Athletics"] },
  { label: "TECHNOLOGY", Icon: Cpu, links: ["AI & Machine Learning", "Mobile & Gadgets", "Cybersecurity", "Social Media", "Space Tech"] },
  { label: "ENTERTAINMENT", Icon: Film, links: ["Bollywood", "Hollywood", "OTT", "Music", "TV Shows", "Celebrity News", "Reviews"] },
  { label: "HEALTH", Icon: Heart, links: ["COVID Updates", "Mental Health", "Nutrition", "Fitness", "Medical Research"] },
  { label: "OPINION", Icon: PenLine, links: ["Editorials", "Columns", "Analysis", "Letters", "Fact Check"] },
  { label: "LIFESTYLE", Icon: Zap, links: ["Fashion", "Food & Recipes", "Travel", "Parenting", "Home & Decor"] },
  { label: "EDUCATION", Icon: GraduationCap, links: ["Higher Education", "School News", "Results & Exams", "Scholarships", "Study Abroad"] },
  { label: "ENVIRONMENT", Icon: Leaf, links: ["Climate Change", "Natural Disasters", "Conservation", "Pollution", "Water Crisis"] },
  { label: "VIDEOS", Icon: Video, links: ["Live TV", "News Clips", "Documentaries", "Interviews", "Press Conferences"] },
  { label: "PHOTOS", Icon: Camera, links: ["Photo Stories", "In Focus", "Galleries", "Infographics"] },
  { label: "GOLD & SILVER", Icon: TrendingUp, links: ["Gold Rates", "Silver Rates", "Commodities", "MCX", "Bullion News"] },
  { label: "MORE", Icon: MoreHorizontal, links: ["Weather", "Horoscope", "Science", "Archives", "About Us", "Contact", "Advertise", "Newsletter"] },
];

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

const navLinks = [
  { label: "Home", path: "/" },
  { label: "About Us", path: "/about" },
   { label: "Privacy Policy", path: "/privacy-policy" },
   { label: "Terms of Service", path: "/terms-of-service" },

  { label: "Breaking Now", path: "/category/breaking-now" },
  { label: "Bharat Explainers", path: "/category/bharat-explainers" },
  { label: "National Affairs", path: "/category/national-affairs" },
  { label: "States of Bharat", path: "/category/states-of-bharat" },
  { label: "Opinion", path: "/category/opinion" },
  { label: "Economy & Business", path: "/category/economy-business" },
  { label: "World News", path: "/category/world-news" },
  { label: "Bharat Explores", path: "/category/bharat-explores" },
  { label: "Fact Check", path: "/category/fact-check" },
  { label: "Bharat in Numbers", path: "/category/bharat-in-numbers" },
  { label: "Bharat Startups", path: "/category/bharat-startups" },
  { label: "Bharat Leaders", path: "/category/bharat-leaders" },
  { label: "Bharat 2047", path: "/category/bharat-2047" },
];

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [weather, setWeather] = useState(null);
  const [metals, setMetals] = useState(null);
  const [markets, setMarkets] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dateTime, setDateTime] = useState({ date: "", time: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const getLocalDateTime = () => {
      const now = new Date();
      return {
        date: now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
    };
    const fetchDateOnce = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/datetime/");
        const data = await res.json();
        setDateTime({ date: data.date || data.formatted_date || getLocalDateTime().date, time: getLocalDateTime().time });
      } catch (err) {
        setDateTime(getLocalDateTime());
      }
    };
    fetchDateOnce();
    const interval = setInterval(() => {
      const now = new Date();
      setDateTime((prev) => ({ ...prev, time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSearchResults = async (query) => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:8000/api/search/?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = Array.isArray(data) ? data : (data.results || data.articles || []);
      setSearchResults(results);
      setShowResults(true);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) { setSearchResults([]); setShowResults(false); return; }
    searchDebounceRef.current = setTimeout(() => fetchSearchResults(val), 400);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); fetchSearchResults(searchQuery); }
    if (e.key === "Escape") setShowResults(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try { const res = await fetch("http://127.0.0.1:8000/api/weather/?city=Delhi"); const data = await res.json(); setWeather(data); } catch (err) { }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMetals = async () => {
      try { const res = await fetch("http://127.0.0.1:8000/api/metal-ticker/"); const data = await res.json(); setMetals(data); } catch (err) { }
    };
    fetchMetals();
    const interval = setInterval(fetchMetals, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMarkets = async () => {
      try { const res = await fetch("http://127.0.0.1:8000/api/market-indices/"); const data = await res.json(); setMarkets(data); } catch (err) { }
    };
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsScrolled(false);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsScrolled(false);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const toggleSection = (label) => setExpandedSection((prev) => (prev === label ? null : label));

  const goldPrice = metals?.gold?.price ?? null;
  const silverPrice = metals?.silver?.price ?? null;
  const goldChange = metals?.gold?.change ?? null;
  const silverChange = metals?.silver?.change ?? null;
  const sensexPrice = markets?.sensex?.price ?? null;
  const sensexChange = markets?.sensex?.change ?? null;
  const sensexTrend = markets?.sensex?.trend ?? "up";
  const niftyPrice = markets?.nifty?.price ?? null;
  const niftyChange = markets?.nifty?.change ?? null;
  const niftyTrend = markets?.nifty?.trend ?? "up";

  const tickerStyle = isMobile
    ? { display: "flex", padding: "5px 10px", borderBottom: "1px solid #ebebeb" }
    : {
      maxHeight: isScrolled ? "0px" : "200px",
      opacity: isScrolled ? 0 : 1,
      overflow: "hidden",
      padding: isScrolled ? "0 18px" : "5px 15px",
      borderBottom: isScrolled ? "none" : "1px solid #ebebeb",
      transition: "max-height 0.3s ease, opacity 0.3s ease",
    };

  const topBarStyle = isMobile
    ? { display: "none" }
    : {
      maxHeight: isScrolled ? "0px" : "200px",
      opacity: isScrolled ? 0 : 1,
      overflow: "hidden",
      padding: isScrolled ? "0 18px" : "6px 18px",
      borderBottom: isScrolled ? "none" : "1px solid #ebebeb",
      transition: "max-height 0.3s ease, opacity 0.3s ease",
    };

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

  return (
    <>
      <div className={`drawer-overlay${isOpen ? " open" : ""}`} onClick={() => setIsOpen(false)} />

      <aside className={`nav-drawer${isOpen ? " open" : ""}`}>
        <div className="drawer-head">
          <button className="drawer-close" onClick={() => setIsOpen(false)} aria-label="Close menu">
            X <X size={16} color="white" />
          </button>
        </div>
        <div className="drawer-ticker">
          <span className="drawer-live-badge">LIVE</span>
          Breaking: Sensex surges 600 pts — RBI holds repo rate steady
        </div>
        <div className="drawer-search-wrap">
          <div className="drawer-search-box" style={{ position: "relative" }}>
            <Search size={14} color="#aa9988" />
            <input type="text" placeholder="Search news, topics..." value={searchQuery} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} />
          </div>
        </div>
        <div className="drawer-scroll">
          {NAV_SECTIONS.map(({ label, Icon, links }) => {
            const expanded = expandedSection === label;
            return (
              <div className="drawer-section" key={label}>
                <div className="drawer-section-head" onClick={() => toggleSection(label)}>
                  <span className="drawer-section-label">
                    <Icon size={15} color="#D80100" strokeWidth={2} />
                    {label}
                  </span>
                  <ChevronDown size={14} color="#aa9977" style={{ transition: "transform 0.24s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                </div>
                <div className={`drawer-sub-links${expanded ? " open" : ""}`}>
                  {links.map((link) => (
                    <a key={link} href="#" className="drawer-sub-link" onClick={(e) => e.preventDefault()}>{link}</a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="drawer-foot">
          <div className="drawer-foot-title">Quick Access</div>
          <div className="drawer-foot-pills">
            {["E-Paper", "Live TV", "Newsletter", "Podcast", "App", "RSS"].map((t) => (
              <span key={t} className="drawer-foot-pill">{t}</span>
            ))}
          </div>
        </div>
      </aside>

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

        {/* TOP BAR - Search */}
        <div className="top-bar" style={topBarStyle}>
          <div className="search-row">
            <div className="search-box" ref={searchRef} style={{ position: "relative" }}>
              <Search size={14} className="search-icon" />
              <input type="text" className="search-input" placeholder="Search news..." value={searchQuery} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} onFocus={() => searchResults.length > 0 && setShowResults(true)} />
              <Mic size={14} className="mic-icon" />
              {showResults && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: "360px", overflowY: "auto" }}>
                  {isSearching ? (
                    <div style={{ padding: "14px 16px", color: "#888", fontSize: 13 }}>Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: "14px 16px", color: "#888", fontSize: 13 }}>No results found for "{searchQuery}"</div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <a key={idx} href={item.url || item.link || "#"} style={{ display: "flex", flexDirection: "column", padding: "10px 16px", borderBottom: idx < searchResults.length - 1 ? "1px solid #f0f0f0" : "none", textDecoration: "none", color: "#222", transition: "background 0.15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fef4f4"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        onClick={() => setShowResults(false)}>
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

          {/* ✅ Desktop pe nav links, mobile pe hide */}
          <ul className="nav-links">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} className="nav-link">
                {link.label}
              </Link>
            ))}
          </ul>

          {/* ✅ Mobile pe sirf ye buttons dikhenge (Hindi, Live TV, E-Paper, Sign In) */}
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