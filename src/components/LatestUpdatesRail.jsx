import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock3, RefreshCw } from "lucide-react";
import { getArticlePath } from "../lib/articleUrl";

const DESK_STATUS_ITEMS = [
  "Newest headlines are shown first",
  "Stories update as the newsroom publishes",
  "Fresh developments across India and the world",
  "Refresh to pull the newest wire",
];

const getTimeLabel = (article) => {
  const value = article?.published_at || article?.updated_at || article?.created_at || article?.date;
  if (!value) return "";

  try {
    return new Date(value)
      .toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
      .replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());
  } catch {
    return "";
  }
};

export default function LatestUpdatesRail({ articles = [] }) {
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

  if (updates.length === 0) return null;
  const latestTime = updates[0]?.time || "Latest";

  return (
    <section className="latest-updates-rail" aria-labelledby="latest-updates-title">
      <div className="latest-updates-rail__signal" aria-hidden="true" />
      <div className="latest-updates-rail__header">
        <div>
          <span className="latest-updates-rail__eyebrow">
            <span className="latest-updates-rail__live-dot" aria-hidden="true" />
            <Clock3 size={13} />
            Latest News Wire
            <span className="latest-updates-rail__bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </span>
          <h2 id="latest-updates-title">Latest News</h2>
        </div>
        <span className="latest-updates-rail__updated">Updated {latestTime}</span>
        <button
          type="button"
          className="latest-updates-rail__refresh"
          aria-label="Refresh latest updates"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="latest-updates-rail__ticker" aria-label="Latest updates status ticker">
        <span className="latest-updates-rail__ticker-label">Just In</span>
        <div className="latest-updates-rail__ticker-window">
          <div className="latest-updates-rail__ticker-track">
            {[...DESK_STATUS_ITEMS, ...DESK_STATUS_ITEMS].map((item, index) => (
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
