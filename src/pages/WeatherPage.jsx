import React, { useEffect, useState } from "react";
import { CloudSun, RefreshCw, ThermometerSun, Wind } from "lucide-react";
import { apiUrl } from "../lib/api";

const getTemperature = (weather) => {
  const candidates = [
    weather?.temperature,
    weather?.temp,
    weather?.temp_c,
    weather?.current?.temperature,
    weather?.current?.temp,
    weather?.current?.temp_c,
    weather?.main?.temp,
  ];
  const value = candidates.map(Number).find(Number.isFinite);
  return Number.isFinite(value) ? `${Math.round(value)}°C` : "--";
};

const getCity = (weather) =>
  weather?.city ||
  weather?.name ||
  weather?.location?.name ||
  weather?.location?.city ||
  "Delhi";

const getCondition = (weather) =>
  weather?.condition ||
  weather?.weather ||
  weather?.current?.condition?.text ||
  weather?.current?.weather ||
  weather?.description ||
  "N/A";

const getHumidity = (weather) => {
  const candidates = [
    weather?.humidity,
    weather?.current?.humidity,
    weather?.main?.humidity,
  ];
  const value = candidates.map(Number).find(Number.isFinite);
  return Number.isFinite(value) ? `${Math.round(value)}%` : "--";
};

const getWindSpeed = (weather) => {
  const candidates = [
    weather?.wind_speed,
    weather?.wind_kph,
    weather?.current?.wind_kph,
    weather?.wind?.speed,
  ];
  const value = candidates.map(Number).find(Number.isFinite);
  return Number.isFinite(value) ? `${value} km/h` : "--";
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  padding: "14px 16px",
};

const WeatherPage = () => {
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWeather = async () => {
    try {
      setError("");
      const response = await fetch(apiUrl("/weather/?city=Delhi"), { cache: "no-store" });
      if (!response.ok) throw new Error("Weather API request failed");
      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setError("Weather data load nahi ho paaya. Thoda der baad try karo.");
      void err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const intervalId = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <main style={{ width: "min(900px, calc(100% - 32px))", margin: "28px auto 40px", fontFamily: "Poppins, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 26, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 9 }}>
          <CloudSun size={24} color="#D80100" />
          Weather
        </h1>
        <button
          type="button"
          onClick={fetchWeather}
          style={{
            border: "1px solid #dbe3ee",
            background: "#fff",
            color: "#0b2a5f",
            padding: "7px 10px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: "#64748b", margin: 0 }}>Loading weather...</p>
      ) : error ? (
        <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>
      ) : (
        <section style={{ display: "grid", gap: 10 }}>
          <div style={cardStyle}>
            <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 12, fontWeight: 600 }}>CITY</p>
            <p style={{ margin: 0, fontSize: 22, color: "#0f172a", fontWeight: 700 }}>{getCity(weather)}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div style={cardStyle}>
              <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 12, fontWeight: 600 }}>TEMPERATURE</p>
              <p style={{ margin: 0, fontSize: 20, color: "#0f172a", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <ThermometerSun size={18} color="#D80100" />
                {getTemperature(weather)}
              </p>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 12, fontWeight: 600 }}>CONDITION</p>
              <p style={{ margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 700 }}>{getCondition(weather)}</p>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 12, fontWeight: 600 }}>HUMIDITY</p>
              <p style={{ margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 700 }}>{getHumidity(weather)}</p>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 12, fontWeight: 600 }}>WIND</p>
              <p style={{ margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Wind size={17} color="#D80100" />
                {getWindSpeed(weather)}
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default WeatherPage;
