import { useState, useEffect, useRef } from "react";
import logoBig from "../assets/NEWS4BHARAT LOGO 2.png";
import logoSmall from "../assets/NEWS4BHARAT.png";
import { Link, useNavigate } from "react-router-dom";

import {
  BarChart2, Search, Mic, Menu, X, Radio, FileText,
  TrendingUp, TrendingDown, ChevronDown, Flame, Globe,
  Trophy, Cpu, Film, Heart, PenLine, Zap, GraduationCap,
  Leaf, Video, Camera, MoreHorizontal, Newspaper, CloudSun,
} from "lucide-react";
import "../Navbar.css";

const getIconForCategory = (name) => {
  const map = {
    "Breaking News":             Flame,
    "States of Bharat":          Globe,
    "Bharat Economy & Business": TrendingUp,
    "Bharat's BFSI":             BarChart2,
    "Bharat Explainers":         FileText,
    "Bharat in Numbers":         BarChart2,
    "Bharat Opinions":           PenLine,
    "Bharat's Startups":         Zap,
    "Bharat 2047":               Flame,
    "Bharat By 2047":            Flame,
    "Technology":                Cpu,
    "Artificial Intelligence":   Cpu,
    "Sports":                    Trophy,
    "World News":                Globe,
    "Entertainment":             Film,
    "Trending":                  TrendingUp,
    "60-Second Read":            Zap,
  };
  return map[name] || Newspaper;
};

const makeSlug = (slug, label) => {
  if (slug && slug.trim() !== "") return slug;
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
};

const SLUG_OVERRIDES = {
  "bharat-in-numbers": "bharat-numbers",
  "states-of-bharat":  "state-of-bharat",
  "bharats-startups":  "bharat-startups",
  "breaking-news":     "breaking-now",
};

const getFinalSlug = (slug, label) => {
  const s = makeSlug(slug, label);
  return SLUG_OVERRIDES[s] || s;
};

const getSearchResultHref = (item) => {
  if (item?.url) return item.url;
  if (item?.link) return item.link;
  if (item?.slug) return `/article/${item.slug}`;
  if (item?.id) return `/article/${item.id}`;
  return "#";
};

