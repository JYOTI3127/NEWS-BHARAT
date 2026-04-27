import { useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Trophy, Radio } from "lucide-react";

// TODO: Replace with real API
// CricAPI: https://cricapi.com/
// Cricbuzz unofficial, ESPN Cricinfo API
const CRICKET_DATA = {
  live: [
    {
      id: 1,
      series: "IPL 2026 — Match 42",
      venue: "Wankhede Stadium, Mumbai",
      type: "T20",
      status: "live",
      statusText: "MI batting — 22 balls left",
      team1: { name: "Mumbai Indians", short: "MI", score: "167/4", overs: "16.2", batting: false },
      team2: { name: "Royal Challengers Bangalore", short: "RCB", score: "145/6", overs: "14.0", batting: true },
      result: "MI need 23 runs off 22 balls — CRR 8.6 · RRR 6.27",
      batsmen: [
        { name: "Rohit Sharma", runs: 48, balls: 34, fours: 5, sixes: 2 },
        { name: "Hardik Pandya", runs: 31, balls: 18, fours: 2, sixes: 2 },
      ],
      bowler: { name: "Mohammed Siraj", overs: "3.2", runs: 28, wickets: 1 },
    },
  ],
  recent: [
    {
      id: 2,
      series: "ICC WTC Final 2025-26",
      venue: "Lord's, London",
      type: "Test",
      status: "completed",
      team1: { name: "India", short: "IND", score: "312 & 187", overs: "", batting: false },
      team2: { name: "Australia", short: "AUS", score: "290 & 204/6", overs: "", batting: false },
      result: "Australia won by 4 wickets — Labuschagne 78*",
    },
    {
      id: 3,
      series: "Asia Cup 2026 — Final",
      venue: "Dubai International, UAE",
      type: "ODI",
      status: "completed",
      team1: { name: "India", short: "IND", score: "287/6", overs: "50", batting: false },
      team2: { name: "Pakistan", short: "PAK", score: "241 all out", overs: "46.3", batting: false },
      result: "India won by 46 runs — Virat Kohli 112*",
    },
  ],
  upcoming: [
    {
      id: 4,
      series: "IPL 2026 — Match 43",
      venue: "Eden Gardens, Kolkata",
      type: "T20",
      status: "upcoming",
      scheduledAt: "28 Apr 2026, 7:30 PM IST",
      team1: { name: "Kolkata Knight Riders", short: "KKR" },
      team2: { name: "Chennai Super Kings", short: "CSK" },
    },
    {
      id: 5,
      series: "IPL 2026 — Match 44",
      venue: "Rajiv Gandhi Stadium, Hyderabad",
      type: "T20",
      status: "upcoming",
      scheduledAt: "29 Apr 2026, 3:30 PM IST",
      team1: { name: "Sunrisers Hyderabad", short: "SRH" },
      team2: { name: "Rajasthan Royals", short: "RR" },
    },
  ],
  pointsTable: [
    { team: "MI", p: 10, w: 7, l: 3, nrr: "+0.812", pts: 14 },
    { team: "RCB", p: 10, w: 6, l: 4, nrr: "+0.542", pts: 12 },
    { team: "CSK", p: 10, w: 6, l: 4, nrr: "+0.318", pts: 12 },
    { team: "KKR", p: 10, w: 5, l: 5, nrr: "+0.124", pts: 10 },
    { team: "SRH", p: 10, w: 5, l: 5, nrr: "-0.091", pts: 10 },
    { team: "RR", p: 10, w: 4, l: 6, nrr: "-0.312", pts: 8 },
  ],
};

const teamColor = (short) => {
  const map = {
    MI: "#004ba0", RCB: "#c00", CSK: "#f5a623", KKR: "#3a0067",
    SRH: "#f26522", RR: "#254aa5", IND: "#138808", AUS: "#ffcd00",
    PAK: "#01411c",
  };
  return map[short] || "#1a2a5e";
};

