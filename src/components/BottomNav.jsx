import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MenuDrawer from "./MenuDrawer";

const BREAKING_NEWS_CATEGORY_ID = 2;

const HomeIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const VideosIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polygon points="10,8 16,12 10,16" fill={active ? "#D80100" : "#999999"} stroke="none" />
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

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Ab { title, slug } store karenge sirf title nahi
  const [breakingNewsItems, setBreakingNewsItems] = useState([]);

  const [showBreaking, setShowBreaking] = useState(() => {
    return sessionStorage.getItem("breakingClosed") !== "true";
  });

  useEffect(() => {
    const fetchBreakingNews = async () => {
      try {
        const res = await fetch("https://news4bharat.cloud/api/articles/");
        const data = await res.json();

        const articles = Array.isArray(data) ? data : (data.results ?? []);

        const breaking = articles.filter((article) =>
          article.categories?.includes(BREAKING_NEWS_CATEGORY_ID) &&
          article.status === "published"
        );

        // { title, slug } dono save karo
        const shuffled = breaking
          .sort(() => Math.random() - 0.5)
          .slice(0, 2)
          .map((article) => ({ title: article.title, slug: article.slug }));

        setBreakingNewsItems(shuffled);
      } catch (err) {
        console.error("Breaking news fetch failed:", err);
        setBreakingNewsItems([]);
      }
    };

    fetchBreakingNews();
  }, []);

  const handleCloseBreaking = () => {
    sessionStorage.setItem("breakingClosed", "true");
    setShowBreaking(false);
  };

  const navItems = [
    { label: "Home", path: "/", icon: HomeIcon },
    { label: "Videos", path: "/videos", icon: VideosIcon },
    { label: "Search", path: "/search", icon: SearchIcon },
    { label: "60 Second", path: "/live", icon: LiveTVIcon },
  ];

  return (
    <>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="fixed bottom-0 left-0 right-0 z-50 font-sans block md:hidden">

        {/* Breaking News Bar */}
        {showBreaking && breakingNewsItems.length > 0 && (
          <div className="bg-red-800 px-2 py-2 xs:px-3 xs:py-2.5">
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
              {breakingNewsItems.map((item, i) => (
                <li
                  key={i}
                  onClick={() => item.slug && navigate(`/article/${item.slug}`)}
                  className="text-white text-[11px] xs:text-sm font-bold leading-[1.8] flex items-baseline gap-1 xs:gap-1.5 cursor-pointer hover:text-yellow-300 transition-colors duration-200"
                >
                  <span className="text-white text-base xs:text-lg leading-none flex-shrink-0">•</span>
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom Nav Bar */}
        <nav className="
          h-[56px] xs:h-[60px] sm:h-[65px]
          bg-white
          border-t border-slate-200
          flex justify-around items-center
          shadow-[0_-2px_10px_rgba(0,0,0,0.08)]
        ">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={label}
                onClick={() => navigate(path)}
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
                  <Icon active={active} />
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

          {/* Menu Button */}
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

      {/* Spacer */}
      <div className={`block md:hidden ${showBreaking && breakingNewsItems.length > 0 ? "h-[165px] xs:h-[175px]" : "h-[56px] xs:h-[60px] sm:h-[65px]"}`} />
    </>
  );
}