import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import logoBig from "../assets/NEWS4BHARAT LOGO 2 compact.png";
import logoSmall from "../assets/NEWS4BHARAT compact.png";
import { Link, useNavigate } from "react-router-dom";

import {
  BarChart2, Search, Mic, Menu, X, Radio, FileText,
  TrendingUp, TrendingDown, ChevronDown, Flame, Globe,
  Trophy, Cpu, Film, Heart, PenLine, Zap, GraduationCap,
  Leaf, Video, Camera, MoreHorizontal, Newspaper, CloudSun,
} from "lucide-react";
import "../Navbar.css";
import { apiUrl } from "../lib/api";

// ─────────────────────────────────────────────
// ✅ FIX 1: LiveClock — alag component
// Sirf yahi re-render hoga har second, poora Navbar nahi!
// ─────────────────────────────────────────────
const LiveClock = memo(() => {
  const [time, setTime] = useState(
    () => new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
  );

  useEffect(() => {
    const iv = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return <span>{time}</span>;
});

// ─────────────────────────────────────────────
// Utilities — same as before
// ─────────────────────────────────────────────
const deferNonCritical = (callback, timeout = 1200) => {
  if (typeof window === "undefined") return () => {};
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(id);
};

const CATEGORY_ICON_MAP = {
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

const FALLBACK_ICONS = [
  Newspaper, Globe, TrendingUp, BarChart2, Cpu,
  Trophy, Film, Heart, PenLine, Zap, GraduationCap,
  Leaf, Video, Camera, CloudSun, MoreHorizontal,
];

const getStableIconIndex = (value) => {
  const source = String(value || "").trim().toLowerCase();
  if (!source) return 0;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash % FALLBACK_ICONS.length;
};

const getIconForCategory = (name, slug = "") => {
  const directMatch = CATEGORY_ICON_MAP[name];
  if (directMatch) return directMatch;
  return FALLBACK_ICONS[getStableIconIndex(slug || name)];
};

const makeSlug = (slug, label) => {
  if (slug && slug.trim() !== "") return slug;
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
};

const SLUG_OVERRIDES = {
  "bharat-in-numbers": "bharat-in-numbers",
  "states-of-bharat":  "state-of-bharat",
  "bharats-startups":  "bharat-startups",
  "breaking-news":     "breaking-news",
};

const getFinalSlug = (slug, label) => {
  const s = makeSlug(slug, label);
  return SLUG_OVERRIDES[s] || s;
};

const getSearchResultHref = (item) => {
  if (item?.url)  return item.url;
  if (item?.link) return item.link;
  if (item?.slug) return `/article/${item.slug}/`;
  if (item?.id)   return `/article/${item.id}/`;
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
  const raw     = item?.description || item?.summary || item?.excerpt || "";
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
  { label: "Bharat's BFSI",          slug: "bfsi",            Icon: BarChart2, links: ["Banking", "NBFCs", "Fintech", "Stock Market", "Insurance"] },
  { label: "Bharat Opinions",         slug: "bharat-opinions", Icon: PenLine,   links: ["Editorials", "Expert Opinions", "Industry Voices", "Articles", "Interviews", "Debates & Counterpoints", "Policy Perspective"] },
  { label: "Technology",              slug: "technology",      Icon: Cpu },
  { label: "Artificial Intelligence", slug: "ai",              Icon: Cpu },
  { label: "Bharat By 2047",          slug: "bharat-2047",     Icon: Flame },
];

const navLinks = [
  { label: "Breaking News",     path: "/category/breaking-news" },
  { label: "States of Bharat",  path: "/category/state-of-bharat" },
  { label: "Bharat Explainers", path: "/category/bharat-explainers" },
  { label: "Bharat in Numbers", path: "/category/bharat-in-numbers" },
  { label: "Bharat's Startups", path: "/category/bharat-startups" },
  { label: "60-Second Read",    path: "/category/60-second-read" },
  { label: "Sports",            path: "/category/sports" },
  { label: "World News",        path: "/category/world-news" },
  { label: "Trending",          path: "/category/trending" },
];

// ─────────────────────────────────────────────
// ✅ FIX 2: LogoFull & LogoScroll — bahar + memo
// ─────────────────────────────────────────────
const LogoFull = memo(() => (
  <div className="logo-full">
    <Link to="/" className="logo-full-link">
      <img src={logoBig} alt="News4Bharat Logo" width="160" height="160" loading="eager" fetchPriority="high" decoding="async" />
    </Link>
  </div>
));

const LogoScroll = memo(() => (
  <div className="logo-scroll">
    <Link to="/"><img src={logoSmall} alt="News4Bharat Logo Small" width="192" height="95" loading="eager" fetchPriority="high" decoding="async" /></Link>
  </div>
));

// ─────────────────────────────────────────────
// ✅ FIX 3: TickerContent — bahar + memo + props se data
// Pehle: Header ke andar tha → har Navbar render pe naya function
// Ab: Bahar + memo → sirf tab re-render jab market data change ho
// ─────────────────────────────────────────────
const TickerContent = memo(({ sensexPrice, sensexChange, sensexTrend, niftyPrice, niftyChange, niftyTrend, goldPrice, goldChange, silverPrice, silverChange }) => (
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
));

// ─────────────────────────────────────────────
// ✅ FIX 4: useIs2K — ek hi resize listener
// ─────────────────────────────────────────────
const useIs2K = () => {
  const getValue = () =>
    typeof window !== "undefined" &&
    window.innerWidth >= 1441 &&
    window.innerWidth <= 2560;
  const [is2K, setIs2K] = useState(getValue);
  useEffect(() => {
    const onResize = () => setIs2K(getValue());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return is2K;
};

// ─────────────────────────────────────────────
// ✅ FIX 5: useIsMobile — alag hook
// Pehle: Header ke andar state thi + useIs2K alag hook
// Ab: Dono alag hooks → Header mein sirf call karo
// ─────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

// ─────────────────────────────────────────────
// Main Header Component
// ─────────────────────────────────────────────
const Header = () => {
  const [isScrolled, setIsScrolled]               = useState(false);
  const [isOpen, setIsOpen]                       = useState(false);
  const [expandedSection, setExpandedSection]     = useState(null);
  const [expandedSubcat, setExpandedSubcat]       = useState(null);
  const [navSections, setNavSections]             = useState(NAV_SECTIONS);
  const [navSectionsLoaded, setNavSectionsLoaded] = useState(false);

  const [weather, setWeather]   = useState(null);
  const [metals, setMetals]     = useState(null);
  const [markets, setMarkets]   = useState(null);

  // ✅ FIX: date alag state — time LiveClock handle karega
  const [date, setDate] = useState(
    () => new Date().toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    })
  );

  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [showResults, setShowResults]     = useState(false);
  const [headerHeight, setHeaderHeight]   = useState(0);

  // ✅ Hooks — clean
  const isMobile = useIsMobile();
  const is2K     = useIs2K();

  const searchRef               = useRef(null);
  const searchDebounceRef       = useRef(null);
  const headerRef               = useRef(null);
  const measuredHeaderHeightRef = useRef(0);
  const navigate                = useNavigate();

  const extra2KNavLinks = [
    { label: "Technology",   path: "/category/technology" },
    { label: "AI",           path: "/category/ai" },
    { label: "BFSI",         path: "/category/bfsi" },
    { label: "Auto",         path: "/category/automobile" },
    { label: "Health",       path: "/category/health" },
    { label: "Education",    path: "/category/education" },
    { label: "Entertainment",path: "/category/entertainment" },
    { label: "Bharat 2047",  path: "/category/bharat-2047" },
    { label: "Opinions",     path: "/category/bharat-opinions" },
  ];
  const visibleNavLinks = is2K ? [...navLinks, ...extra2KNavLinks] : navLinks;

  // ✅ FIX: Sirf date fetch karo — time LiveClock mein hai
  useEffect(() => {
    if (isMobile) return;
    const fetchDate = async () => {
      try {
        const res  = await fetch(apiUrl("/datetime/"));
        const data = await res.json();
        setDate(
          data.date || data.formatted_date ||
          new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })
        );
      } catch {}
    };
    const cancelDeferred = deferNonCritical(fetchDate, 5000);
    return () => cancelDeferred();
  }, [isMobile]);

  // Categories — sirf jab drawer open ho
  useEffect(() => {
    if (!isOpen || navSectionsLoaded) return;
    const fetchCategories = async () => {
      try {
        const res    = await fetch(apiUrl("/categories/"));
        const data   = await res.json();
        const active = data.filter(cat => cat.status === "active");
        const sections = active.map(cat => {
          const subKeys     = Object.keys(cat.sub_categories || {});
          let subcategories = null;
          let links         = null;
          if (subKeys.length > 1) {
            subcategories = subKeys.map(key => ({ label: key, topics: cat.sub_categories[key] }));
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
            Icon:  getIconForCategory(cat.name, cat.slug),
            ...(subcategories && { subcategories }),
            ...(links         && { links }),
          };
        });
        setNavSections(sections);
        setNavSectionsLoaded(true);
      } catch (err) {
        console.error("Categories API fail:", err.message);
        setNavSections(NAV_SECTIONS);
        setNavSectionsLoaded(true);
      }
    };
    const cancelDeferred = deferNonCritical(fetchCategories, 800);
    return () => cancelDeferred();
  }, [isOpen, navSectionsLoaded]);

  // Search
  const fetchSearchResults = useCallback(async (query) => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    setIsSearching(true);
    setShowResults(true);
    try {
      const res     = await fetch(apiUrl(`/search/articles/?q=${encodeURIComponent(query)}`));
      const data    = await res.json();
      const results = Array.isArray(data)
        ? data
        : (data.results || data.articles || data.data || data.items || []);
      setSearchResults(results);
    } catch (err) {
      console.error("Search API error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) { setSearchResults([]); setShowResults(false); return; }
    searchDebounceRef.current = setTimeout(() => fetchSearchResults(val), 400);
  }, [fetchSearchResults]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter")  { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); fetchSearchResults(searchQuery); }
    if (e.key === "Escape") setShowResults(false);
  }, [fetchSearchResults, searchQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Weather
  useEffect(() => {
    if (isMobile) return;
    const fetchWeather = async () => {
      try {
        const r    = await fetch(apiUrl("/weather/?city=Delhi"));
        const data = await r.json();
        setWeather(data);
      } catch {}
    };
    const cancelDeferred = deferNonCritical(fetchWeather, 5200);
    const iv = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => { cancelDeferred(); clearInterval(iv); };
  }, [isMobile]);

  // Metals
  useEffect(() => {
    const fetchMetals = async () => {
      try {
        const r    = await fetch(apiUrl("/metal-ticker/"));
        const data = await r.json();
        setMetals(data);
      } catch {}
    };
    const cancelDeferred = deferNonCritical(fetchMetals, 4600);
    const iv = setInterval(fetchMetals, 15 * 60 * 1000);
    return () => { cancelDeferred(); clearInterval(iv); };
  }, []);

  // Markets
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const r    = await fetch(apiUrl("/market-indices/"));
        const data = await r.json();
        setMarkets(data);
      } catch {}
    };
    const cancelDeferred = deferNonCritical(fetchMarkets, 4200);
    const iv = setInterval(fetchMarkets, 5 * 60 * 1000);
    return () => { cancelDeferred(); clearInterval(iv); };
  }, []);

  // Scroll
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

  // Header height measurement
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const syncMeasuredHeight = (nextHeight) => {
      measuredHeaderHeightRef.current = nextHeight;
      if (!isMobile && isScrolled) return;
      setHeaderHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };
    const applyCurrentHeight = () => {
      const nextHeight = Math.round(node.getBoundingClientRect().height);
      if (nextHeight > 0) syncMeasuredHeight(nextHeight);
    };
    applyCurrentHeight();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", applyCurrentHeight);
      return () => window.removeEventListener("resize", applyCurrentHeight);
    }
    const observer = new ResizeObserver((entries) => {
      const entry      = entries[0];
      const nextHeight = Math.round(entry?.contentRect?.height || 0);
      if (nextHeight > 0) syncMeasuredHeight(nextHeight);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [isScrolled, isMobile]);

  useEffect(() => {
    if (!isMobile && isScrolled) { setHeaderHeight(44); return; }
    if (measuredHeaderHeightRef.current > 0) setHeaderHeight(measuredHeaderHeightRef.current);
  }, [isScrolled, isMobile]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ✅ useCallback — functions stable rahenge
  const toggleSection = useCallback((label) => {
    setExpandedSection(prev => prev === label ? null : label);
    setExpandedSubcat(null);
  }, []);

  const toggleSubcat = useCallback((e, label) => {
    e.stopPropagation();
    setExpandedSubcat(prev => prev === label ? null : label);
  }, []);

  const goTo = useCallback((path) => {
    setIsOpen(false);
    setExpandedSection(null);
    setExpandedSubcat(null);
    navigate(path);
  }, [navigate]);

  // Market data
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
    : `overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${isScrolled ? "max-h-0 opacity-0 border-b-0 py-0" : "max-h-[200px] opacity-100 border-b border-slate-200 py-1"}`;

  const topBarClasses = isMobile
    ? "hidden"
    : `${showResults ? "overflow-visible" : "overflow-hidden"} transition-[max-height,opacity] duration-300 ease-out ${isScrolled ? "max-h-0 opacity-0 border-b-0 py-0" : "max-h-[200px] opacity-100 border-b border-slate-200 py-1"}`;

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
                    <span
                      className="no-underline text-inherit cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); goTo(`/category/${finalSlug}`); }}
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
            {["Live TV", "Newsletter", "Podcast", "60 Second", "Bharat Opinion"].map((t) => (
              <span key={t} className="drawer-foot-pill">{t}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* ══ HEADER ══ */}
      <header ref={headerRef} className={`header-wrapper${isScrolled ? " scrolled" : ""}${is2K ? " is-2k" : ""}`}>

        {/* Ticker Bar */}
        <div className={tickerBarClasses}>
          <div className="header-shell ticker-shell">
            <div className="ticker-left">
              <BarChart2 size={14} className="ticker-icon" />
              <span className="ticker-label">Markets :</span>
            </div>
            <div className="ticker-scroll-track">
              <div className="ticker-scroll-inner">
                {/* ✅ TickerContent memo — sirf market data change hone par re-render */}
                <TickerContent
                  sensexPrice={sensexPrice}
                  sensexChange={sensexChange}
                  sensexTrend={sensexTrend}
                  niftyPrice={niftyPrice}
                  niftyChange={niftyChange}
                  niftyTrend={niftyTrend}
                  goldPrice={goldPrice}
                  goldChange={goldChange}
                  silverPrice={silverPrice}
                  silverChange={silverChange}
                />
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
        </div>

        {/* Top Bar — Search + Date/Time */}
        <div className={topBarClasses}>
          <div className="header-shell">
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
                            <span className="text-[11px] text-slate-600 mt-1 leading-[1.4]">{getSearchPreview(item)}</span>
                          )}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="main-nav">
          <div className="header-shell main-nav-shell">
            <div className="nav-left">
              <button className="hamburger" aria-label="Menu" onClick={() => setIsOpen(true)}>
                <Menu size={22} color="white" />
              </button>
              <div className="logo-area">
                {isMobile ? <LogoScroll /> : (!isScrolled ? <LogoFull /> : <LogoScroll />)}
              </div>
            </div>

            <ul className="nav-links">
              {visibleNavLinks.map((link, idx) => (
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
          </div>
        </nav>

      </header>
    </>
  );
};

export default Header;