export default function CricketPage() {
  const [expandedId, setExpandedId] = useState(1);
  const [showPoints, setShowPoints] = useState(false);

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#f0f4ff", minHeight: "100vh", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2a5e", margin: 0 }}>Cricket</h1>
          <p style={{ fontSize: 12, color: "#5a6280", margin: 0 }}>Live scores, results & schedules</p>
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

      {/* LIVE MATCHES */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          <Radio size={14} color="#d32f2f" />
          <span style={{ color: "#d32f2f" }}>Live</span>
        </div>

        {CRICKET_DATA.live.map((m) => (
          <div key={m.id} style={{ background: "white", borderRadius: 12, border: "1px solid #dde3f5", marginBottom: 10, overflow: "hidden" }}>
            {/* Match Header */}
            <div style={{ background: "#1a2a5e", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 500 }}>{m.series}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, marginTop: 1 }}>{m.venue}</div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "#d32f2f", padding: "3px 9px", borderRadius: 12,
                fontSize: 10, fontWeight: 700, color: "white",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", background: "white",
                  display: "inline-block",
                  animation: "blink-white 1s infinite",
                }} />
                LIVE
              </div>
            </div>

            <div style={{ padding: "14px" }}>
              {/* Teams */}
              {[m.team1, m.team2].map((t) => (
                <div key={t.short} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: teamColor(t.short), display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: "white",
                    }}>{t.short}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2a5e" }}>{t.name}</div>
                      {t.batting && <div style={{ fontSize: 10, color: "#1b7a3e", fontWeight: 600 }}>Batting</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: "#1a2a5e" }}>{t.score}</span>
                    {t.overs && <span style={{ fontSize: 11, color: "#9aa0b8", marginLeft: 5 }}>({t.overs})</span>}
                  </div>
                </div>
              ))}

              {/* Result Bar */}
              <div style={{
                marginTop: 10, padding: "8px 12px", background: "#fff8e1",
                borderRadius: 8, fontSize: 12, color: "#7a5c00", fontWeight: 600, borderLeft: "3px solid #f5a623",
              }}>{m.result}</div>

              {/* Expand Button */}
              <button onClick={() => setExpandedId(expandedId === m.id ? null : m.id)} style={{
                width: "100%", marginTop: 10, padding: "6px", background: "#f0f4ff",
                border: "none", borderRadius: 8, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 5,
                fontSize: 12, color: "#1a2a5e", fontWeight: 600, fontFamily: "'Poppins', sans-serif",
              }}>
                {expandedId === m.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expandedId === m.id ? "Hide" : "Show"} Scorecard
              </button>

              {/* Expanded Scorecard */}
              {expandedId === m.id && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5a6280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Current Batsmen</div>
                  <div style={{ background: "#f8faff", borderRadius: 8, overflow: "hidden", border: "1px solid #dde3f5" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 4, padding: "6px 10px", background: "#eef0fa" }}>
                      {["Batsman", "R", "B", "4s", "6s"].map((h) => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#5a6280", textAlign: h === "Batsman" ? "left" : "center" }}>{h}</div>
                      ))}
                    </div>
                    {m.batsmen.map((b) => (
                      <div key={b.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 4, padding: "7px 10px", borderTop: "1px solid #eef0fa" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2a5e" }}>{b.name}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#d32f2f", textAlign: "center" }}>{b.runs}*</div>
                        <div style={{ fontSize: 12, color: "#5a6280", textAlign: "center" }}>{b.balls}</div>
                        <div style={{ fontSize: 12, color: "#5a6280", textAlign: "center" }}>{b.fours}</div>
                        <div style={{ fontSize: 12, color: "#5a6280", textAlign: "center" }}>{b.sixes}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5a6280", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10, marginBottom: 6 }}>Current Bowler</div>
                  <div style={{ background: "#f8faff", borderRadius: 8, padding: "8px 10px", border: "1px solid #dde3f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1a2a5e" }}>{m.bowler.name}</span>
                    <span style={{ fontSize: 12, color: "#5a6280" }}>{m.bowler.overs} ov · {m.bowler.runs} runs · {m.bowler.wickets}W</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* RECENT RESULTS */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          Recent Results
        </div>
        {CRICKET_DATA.recent.map((m) => (
          <div key={m.id} style={{ background: "white", borderRadius: 12, border: "1px solid #dde3f5", marginBottom: 10, overflow: "hidden" }}>
            <div style={{ background: "#2d3a6b", padding: "7px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 500 }}>{m.series}</div>
              <div style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 10, fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                {m.type} · Completed
              </div>
            </div>
            <div style={{ padding: "12px 14px" }}>
              {[m.team1, m.team2].map((t) => (
                <div key={t.short} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: teamColor(t.short), display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800, color: "white",
                    }}>{t.short}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2a5e" }}>{t.name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2a5e" }}>{t.score}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "#e65100", borderTop: "1px solid #f0f4ff", paddingTop: 8 }}>
                {m.result}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* UPCOMING */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          Upcoming Matches
        </div>
        {CRICKET_DATA.upcoming.map((m) => (
          <div key={m.id} style={{ background: "white", borderRadius: 12, border: "1px solid #dde3f5", marginBottom: 10, padding: "14px" }}>
            <div style={{ fontSize: 11, color: "#5a6280", marginBottom: 8, fontWeight: 500 }}>{m.series} · {m.venue}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: teamColor(m.team1.short), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white" }}>{m.team1.short}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2a5e" }}>{m.team1.name}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9aa0b8" }}>VS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2a5e" }}>{m.team2.name}</span>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: teamColor(m.team2.short), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white" }}>{m.team2.short}</div>
              </div>
            </div>
            <div style={{ marginTop: 10, padding: "6px 10px", background: "#f0f4ff", borderRadius: 6, fontSize: 11, color: "#1a2a5e", fontWeight: 600, textAlign: "center" }}>
              {m.scheduledAt}
            </div>
          </div>
        ))}
      </div>

      {/* IPL Points Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #dde3f5", overflow: "hidden" }}>
        <button onClick={() => setShowPoints(!showPoints)} style={{
          width: "100%", padding: "14px 16px", background: "white", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "'Poppins', sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
            <Trophy size={14} color="#e65100" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px" }}>IPL 2026 Points Table</span>
          </div>
          {showPoints ? <ChevronUp size={16} color="#5a6280" /> : <ChevronDown size={16} color="#5a6280" />}
        </button>

        {showPoints && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", padding: "8px 14px", background: "#f0f4ff", fontSize: 10, fontWeight: 700, color: "#5a6280", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {["Team", "P", "W", "L", "NRR", "Pts"].map((h) => (
                <div key={h} style={{ textAlign: h === "Team" ? "left" : "center" }}>{h}</div>
              ))}
            </div>
            {CRICKET_DATA.pointsTable.map((row, i) => (
              <div key={row.team} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                padding: "10px 14px", alignItems: "center",
                background: i < 4 ? "white" : "#fafafa",
                borderTop: "1px solid #f0f4ff",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {i < 4 && <div style={{ width: 3, height: 20, background: "#1b7a3e", borderRadius: 2 }} />}
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: teamColor(row.team), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "white" }}>{row.team}</div>
                </div>
                {[row.p, row.w, row.l].map((v, j) => (
                  <div key={j} style={{ textAlign: "center", fontSize: 13, color: "#5a6280" }}>{v}</div>
                ))}
                <div style={{ textAlign: "center", fontSize: 12, color: row.nrr.startsWith("+") ? "#1b7a3e" : "#d32f2f", fontWeight: 600 }}>{row.nrr}</div>
                <div style={{ textAlign: "center", fontSize: 14, fontWeight: 800, color: "#1a2a5e" }}>{row.pts}</div>
              </div>
            ))}
            <div style={{ padding: "8px 14px", fontSize: 10, color: "#9aa0b8", borderTop: "1px solid #f0f4ff" }}>
              Green bar = Playoff qualification zone (top 4)
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff8e1", borderRadius: 8, border: "1px solid #ffe082", fontSize: 11, color: "#7a5c00" }}>
        <strong>Dev Note:</strong> Live scores ke liye CricAPI ya Cricbuzz unofficial API use karein — <code>CRICKET_DATA</code> replace karein.
      </div>

      <style>{`@keyframes blink-white { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
    </div>
  );
}