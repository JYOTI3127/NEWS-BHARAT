import React, { useState, useEffect } from 'react';
import logo from "../assets/NEWS4BHARAT LOGO.png";
import '../Navbar.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const MOCK_DATA = {
  weather: { city: 'Delhi', tempC: 24, tempF: 75, condition: '⛅' },
  gold:    { rate: '₹71,450', change: '+0.3%', up: true },
  silver:  { rate: '₹88,200', change: '-0.1%', up: false },
  sensex:  { value: '73,845', change: '+312', up: true },
  nifty:   { value: '22,430', change: '+95',  up: true },
  usd_inr: { value: '83.42',  change: '-0.05', up: false },
};

const NAV_LINKS = [
  { label: 'Home',          href: '#home' },
  { label: 'Breaking News', href: '#breaking', badge: 'LIVE' },
  { label: 'India',         href: '#india' },
  { label: 'World',         href: '#world' },
  { label: 'Business',      href: '#business' },
  { label: 'Markets',       href: '#markets' },
  { label: 'Gold & Silver', href: '#gold' },
  { label: 'Weather',       href: '#weather' },
  { label: 'Sports',        href: '#sports' },
  { label: 'Entertainment', href: '#entertainment' },
  { label: 'Technology',    href: '#technology' },
  { label: 'Opinion',       href: '#opinion' },
  { label: 'Videos',        href: '#videos' },
  { label: 'Sponsored',     href: '#sponsored' },
];

