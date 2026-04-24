import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import logoBig from "../assets/NEWS4BHARAT logo (7).png";
import logoSmall from "../assets/NEWS4BHARAT compact.png";
import { Link, useNavigate } from "react-router-dom";

import {
  BarChart2, Search, Mic, Menu, X, Radio, FileText,
  TrendingUp, ChevronDown, Flame, Globe,
  Trophy, Cpu, Film, Heart, PenLine, Zap, GraduationCap,
  Leaf, Video, Camera, MoreHorizontal, Newspaper, CloudSun,
  Bell, CalendarDays, Clock3, Languages, Linkedin, Instagram, Youtube,
} from "lucide-react";

import "../Navbar.css";
import { apiUrl } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";
import { YOUTUBE_CHANNEL_URL } from "../lib/socialLinks";

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
  if (typeof window === "undefined") return () => { };
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(id);
};

const getWeatherTemperature = (weather) => {
  const candidates = [
    weather?.temperature,
    weather?.temp,
    weather?.temp_c,
    weather?.current?.temperature,
    weather?.current?.temp,
    weather?.current?.temp_c,
    weather?.main?.temp,
  ];

  const value = candidates.map(Number).find(Number.isFinite);
  if (!Number.isFinite(value)) return "";
  return `${Math.round(value)}°C`;
};

const getWeatherCity = (weather) =>
  weather?.city ||
  weather?.name ||
  weather?.location?.name ||
  weather?.location?.city ||
  "Delhi";

const getWeatherCondition = (weather) =>
  weather?.condition ||
  weather?.weather ||
  weather?.current?.condition?.text ||
  weather?.current?.weather ||
  weather?.description ||
  "";

const CATEGORY_ICON_MAP = {
  "Breaking News": Flame,
  "World News": Globe,
  "Business": TrendingUp,
  "Technology": Cpu,
  "Sports": Trophy,
  "Entertainment": Film,
  "Health": Heart,
  "Education": GraduationCap,
  "Automobile": Video,
  "National": Globe,
  "Political": PenLine,
  "States of Bharat": Globe,
  "Bharat's BFSI": BarChart2,
  "Bharat in Numbers": BarChart2,
  "Bharat Opinions": PenLine,
  "Bharat's Startups": Zap,
  "Bharat 2047": Flame,
  "Bharat By 2047": Flame,
  "Artificial Intelligence": Cpu,
  "Trending": TrendingUp,
  "60-Second Read": Zap,
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
  "states-of-bharat": "state-of-bharat",
  "bharats-startups": "bharat-startups",
  "breaking-news": "breaking-news",
};

const STATE_CATEGORY_SLUGS = new Set(["state-of-bharat", "states-of-bharat"]);

const FALLBACK_STATES_OF_INDIA = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Jammu and Kashmir",
];

const FALLBACK_UNION_TERRITORIES = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const UNION_TERRITORIES_LOOKUP = new Set(
  FALLBACK_UNION_TERRITORIES.map((value) => value.toLowerCase())
);

const toUniqueList = (values = []) => {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });

  return result;
};

const splitStatesAndUnionTerritories = (stateNames = []) => {
  const states = [];
  const unionTerritories = [];

  stateNames.forEach((name) => {
    const normalized = String(name || "").trim();
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (UNION_TERRITORIES_LOOKUP.has(key)) {
      unionTerritories.push(normalized);
    } else {
      states.push(normalized);
    }
  });

  return {
    states: toUniqueList([...states, ...FALLBACK_STATES_OF_INDIA]),
    unionTerritories: toUniqueList([...unionTerritories, ...FALLBACK_UNION_TERRITORIES]),
  };
};

const extractStatesFromByStateResponse = (data) => {
  if (Array.isArray(data?.states)) return toUniqueList(data.states);

  if (data?.results && typeof data.results === "object" && !Array.isArray(data.results)) {
    return toUniqueList(Object.keys(data.results));
  }

  if (Array.isArray(data?.results)) {
    return toUniqueList(
      data.results
        .map((item) => item?.selected_state_name || item?.state || item?.state_name)
        .filter(Boolean)
    );
  }

  if (Array.isArray(data)) {
    return toUniqueList(
      data
        .map((item) => item?.selected_state_name || item?.state || item?.state_name)
        .filter(Boolean)
    );
  }

  return [];
};

