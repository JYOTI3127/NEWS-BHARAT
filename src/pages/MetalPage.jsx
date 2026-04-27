import { useState } from "react";
import { ArrowUp, ArrowDown, RefreshCw, MapPin } from "lucide-react";

// TODO: Replace with real API (IBJA, MCX, etc.)
// MCX: https://www.mcxindia.com/
// IBJA: https://www.ibja.co/
const METAL_DATA = {
  lastUpdated: "27 Apr 2026, 12:00 PM IST",
  metals: [
    {
      symbol: "Au", name: "Gold", purity: "24K",
      pricePerGram: 9320, pricePer10g: 93200, changePct: 0.54, changeAmt: 504, up: true,
      weekHigh: 94800, weekLow: 88200, color: "#d4a017", bg: "#fffbe6",
    },
    {
      symbol: "Au", name: "Gold", purity: "22K",
      pricePerGram: 8845, pricePer10g: 88450, changePct: 0.36, changeAmt: 320, up: true,
      weekHigh: 89900, weekLow: 83500, color: "#d4a017", bg: "#fffbe6",
    },
    {
      symbol: "Ag", name: "Silver", purity: "999",
      pricePerGram: 98.7, pricePer10g: 987, changePct: -0.15, changeAmt: -150, up: false,
      weekHigh: 102000, weekLow: 94000, color: "#9e9e9e", bg: "#f5f5f5",
      perKg: 98700,
    },
    {
      symbol: "Pt", name: "Platinum", purity: "950",
      pricePerGram: 3180, pricePer10g: 31800, changePct: 0.22, changeAmt: 70, up: true,
      weekHigh: 32400, weekLow: 30100, color: "#7986cb", bg: "#f3f4ff",
    },
    {
      symbol: "Cu", name: "Copper", purity: "99.9",
      pricePerGram: 0.945, pricePer10g: 9.45, changePct: 1.28, changeAmt: 12, up: true,
      weekHigh: 980, weekLow: 910, color: "#b87333", bg: "#fff3e0",
      perKg: 945,
    },
  ],
  cityRates: [
    { city: "Delhi", gold22k: 88450, gold24k: 93200, silver: 98700 },
    { city: "Mumbai", gold22k: 88350, gold24k: 93100, silver: 98600 },
    { city: "Chennai", gold22k: 89100, gold24k: 93800, silver: 99000 },
    { city: "Kolkata", gold22k: 88600, gold24k: 93350, silver: 98800 },
    { city: "Hyderabad", gold22k: 88550, gold24k: 93250, silver: 98750 },
    { city: "Bangalore", gold22k: 88400, gold24k: 93150, silver: 98650 },
  ],
};

const fmt = (n) => n.toLocaleString("en-IN");

export default function MetalPage() {
  const [activeCity, setActiveCity] = useState("Delhi");
  const d = METAL_DATA;
  const cityData = d.cityRates.find((c) => c.city === activeCity);

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: "100vh", padding: 0 }}>
      <div
        style={{
          width: "var(--site-content-width)",
          maxWidth: "var(--site-content-width)",
          margin: "0 auto",
          minHeight: "100vh",
          padding: "clamp(26px, 3vw, 38px) 0 20px",
        }}
      >

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2a5e", margin: 0 }}>Metal Rates</h1>
          <p style={{ fontSize: 12, color: "#5a6280", margin: 0 }}>MCX / IBJA · {d.lastUpdated}</p>
        </div>
        <button style={{
          background: "#1a2a5e", border: "none", borderRadius: 8,
          padding: "8px 14px", color: "white", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Gold Hero Banner */}
      <div style={{
        background: "linear-gradient(135deg, #3d2800 0%, #7a4f00 100%)",
        borderRadius: 16, padding: "20px", marginBottom: 14, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(212,160,23,0.18)" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Gold 22K — Today</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#f5c842", lineHeight: 1.1 }}>
          ₹{fmt(88450)} <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>/ 10g</span>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8,
          background: "rgba(27,122,62,0.25)", padding: "3px 10px", borderRadius: 20,
          fontSize: 12, fontWeight: 600, color: "#69f0ae",
        }}>
          <ArrowUp size={12} /> +₹320 (0.36%) today
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Week High</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f5c842" }}>₹{fmt(89900)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Week Low</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f5c842" }}>₹{fmt(83500)}</div>
          </div>
        </div>
      </div>

      {/* All Metal Rates */}
      <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid #dde3f5" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          All Metal Rates
        </div>

        {d.metals.map((m, i) => (
          <div key={`${m.name}-${m.purity}`} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0",
            borderBottom: i < d.metals.length - 1 ? "1px solid #f0f4ff" : "none",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: m.bg, border: `2px solid ${m.color}30`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: m.color }}>{m.symbol}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: m.color, opacity: 0.7 }}>{m.purity}</div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2a5e" }}>
                {m.name} <span style={{ fontSize: 11, fontWeight: 500, color: "#9aa0b8" }}>({m.purity})</span>
              </div>
              <div style={{ fontSize: 11, color: "#5a6280" }}>
                {m.name === "Silver" || m.name === "Copper"
                  ? `₹${fmt(m.perKg)} / kg`
                  : `₹${fmt(m.pricePerGram)} / g`}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2a5e" }}>
                ₹{fmt(m.pricePer10g)}
                <span style={{ fontSize: 10, fontWeight: 400, color: "#9aa0b8" }}> /10g</span>
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5, marginTop: 3,
                background: m.up ? "#f0fff6" : "#fff0f0",
                color: m.up ? "#1b7a3e" : "#d32f2f",
              }}>
                {m.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {m.up ? "+" : ""}{m.changePct}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* City-wise Rates */}
      <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #dde3f5" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          <MapPin size={14} color="#e65100" /> City-wise Rates (per 10g / per kg)
        </div>

        {/* City Selector */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {d.cityRates.map((c) => (
            <button key={c.city} onClick={() => setActiveCity(c.city)} style={{
              padding: "4px 12px", borderRadius: 20, cursor: "pointer",
              border: activeCity === c.city ? "none" : "1px solid #dde3f5",
              background: activeCity === c.city ? "#1a2a5e" : "white",
              color: activeCity === c.city ? "white" : "#5a6280",
              fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
              transition: "all 0.2s",
            }}>{c.city}</button>
          ))}
        </div>

        {cityData && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Gold 22K", value: `₹${fmt(cityData.gold22k)}`, sub: "per 10g", color: "#d4a017", bg: "#fffbe6" },
              { label: "Gold 24K", value: `₹${fmt(cityData.gold24k)}`, sub: "per 10g", color: "#d4a017", bg: "#fff8d6" },
              { label: "Silver", value: `₹${fmt(cityData.silver)}`, sub: "per kg", color: "#757575", bg: "#f5f5f5" },
            ].map((item) => (
              <div key={item.label} style={{
                background: item.bg, borderRadius: 10, padding: "12px 10px", textAlign: "center",
                border: `1px solid ${item.color}25`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: item.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1a2a5e" }}>{item.value}</div>
                <div style={{ fontSize: 10, color: "#9aa0b8", marginTop: 2 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff8e1", borderRadius: 8, border: "1px solid #ffe082", fontSize: 11, color: "#7a5c00" }}>
        <strong>Dev Note:</strong> Live rates ke liye MCX API ya IBJA website se data lein — <code>METAL_DATA</code> replace karein.
      </div>
      </div>
    </div>
  );
}
