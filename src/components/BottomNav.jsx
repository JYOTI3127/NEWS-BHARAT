import { useState } from "react";
import { BiFontFamily } from "react-icons/bi";
import { useLocation, useNavigate } from "react-router-dom";

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

const navItems = [
  { label: "Home",    path: "/",       icon: HomeIcon   },
  { label: "Videos",  path: "/videos", icon: VideosIcon },
  { label: "Search",  path: "/search", icon: SearchIcon },
  { label: "Live TV", path: "/live",   icon: LiveTVIcon },
  { label: "Menu",    path: "/menu",   icon: MenuIcon   },
];

const breakingNewsItems = [
  "PM Modi ne 'Seva Teerth' Bhawan ke Namkaran ka Anawaran Kiya",
  "PM Modi ne 'Seva Teerth' Bhawan ke Namkaran ka Anawaran Kiya",
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showBreaking, setShowBreaking] = useState(true);

  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (!isMobile) return null;

  return (
    <>
      <div style={styles.wrapper}>

        {/* Breaking News Banner */}
        {showBreaking && (
          <div style={styles.breakingBox}>
            {/* Header */}
            <div style={styles.breakingHeader}>
              <div style={styles.breakingLabelBox}>
                <span style={styles.breakingLabel}>BREAKING NEWS</span>
              </div>
              <button onClick={() => setShowBreaking(false)} style={styles.closeBtn}>✕</button>
            </div>

            {/* News Items */}
            <ul style={styles.newsList}>
              {breakingNewsItems.map((item, i) => (
                <li key={i} style={styles.newsItem}>
                  <span style={styles.bullet}>•</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom Nav */}
        <nav style={styles.nav}>
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={label}
                onClick={() => navigate(path)}
                style={{
                  ...styles.item,
                  color: active ? "#D80100" : "#000000",
                }}
              >
                <Icon active={active} />
                <span style={{ ...styles.label, color: active ? "#D80100" : "#000000" }}>
                  {label}
                </span>
                {active && <span style={styles.activeLine} />}
              </button>
            );
          })}
        </nav>

      </div>

      <div style={{ height: showBreaking ? 175 : 65 }} />
    </>
  );
}

const styles = {
  wrapper: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    fontFamily: "Poppins, sans-serif",
  },
  breakingBox: {
    background: "#C0000C",
    padding: "8px 12px 10px 12px",
  },
  breakingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  breakingLabelBox: {
    background: "#8B0000",
    paddingLeft: 10,
    paddingRight: 14,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 3,
  },
  breakingLabel: {
    color: "#FFD700",
    fontWeight: 900,
    fontSize: 14,
    letterSpacing: 1,
    fontStyle: "italic",
    textTransform: "uppercase",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: 18,
    cursor: "pointer",
    fontWeight: "bold",
    lineHeight: 1,
  },
  newsList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  newsItem: {
    color: "#fff",
    fontSize: 15,
    lineHeight: "1.9",
    fontWeight: 500,
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    fontWeight: "bold"
  },
  bullet: {
    color: "#fff",
    fontSize: 16,
    lineHeight: "1.6",
  },
  nav: {
    height: 65,
    background: "#fff",
    borderTop: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    boxShadow: "0 -2px 10px rgba(0,0,0,0.08)",
  },
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    flex: 1,
    height: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    position: "relative",
    padding: "8px 0",
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
  },
  activeLine: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 3,
    background: "#D80100",
    borderRadius: "3px 3px 0 0",
  },
};