const buildStateDrawerSubcategories = (existingSubCategories = {}, stateBuckets = null) => {
  const rawEntries = Object.entries(existingSubCategories || {});
  const normalizedGroups = rawEntries
    .map(([label, topics]) => ({
      label: String(label || "").trim(),
      topics: Array.isArray(topics) ? topics : [],
    }))
    .filter((group) => group.label.length > 0);

  const stateGroupFromApi = normalizedGroups.find((group) =>
    group.label.toLowerCase().includes("state")
  );
  const utGroupFromApi = normalizedGroups.find((group) =>
    group.label.toLowerCase().includes("union")
  );

  const statesLabel = stateGroupFromApi?.label || "States of India";
  const unionLabel = utGroupFromApi?.label || "Union Territories";

  const statesFromApi = stateGroupFromApi?.topics || [];
  const utFromApi = utGroupFromApi?.topics || [];

  const mergedStates = toUniqueList([
    ...statesFromApi,
    ...(stateBuckets?.states || []),
    ...FALLBACK_STATES_OF_INDIA,
  ]);
  const mergedUTs = toUniqueList([
    ...utFromApi,
    ...(stateBuckets?.unionTerritories || []),
    ...FALLBACK_UNION_TERRITORIES,
  ]);

  return [
    { label: statesLabel, topics: mergedStates },
    { label: unionLabel, topics: mergedUTs },
  ];
};

const getFinalSlug = (slug, label) => {
  const s = makeSlug(slug, label);
  return SLUG_OVERRIDES[s] || s;
};

