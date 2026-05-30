import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getArticlePath } from "../lib/articleUrl";
import { getArticleDateValue } from "../lib/api";

const DESK_STATUS_ITEMS = [
  "Newest headlines are shown first",
  "Stories update as the newsroom publishes",
  "Fresh developments across India and the world",
  "Refresh to pull the newest wire",
];

const formatDateLabel = (value) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
    const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
      .replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
    return `${day} at ${time} IST`;
  } catch {
    return "";
  }
};

const getTimeLabel = (article) => {
  const displayValue = String(article?.updated_display || "").trim();
  if (displayValue) {
    // "Updated on May 26, 2026 at 5:58 PM" → "May 26, 2026 at 5:58 PM"
   return displayValue.replace(/^Updated on\s*/i, "Updated on ").trim();
  }

  const value = getArticleDateValue(article);
  if (!value) return "";

  try {
    const date = new Date(value);
    const day = date.toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata"
    });
    const time = date.toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata"
    }).replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
    return `${day} at ${time} IST`;
  } catch {
    return "";
  }
};

const getTickerText = (article) =>
  String(
    article?.title ||
      article?.headline ||
      article?.summary ||
      article?.subtitle ||
      article?.sub_heading ||
      article?.subheading ||
      article?.description ||
      article?.excerpt ||
      ""
  )
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function LatestUpdatesRail({ articles = [], tickerArticles = [] }) {
  const updates = useMemo(() => {
    const list = (Array.isArray(articles) ? articles : [])
      .filter((article) => article?.title || article?.headline)
      .slice(0, 5)
      .map((article) => ({
        id: article?.id || article?.slug || article?.title,
        time: getTimeLabel(article) || "Latest",
        title: article?.title || article?.headline,
        path: getArticlePath(article),
      }));

    return list;
  }, [articles]);

  const tickerItems = useMemo(() => {
    const seen = new Set();
    const items = [];

    (Array.isArray(tickerArticles) ? tickerArticles : []).forEach((article) => {
      const text = getTickerText(article);
      const key = text.toLowerCase();
      if (!text || seen.has(key)) return;
      seen.add(key);
      items.push(text);
    });

    return items.length > 0 ? items.slice(0, 6) : DESK_STATUS_ITEMS;
  }, [tickerArticles]);
  const tickerTrackItems = useMemo(
    () => (tickerItems.length > 1 ? [...tickerItems, ...tickerItems] : tickerItems),
    [tickerItems]
  );

  if (updates.length === 0) return null;

  return (
    <section className="latest-updates-rail" aria-labelledby="latest-updates-title">
      <div className="latest-updates-rail__signal" aria-hidden="true" />
      <h2 id="latest-updates-title" className="sr-only">Latest News</h2>

      <div className="latest-updates-rail__ticker" aria-label="Latest updates status ticker">
        <span className="latest-updates-rail__ticker-label">
          <span className="latest-updates-rail__ticker-live-dot" aria-hidden="true" />
          <span>Live</span>
          <span className="latest-updates-rail__ticker-live-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </span>
        <div className="latest-updates-rail__ticker-window">
          <div className={`latest-updates-rail__ticker-track${tickerItems.length === 1 ? " latest-updates-rail__ticker-track--single" : ""}`}>
            {tickerTrackItems.map((item, index) => (
              <span className="latest-updates-rail__ticker-item" key={`${item}-${index}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="latest-updates-rail__list">
        {updates.map((update, index) => {
          const content = (
            <>
              <span className="latest-updates-rail__time">{update.time}</span>
              <span className="latest-updates-rail__title-row">
                <span className="latest-updates-rail__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="latest-updates-rail__title">{update.title}</span>
              </span>
            </>
          );

          return update.path ? (
            <Link
              key={update.id || index}
              to={update.path}
              className={`latest-updates-rail__item${index === 0 ? " latest-updates-rail__item--lead" : ""}`}
              style={{ "--live-item-index": index }}
            >
              <span className="latest-updates-rail__item-pulse" aria-hidden="true" />
              {content}
            </Link>
          ) : (
            <div
              key={update.id || index}
              className={`latest-updates-rail__item${index === 0 ? " latest-updates-rail__item--lead" : ""}`}
              style={{ "--live-item-index": index }}
            >
              <span className="latest-updates-rail__item-pulse" aria-hidden="true" />
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
