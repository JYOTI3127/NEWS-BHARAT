import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MenuDrawer from "./MenuDrawer";
import { apiUrl } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";

const BOTTOM_STRIP_CATEGORY_SLUG = "bharat-explainers";
const BREAKING_NEWS_CACHE_KEY = "bottomBharatExplainersOnlyV1";
const OLD_BREAKING_NEWS_CACHE_KEYS = [
  "bottomBreakingNewsItems",
  "bottomBharatExplainersItems",
  "bottomBharatExplainersItemsV2",
];

const getArticleCategories = (article) => {
  const categoryDetails = Array.isArray(article?.category_details)
    ? article.category_details
    : article?.category_details
      ? [article.category_details]
      : [];
  const categories = Array.isArray(article?.categories) ? article.categories : [];
  const category = article?.category ? [article.category] : [];

  return [...categoryDetails, ...categories, ...category];
};

const isBharatExplainerArticle = (article) =>
  getArticleCategories(article).some((category) => {
    if (typeof category === "string") {
      const value = category.toLowerCase();
      return value === BOTTOM_STRIP_CATEGORY_SLUG || value.includes("bharat explainer");
    }

    const slug = String(category?.slug || category?.category_slug || "").toLowerCase();
    const name = String(category?.name || category?.title || "").toLowerCase();
    return slug === BOTTOM_STRIP_CATEGORY_SLUG || name.includes("bharat explainer");
  });

const getArticleDateValue = (article) =>
  article?.published_at ||
  article?.created_at ||
  article?.updated_at ||
  article?.date ||
  article?.published_date ||
  article?.publish_date ||
  "";

const sortLatestArticles = (articles) =>
  [...articles].sort(
    (a, b) => new Date(getArticleDateValue(b) || 0) - new Date(getArticleDateValue(a) || 0)
  );

const getOnlyBharatExplainers = (items) =>
  (Array.isArray(items) ? items : [])
    .filter((article) => article?.status !== "draft")
    .filter(isBharatExplainerArticle);

const getCachedBreakingNews = () => {
  if (typeof window === "undefined") return [];

  try {
    const cached = window.sessionStorage.getItem(BREAKING_NEWS_CACHE_KEY);
    const parsed = cached ? JSON.parse(cached) : [];
    return sortLatestArticles(getOnlyBharatExplainers(parsed)).slice(0, 2);
  } catch {
    return [];
  }
};

const setCachedBreakingNews = (items) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      BREAKING_NEWS_CACHE_KEY,
      JSON.stringify(sortLatestArticles(getOnlyBharatExplainers(items)).slice(0, 2))
    );
  } catch {
    // Ignore storage errors; the live fetch still updates the UI.
  }
};

const HomeIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const NewsletterIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M4 8.5l8 5 8-5" />
    <path d="M8 16h8" />
  </svg>
);

const SearchIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" />
  </svg>
);

const LiveTVIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M7 7L12 2l5 5" />
    <circle cx="8" cy="14" r="1" fill={active ? "#D80100" : "#999999"} stroke="none" />
    <line x1="12" y1="12" x2="12" y2="17" />
    <circle cx="16" cy="14" r="1" fill={active ? "#D80100" : "#999999"} stroke="none" />
  </svg>
);

const MenuIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </svg>
);

const getSearchResultHref = (item) => {
  const articlePath = getArticlePath(item);
  if (articlePath) return articlePath;
  if (item?.url) return item.url;
  if (item?.slug) return `/news/${item.slug}`;
  return "/";
};

