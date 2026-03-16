import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MenuDrawer from "./MenuDrawer";

const HomeIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const VideosIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <polygon points="10,8 16,12 10,16" fill={active ? "#D80100" : "#999999"} stroke="none"/>
  </svg>
);

const SearchIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <line x1="16.5" y1="16.5" x2="22" y2="22"/>
  </svg>
);

const LiveTVIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M7 7L12 2l5 5"/>
    <circle cx="8" cy="14" r="1" fill={active ? "#D80100" : "#999999"} stroke="none"/>
    <line x1="12" y1="12" x2="12" y2="17"/>
    <circle cx="16" cy="14" r="1" fill={active ? "#D80100" : "#999999"} stroke="none"/>
  </svg>
);

const MenuIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#D80100" : "#999999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1"/>
    <rect x="13" y="3" width="8" height="8" rx="1"/>
    <rect x="3" y="13" width="8" height="8" rx="1"/>
    <rect x="13" y="13" width="8" height="8" rx="1"/>
  </svg>
);

const breakingNewsItems = [
  "PM Modi ne 'Seva Teerth' Bhawan ke Namkaran ka Anawaran Kiya",
  "PM Modi ne 'Seva Teerth' Bhawan ke Namkaran ka Anawaran Kiya",
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ FIX: sessionStorage se read karo — page change pe reset nahi hoga
  const [showBreaking, setShowBreaking] = useState(() => {
    return sessionStorage.getItem("breakingClosed") !== "true";
  });

  const handleCloseBreaking = () => {
    sessionStorage.setItem("breakingClosed", "true");
    setShowBreaking(false);
  };

  const navItems = [
    { label: "Home",      path: "/",       icon: HomeIcon   },
    { label: "Videos",    path: "/videos", icon: VideosIcon },
    { label: "Search",    path: "/search", icon: SearchIcon },
    { label: "60 Second", path: "/live",   icon: LiveTVIcon },
  ];

  return (
    <>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="bottom-nav-wrapper fixed bottom-0 left-0 right-0 z-50 font-sans md:hidden">

        {showBreaking && (
          <div className="bg-red-800 px-3 py-2.5">
            <div className="flex justify-between items-center mb-2">
              <div className="bg-red-900 px-3.5 py-1 rounded text-yellow-300 font-black text-sm italic uppercase tracking-wide">
                BREAKING NEWS
              </div>
              {/* ✅ handleCloseBreaking — sessionStorage mein save karega */}
              <button onClick={handleCloseBreaking} className="bg-transparent border-none cursor-pointer flex items-center justify-center p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <ul className="list-none m-0 p-0">
              {breakingNewsItems.map((item, i) => (
                <li key={i} className="text-white text-sm font-bold leading-[1.9] flex items-start gap-1.5">
                  <span className="text-white text-lg leading-[1.6]">•</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <nav className="h-[65px] bg-white border-t border-slate-200 flex justify-around items-center shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full bg-transparent border-none cursor-pointer relative py-2 ${active ? "text-red-600" : "text-black"}`}
              >
                <Icon active={active} />
                <span className={`text-[11px] font-medium ${active ? "text-red-600" : "text-black"}`}>
                  {label}
                </span>
                {active && <span className="absolute bottom-0 left-[20%] right-[20%] h-1 bg-red-600 rounded-t" />}
              </button>
            );
          })}

          <button
            onClick={() => setMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full bg-transparent border-none cursor-pointer relative py-2 ${menuOpen ? "text-red-600" : "text-black"}`}
          >
            <MenuIcon active={menuOpen} />
            <span className={`text-[11px] font-medium ${menuOpen ? "text-red-600" : "text-black"}`}>
              Menu
            </span>
            {menuOpen && <span className="absolute bottom-0 left-[20%] right-[20%] h-1 bg-red-600 rounded-t" />}
          </button>
        </nav>
      </div>

      <div className={showBreaking ? "bottom-nav-spacer h-[175px]" : "bottom-nav-spacer h-[65px]"} />
    </>
  );
}
