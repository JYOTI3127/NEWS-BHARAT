import { useState } from "react";
import {
  Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets,
  Eye, Thermometer, MapPin, RefreshCw, ChevronRight
} from "lucide-react";

// TODO: Replace with real API call
// Example: https://api.openweathermap.org/data/2.5/weather?q=Delhi&appid=YOUR_KEY&units=metric
const WEATHER_DATA = {
  city: "Delhi",
  state: "Delhi, India",
  temp: 40,
  feelsLike: 44,
  condition: "Sunny",
  humidity: 28,
  wind: 14,
  visibility: 5,
  uvIndex: 9,
  pressure: 1002,
  sunrise: "5:48 AM",
  sunset: "6:52 PM",
  forecast: [
    { day: "Tue", high: 41, low: 28, condition: "Sunny" },
    { day: "Wed", high: 39, low: 27, condition: "Hazy" },
    { day: "Thu", high: 37, low: 26, condition: "Cloudy" },
    { day: "Fri", high: 34, low: 25, condition: "Rain" },
    { day: "Sat", high: 33, low: 24, condition: "Shower" },
    { day: "Sun", high: 35, low: 25, condition: "Partly Cloudy" },
    { day: "Mon", high: 38, low: 26, condition: "Sunny" },
  ],
  hourly: [
    { time: "12 PM", temp: 40 },
    { time: "1 PM", temp: 41 },
    { time: "2 PM", temp: 42 },
    { time: "3 PM", temp: 41 },
    { time: "4 PM", temp: 40 },
    { time: "5 PM", temp: 38 },
    { time: "6 PM", temp: 36 },
    { time: "7 PM", temp: 34 },
  ],
  cities: [
    { name: "Mumbai", temp: 34, condition: "Humid" },
    { name: "Bangalore", temp: 28, condition: "Cloudy" },
    { name: "Chennai", temp: 36, condition: "Sunny" },
    { name: "Kolkata", temp: 33, condition: "Partly Cloudy" },
    { name: "Hyderabad", temp: 37, condition: "Sunny" },
  ],
};

const conditionIcon = (condition, size = 20) => {
  const props = { size, strokeWidth: 1.8 };
  if (condition === "Rain" || condition === "Shower") return <CloudRain {...props} />;
  if (condition === "Cloudy" || condition === "Partly Cloudy") return <Cloud {...props} />;
  if (condition === "Snow") return <CloudSnow {...props} />;
  return <Sun {...props} />;
};

const conditionColor = (condition) => {
  if (condition === "Rain" || condition === "Shower") return "#2196f3";
  if (condition === "Cloudy" || condition === "Partly Cloudy") return "#607d8b";
  return "#f5a623";
};

export default function WeatherPage() {
  const [refreshed, setRefreshed] = useState(false);
  const w = WEATHER_DATA;

  const handleRefresh = () => {
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 1500);
    // TODO: call API here
  };

  return (
    <div style={{
      fontFamily: "'Poppins', sans-serif",
      background: "#f0f4ff",
      minHeight: "100vh",
      padding: "20px 16px",
    }}>

      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2a5e", margin: 0 }}>Weather</h1>
          <p style={{ fontSize: 12, color: "#5a6280", margin: 0 }}>Live weather updates across India</p>
        </div>
        <button
          onClick={handleRefresh}
          style={{
            background: "#1a2a5e", border: "none", borderRadius: 8,
            padding: "8px 14px", color: "white", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <RefreshCw size={13} style={{ transform: refreshed ? "rotate(360deg)" : "rotate(0)", transition: "transform 0.5s" }} />
          Refresh
        </button>
      </div>

      {/* Main Hero Card */}
      <div style={{
        background: "linear-gradient(135deg, #1a2a5e 0%, #0d1b3e 100%)",
        borderRadius: 16, padding: "24px 20px", marginBottom: 14, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -30, right: -30, width: 160, height: 160,
          borderRadius: "50%", background: "rgba(245,166,35,0.12)",
        }} />
        <div style={{
          position: "absolute", top: 20, right: 20, width: 80, height: 80,
          borderRadius: "50%", background: "rgba(245,166,35,0.08)",
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <MapPin size={13} color="rgba(255,255,255,0.6)" />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{w.state}</span>
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, color: "white", lineHeight: 1, marginBottom: 4 }}>
              {w.temp}<span style={{ fontSize: 28, fontWeight: 400 }}>°C</span>
            </div>
            <div style={{ fontSize: 14, color: "#f5a623", fontWeight: 600, marginBottom: 4 }}>{w.condition}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Feels like {w.feelsLike}°C</div>
          </div>
          <div style={{ color: "#f5a623", marginTop: 8 }}>
            <Sun size={64} strokeWidth={1.2} />
          </div>
        </div>

        {/* Stats Row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10, marginTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 16,
        }}>
          {[
            { icon: <Droplets size={14} />, label: "Humidity", value: `${w.humidity}%` },
            { icon: <Wind size={14} />, label: "Wind", value: `${w.wind} km/h` },
            { icon: <Eye size={14} />, label: "Visibility", value: `${w.visibility} km` },
            { icon: <Thermometer size={14} />, label: "UV Index", value: w.uvIndex },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", display: "flex", justifyContent: "center", marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Forecast */}
      <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid #dde3f5" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          Hourly Forecast
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {w.hourly.map((h) => (
            <div key={h.time} style={{
              minWidth: 64, textAlign: "center", background: "#f0f4ff",
              borderRadius: 10, padding: "10px 6px", flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, color: "#5a6280", fontWeight: 600, marginBottom: 6 }}>{h.time}</div>
              <div style={{ color: "#f5a623", display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <Sun size={16} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2a5e" }}>{h.temp}°</div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid #dde3f5" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          7-Day Forecast
        </div>
        {w.forecast.map((f, i) => (
          <div key={f.day} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: i < w.forecast.length - 1 ? "1px solid #f0f4ff" : "none",
          }}>
            <div style={{ width: 40, fontSize: 13, fontWeight: 600, color: "#1a2a5e" }}>{f.day}</div>
            <div style={{ color: conditionColor(f.condition), display: "flex", alignItems: "center", gap: 6, flex: 1, paddingLeft: 12 }}>
              {conditionIcon(f.condition, 16)}
              <span style={{ fontSize: 12, color: "#5a6280" }}>{f.condition}</span>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: "#d32f2f" }}>{f.high}°</span>
              <span style={{ color: "#9aa0b8" }}>{f.low}°</span>
            </div>
          </div>
        ))}
      </div>

      {/* Other Cities */}
      <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #dde3f5" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2a5e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: "#d32f2f", borderRadius: 2 }} />
          Other Cities
        </div>
        {w.cities.map((c, i) => (
          <div key={c.name} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: i < w.cities.length - 1 ? "1px solid #f0f4ff" : "none",
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={13} color="#5a6280" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2a5e" }}>{c.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#5a6280" }}>{c.condition}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2a5e" }}>{c.temp}°C</span>
              <ChevronRight size={14} color="#9aa0b8" />
            </div>
          </div>
        ))}
      </div>

      {/* API Note */}
      <div style={{
        marginTop: 14, padding: "10px 14px", background: "#fff8e1",
        borderRadius: 8, border: "1px solid #ffe082", fontSize: 11, color: "#7a5c00",
      }}>
        <strong>Dev Note:</strong> Abhi static data hai. Live data ke liye OpenWeatherMap API ya IMD API connect karein — <code>WEATHER_DATA</code> ko replace karein.
      </div>
    </div>
  );
}