const getSearchResultHref = (item) => {
  const publicUrl = String(item?.public_url || "").trim();
  if (publicUrl) return publicUrl;

  const canonicalUrl = String(item?.canonical_url || "").trim();
  if (canonicalUrl) return canonicalUrl;

  const articlePath = getArticlePath(item);
  if (articlePath) return articlePath;

  if (item?.url) return item.url;
  if (item?.link) return item.link;
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
    .replace(/^[^\p{L}\p{N}]+/u, "")
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

const getListFromSearchResponse = (data) => {
  if (Array.isArray(data)) return data;
  return data?.results || data?.categories || data?.data || data?.items || [];
};

const getCategorySearchTitle = (item) =>
  item?.name || item?.title || item?.label || item?.category_name || "Untitled Category";

const getCategorySearchDescription = (item) => {
  const cleaned = stripHtml(item?.description || item?.summary || item?.excerpt || "");
  if (!cleaned) return "";
  const trimmed = cleaned.slice(0, 90).trim();
  return cleaned.length > 90 ? `${trimmed}...` : trimmed;
};

const getCategorySearchHref = (item) => {
  const directLink = item?.path || item?.url || item?.link || "";
  const title = getCategorySearchTitle(item);
  const slug = item?.slug || item?.category_slug || item?.categorySlug;

  if (directLink) {
    try {
      const parsed = new URL(directLink, "https://news4bharat.com");
      if (parsed.pathname.startsWith("/category/")) return parsed.pathname;
    } catch (error) {
      void error;
    }
  }

  return `/category/${getFinalSlug(slug, title)}`;
};

const NAV_SECTIONS = [
  {
    label: "Business",
    Icon: TrendingUp,
    slug: "bharat-economy",
    subcategories: [
      { label: "Macro Economy", topics: ["GDP & Growth", "Inflation", "Fiscal & Monetary", "Employment & Labour Market"] },
      { label: "Government Policy", topics: ["Union Budget", "Economic Reforms", "PLI & Policies", "PSU"] },
      { label: "Industry & Sectors", topics: ["Manufacturing", "Agriculture", "Rural Economy", "Infrastructure & Construction", "Energy & Power", "Telecom & Digital"] },
      { label: "Corporate & Companies", topics: ["Corporate News", "Mergers & Acquisitions", "Company Results", "Business Leaders & Interviews"] },
      { label: "MSME & Entrepreneurship", topics: ["MSME Policies", "Small Business Stories"] },
    ],
  },
  { label: "Bharat's BFSI", slug: "bfsi", Icon: BarChart2, links: ["Banking", "NBFCs", "Fintech", "Stock Market", "Insurance"] },
  { label: "Bharat Opinions", slug: "bharat-opinions", Icon: PenLine, links: ["Editorials", "Expert Opinions", "Industry Voices", "Articles", "Interviews", "Debates & Counterpoints", "Policy Perspective"] },
  { label: "Technology", slug: "technology", Icon: Cpu },
  { label: "Artificial Intelligence", slug: "ai", Icon: Cpu },
  { label: "Bharat By 2047", slug: "bharat-2047", Icon: Flame },
];

const navLinks = [
  { label: "Breaking News", path: "/category/breaking-news" },
  { label: "World News", path: "/category/world-news" },
  { label: "Business", path: "/category/bharat-economy" },
  { label: "Technology", path: "/category/technology" },
  { label: "Sports", path: "/category/sports" },
  { label: "Health", path: "/category/health" },
  { label: "Entertainment", path: "/category/entertainment" },
  { label: "Education", path: "/category/education" },
  { label: "Automobile", path: "/category/automobile" },
  { label: "National", path: "/category/national" },
  { label: "Political", path: "/category/politics" },
  { label: "Trending", path: "/category/trending" },
  { label: "Artificial Intelligence", path: "/category/ai" },
];

const DESKTOP_VISIBLE_NAV_COUNT = 8;

const uniqueNavLinksByPath = (links) => {
  const seen = new Set();
  return links.filter((link) => {
    const key = String(link?.path || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const PUSH_VAPID_KEY_URL = apiUrl("/push/vapid-key/");
const PUSH_SUBSCRIBE_URL = apiUrl("/push/subscribe/");
const LIVE_VAPID_PUBLIC_KEY = "BJ-tbAcljktBC5rfkAWNi7pkhFn_s6pHHd9fo6GwZBi_olNVUxltcE0ErPM6qHTNhX2oCMVpwUOmmD6qhI7LNSE";
const PUSH_STATE_STORAGE_KEY = "news4bharat_push_subscribed";

const toVapidKeyUint8Array = (value) => {
  const normalizedValue = String(value || "").trim();
  const padded = `${normalizedValue}${"=".repeat((4 - (normalizedValue.length % 4)) % 4)}`;
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const getVapidPublicKeyFromResponse = (data) => {
  const candidates = [
    data?.public_key,
    data?.publicKey,
    data?.vapid_key,
    data?.vapidKey,
    data?.key,
    data?.data?.public_key,
    data?.data?.publicKey,
    data?.result?.public_key,
    data?.result?.publicKey,
  ];

  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim()) || "";
};

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedSubcat, setExpandedSubcat] = useState(null);
  const [navSections, setNavSections] = useState(NAV_SECTIONS);
  const [navSectionsLoaded, setNavSectionsLoaded] = useState(false);
  const [weather, setWeather] = useState(null);

  // ✅ FIX: date alag state — time LiveClock handle karega
  const [date, setDate] = useState(
    () => new Date().toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    })
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [categorySearchResults, setCategorySearchResults] = useState([]);
  const [isCategorySearching, setIsCategorySearching] = useState(false);
  const [showCategoryResults, setShowCategoryResults] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [showMoreNav, setShowMoreNav] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  // ✅ Hooks — clean
  const isMobile = useIsMobile();
  const is2K = useIs2K();

  const searchRef = useRef(null);
  const drawerSearchRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const categorySearchDebounceRef = useRef(null);
  const categorySearchRequestRef = useRef(0);
  const headerRef = useRef(null);
  const measuredHeaderHeightRef = useRef(0);
  const navMoreRef = useRef(null);
  const navigate = useNavigate();

  const extra2KNavLinks = [
    { label: "AI", path: "/category/ai" },
    { label: "Bharat Explainers", path: "/category/bharat-explainers" },
    { label: "Bharat Numbers", path: "/category/bharat-in-numbers" },
    { label: "Bharat Startups", path: "/category/bharat-startups" },
    { label: "BFSI", path: "/category/bfsi" },
    { label: "Bharat 2047", path: "/category/bharat-2047" },
    { label: "Opinions", path: "/category/bharat-opinions" },
    { label: "States", path: "/category/state-of-bharat" },
    { label: "60 Sec Read", path: "/category/60-second-read" },
  ];
  const visibleNavLinks = is2K ? uniqueNavLinksByPath([...navLinks, ...extra2KNavLinks]) : navLinks;
  const primaryNavLinks = visibleNavLinks.slice(0, DESKTOP_VISIBLE_NAV_COUNT);
  const overflowNavLinks = visibleNavLinks.slice(DESKTOP_VISIBLE_NAV_COUNT);

  // ✅ FIX: Sirf date fetch karo — time LiveClock mein hai
  useEffect(() => {
    if (isMobile) return;
    const fetchDate = async () => {
      try {
        const res = await fetch(apiUrl("/datetime/"));
        const data = await res.json();
        setDate(
          data.date || data.formatted_date ||
          new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })
        );
      } catch (error) {
        void error;
      }
    };
    const cancelDeferred = deferNonCritical(fetchDate, 5000);
    return () => cancelDeferred();
  }, [isMobile]);

  // Categories — sirf jab drawer open ho
  useEffect(() => {
    if (!isOpen || navSectionsLoaded) return;
    const fetchCategories = async () => {
      try {
        const [categoriesResult, byStateResult] = await Promise.allSettled([
          fetch(apiUrl("/categories/")).then((res) => res.json()),
          fetch(apiUrl("/articles/by-state/")).then((res) =>
            res.ok ? res.json() : null
          ),
        ]);

        const data =
          categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
        const categoryList = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];
        const active = categoryList.filter((cat) => cat?.status === "active");

        const byStateData =
          byStateResult.status === "fulfilled" ? byStateResult.value : null;
        const stateBuckets = splitStatesAndUnionTerritories(
          extractStatesFromByStateResponse(byStateData)
        );

        const sections = active.map(cat => {
          const normalizedSlug = String(cat?.slug || "").trim().toLowerCase();

          let subcategories = null;
          let links = null;

          if (STATE_CATEGORY_SLUGS.has(normalizedSlug)) {
            subcategories = buildStateDrawerSubcategories(
              cat?.sub_categories || {},
              stateBuckets
            );
          } else {
            const subKeys = Object.keys(cat.sub_categories || {});
            if (subKeys.length > 1) {
              subcategories = subKeys.map(key => ({ label: key, topics: cat.sub_categories[key] }));
            } else if (subKeys.length === 1 && (cat.sub_categories[subKeys[0]] || []).length > 0) {
              const vals = cat.sub_categories[subKeys[0]];
              if (subKeys[0] === "default") {
                links = vals;
              } else {
                subcategories = [{ label: subKeys[0], topics: vals }];
              }
            } else if (subKeys.length === 1 && subKeys[0] === "default") {
              links = cat.sub_categories[subKeys[0]] || [];
            }
          }

          if (STATE_CATEGORY_SLUGS.has(normalizedSlug) && (!subcategories || subcategories.length === 0)) {
            subcategories = buildStateDrawerSubcategories({}, stateBuckets);
          }

          return {
            label: cat.name,
            slug: cat.slug,
            Icon: getIconForCategory(cat.name, cat.slug),
            ...(subcategories && { subcategories }),
            ...(links && { links }),
          };
        });

        setNavSections(sections.length > 0 ? sections : NAV_SECTIONS);
        setNavSectionsLoaded(true);
      } catch (err) {
        console.error("Categories API fail:", err.message);

        const fallbackStateSubcategories = buildStateDrawerSubcategories(
          {},
          splitStatesAndUnionTerritories([])
        );
        const fallbackSections = NAV_SECTIONS.map((section) => {
          if (!STATE_CATEGORY_SLUGS.has(String(section?.slug || "").toLowerCase())) {
            return section;
          }

          return {
            ...section,
            subcategories: fallbackStateSubcategories,
            links: undefined,
          };
        });

        setNavSections(fallbackSections);
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
      const res = await fetch(apiUrl(`/search/articles/?q=${encodeURIComponent(query)}`));
      const data = await res.json();
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

  const fetchCategorySearchResults = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setCategorySearchResults([]);
      setShowCategoryResults(false);
      return;
    }

    const requestId = categorySearchRequestRef.current + 1;
    categorySearchRequestRef.current = requestId;
    setIsCategorySearching(true);
    setShowCategoryResults(true);

    try {
      const res = await fetch(
        apiUrl(`/search/categories/?q=${encodeURIComponent(trimmedQuery)}&limit=5`)
      );
      if (!res.ok) throw new Error(`Category search failed: ${res.status}`);

      const data = await res.json();
      if (categorySearchRequestRef.current !== requestId) return;

      setCategorySearchResults(getListFromSearchResponse(data));
    } catch (err) {
      if (categorySearchRequestRef.current === requestId) {
        console.error("Category search API error:", err);
        setCategorySearchResults([]);
      }
    } finally {
      if (categorySearchRequestRef.current === requestId) {
        setIsCategorySearching(false);
      }
    }
  }, []);

  const openCategorySearchResult = useCallback((item) => {
    const href = getCategorySearchHref(item);
    setShowCategoryResults(false);
    setCategorySearchQuery("");
    setCategorySearchResults([]);
    setIsOpen(false);
    setExpandedSection(null);
    setExpandedSubcat(null);
    navigate(href);
  }, [navigate]);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) { setSearchResults([]); setShowResults(false); return; }
    searchDebounceRef.current = setTimeout(() => fetchSearchResults(val), 400);
  }, [fetchSearchResults]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter") { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); fetchSearchResults(searchQuery); }
    if (e.key === "Escape") setShowResults(false);
  }, [fetchSearchResults, searchQuery]);

  const handleSearchResultClick = useCallback((event, item) => {
    const payload = item || {};
    const directUrl = String(payload?.public_url || payload?.canonical_url || "").trim();
    const fallbackUrl = getSearchResultHref(payload);
    const finalUrl = directUrl || fallbackUrl;

    console.log("[Search] clicked item payload:", payload);
    console.log("[Search] opening URL:", finalUrl);

    setShowResults(false);

    if (!finalUrl || finalUrl === "#") {
      event.preventDefault();
      return;
    }

    if (directUrl) {
      event.preventDefault();
      window.location.href = directUrl;
    }
  }, []);

  const handleCategorySearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setCategorySearchQuery(val);
    if (categorySearchDebounceRef.current) clearTimeout(categorySearchDebounceRef.current);

    if (!val.trim()) {
      setCategorySearchResults([]);
      setShowCategoryResults(false);
      return;
    }

    categorySearchDebounceRef.current = setTimeout(() => {
      fetchCategorySearchResults(val);
    }, 300);
  }, [fetchCategorySearchResults]);

  const handleCategorySearchKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      if (categorySearchDebounceRef.current) clearTimeout(categorySearchDebounceRef.current);
      if (categorySearchResults.length > 0) {
        openCategorySearchResult(categorySearchResults[0]);
        return;
      }
      fetchCategorySearchResults(categorySearchQuery);
    }
    if (e.key === "Escape") setShowCategoryResults(false);
  }, [categorySearchQuery, categorySearchResults, fetchCategorySearchResults, openCategorySearchResult]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (drawerSearchRef.current && !drawerSearchRef.current.contains(e.target)) {
        setShowCategoryResults(false);
      }
      if (navMoreRef.current && !navMoreRef.current.contains(e.target)) {
        setShowMoreNav(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }, [isOpen]);

  useEffect(() => {
    if (isMobile) return;
    const fetchWeather = async () => {
      try {
        const response = await fetch(apiUrl("/weather/?city=Delhi"));
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        void error;
      }
    };

    const cancelDeferred = deferNonCritical(fetchWeather, 5200);
    const intervalId = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => {
      cancelDeferred();
      clearInterval(intervalId);
    };
  }, [isMobile]);

  useEffect(() => {
    let ignore = false;

    const syncPushState = async () => {
      if (typeof window === "undefined") return;

      const hasPushSupport =
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window;

      if (!hasPushSupport) {
        if (!ignore) setIsPushSubscribed(false);
        return;
      }

      try {
        const registration =
          (await navigator.serviceWorker.getRegistration("/sw.js")) ||
          (await navigator.serviceWorker.getRegistration());

        const existingSubscription =
          await registration?.pushManager?.getSubscription?.();

        if (ignore) return;
        const subscribed = Boolean(existingSubscription);
        setIsPushSubscribed(subscribed);

        if (subscribed) {
          window.localStorage.setItem(PUSH_STATE_STORAGE_KEY, "1");
        } else {
          window.localStorage.removeItem(PUSH_STATE_STORAGE_KEY);
        }
      } catch (error) {
        void error;
        if (ignore) return;
        const storedValue = window.localStorage.getItem(PUSH_STATE_STORAGE_KEY);
        setIsPushSubscribed(storedValue === "1");
      }
    };

    syncPushState();

    return () => {
      ignore = true;
    };
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
      const entry = entries[0];
      const nextHeight = Math.round(entry?.contentRect?.height || 0);
      if (nextHeight > 0) syncMeasuredHeight(nextHeight);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [isScrolled, isMobile]);

  useEffect(() => {
    if (!isMobile && isScrolled) { setHeaderHeight(56); return; }
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

  const handleTranslateToHindi = useCallback(() => {
    if (typeof window === "undefined") return;
    const translateUrl = new URL("https://translate.google.com/translate");
    translateUrl.searchParams.set("sl", "en");
    translateUrl.searchParams.set("tl", "hi");
    translateUrl.searchParams.set("u", window.location.href);
    window.open(translateUrl.toString(), "_blank", "noopener,noreferrer");
  }, []);

  const fetchVapidPublicKey = useCallback(async () => {
    try {
      const response = await fetch(PUSH_VAPID_KEY_URL);
      if (!response.ok) {
        throw new Error(`VAPID key API failed: ${response.status}`);
      }

      const data = await response.json();
      const liveVapidKey = getVapidPublicKeyFromResponse(data);
      if (liveVapidKey) return liveVapidKey;
    } catch (error) {
      console.error("Could not fetch live VAPID key. Using fallback key.", error);
    }

    return LIVE_VAPID_PUBLIC_KEY;
  }, []);

  const handleNotificationClick = useCallback(async () => {
    if (typeof window === "undefined" || isPushLoading) return;

    const hasPushSupport =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    if (!hasPushSupport) {
      window.alert("Push notifications are not supported in this browser.");
      return;
    }

    setIsPushLoading(true);

    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setIsPushSubscribed(false);
        window.localStorage.removeItem(PUSH_STATE_STORAGE_KEY);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        await existingSubscription.unsubscribe();
        setIsPushSubscribed(false);
        window.localStorage.removeItem(PUSH_STATE_STORAGE_KEY);
        return;
      }

      const vapidPublicKey = await fetchVapidPublicKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toVapidKeyUint8Array(vapidPublicKey),
      });

      const subscriptionJson = subscription.toJSON();
      const payload = {
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh || "",
          auth: subscriptionJson.keys?.auth || "",
        },
      };

      const subscribeResponse = await fetch(PUSH_SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!subscribeResponse.ok) {
        await subscription.unsubscribe().catch(() => { });
        throw new Error(`Push subscribe API failed: ${subscribeResponse.status}`);
      }

      setIsPushSubscribed(true);
      window.localStorage.setItem(PUSH_STATE_STORAGE_KEY, "1");
    } catch (error) {
      console.error("Push subscription flow failed:", error);
      setIsPushSubscribed(false);
      window.localStorage.removeItem(PUSH_STATE_STORAGE_KEY);
      window.alert("Notification setup failed. Please try again.");
    } finally {
      setIsPushLoading(false);
    }
  }, [fetchVapidPublicKey, isPushLoading]);

  const weatherCity = getWeatherCity(weather);
  const weatherTemperature = getWeatherTemperature(weather);
  const weatherCondition = getWeatherCondition(weather);
  const notificationButtonLabel = isPushSubscribed
    ? "Disable notifications"
    : "Enable notifications";
  const notificationButtonTitle = isPushLoading
    ? "Updating notification preference..."
    : isPushSubscribed
      ? "You are subscribed. Click to unsubscribe."
      : "Click to subscribe for notifications.";
  const desktopNotificationClassName = `top-icon-button${isPushSubscribed ? " is-subscribed" : ""}${isPushLoading ? " is-loading" : ""}`;
  const mobileNotificationClassName = `navbar-notification-btn${isPushSubscribed ? " is-subscribed" : ""}${isPushLoading ? " is-loading" : ""}`;

  const topBarClasses = isMobile
    ? "hidden"
    : `${!isOpen && showResults ? "overflow-visible" : "overflow-hidden"} transition-[max-height,opacity] duration-300 ease-out ${isScrolled ? "max-h-0 opacity-0 border-b-0 py-0" : "max-h-[200px] opacity-100 border-b-0 py-1"}`;

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

        {/* <div className="drawer-ticker">
          <span className="drawer-live-badge">LIVE</span>
          Breaking: Sensex surges 600 pts —
        </div> */}

        <div className="drawer-search-wrap" ref={drawerSearchRef}>
          <div className="drawer-search-box">
            <Search size={14} color="#aa9988" />
            <input
              type="text"
              name="drawer-category-search"
              autoComplete="off"
              placeholder="Search categories..."
              value={categorySearchQuery}
              onChange={handleCategorySearchChange}
              onKeyDown={handleCategorySearchKeyDown}
              onFocus={() => {
                if (categorySearchResults.length > 0 || categorySearchQuery.trim()) {
                  setShowCategoryResults(true);
                }
              }}
            />
          </div>
          {showCategoryResults && (
            <div className="drawer-category-results">
              {isCategorySearching ? (
                <div className="drawer-category-result-empty">Searching categories...</div>
              ) : categorySearchResults.length === 0 ? (
                <div className="drawer-category-result-empty">
                  No category found for "{categorySearchQuery}"
                </div>
              ) : (
                categorySearchResults.map((item, idx) => {
                  const title = getCategorySearchTitle(item);
                  const description = getCategorySearchDescription(item);
                  const Icon = getIconForCategory(title, item?.slug || item?.category_slug || "");

                  return (
                    <button
                      type="button"
                      key={item?.id || item?.slug || item?.category_slug || `${title}-${idx}`}
                      className="drawer-category-result"
                      onClick={() => openCategorySearchResult(item)}
                    >
                      <span className="drawer-category-result-icon">
                        <Icon size={14} strokeWidth={2} />
                      </span>
                      <span className="drawer-category-result-copy">
                        <span className="drawer-category-result-title">{title}</span>
                        {description && (
                          <span className="drawer-category-result-desc">{description}</span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="drawer-scroll">
          {navSections.map(({ label, slug, Icon, links, subcategories }) => {
            const sectionOpen = expandedSection === label;
            const hasSubcats = subcategories && subcategories.length > 0;
            const hasLinks = links && links.length > 0;
            const finalSlug = getFinalSlug(slug, label);

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
                      const subcatKey = `${label}__${sub.label}`;
                      const subcatOpen = expandedSubcat === subcatKey;
                      const subcategoryPath = `/category/${finalSlug}?subcategory=${encodeURIComponent(sub.label)}`;
                      const hasTopics = Array.isArray(sub.topics) && sub.topics.length > 0;
                      return (
                        <div key={sub.label} className="drawer-subcat-group">
                          <div
                            className={`drawer-subcat-head flex items-center justify-between cursor-pointer border-b border-slate-200 px-4 py-2 pl-7 text-[13px] font-medium transition-colors duration-150 ${subcatOpen ? "text-red-600 bg-red-50" : "text-slate-800 bg-transparent"}`}
                            onClick={(e) => {
                              if (hasTopics) {
                                toggleSubcat(e, subcatKey);
                              } else {
                                goTo(subcategoryPath);
                              }
                            }}
                          >
                            <span
                              className="cursor-pointer hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                goTo(subcategoryPath);
                              }}
                            >
                              {sub.label}
                            </span>
                            {hasTopics && (
                              <ChevronDown
                                size={12}
                                color={subcatOpen ? "#D80100" : "#bbb"}
                                className={`transition-transform duration-200 ease-out ${subcatOpen ? "rotate-180" : "rotate-0"}`}
                              />
                            )}
                          </div>
                          {subcatOpen && hasTopics && (
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


        {/* Top Bar — Exclusive Interviews + Social */}
        {!isScrolled && (
          <div className={`top-bar ${topBarClasses}`}>
            <div className="header-shell top-bar-shell">
              <div className="top-bar-left">
                <div className="top-meta" aria-label="Date and time">
                  <span className="top-meta-pill top-datetime">
                    <CalendarDays size={14} aria-hidden="true" />
                    <span>{date}</span>
                    <span className="top-datetime-sep">|</span>
                    <span><LiveClock /> IST</span>
                  </span>
                  <Link to="/weather" className="top-meta-pill top-weather" aria-label="Open weather page">
                    <CloudSun size={15} aria-hidden="true" />
                    <span>
                      {weatherCity}
                      {weatherTemperature ? ` ${weatherTemperature}` : ""}
                      {weatherCondition ? (
                        <span className="top-weather-condition">, {weatherCondition}</span>
                      ) : null}
                    </span>
                  </Link>
                </div>
                <Link
                  to="/category/bharat-opinions"
                  className="top-exclusive-link"
                  aria-label="Open Exclusive Interviews page"
                >
                  <FileText size={14} aria-hidden="true" />
                  <span>Exclusive Articles & Interviews</span>
                </Link>
              </div>

              <div className="top-social-links" aria-label="Follow us on social media">
                <a
                  href="https://www.linkedin.com/company/news4bharat"
                  target="_blank"
                  rel="noreferrer"
                  className="top-social-link"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={14} aria-hidden="true" />
                </a>
                <a
                  href="https://www.instagram.com/news4_bharat?igsh=MWlxem53bjNobHl2Zw%3D%3D&utm_source=qr"
                  target="_blank"
                  rel="noreferrer"
                  className="top-social-link"
                  aria-label="Instagram"
                >
                  <Instagram size={14} aria-hidden="true" />
                </a>
                <a
                  href={YOUTUBE_CHANNEL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="top-social-link"
                  aria-label="YouTube"
                >
                  <Youtube size={14} aria-hidden="true" />
                </a>
                <a
                  href="https://x.com/news4_bharat?s=21&t=QmL3UuRgMMfwt2JDGmB3mQ"
                  target="_blank"
                  rel="noreferrer"
                  className="top-social-link"
                  aria-label="X (Twitter)"
                >
                  <span className="top-social-x" aria-hidden="true">X</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {!isScrolled && (
          <div className={`navbar-search-bar ${topBarClasses}`}>
            <div className="header-shell">
              <div className="search-row">
                <div className="search-center">
                  <div className="search-box relative" ref={searchRef} style={{ position: "relative" }}>
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search news..."
                      name="navbar-article-search"
                      autoComplete="off"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => !isOpen && searchResults.length > 0 && setShowResults(true)}
                    />
                    <Mic size={14} className="mic-icon" />
                    {!isOpen && showResults && (
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
                              onClick={(event) => handleSearchResultClick(event, item)}
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

                <div className="top-actions search-actions" aria-label="Search tools">
                  <button
                    type="button"
                    className="top-action-btn"
                    onClick={handleTranslateToHindi}
                    aria-label="Translate this page from English to Hindi"
                  >
                    <Languages size={14} aria-hidden="true" />
                    <span>EN to HI</span>
                  </button>
                  <button
                    type="button"
                    className={desktopNotificationClassName}
                    onClick={handleNotificationClick}
                    disabled={isPushLoading}
                    aria-label={notificationButtonLabel}
                    title={notificationButtonTitle}
                  >
                    <Bell size={15} aria-hidden="true" />
                    <span className="notification-dot" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              {primaryNavLinks.map((link, idx) => (
                <Link key={`${link.path}-${idx}`} to={link.path} className="nav-link">
                  {link.label}
                </Link>
              ))}
              {overflowNavLinks.length > 0 && (
                <li
                  className={`nav-more${showMoreNav ? " open" : ""}`}
                  ref={navMoreRef}
                >
                  <button
                    type="button"
                    className="nav-more-button"
                    aria-expanded={showMoreNav}
                    aria-label="Show more categories"
                    onClick={() => setShowMoreNav((current) => !current)}
                  >
                    <MoreHorizontal size={18} aria-hidden="true" />
                  </button>
                  <div className="nav-more-menu">
                    {overflowNavLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className="nav-more-link"
                        onClick={() => setShowMoreNav(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </li>
              )}
            </ul>

            <div className="mobile-nav-actions">
              <button
                type="button"
                className="btn-flag navbar-hindi-btn"
                onClick={handleTranslateToHindi}
                aria-label="Translate this page from English to Hindi"
              >
                <svg width="14" height="10" viewBox="0 0 16 11">
                  <rect width="16" height="3.67" fill="#FF9933" />
                  <rect y="3.67" width="16" height="3.67" fill="white" />
                  <rect y="7.33" width="16" height="3.67" fill="#138808" />
                  <circle cx="8" cy="5.5" r="1.5" fill="#000080" />
                </svg>
                EN to HI
              </button>
              <button
                type="button"
                className={mobileNotificationClassName}
                onClick={handleNotificationClick}
                disabled={isPushLoading}
                aria-label={notificationButtonLabel}
                title={notificationButtonTitle}
              >
                <Bell size={15} aria-hidden="true" />
                <span className="notification-dot" aria-hidden="true" />
              </button>
            </div>
          </div>
        </nav>

      </header>
    </>
  );
};

export default Header;