const getSearchPreview = (item) => {
  const raw =
    item?.subtitle ||
    item?.summary ||
    item?.excerpt ||
    item?.description ||
    item?.content ||
    "";

  return String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 95);
};

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [breakingNewsItems, setBreakingNewsItems] = useState(getCachedBreakingNews);
  const [showBreaking, setShowBreaking] = useState(() => {
    return sessionStorage.getItem("breakingClosed") !== "true";
  });

  const shouldReserveBreakingSpace = showBreaking;

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    OLD_BREAKING_NEWS_CACHE_KEYS.forEach((key) => {
      window.sessionStorage.removeItem(key);
    });
  }, []);

  useEffect(() => {
    if (!isMobileView || !showBreaking) return;

    const fetchBreakingNews = async () => {
      try {
        const res = await fetch(
          apiUrl(`/articles/?category=${BOTTOM_STRIP_CATEGORY_SLUG}&limit=10`),
          { cache: "no-store" }
        );
        const data = await res.json();

        const articles = Array.isArray(data) ? data : (data.results ?? []);
        let publishedArticles = getOnlyBharatExplainers(articles);

        if (publishedArticles.length === 0) {
          const fallbackRes = await fetch(apiUrl("/articles/?limit=100"), { cache: "no-store" });
          const fallbackData = await fallbackRes.json();
          const fallbackArticles = Array.isArray(fallbackData) ? fallbackData : (fallbackData.results ?? []);
          publishedArticles = getOnlyBharatExplainers(fallbackArticles);
        }

        const latest = sortLatestArticles(publishedArticles).slice(0, 2);

        setBreakingNewsItems(latest);
        setCachedBreakingNews(latest);
      } catch (err) {
        console.error("Breaking news fetch failed:", err);
        setBreakingNewsItems([]);
      }
    };

    fetchBreakingNews();
    return undefined;
  }, [isMobileView, showBreaking]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(focusTimer);
  }, [searchOpen]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const fetchSearchResults = async (query) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const res = await fetch(apiUrl(`/search/articles/?q=${encodeURIComponent(trimmedQuery)}`));
      if (!res.ok) throw new Error("Search request failed");

      const data = await res.json();
      const results = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.articles)
            ? data.articles
            : [];

      setSearchResults(results);
    } catch (error) {
      console.error("Search API error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchQuery(value);

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    searchDebounceRef.current = window.setTimeout(() => {
      fetchSearchResults(value);
    }, 350);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    fetchSearchResults(searchQuery);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleCloseBreaking = () => {
    sessionStorage.setItem("breakingClosed", "true");
    setShowBreaking(false);
  };

  const navItems = [
    { label: "Home", path: "/", icon: HomeIcon },
    { label: "Newsletter", path: "/newsletter", icon: NewsletterIcon },
    { label: "Search", action: "search", icon: SearchIcon },
    {
      label: "60 Second",
      path: "/60-second-read",
      activePaths: ["/60-second-read", "/category/60-second-read"],
      icon: LiveTVIcon,
    },
  ];

  return (
    <>
      {menuOpen && <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/45 md:hidden" onClick={closeSearch}>
          <div
            className="absolute left-3 right-3 bottom-[72px] rounded-lg bg-white shadow-[0_18px_55px_rgba(0,0,0,0.22)] overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">
                  Search
                </p>
                <p className="m-0 mt-0.5 text-[12px] text-slate-500">
                  News, topics, articles
                </p>
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                aria-label="Close search"
              >
                ×
              </button>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                <SearchIcon active={false} />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search news..."
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="mt-3 max-h-[330px] overflow-y-auto rounded-lg border border-slate-100 bg-white">
                {isSearching ? (
                  <div className="px-4 py-5 text-center text-[13px] font-medium text-slate-500">
                    Searching...
                  </div>
                ) : searchQuery.trim() && searchResults.length === 0 ? (
                  <div className="px-4 py-5 text-center text-[13px] font-medium text-slate-500">
                    No results found.
                  </div>
                ) : !searchQuery.trim() ? (
                  <div className="px-4 py-5 text-center text-[13px] text-slate-500">
                    Type to search latest articles.
                  </div>
                ) : (
                  searchResults.map((item, index) => (
                    <button
                      key={item?.id || item?.slug || `${item?.title || "result"}-${index}`}
                      type="button"
                      onClick={() => {
                        closeSearch();
                        navigate(getSearchResultHref(item));
                      }}
                      className="block w-full border-b border-slate-100 bg-white px-3 py-3 text-left last:border-b-0 hover:bg-red-50"
                    >
                      <span className="block text-[13px] font-semibold leading-snug text-slate-900">
                        {item?.title || item?.headline || "Untitled"}
                      </span>
                      {getSearchPreview(item) ? (
                        <span className="mt-1 block text-[11px] leading-[1.4] text-slate-500">
                          {getSearchPreview(item)}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 font-sans block md:hidden">
        {showBreaking && (
          <div className="bg-red-800 px-2 py-2 xs:px-3 xs:py-2.5 min-h-[109px] xs:min-h-[115px]">
            <div className="flex justify-between items-center mb-1.5 xs:mb-2">
              <div className="bg-red-900 px-2 py-0.5 xs:px-3.5 xs:py-1 rounded text-yellow-300 font-black text-[10px] xs:text-sm italic uppercase tracking-wide">
                BREAKING NEWS
              </div>
              <button
                onClick={handleCloseBreaking}
                className="bg-transparent border-none cursor-pointer flex items-center justify-center p-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <ul className="list-none m-0 p-0 space-y-0.5">
              {breakingNewsItems.length > 0 ? (
                breakingNewsItems.map((item, i) => {
                  const articlePath = getArticlePath(item);

                  if (!articlePath) {
                    return (
                      <li
                        key={item.id || item.slug || i}
                        className="text-white text-[11px] xs:text-sm font-bold leading-[1.8] flex items-baseline gap-1 xs:gap-1.5"
                      >
                        <span className="text-white text-base xs:text-lg leading-none flex-shrink-0">&bull;</span>
                        <span>{item.title}</span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id || item.slug || i}>
                      <Link
                        to={articlePath}
                        onClick={handleCloseBreaking}
                        className="bottom-breaking-link text-white text-[11px] xs:text-sm font-bold leading-[1.8] flex items-baseline gap-1 xs:gap-1.5 cursor-pointer !no-underline hover:!no-underline hover:text-yellow-300 transition-colors duration-200"
                        style={{ textDecoration: "none" }}
                      >
                        <span className="text-white text-base xs:text-lg leading-none flex-shrink-0">&bull;</span>
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  );
                })
              ) : (
                <>
                  <li className="text-white/85 text-[11px] xs:text-sm font-bold leading-[1.8] flex items-baseline gap-1 xs:gap-1.5">
                    <span className="text-white text-base xs:text-lg leading-none flex-shrink-0">&bull;</span>
                    <span>Loading breaking news...</span>
                  </li>
                  <li className="text-white/60 text-[11px] xs:text-sm font-bold leading-[1.8] flex items-baseline gap-1 xs:gap-1.5">
                    <span className="text-white/80 text-base xs:text-lg leading-none flex-shrink-0">&bull;</span>
                    <span>Latest updates will appear here shortly.</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        <nav className="
          h-[56px] xs:h-[60px] sm:h-[65px]
          bg-white
          border-t border-slate-200
          flex justify-around items-center
          shadow-[0_-2px_10px_rgba(0,0,0,0.08)]
        ">
          {navItems.map(({ label, path, activePaths = [path], action, icon }) => {
            const active = action === "search" ? searchOpen : activePaths.includes(location.pathname);
            return (
              <button
                key={label}
                onClick={() => {
                  if (action === "search") {
                    setMenuOpen(false);
                    setSearchOpen(true);
                    return;
                  }
                  navigate(path);
                }}
                className={`
                  flex flex-col items-center justify-center
                  gap-0.5 xs:gap-1
                  flex-1 h-full
                  bg-transparent border-none cursor-pointer
                  relative py-1.5 xs:py-2
                  ${active ? "text-red-600" : "text-gray-700"}
                `}
              >
                <span className="w-5 h-5 xs:w-6 xs:h-6 flex items-center justify-center">
                  {icon({ active })}
                </span>
                <span className={`
                  text-[9px] xs:text-[10px] sm:text-[11px]
                  font-medium leading-none
                  ${active ? "text-red-600" : "text-gray-700"}
                `}>
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-[20%] right-[20%] h-[3px] xs:h-1 bg-red-600 rounded-t" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => setMenuOpen(true)}
            className={`
              flex flex-col items-center justify-center
              gap-0.5 xs:gap-1
              flex-1 h-full
              bg-transparent border-none cursor-pointer
              relative py-1.5 xs:py-2
              ${menuOpen ? "text-red-600" : "text-gray-700"}
            `}
          >
            <span className="w-5 h-5 xs:w-6 xs:h-6 flex items-center justify-center">
              <MenuIcon active={menuOpen} />
            </span>
            <span className={`
              text-[9px] xs:text-[10px] sm:text-[11px]
              font-medium leading-none
              ${menuOpen ? "text-red-600" : "text-gray-700"}
            `}>
              Menu
            </span>
            {menuOpen && (
              <span className="absolute bottom-0 left-[20%] right-[20%] h-[3px] xs:h-1 bg-red-600 rounded-t" />
            )}
          </button>
        </nav>
      </div>

      <div className={`block md:hidden ${shouldReserveBreakingSpace ? "h-[165px] xs:h-[175px]" : "h-[56px] xs:h-[60px] sm:h-[65px]"}`} />
    </>
  );
}
