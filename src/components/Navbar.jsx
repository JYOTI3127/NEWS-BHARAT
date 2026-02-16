import React, { useState, useEffect } from 'react';
import logo from "../assets/NEWS4BHARAT LOGO.png"; // tumhara circular NB logo
import '../Navbar.css';
import { WiDayCloudy, WiDaySunny, WiRain, WiCloudy } from "react-icons/wi";

// Live clock
function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const MOCK_DATA = {
  weather: { city: 'Delhi', tempC: 24, condition: 'cloudy' },
  gold: { rate: '₹71,450', change: '+0.3%', up: true },
  silver: { rate: '₹88,200', change: '-0.1%', up: false },
  sensex: { value: '73,845', change: '+312', up: true },
  nifty: { value: '22,430', change: '+95', up: true },
  usd_inr: { value: '83.42', change: '-0.05', up: false },
  breakingEN: "PM Modi unveils naming of 'Seva Nidhi Bhavan'",
  breakingHI: "PM मोदी ने 'सेवा निधि' भवन के नामकरण का अनावरण किया",
};

const getWeatherIcon = (cond) => {
  const c = cond.toLowerCase();
  if (c.includes('sunny')) return <WiDaySunny size={20} color="#f9c74f" />;
  if (c.includes('cloud')) return <WiDayCloudy size={20} color="#90dbf4" />;
  if (c.includes('rain')) return <WiRain size={20} color="#4dabf7" />;
  return <WiCloudy size={20} color="#adb5bd" />;
};

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Breaking News', href: '#breaking', badge: 'LIVE' },
  { label: 'India', href: '#india' },
  { label: 'World', href: '#world' },
  { label: 'Business', href: '#business' },
  { label: 'Markets', href: '#markets' },
  { label: 'Gold & Silver', href: '#gold' },
  { label: 'Weather', href: '#weather' },
  { label: 'Sports', href: '#sports' },
  { label: 'Entertainment', href: '#entertainment' },
  { label: 'Technology', href: '#technology' },
  { label: 'Opinion', href: '#opinion' },
  { label: 'Videos', href: '#videos' },
  { label: 'Sponsored', href: '#sponsored' },
];

const translate = (label, lang) => {
  if (lang !== 'HI') return label;
  const map = {
    'Home': 'होम',
    'Breaking News': 'ब्रेकिंग न्यूज़',
    'India': 'भारत',
    'World': 'विश्व',
    'Business': 'व्यापार',
    'Markets': 'बाज़ार',
    'Gold & Silver': 'सोना-चांदी',
    'Weather': 'मौसम',
    'Sports': 'खेल',
    'Entertainment': 'मनोरंजन',
    'Technology': 'तकनीक',
    'Opinion': 'राय',
    'Videos': 'वीडियो',
    'Sponsored': 'प्रायोजित',
  };
  return map[label] || label;
};

function MarketPill({ label, value, change, up }) {
  return (
    <span className="pill market-pill">
      {label} {value} <span className={up ? 'up' : 'down'}>{up ? '▲' : '▼'}{change}</span>
    </span>
  );
}

function MetalPill({ label, rate, change, up }) {
  return (
    <span className="pill metal-pill">
      {label} {rate} <span className={up ? 'up' : 'down'}>{up ? '▲' : '▼'}{change}</span>
    </span>
  );
}

function BreakingBanner({ text, lang, onClose }) {
  return (
    <div className="breaking-banner">
      <span className="banner-label">{lang === 'HI' ? 'ब्रेकिंग न्यूज़' : 'BREAKING NEWS'}</span>
      <span className="banner-text">{text}</span>
      <button className="banner-close" onClick={onClose}>×</button>
    </div>
  );
}

export default function Navbar() {
  const now = useLiveClock();
  const [lang, setLang] = useState('EN');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBreaking, setShowBreaking] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 120); // ~120px ke baad hide ticker & breaking
      if (window.scrollY > 120) setShowBreaking(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const dateTime = now.toLocaleString(lang === 'HI' ? 'hi-IN' : 'en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  }).toUpperCase();

  const breakingText = lang === 'HI' ? MOCK_DATA.breakingHI : MOCK_DATA.breakingEN;

  return (
    <header className={`n4b-header ${scrolled ? 'scrolled' : ''}`}>
      {/* Top Ticker - hide on scroll */}
      {!scrolled && (
        <div className="ticker-bar">
          <div className="ticker-inner">
            <span className="markets-label">Markets :</span>
            <MarketPill label="Sensex" {...MOCK_DATA.sensex} />
            <MarketPill label="Nifty 50" {...MOCK_DATA.nifty} />
            <MarketPill label="USD/INR" {...MOCK_DATA.usd_inr} />

            <div className="ticker-right">
              <span className="date-time">{dateTime}</span>
              <button className="lang-btn" onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}>
                {lang === 'EN' ? 'हिंदी' : 'English'}
              </button>
              <button className="live-btn">Live TV</button>
              <button className="live-btn">E-Paper</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bar with Logo, Search (hide on scroll), Metals */}
      <div className="main-header">
        <div className="header-container">
          <a href="#home" className="logo-link">
            <img src={logo} alt="NEWS4BHARAT" className={`main-logo ${scrolled ? 'scrolled-logo' : ''}`} />
          </a>

          {!scrolled && (
            <div className="search-container">
              <input
                type="text"
                placeholder={lang === 'HI' ? 'खोजें...' : 'Search news...'}
                className="search-input"
              />
            </div>
          )}

          <div className="metals-container">
            <MetalPill label="GOLD" {...MOCK_DATA.gold} />
            <MetalPill label="SILVER" {...MOCK_DATA.silver} />
          </div>
        </div>
      </div>

      {/* Red Breaking Banner - hide on scroll */}
      {!scrolled && showBreaking && (
        <BreakingBanner text={breakingText} lang={lang} onClose={() => setShowBreaking(false)} />
      )}

      {/* Sticky Blue Nav */}
      <nav className="blue-navbar">
        <div className="nav-container">
          <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>

          <div className={`nav-menu ${menuOpen ? 'menu-open' : ''}`}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                {translate(link.label, lang)}
                {link.badge && <span className="nav-badge">{link.badge}</span>}
              </a>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}