// ─── Hindi Translations ──────────────────────────────────────────────────────
function translateLabel(label) {
  const map = {
    'Home': 'होम',
    'Breaking News': 'ब्रेकिंग न्यूज़',
    'India': 'भारत',
    'World': 'विश्व',
    'Business': 'व्यापार',
    'Markets': 'बाजार',
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
}

// ─── Ticker ──────────────────────────────────────────────────────────────────
function Ticker({ items }) {
  return (
    <div className="n4b-ticker">
      <span className="n4b-ticker-label">LIVE</span>
      <div className="n4b-ticker-track">
        <div className="n4b-ticker-inner">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="n4b-ticker-item">
              {item}&nbsp;&nbsp;●&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Market Pill ─────────────────────────────────────────────────────────────
function MarketPill({ label, value, change, up }) {
  return (
    <span className="n4b-pill">
      <span className="n4b-pill-label">{label}</span>
      <span className="n4b-pill-value">{value}</span>
      <span className={`n4b-pill-change ${up ? 'n4b-pill-change--up' : 'n4b-pill-change--down'}`}>
        {up ? '▲' : '▼'} {change}
      </span>
    </span>
  );
}

// ─── Metal Pill ──────────────────────────────────────────────────────────────
function MetalPill({ label, rate, change, up }) {
  return (
    <span className="n4b-metal-pill">
      <span className="n4b-metal-icon">{label === 'Gold' ? '🥇' : '🥈'}</span>
      <span className="n4b-pill-label">{label}</span>
      <span className="n4b-pill-value">{rate}</span>
      <span className={`n4b-pill-change ${up ? 'n4b-pill-change--up' : 'n4b-pill-change--down'}`}>
        {up ? '▲' : '▼'} {change}
      </span>
    </span>
  );
}

// ─── Main Navbar ─────────────────────────────────────────────────────────────
function Navbar() {
  const now = useLiveClock();
  const [isCelsius, setIsCelsius]   = useState(true);
  const [lang, setLang]             = useState('EN');
  const [search, setSearch]         = useState('');
  const [menuOpen, setMenuOpen]     = useState(false);
  const [activeLink, setActiveLink] = useState('#home');

  const { weather, gold, silver, sensex, nifty, usd_inr } = MOCK_DATA;

  const dateStr = now.toLocaleDateString(lang === 'HI' ? 'hi-IN' : 'en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString(lang === 'HI' ? 'hi-IN' : 'en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const temp = isCelsius ? `${weather.tempC}°C` : `${weather.tempF}°F`;

  const tickerItems = [
    `Sensex ${sensex.value} (${sensex.change})`,
    `Nifty ${nifty.value} (${nifty.change})`,
    `USD/INR ${usd_inr.value}`,
    `Gold ${gold.rate}  ${gold.change}`,
    `Silver ${silver.rate}  ${silver.change}`,
    `${weather.city}: ${temp} ${weather.condition}`,
  ];

  return (
    <header className="n4b-header">

      {/* ══ GLOBAL HEADER (Section 18.1) ══ */}
      <div className="n4b-header-bg">

        {/* Top Row */}
        <div className="n4b-header-row">

          {/* Logo → Home */}
          <a href="#home" className="n4b-logo-wrap">
            <img src={logo} alt="News4Bharat" className="n4b-logo-img" />
          </a>

          <div className="n4b-divider-v" />

          {/* Date & Time */}
          <div className="n4b-date-time">
            <span className="n4b-date-text">{dateStr}</span>
            <span className="n4b-time-text">{timeStr}</span>
          </div>

          <div className="n4b-divider-v" />

          {/* Weather + Toggle */}
          <div className="n4b-weather-wrap">
            <span className="n4b-weather-icon">{weather.condition}</span>
            <span className="n4b-weather-city">{weather.city}</span>
            <span className="n4b-weather-temp">{temp}</span>
            <button
              className="n4b-btn n4b-temp-toggle"
              onClick={() => setIsCelsius(!isCelsius)}
            >
              °{isCelsius ? 'F' : 'C'}
            </button>
          </div>

          <div className="n4b-divider-v" />

          {/* Gold & Silver */}
          <MetalPill label="Gold"   rate={gold.rate}   change={gold.change}   up={gold.up} />
          <MetalPill label="Silver" rate={silver.rate} change={silver.change} up={silver.up} />

          <div className="n4b-spacer" />

          {/* Search Bar */}
          <div className="n4b-search-wrap">
            <input
              className="n4b-search-input"
              type="text"
              placeholder={lang === 'HI' ? 'खोजें...' : 'Search news...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="n4b-divider-v" />

          {/* Language Switcher */}
          <button
            className="n4b-btn"
            onClick={() => setLang(l => l === 'EN' ? 'HI' : 'EN')}
          >
            {lang === 'EN' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>

          <div className="n4b-divider-v" />

          {/* Live TV */}
          <button className="n4b-live-btn">
            <span className="n4b-live-dot">●</span>
            {lang === 'HI' ? 'लाइव TV' : 'Live TV'}
          </button>

          {/* Live News */}
          <button className="n4b-live-btn n4b-live-btn--news">
            <span className="n4b-live-dot">●</span>
            {lang === 'HI' ? 'लाइव न्यूज़' : 'Live News'}
          </button>

        </div>

        {/* Markets Row */}
        <div className="n4b-markets-row">
          <div className="n4b-markets-inner">
            <span className="n4b-markets-label">📈 Markets</span>
            <MarketPill label="Sensex"   value={sensex.value}         change={sensex.change}  up={sensex.up} />
            <MarketPill label="Nifty 50" value={nifty.value}          change={nifty.change}   up={nifty.up} />
            <MarketPill label="USD/INR"  value={`₹${usd_inr.value}`} change={usd_inr.change} up={usd_inr.up} />
          </div>
        </div>

      </div>

      {/* ══ TICKER BAR ══ */}
      <div className="n4b-ticker-outer">
        <div className="n4b-ticker-container">
          <Ticker items={tickerItems} />
        </div>
      </div>

      {/* ══ PRIMARY NAV BAR (Section 18.2) ══ */}
      <nav className="n4b-navbar">
        <div className="n4b-navbar-inner">

          {/* Hamburger – mobile only */}
          <button
            className="n4b-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          {/* Nav Links */}
          <div className={`n4b-nav-scroll ${menuOpen ? 'open' : ''}`}>
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`n4b-nav-link ${activeLink === link.href ? 'active' : ''}`}
                onClick={() => { setActiveLink(link.href); setMenuOpen(false); }}
              >
                {lang === 'HI' ? translateLabel(link.label) : link.label}
                {link.badge && <span className="n4b-badge">{link.badge}</span>}
              </a>
            ))}
          </div>

        </div>
      </nav>

    </header>
  );
}

export default Navbar;