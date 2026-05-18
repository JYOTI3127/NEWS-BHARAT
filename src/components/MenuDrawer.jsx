import { createElement, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, TrendingUp, PenLine, Cpu, Flame,
  ChevronDown, ChevronRight, X, Loader2, FileText,
  Globe, Trophy, Zap, Film, Newspaper,
  Heart, GraduationCap, BookOpen, Leaf, Shield,
  Clock, AlertCircle, Users, Car, MapPin, Hash, Target, Brain, Flag,
} from "lucide-react";
import logo from "../assets/logo 01 (1) compact.png";
import { apiUrl } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

// ── Exact name → Icon (pehle check hoga) ──
const CATEGORY_ICON_MAP = {
  "Breaking News": Flame,
  "World News": Globe,
  "Business": TrendingUp,
  "Technology": Cpu,
  "Sports": Trophy,
  "Entertainment": Film,
  "Health": Heart,
  "Education": GraduationCap,
  "Automobile": Car,
  "National": Shield,           // Globe tha — ab Shield
  "Politics": PenLine,
  "Political": PenLine,
  "Trending": BarChart2,        // TrendingUp tha — ab BarChart2
  "States of Bharat": MapPin,   // Globe tha — ab MapPin
  "Bharat's BFSI": BarChart2,
  "Bharat in Numbers": Hash,    // BarChart2 tha — ab Hash
  "Bharat Opinions": PenLine,
  "Bharat's Startups": Zap,
  "Bharat 2047": Target,        // Flame tha — ab Target
  "Bharat By 2047": Target,
  "Bharat Explainers": BookOpen, // TrendingUp tha — ab BookOpen
  "Artificial Intelligence": Brain, // Cpu tha — ab Brain
  "60-Second Read": Clock,
  "Markets": TrendingUp,        // Heart tha — ab TrendingUp
  "India": Flag,                // Heart tha — ab Flag
  "Press Release": Newspaper,
  "Viral & Fact Check": AlertCircle,
  "Q4 Performance & Strategic Outlook": BarChart2,
};

// ── Icon name → Component ──
const ICON_COMPONENT_MAP = {
  TrendingUp, BarChart2, Zap, Flame, Globe, PenLine,
  Cpu, FileText, Heart, Trophy, Film, GraduationCap,
  Newspaper, BookOpen, Leaf, Shield, Clock,
  AlertCircle, Users, Car,
};