const stripHtml = (value) => {
  if (typeof value !== "string") return "";
  let cleaned = value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  // Handle escaped/truncated HTML fragments that survive the first pass.
  cleaned = cleaned
    .replace(/<\/?[^>]*$/g, "")
    .replace(/^[a-z0-9-]+\s*=\s*["'][^"']*["']\s*/gi, "")
    .replace(/\b(?:style|class|id|data-[a-z0-9-]+|dir|face|size)\s*=\s*["'][^"']*["']/gi, "")
    .replace(/^[^a-zA-Z0-9\u0900-\u097F]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
};

const getSearchPreview = (item) => {
  const raw = item?.description || item?.summary || item?.excerpt || "";
  const cleaned = stripHtml(raw);
  if (!cleaned) return "";

  const trimmed = cleaned.slice(0, 110).trim();
  return cleaned.length > 110 ? `${trimmed}...` : trimmed;
};

const NAV_SECTIONS = [
  {
    label: "Bharat Economy & Business",
    Icon: TrendingUp,
    slug: "bharat-economy",
    subcategories: [
      { label: "Macro Economy",           topics: ["GDP & Growth", "Inflation", "Fiscal & Monetary", "Employment & Labour Market"] },
      { label: "Government Policy",       topics: ["Union Budget", "Economic Reforms", "PLI & Policies", "PSU"] },
      { label: "Industry & Sectors",      topics: ["Manufacturing", "Agriculture", "Rural Economy", "Infrastructure & Construction", "Energy & Power", "Telecom & Digital"] },
      { label: "Corporate & Companies",   topics: ["Corporate News", "Mergers & Acquisitions", "Company Results", "Business Leaders & Interviews"] },
      { label: "MSME & Entrepreneurship", topics: ["MSME Policies", "Small Business Stories"] },
    ],
  },
  { label: "Bharat's BFSI",         slug: "bfsi",            Icon: BarChart2, links: ["Banking", "NBFCs", "Fintech", "Stock Market", "Insurance"] },
  { label: "Bharat Opinions",        slug: "bharat-opinions", Icon: PenLine,   links: ["Editorials", "Expert Opinions", "Industry Voices", "Articles", "Interviews", "Debates & Counterpoints", "Policy Perspective"] },
  { label: "Technology",             slug: "technology",      Icon: Cpu },
  { label: "Artificial Intelligence",slug: "ai",              Icon: Cpu },
  { label: "Bharat By 2047",         slug: "bharat-2047",     Icon: Flame },
];

const navLinks = [
  { label: "Breaking News",     path: "/category/breaking-news" },
  { label: "States of Bharat",  path: "/category/state-of-bharat" },
  { label: "Bharat Explainers", path: "/category/bharat-explainers" },
  { label: "Bharat in Numbers", path: "/category/bharat-numbers" },
  { label: "Bharat's Startups", path: "/category/bharat-startups" },
  { label: "60-Second Read",    path: "/category/60-second-read" },
  { label: "Sports",            path: "/category/sports" },
  { label: "World News",        path: "/category/world-news" },
  { label: "Trending",          path: "/category/trending" },
  
];

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

const Header = () => {
  const [isScrolled, setIsScrolled]           = useState(false);
  const [isOpen, setIsOpen]                   = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedSubcat, setExpandedSubcat]   = useState(null);
  const [navSections, setNavSections]         = useState(NAV_SECTIONS);

  const [weather, setWeather]   = useState(null);
  const [metals, setMetals]     = useState(null);
  const [markets, setMarkets]   = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dateTime, setDateTime] = useState({ date: "", time: "" });
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [showResults, setShowResults]     = useState(false);
  const searchRef         = useRef(null);
  const searchDebounceRef = useRef(null);
  const headerRef         = useRef(null);
  const navigate          = useNavigate();
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const getLocal = () => ({
      date: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
    const fetchDate = async () => {
      try {
        const res  = await fetch("https://news4bharat.cloud/api/datetime/");
        const data = await res.json();
        setDateTime({ date: data.date || data.formatted_date || getLocal().date, time: getLocal().time });
      } catch {
        setDateTime(getLocal());
      }
    };
    fetchDate();
    const iv = setInterval(() => {
      setDateTime(prev => ({ ...prev, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res    = await fetch("https://news4bharat.cloud/api/categories/");
        const data   = await res.json();
        const active = data.filter(cat => cat.status === "active");

        const sections = active.map(cat => {
          const subKeys     = Object.keys(cat.sub_categories || {});
          let subcategories = null;
          let links         = null;

          if (subKeys.length > 1) {
            subcategories = subKeys.map(key => ({
              label:  key,
              topics: cat.sub_categories[key],
            }));
          } else if (subKeys.length === 1 && (cat.sub_categories[subKeys[0]] || []).length > 0) {
            const vals = cat.sub_categories[subKeys[0]];
            if (subKeys[0] === "default") {
              links = vals;
            } else {
              subcategories = [{ label: subKeys[0], topics: vals }];
            }
          }

          return {
            label: cat.name,
            slug:  cat.slug,
            Icon:  getIconForCategory(cat.name),
            ...(subcategories && { subcategories }),
            ...(links         && { links }),
          };
        });

        setNavSections(sections);
      } catch (err) {
        console.error("Categories API fail:", err.message);
        setNavSections(NAV_SECTIONS);
      }
    };
    fetchCategories();
  }, []);

  // ✅ UPDATED: /api/search/articles/ + fixed showResults logic + debug logs
  const fetchSearchResults = async (query) => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    setIsSearching(true);
    setShowResults(true); // show dropdown immediately with "Searching..."
    try {
      const res  = await fetch(`https://news4bharat.cloud/api/search/articles/?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      console.log("🔍 Search API raw response:", data); // DEBUG — hata dena baad mein
      const results = Array.isArray(data)
        ? data
        : (data.results || data.articles || data.data || data.items || []);
      console.log("🔍 Parsed results:", results.length, "items"); // DEBUG
      setSearchResults(results);
    } catch (err) {
      console.error("Search API error:", err);
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
    if (e.key === "Enter")  { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); fetchSearchResults(searchQuery); }
    if (e.key === "Escape") setShowResults(false);
  };

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const r    = await fetch("https://news4bharat.cloud/api/weather/?city=Delhi");
        const data = await r.json();
        setWeather(data);
      } catch {}
    };
    fetchWeather();
    const iv = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchMetals = async () => {
      try {
        const r    = await fetch("https://news4bharat.cloud/api/metal-ticker/");
        const data = await r.json();
        setMetals(data);
      } catch {}
    };
    fetchMetals();
    const iv = setInterval(fetchMetals, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const r    = await fetch("https://news4bharat.cloud/api/market-indices/");
        const data = await r.json();
        setMarkets(data);
      } catch {}
    };
    fetchMarkets();
    const iv = setInterval(fetchMarkets, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 768) { setIsScrolled(false); return; }
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
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };    

    updateHeaderHeight();
    const raf = window.requestAnimationFrame(updateHeaderHeight);
    window.addEventListener("resize", updateHeaderHeight);
    const observer = typeof ResizeObserver !== "undefined" && headerRef.current
      ? new ResizeObserver(updateHeaderHeight)
      : null;

    if (observer && headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateHeaderHeight);
      observer?.disconnect();
    };
  }, [isScrolled, isMobile, isOpen, showResults, searchResults.length, searchQuery]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const toggleSection = (label) => {
    setExpandedSection(prev => prev === label ? null : label);
    setExpandedSubcat(null);
  };

  const toggleSubcat = (e, label) => {
    e.stopPropagation();
    setExpandedSubcat(prev => prev === label ? null : label);
  };

  // Drawer close + navigate helper
  const goTo = (path) => {
    setIsOpen(false);
    setExpandedSection(null);
    setExpandedSubcat(null);
    navigate(path);
  };

  const sensexPrice  = markets?.sensex?.price  ?? null;
  const sensexChange = markets?.sensex?.change ?? null;
  const sensexTrend  = markets?.sensex?.trend  ?? "up";
  const niftyPrice   = markets?.nifty?.price   ?? null;
  const niftyChange  = markets?.nifty?.change  ?? null;
  const niftyTrend   = markets?.nifty?.trend   ?? "up";
  const goldPrice    = metals?.gold?.price     ?? null;
  const goldChange   = metals?.gold?.change    ?? null;
  const silverPrice  = metals?.silver?.price   ?? null;
  const silverChange = metals?.silver?.change  ?? null;

  const tickerBarClasses = isMobile
    ? "flex flex-nowrap items-center px-2.5 py-1 border-b border-slate-200"
    : `flex flex-nowrap items-center overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${isScrolled ? "max-h-0 opacity-0 border-b-0 px-4 py-0" : "max-h-[200px] opacity-100 border-b border-slate-200 px-4 py-1"}`;

  const topBarClasses = isMobile
    ? "hidden"
    : `${showResults ? "overflow-visible" : "overflow-hidden"} transition-[max-height,opacity] duration-300 ease-out ${isScrolled ? "max-h-0 opacity-0 border-b-0 px-4 py-0" : "max-h-[200px] opacity-100 border-b border-slate-200 px-4 py-1"}`;

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
        {goldPrice && <strong className="ml-[2px]">₹{Number(goldPrice).toLocaleString("en-IN")}</strong>}
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
        {silverPrice && <strong className="ml-[2px]">₹{Number(silverPrice).toLocaleString("en-IN")}</strong>}
        {silverChange !== null && (
          <span className={silverChange >= 0 ? "up" : "down"}>
            {silverChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {silverChange >= 0 ? "+" : ""}{silverChange}%
          </span>
        )}
      </span>
      <span className="ticker-sep mr-0">|</span>
    </>
  );

  return (
    <>
      <div aria-hidden="true" style={{ height: `${headerHeight}px` }} />
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
          {navSections.map(({ label, slug, Icon, links, subcategories }) => {
            const sectionOpen = expandedSection === label;
            const hasSubcats  = subcategories && subcategories.length > 0;
            const hasLinks    = links && links.length > 0;
            const finalSlug   = getFinalSlug(slug, label);

            return (
              <div className="drawer-section" key={label}>
                <div className="drawer-section-head" onClick={() => toggleSection(label)}>
                  <span className="drawer-section-label">
                    {Icon && <Icon size={15} color="#D80100" strokeWidth={2} />}
                    {/* ✅ Category name click → category page */}
                    <span
                      className="no-underline text-inherit cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        goTo(`/category/${finalSlug}`);
                      }}
                    >
                      {label}
                    </span>
                  </span>
                  {(hasSubcats || hasLinks) && (
                    <ChevronDown
                      size={14}
                      color="#aa9977"
                      className={`transition-transform duration-200 ease-out ${sectionOpen ? "rotate-180" : "rotate-0"}`}
                    />
                  )}
                </div>

                <div className={`drawer-sub-links${sectionOpen ? " open" : ""}`}>
                  {hasSubcats ? (
                    subcategories.map((sub) => {
                      const subcatOpen = expandedSubcat === `${label}__${sub.label}`;
                      return (
                        <div key={sub.label} className="drawer-subcat-group">
                          {/* Subcategory head — click karke expand/collapse */}
                          <div
                            className={`drawer-subcat-head flex items-center justify-between cursor-pointer border-b border-slate-200 px-4 py-2 pl-7 text-[13px] font-medium transition-colors duration-150 ${subcatOpen ? "text-red-600 bg-red-50" : "text-slate-800 bg-transparent"}`}
                            onClick={(e) => toggleSubcat(e, `${label}__${sub.label}`)}
                          >
                            <span>{sub.label}</span>
                            <ChevronDown
                              size={12}
                              color={subcatOpen ? "#D80100" : "#bbb"}
                              className={`transition-transform duration-200 ease-out ${subcatOpen ? "rotate-180" : "rotate-0"}`}
                            />
                          </div>

                          {subcatOpen && (
                            <div className="drawer-topics-list">
                              {(sub.topics || []).map((topic) => (
                                // ✅ Topic click → /category/slug?subcategory=topic
                                <span
                                  key={topic}
                                  className="drawer-topic-link block px-4 py-1.5 pl-11 text-[12.5px] text-slate-600 no-underline border-b border-slate-100 transition-colors duration-150 font-sans hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  onClick={() => goTo(`/category/${finalSlug}?subcategory=${encodeURIComponent(topic)}`)}
                                >
                                  › {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : hasLinks ? (
                    // ✅ Links click → /category/slug?subcategory=link
                    links.map((link) => (
                      <span
                        key={link}
                        className="drawer-sub-link cursor-pointer"
                        onClick={() => goTo(`/category/${finalSlug}?subcategory=${encodeURIComponent(link)}`)}
                      >
                        {link}
                      </span>
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
            {[ "Live TV", "Newsletter", "Podcast", "60 Second", "Bharat Opinion"].map((t) => (
              <span key={t} className="drawer-foot-pill">{t}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* ══ HEADER ══ */}
      <header ref={headerRef} className={`header-wrapper${isScrolled ? " scrolled" : ""}`}>

        <div className={tickerBarClasses}>
          <div className="ticker-left">
            <BarChart2 size={14} className="ticker-icon" />
            <span className="ticker-label">Markets :</span>
          </div>
          <div className="ticker-scroll-track">
            <div className="ticker-scroll-inner">
              <TickerContent />
            </div>
          </div>
          <div className="ticker-actions flex items-center gap-2 flex-nowrap flex-shrink-0 hidden md:flex">
            <button className="btn-flag topbar-hindi-btn">
              <svg width="16" height="11" viewBox="0 0 16 11">
                <rect width="16" height="3.67" fill="#FF9933" />
                <rect y="3.67" width="16" height="3.67" fill="white" />
                <rect y="7.33" width="16" height="3.67" fill="#138808" />
                <circle cx="8" cy="5.5" r="1.5" fill="#000080" />
              </svg>
              हिंदी
            </button>
          </div>
        </div>

        <div className={topBarClasses}>
          <div className="search-row">
            <div className="search-box relative" ref={searchRef} style={{ position: "relative" }}>
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
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 border-t-0 rounded-b-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-h-[360px] overflow-y-auto" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, background: "#fff" }}>
                  {isSearching ? (
                    <div className="px-4 py-3 text-xs text-slate-500">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">No results found for "{searchQuery}"</div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <Link
                        key={idx}
                        to={getSearchResultHref(item)}
                        className={`flex flex-col p-2.5 border-b ${idx < searchResults.length - 1 ? "border-slate-100" : "border-transparent"} text-slate-900 no-underline transition-colors duration-150 hover:bg-red-50`}
                        onClick={() => setShowResults(false)}
                      >
                        {(item.category || item.tag || item.type) && (
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-[0.5px] mb-1">
                            {item.category || item.tag || item.type}
                          </span>
                        )}
                        <span className="text-[13px] font-semibold leading-[1.4]">{item.title || item.headline || item.name || "Untitled"}</span>
                        {getSearchPreview(item) && (
                          <span className="text-[11px] text-slate-600 mt-1 leading-[1.4]">
                            {getSearchPreview(item)}
                          </span>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

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
            {navLinks.map((link, idx) => (
              <Link key={`${link.path}-${idx}`} to={link.path} className="nav-link">
                {link.label}
              </Link>
            ))}
          </ul>

          <div className="mobile-nav-actions">
            <button className="btn-flag navbar-hindi-btn">
              <svg width="14" height="10" viewBox="0 0 16 11">
                <rect width="16" height="3.67" fill="#FF9933" />
                <rect y="3.67" width="16" height="3.67" fill="white" />
                <rect y="7.33" width="16" height="3.67" fill="#138808" />
                <circle cx="8" cy="5.5" r="1.5" fill="#000080" />
              </svg>
              हिंदी
            </button>
          </div>
        </nav>

      </header>
    </>
  );
};

export default Header;
