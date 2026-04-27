import { useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw, ArrowUp, ArrowDown, BarChart2, DollarSign, Globe } from "lucide-react";

// TODO: Replace with real API
// NSE India: https://www.nseindia.com/api/
// Alpha Vantage: https://www.alphavantage.co/
// Yahoo Finance unofficial, etc.
const MARKET_DATA = {
  indices: [
    { name: "Sensex", value: 79212.45, change: 423.5, changePct: 0.54, up: true },
    { name: "Nifty 50", value: 24039.35, change: 128.2, changePct: 0.54, up: true },
    { name: "Bank Nifty", value: 51847.1, change: 310.6, changePct: 0.60, up: true },
    { name: "Nifty IT", value: 38120.7, change: -210.3, changePct: -0.55, up: false },
    { name: "Nifty Midcap", value: 53441.2, change: 180.9, changePct: 0.34, up: true },
    { name: "Nifty Smallcap", value: 18832.5, change: -45.3, changePct: -0.24, up: false },
  ],
  forex: [
    { pair: "USD / INR", value: 84.31, change: -0.12, changePct: -0.14, up: false },
    { pair: "EUR / INR", value: 95.82, change: 0.34, changePct: 0.36, up: true },
    { pair: "GBP / INR", value: 111.45, change: -0.21, changePct: -0.19, up: false },
    { pair: "JPY / INR", value: 0.5632, change: 0.003, changePct: 0.53, up: true },
  ],
  topGainers: [
    { symbol: "TATAMOTORS", name: "Tata Motors", price: 924.50, changePct: 4.32, up: true },
    { symbol: "HINDALCO", name: "Hindalco", price: 672.80, changePct: 3.14, up: true },
    { symbol: "JSWSTEEL", name: "JSW Steel", price: 891.20, changePct: 2.87, up: true },
    { symbol: "M&M", name: "Mahindra", price: 2841.00, changePct: 2.45, up: true },
  ],
  topLosers: [
    { symbol: "INFY", name: "Infosys", price: 1432.10, changePct: -2.84, up: false },
    { symbol: "TCS", name: "TCS", price: 3521.40, changePct: -1.92, up: false },
    { symbol: "WIPRO", name: "Wipro", price: 487.30, changePct: -1.45, up: false },
    { symbol: "HCLTECH", name: "HCL Tech", price: 1624.70, changePct: -0.98, up: false },
  ],
  marketStatus: "Open",
  lastUpdated: "27 Apr 2026, 1:15 PM IST",
};

const fmt = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState("gainers");
  const d = MARKET_DATA;

  const tabs = [
    { id: "gainers", label: "Top Gainers" },
    { id: "losers", label: "Top Losers" },
  ];

  const tableData = activeTab === "gainers" ? d.topGainers : d.topLosers;

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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2a5e", margin: 0 }}>Market</h1>
          <p style={{ fontSize: 12, color: "#5a6280", margin: 0 }}>
            <span style={{
              display: "inline-block", width: 7, height: 7, borderRadius: "50%",
              background: d.marketStatus === "Open" ? "#1b7a3e" : "#d32f2f",
              marginRight: 5, verticalAlign: "middle",
            }} />
            NSE/BSE {d.marketStatus} · {d.lastUpdated}
          </p>
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

      {/* Indices Grid */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          <BarChart2 size={14} color="#e65100" /> Indices
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {d.indices.map((idx) => (
            <div key={idx.name} style={{
              background: "white", borderRadius: 10, padding: "12px 14px",
              border: "1px solid #dde3f5",
            }}>
              <div style={{ fontSize: 11, color: "#5a6280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{idx.name}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a2a5e", marginBottom: 4 }}>{fmt(idx.value)}</div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                background: idx.up ? "#f0fff6" : "#fff0f0",
                color: idx.up ? "#1b7a3e" : "#d32f2f",
              }}>
                {idx.up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {idx.up ? "+" : ""}{fmt(Math.abs(idx.change))} ({idx.up ? "+" : ""}{idx.changePct}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forex */}
      <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid #dde3f5" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          <Globe size={14} color="#e65100" /> Forex Rates
        </div>
        {d.forex.map((f, i) => (
          <div key={f.pair} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: i < d.forex.length - 1 ? "1px solid #f0f4ff" : "none",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2a5e" }}>{f.pair}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2a5e" }}>₹{f.value}</span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                background: f.up ? "#f0fff6" : "#fff0f0",
                color: f.up ? "#1b7a3e" : "#d32f2f",
              }}>
                {f.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {f.up ? "+" : ""}{f.changePct}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gainers / Losers Tab */}
      <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #dde3f5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "6px 16px", borderRadius: 20, cursor: "pointer",
              border: activeTab === t.id ? "none" : "1px solid #dde3f5",
              background: activeTab === t.id ? "#1a2a5e" : "white",
              color: activeTab === t.id ? "white" : "#5a6280",
              fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
              transition: "all 0.2s",
            }}>
              {t.id === "gainers" ? <TrendingUp size={12} style={{ marginRight: 5, verticalAlign: "middle" }} /> : <TrendingDown size={12} style={{ marginRight: 5, verticalAlign: "middle" }} />}
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 12px", fontSize: 11, color: "#9aa0b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #f0f4ff" }}>
          <span>Stock</span>
          <span style={{ textAlign: "right" }}>Price</span>
          <span style={{ textAlign: "right" }}>Change</span>
        </div>

        {tableData.map((s, i) => (
          <div key={s.symbol} style={{
            display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 12px",
            alignItems: "center", padding: "11px 0",
            borderBottom: i < tableData.length - 1 ? "1px solid #f0f4ff" : "none",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2a5e" }}>{s.symbol}</div>
              <div style={{ fontSize: 11, color: "#9aa0b8" }}>{s.name}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2a5e", textAlign: "right" }}>₹{fmt(s.price)}</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
              background: s.up ? "#f0fff6" : "#fff0f0",
              color: s.up ? "#1b7a3e" : "#d32f2f",
              minWidth: 70, justifyContent: "center",
            }}>
              {s.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {s.up ? "+" : ""}{s.changePct}%
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff8e1", borderRadius: 8, border: "1px solid #ffe082", fontSize: 11, color: "#7a5c00" }}>
        <strong>Dev Note:</strong> Live data ke liye NSE India API ya Alpha Vantage connect karein — <code>MARKET_DATA</code> ko replace karein.
      </div>
      </div>
    </div>
  );
}