// ── Keyword → Icon (naye categories ke liye) ──
const KEYWORD_ICON_MAP = [
  { keywords: ["business", "economy", "trade", "commerce", "corporate"], icon: "TrendingUp" },
  { keywords: ["bfsi", "bank", "banking", "finance", "fintech", "insurance", "stock", "nfbc", "market", "sensex", "nifty"], icon: "BarChart2" },
  { keywords: ["startup", "entrepreneur", "msme", "venture"], icon: "Zap" },
  { keywords: ["number", "data", "statistics", "analytics", "metric"], icon: "BarChart2" },
  { keywords: ["breaking", "urgent", "live", "alert", "flash"], icon: "Flame" },
  { keywords: ["world", "global", "international", "foreign", "geopolit"], icon: "Globe" },
 { keywords: ["national", "domestic"], icon: "Globe" },
  { keywords: ["state", "region", "province", "local"], icon: "Globe" },
  { keywords: ["political", "politics", "election", "government", "parliament", "lok sabha", "rajya sabha"], icon: "PenLine" },
  { keywords: ["trending", "viral", "popular", "buzz", "hot"], icon: "TrendingUp" },
  { keywords: ["tech", "technology", "digital", "cyber", "software", "hardware", "gadget", "mobile", "phone"], icon: "Cpu" },
  { keywords: ["ai", "artificial intelligence", "machine learning", "ml", "robot"], icon: "Cpu" },
  { keywords: ["space", "isro", "nasa", "rocket", "satellite"], icon: "BookOpen" },
  { keywords: ["science", "research", "lab", "experiment"], icon: "BookOpen" },
  { keywords: ["health", "medical", "doctor", "hospital", "medicine", "wellness", "fitness", "yoga"], icon: "Heart" },
  { keywords: ["sport", "cricket", "football", "tennis", "badminton", "olympic", "ipl", "kabaddi"], icon: "Trophy" },
  { keywords: ["entertainment", "bollywood", "movie", "film", "ott", "web series", "celebrity", "actor"], icon: "Film" },
  { keywords: ["education", "school", "college", "exam", "student", "cbse", "upsc", "neet"], icon: "GraduationCap" },
  { keywords: ["automobile", "car", "bike", "vehicle", "ev", "electric"], icon: "Car" },
  { keywords: ["opinion", "editorial", "analysis", "perspective", "debate"], icon: "PenLine" },
  { keywords: ["explainer", "explain", "guide"], icon: "FileText" },
  { keywords: ["2047", "future", "vision", "goal"], icon: "Flame" },
  { keywords: ["environment", "climate", "green", "eco", "nature", "sustainability"], icon: "Leaf" },
  { keywords: ["defence", "army", "military", "security", "border", "war", "conflict"], icon: "Shield" },
  { keywords: ["law", "court", "judiciary", "legal", "crime", "police"], icon: "Shield" },
  { keywords: ["60 second", "quick", "brief", "short", "minute"], icon: "Clock" },
  { keywords: ["press release", "press", "media"], icon: "Newspaper" },
  { keywords: ["viral", "fact check", "fake", "misinformation"], icon: "AlertCircle" },
  { keywords: ["q4", "quarterly", "result", "earning", "profit", "revenue"], icon: "BarChart2" },
  { keywords: ["agriculture", "farm", "crop", "rural", "kisan", "farmer"], icon: "Leaf" },
  { keywords: ["energy", "power", "solar", "wind", "oil", "gas", "coal"], icon: "Zap" },
  { keywords: ["social", "society", "community", "welfare", "women", "child"], icon: "Users" },
];


const SLUG_ICON_MAP = {
  "business": TrendingUp,
  "bfsi": BarChart2,
  "bharat-opinions": PenLine,
  "bharat-startups": Zap,
  "bharat-2047": Flame,
  "bharat-in-numbers": BarChart2,
  "state-of-bharat": Globe,
  "states-of-bharat": Globe,
  "breaking-news": Flame,
  "world-news": Globe,
  "technology": Cpu,
  "ai": Cpu,
  "artificial-intelligence": Cpu,
  "sports": Trophy,
  "entertainment": Film,
  "health": Heart,
  "education": GraduationCap,
  "automobile": Car,
  "national": Globe,
  "politics": PenLine,
  "political": PenLine,
  "trending": TrendingUp,
  "markets": BarChart2,
  "press-release": Newspaper,
  "60-second-read": Clock,
  "viral-and-fact-check": AlertCircle,
};

// ── Fallback icons (last resort) ──
const FALLBACK_ICONS = [
  Newspaper, Globe, TrendingUp, BarChart2, Cpu,
  Trophy, Zap, Film, PenLine, Flame, FileText,
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

// ── Smart Icon Function ──
const getIconForCategory = (name, slug = "") => {
  // 1. Slug exact match
  const cleanSlug = String(slug || "").trim().toLowerCase();
  if (cleanSlug && SLUG_ICON_MAP[cleanSlug]) return SLUG_ICON_MAP[cleanSlug];

  // 2. Name exact match (case-insensitive)
  const cleanName = String(name || "").trim().toLowerCase();
  const nameMatch = Object.entries(CATEGORY_ICON_MAP)
    .find(([k]) => k.toLowerCase().trim() === cleanName);
  if (nameMatch) return nameMatch[1];

  // 3. Keyword match sirf slug pe
  const slugWords = cleanSlug.replace(/-/g, " ");
  for (const { keywords, icon } of KEYWORD_ICON_MAP) {
    if (keywords.some(kw => slugWords.includes(kw))) {
      return ICON_COMPONENT_MAP[icon] || Newspaper;
    }
  }

  // 4. Name keyword match (fallback)
  for (const { keywords, icon } of KEYWORD_ICON_MAP) {
    if (keywords.some(kw => cleanName.includes(kw))) {
      return ICON_COMPONENT_MAP[icon] || Newspaper;
    }
  }

  // 5. Stable hash fallback
  return FALLBACK_ICONS[getStableIconIndex(slug || name)];
};

const normalizeCategoryLabel = (value) => {
  const label = String(value || "").trim();
  return label.toLowerCase() === "political" ? "Politics" : label;
};

const makeSlug = (slug, label) => {
  if (slug && String(slug).trim() !== "") return slug;
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const SLUG_OVERRIDES = {
  "bharat-in-numbers": "bharat-in-numbers",
  "states-of-bharat": "state-of-bharat",
  "bharats-startups": "bharat-startups",
  "breaking-news": "breaking-news",
};
const STATE_CATEGORY_SLUGS = new Set(["state-of-bharat", "states-of-bharat"]);
const NON_NAVIGABLE_STATE_PARENT_LABELS = new Set(["states of india", "union territories"]);

const getFinalSlug = (slug, label) => {
  const normalized = makeSlug(slug, label);
  return SLUG_OVERRIDES[normalized] || normalized;
};

const isStateParentGroupLabel = (categorySlug, subcategoryLabel) =>
  STATE_CATEGORY_SLUGS.has(String(categorySlug || "").trim().toLowerCase()) &&
  NON_NAVIGABLE_STATE_PARENT_LABELS.has(String(subcategoryLabel || "").trim().toLowerCase());

// ── NAV_SECTIONS (fallback) ──
const NAV_SECTIONS = [
  {
    label: "Business",
    slug: "business",
    Icon: TrendingUp,
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
  { label: "Technology", slug: "technology", Icon: Cpu, links: ["Technology"] },
  { label: "Artificial Intelligence", slug: "ai", Icon: Cpu, links: ["Artificial Intelligence"] },
  { label: "Bharat By 2047", slug: "bharat-2047", Icon: Flame, links: ["Bharat By 2047"] },
];

// ── Nav links ──
const navLinks = [
  { label: "Breaking News", path: "/category/breaking-news", isBreaking: true },
  { label: "World News", path: "/category/world-news" },
  { label: "Business", path: "/category/business" },
  { label: "Technology", path: "/category/technology" },
  { label: "Sports", path: "/category/sports" },
  { label: "Entertainment", path: "/category/entertainment" },
  { label: "Health", path: "/category/health" },
  { label: "Education", path: "/category/education" },
  { label: "Automobile", path: "/category/automobile" },
  { label: "National", path: "/category/national" },
  { label: "Politics", path: "/category/politics" },
  { label: "Trending", path: "/category/trending" },
  { label: "About Us", path: "/about-us" },
  { label: "Founder's Note", path: "/founders-note" },
  { label: "Editorial Policy", path: "/editorial-policy" },
  { label: "Careers", path: "/careers" },
  { label: "Contact Us", path: "/contact-us" },
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Terms & Conditions", path: "/terms-and-conditions" },
  { label: "Disclaimer", path: "/disclaimer" },
];

// ── Footer pills ──
const footerPills = [
  { label: "Newsletter", path: "/newsletter" },
  { label: "60 Second", path: "/60-second-read" },
  { label: "Bharat Opinion", path: "/bharat-opinions" },
];

// ── Article Image with fallback ──
function ArticleImg({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div style={{ width: 56, height: 44, borderRadius: 6, background: "#f0ece8", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: "#ccc" }}>No Img</span>
      </div>
    );
  }
  return (
    <img src={src} alt={alt}
      style={{ width: 56, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
      width={56} height={44} loading="lazy" decoding="async"
      onError={() => setErr(true)}
    />
  );
}

// ── Main Component ──
export default function MenuDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedSubcat, setExpandedSubcat] = useState(null);
  const [navSections, setNavSections] = useState(NAV_SECTIONS);
  const [navSectionsLoaded, setNavSectionsLoaded] = useState(false);
  const [showBreaking, setShowBreaking] = useState(false);
  const [breakingArticles, setBreakingArticles] = useState([]);
  const [breakingLoading, setBreakingLoading] = useState(false);

  const quickLinks = useMemo(() => {
    const categoryPaths = new Set(
      navSections.map((section) => `/category/${getFinalSlug(section?.slug, section?.label)}`)
    );
    return navLinks.filter((link) => !categoryPaths.has(String(link?.path || "").trim()));
  }, [navSections]);

  useEffect(() => {
    if (!showBreaking || breakingArticles.length > 0) return;
    setBreakingLoading(true);
    fetch(apiUrl("/articles/?category=breaking-news&page=1&limit=10"))
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : (data.results || []);
        const breaking = all.filter((a) => {
          const cats = a.category_details || a.categories || [];
          return cats.some((c) => c.slug === "breaking-news" || (c.name || "").toLowerCase().includes("breaking"));
        });
        const result = breaking.length > 0 ? breaking : all;
        const sorted = result
          .sort((a, b) => new Date(b.published_date || b.published_at || b.created_at || 0) - new Date(a.published_date || a.published_at || a.created_at || 0))
          .slice(0, 10);
        setBreakingArticles(sorted);
        setBreakingLoading(false);
      })
      .catch(() => setBreakingLoading(false));
  }, [showBreaking]);

  useEffect(() => {
    if (!open || navSectionsLoaded) return;
    const fetchCategories = async () => {
      try {
        const res = await fetch(apiUrl("/categories/"));
        const data = await res.json();
        const active = Array.isArray(data) ? data.filter((cat) => cat?.status === "active") : [];

        const sections = active.map((cat) => {
          const subCategories = cat?.sub_categories || {};
          const subKeys = Object.keys(subCategories);
          let links = null;
          let subcategories = null;

          if (subKeys.length > 1) {
            subcategories = subKeys.map((key) => ({
              label: key,
              topics: Array.isArray(subCategories[key]) ? subCategories[key] : [],
            }));
          } else if (subKeys.length === 1) {
            const key = subKeys[0];
            const values = Array.isArray(subCategories[key]) ? subCategories[key] : [];
            if (key === "default") {
              links = values;
            } else if (values.length > 0) {
              subcategories = [{ label: key, topics: values }];
            }
          }

          return {
            label: normalizeCategoryLabel(cat?.name),
            slug: cat?.slug,
            Icon: getIconForCategory(cat?.name, cat?.slug), // ✅ Smart icon
            ...(subcategories ? { subcategories } : {}),
            ...(links ? { links } : {}),
          };
        });

        setNavSections(sections.length > 0 ? sections : NAV_SECTIONS);
        setNavSectionsLoaded(true);
      } catch {
        setNavSections(NAV_SECTIONS);
        setNavSectionsLoaded(true);
      }
    };
    fetchCategories();
  }, [open, navSectionsLoaded]);

  const handleNav = (path) => {
    if (!path) return;
    onClose();
    setShowBreaking(false);
    setTimeout(() => navigate(path), 280);
  };

  const goToArticle = (article) => {
    onClose();
    setShowBreaking(false);
    setTimeout(() => {
      const articlePath = getArticlePath(article);
      if (articlePath) navigate(articlePath);
    }, 280);
  };

  const toggleSection = (label) => {
    setExpandedSection(prev => prev === label ? null : label);
    setExpandedSubcat(null);
  };

  const toggleSubcat = (e, key) => {
    e.stopPropagation();
    setExpandedSubcat(prev => prev === key ? null : key);
  };

  const imgSrc = (a) => a?.image_url || a?.image || null;

  return (
    <>
      <style>{`
        .md-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1100; }
        .md-drawer {
          position:fixed;top:0;left:0;bottom:0;width:300px;background:#fff;
          z-index:1101;display:flex;flex-direction:column;
          box-shadow:4px 0 32px rgba(0,0,0,0.18);font-family:'Poppins',sans-serif;overflow:hidden;
          transition:transform 0.32s cubic-bezier(0.4,0,0.2,1);
        }
        .md-header { background:#D80100;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0; }
        .md-close { background:rgba(255,255,255,0.2);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;transition:background 0.2s; }
        .md-close:hover { background:rgba(255,255,255,0.35); }
        .md-body { flex:1;overflow-y:auto;overflow-x:hidden; }
        .md-section-title { font-size:9.5px;font-weight:600;color:#aaa;letter-spacing:2px;text-transform:uppercase;padding:14px 16px 4px; }
        .md-divider { height:1px;background:#f0f0f0;margin:6px 16px; }
        .md-link { display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer;transition:background 0.15s;border:none;background:none;width:100%;text-align:left;font-family:'Poppins',sans-serif;color:#222;border-bottom:1px solid #f5f5f5; }
        .md-link:hover,.md-link.active { background:#fff5f5;color:#D80100; }
        .md-link-dot { width:6px;height:6px;border-radius:50%;background:#D80100;flex-shrink:0;opacity:0.5; }
        .md-link:hover .md-link-dot,.md-link.active .md-link-dot { opacity:1; }
        .md-link-label { font-size:13px;font-weight:500;flex:1; }
        .md-link-arrow { color:#ddd;transition:color 0.15s; }
        .md-link:hover .md-link-arrow,.md-link.active .md-link-arrow { color:#D80100; }
        .md-bn-panel { background:#fff8f7;border-bottom:2px solid #f0ece8; }
        .md-bn-top { display:flex;align-items:center;justify-content:space-between;padding:10px 16px 6px; }
        .md-bn-badge { font-size:9px;font-weight:700;color:#fff;background:#D80100;padding:3px 8px;border-radius:4px;letter-spacing:1.5px;text-transform:uppercase; }
        .md-bn-x { font-size:11px;color:#aaa;cursor:pointer;background:none;border:none;font-family:'Poppins',sans-serif;padding:2px 6px; }
        .md-bn-x:hover { color:#D80100; }
        .md-bn-item { display:flex;gap:10px;padding:10px 16px;border-bottom:1px solid #f0ece8;cursor:pointer;transition:background 0.15s; }
        .md-bn-item:hover { background:#fff0f0; }
        .md-bn-item:last-of-type { border-bottom:none; }
        .md-bn-title { font-size:12px;font-weight:500;color:#222;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-family:'Poppins',sans-serif; }
        .md-bn-date { font-size:10px;color:#aaa;margin-top:3px;font-family:'Poppins',sans-serif; }
        .md-bn-viewall { display:block;text-align:center;padding:10px;font-size:12px;font-weight:600;color:#D80100;cursor:pointer;background:none;border:none;border-top:1px solid #f0ece8;width:100%;font-family:'Poppins',sans-serif;transition:background 0.15s; }
        .md-bn-viewall:hover { background:#fff0f0; }
        .md-sec-head { display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;border:none;background:none;width:100%;text-align:left;font-family:'Poppins',sans-serif;border-bottom:1px solid #f0f0f0;transition:background 0.15s; }
        .md-sec-head:hover { background:#fff5f5; }
        .md-sec-icon { width:30px;height:30px;border-radius:8px;background:#fff0f0;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .md-sec-label { font-size:13px;font-weight:600;color:#222;flex:1; }
        .md-sec-toggle { border:none;background:none;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer; }
        .md-sub-body { overflow:hidden;background:#fafafa; }
        .md-sub-link { display:block;padding:9px 16px 9px 40px;font-size:12.5px;font-weight:400;color:#555;border-bottom:1px solid #f0ece8;cursor:pointer;transition:color 0.15s,background 0.15s;font-family:'Poppins',sans-serif;background:none;width:100%;text-align:left;border-left:none;border-right:none;border-top:none; }
        .md-sub-link:hover { color:#D80100;background:#fff8f7; }
        .md-subcat-head { display:flex;align-items:center;justify-content:space-between;padding:9px 16px 9px 32px;cursor:pointer;font-size:12.5px;font-weight:500;color:#333;border-bottom:1px solid #f0ece8;background:transparent;transition:background 0.15s;font-family:'Poppins',sans-serif;border:none;width:100%;text-align:left; }
        .md-subcat-head:hover,.md-subcat-head.active { background:#fff4f3;color:#D80100; }
        .md-topic-btn { display:block;padding:7px 16px 7px 52px;font-size:12px;color:#666;border-bottom:1px solid #f8f4f0;font-family:'Poppins',sans-serif;transition:color 0.15s,background 0.15s;background:none;width:100%;text-align:left;border-left:none;border-right:none;border-top:none;cursor:pointer; }
        .md-topic-btn:hover { color:#D80100;background:#fff8f7; }
        .md-footer { padding:14px 16px;border-top:1px solid #f0f0f0;flex-shrink:0;background:#fff; }
        .md-footer-pills { display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px; }
        .md-pill { font-size:11px;font-family:'Poppins',sans-serif;font-weight:500;padding:4px 10px;border-radius:20px;background:#f5f5f5;color:#555;cursor:pointer;transition:background 0.15s,color 0.15s;border:none; }
        .md-pill:hover { background:#ffe5e5;color:#D80100; }
        .md-footer-text { font-size:10.5px;color:black;text-align:center;font-family:'Poppins',sans-serif; }
        .md-footer-text span { color:#D80100;font-weight:600; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .md-spin { animation:spin 0.8s linear infinite;display:inline-block; }
      `}</style>

      {open && <div className="md-overlay" onClick={onClose} />}

      <div className="md-drawer" style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}>

        <div className="md-header">
          <img src={logo} alt="News4Bharat" width="384" height="58" loading="lazy" decoding="async"
            style={{ height: 32, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }}
          />
          <button className="md-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="md-body">
          <div className="md-section-title">Categories</div>

          {navSections.map(({ label, slug, Icon: SectionIcon, links, subcategories }) => {
            const sectionOpen = expandedSection === label;
            const hasSubcats = subcategories && subcategories.length > 0;
            const hasLinks = links && links.length > 0;
            const finalSlug = getFinalSlug(slug, label);

            return (
              <div key={label}>
                <div
                  className="md-sec-head"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNav(`/category/${finalSlug}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNav(`/category/${finalSlug}`);
                    }
                  }}
                >
                  <span className="md-sec-icon">
                    {createElement(SectionIcon, { size: 15, color: "#D80100", strokeWidth: 2 })}
                  </span>
                  <span className="md-sec-label">{label}</span>
                  {(hasSubcats || hasLinks) && (
                    <button
                      type="button"
                      className="md-sec-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(label);
                      }}
                      aria-label={`${sectionOpen ? "Collapse" : "Expand"} ${label}`}
                    >
                      <ChevronDown
                        size={14}
                        color="#aaa"
                        style={{ transition: "transform 0.2s", transform: sectionOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>
                  )}
                </div>

                <div className="md-sub-body" style={{ maxHeight: sectionOpen ? "600px" : "0", transition: "max-height 0.3s ease" }}>
                  {hasSubcats ? (
                    subcategories.map((sub) => {
                      const key = `${label}__${sub.label}`;
                      const subcatOpen = expandedSubcat === key;
                      const subcategoryPath = `/category/${finalSlug}?subcategory=${encodeURIComponent(sub.label)}`;
                      const hasTopics = Array.isArray(sub.topics) && sub.topics.length > 0;
                      const isParentOnlyGroup = isStateParentGroupLabel(finalSlug, sub.label);
                      return (
                        <div key={sub.label}>
                          <button className={`md-subcat-head${subcatOpen ? " active" : ""}`}
                            onClick={(e) => {
                              if (hasTopics) toggleSubcat(e, key);
                              else if (!isParentOnlyGroup) handleNav(subcategoryPath);
                            }}>
                            <span onClick={(e) => { if (isParentOnlyGroup) return; e.stopPropagation(); handleNav(subcategoryPath); }}>
                              {sub.label}
                            </span>
                            {hasTopics && (
                              <ChevronDown size={12} color={subcatOpen ? "#D80100" : "#bbb"}
                                style={{ transition: "transform 0.2s", transform: subcatOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                              />
                            )}
                          </button>
                          {subcatOpen && hasTopics && (sub.topics || []).map((topic) => {
                            const topicLabel = typeof topic === "string" ? topic : topic?.label;
                            const topicPath = typeof topic === "string"
                              ? `/category/${finalSlug}?subcategory=${encodeURIComponent(topic)}`
                              : topic?.path;
                            return (
                              <button key={topicLabel} className="md-topic-btn" onClick={() => handleNav(topicPath)}>
                                › {topicLabel}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : hasLinks ? (
                    links.map((link) => {
                      const linkLabel = typeof link === "string" ? link : link?.label;
                      const linkPath = typeof link === "string"
                        ? `/category/${finalSlug}?subcategory=${encodeURIComponent(link)}`
                        : link?.path;
                      return (
                        <button key={linkLabel} className="md-sub-link" onClick={() => handleNav(linkPath)}>
                          › {linkLabel}
                        </button>
                      );
                    })
                  ) : null}
                </div>
              </div>
            );
          })}

          <div className="md-divider" />
          <div className="md-section-title">Quick Links</div>

          {quickLinks.map(({ label, path, isBreaking }) => (
            <button key={label}
              className={`md-link${isBreaking && showBreaking ? " active" : ""}`}
              onClick={() => isBreaking ? setShowBreaking(v => !v) : handleNav(path)}
            >
              <span className="md-link-dot" />
              <span className="md-link-label">{label}</span>
              {isBreaking && showBreaking
                ? <span style={{ fontSize: 9, color: "#D80100", fontWeight: 700, letterSpacing: 1 }}>● LIVE</span>
                : <span className="md-link-arrow"><ChevronRight size={14} /></span>
              }
            </button>
          ))}

          {showBreaking && (
            <div className="md-bn-panel">
              <div className="md-bn-top">
                <span className="md-bn-badge">🔴 Breaking News</span>
                <button className="md-bn-x" onClick={() => setShowBreaking(false)}>✕ Close</button>
              </div>
              {breakingLoading ? (
                <div style={{ padding: "20px", textAlign: "center" }}>
                  <Loader2 size={20} color="#D80100" className="md-spin" />
                  <p style={{ fontSize: 12, color: "#aaa", marginTop: 8, fontFamily: "Poppins,sans-serif" }}>Loading...</p>
                </div>
              ) : breakingArticles.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#bbb", fontFamily: "Poppins,sans-serif" }}>
                  No breaking news right now
                </div>
              ) : (
                <>
                  {breakingArticles.map((article) => (
                    <div key={article.id} className="md-bn-item" onClick={() => goToArticle(article)}>
                      <ArticleImg src={imgSrc(article)} alt={article.title} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="md-bn-title">{article.title}</p>
                        <span className="md-bn-date">
                          {article.date ? new Date(article.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button className="md-bn-viewall" onClick={() => handleNav("/category/breaking-news")}>
                    View All Breaking News →
                  </button>
                </>
              )}
            </div>
          )}

          <div style={{ height: 16 }} />
        </div>

        <div className="md-footer">
          <div className="md-footer-pills">
            {footerPills.map(({ label, path }) => (
              <button key={label} className="md-pill" onClick={() => handleNav(path)}>{label}</button>
            ))}
          </div>
          <p className="md-footer-text">&copy; 2025 <span>News4Bharat</span>. All rights reserved.</p>
        </div>

      </div>
    </>
  );
}
