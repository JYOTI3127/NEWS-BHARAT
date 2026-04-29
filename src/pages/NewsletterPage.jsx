import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { apiUrl } from "../lib/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";

/* ─── helpers ─── */
const getNewsletterItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.newsletters)) return payload.newsletters;
  return [];
};

const getImageUrl = (newsletter) => {
  const image =
    newsletter?.image ||
    newsletter?.thumbnail ||
    newsletter?.cover_image ||
    newsletter?.featured_image ||
    newsletter?.image_url;
  if (!image) return FALLBACK_IMAGE;
  if (typeof image === "string") return image;
  return image?.url || FALLBACK_IMAGE;
};

const getReadMoreUrl = (newsletter) =>
  newsletter?.url || newsletter?.link || newsletter?.read_more_url || newsletter?.article_url || "#";

const getNewsletterHtml = (newsletter) =>
  String(newsletter?.html || newsletter?.html_content || "").trim();

const stripHtml = (value) =>
  String(value || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* ─── date/time helpers ─── */
function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatPublishDate(dateInput) {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  if (isNaN(date)) return null;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today, " + formatTime(date);
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday, " + formatTime(date);
  }
  return (
    date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    ", " +
    formatTime(date)
  );
}

function formatShortDate(dateInput) {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  if (isNaN(date)) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isNew(dateInput) {
  if (!dateInput) return false;
  const date = new Date(dateInput);
  return !isNaN(date) && new Date() - date < 6 * 60 * 60 * 1000;
}

/* ─── components ─── */
function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: 11, height: 11, flexShrink: 0 }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: 11, height: 11, flexShrink: 0 }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: 11, height: 11, flexShrink: 0 }}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: 22, height: 22 }}
      fill="none"
      stroke="#94a3b8"
      strokeWidth="1.5"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M9 13h6" />
    </svg>
  );
}

function NewsletterCard({ newsletter, isActive, onSelect, onViewDetails }) {
  const title = newsletter?.title || newsletter?.subject || "News4Bharat Newsletter";
  const description =
    newsletter?.description ||
    newsletter?.summary ||
    newsletter?.excerpt ||
    newsletter?.short_description ||
    stripHtml(getNewsletterHtml(newsletter)).slice(0, 150);

  const publishedAt =
    newsletter?.published_at ||
    newsletter?.created_at ||
    newsletter?.date ||
    newsletter?.publishedAt ||
    null;

  const shortDate = formatShortDate(publishedAt);
  const publishTime = formatPublishDate(publishedAt);
  const fresh = isNew(publishedAt);
  const editionNum = newsletter?.edition || newsletter?.edition_number || null;

  return (
    <article
      onClick={onSelect}
      style={{
        borderRadius: 12,
        border: isActive ? "1.5px solid #D80100" : "1px solid #e2e8f0",
        background: "#ffffff",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color .22s, transform .22s, box-shadow .22s",
        boxShadow: isActive
          ? "0 0 0 3px rgba(216,1,0,0.06)"
          : "none",
        fontFamily: "'Poppins', sans-serif",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "#cbd5e1";
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(15,23,42,0.07)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      {/* Image */}
      <img
        src={getImageUrl(newsletter)}
        alt={title}
        loading="lazy"
        style={{
          width: "100%",
          height: 160,
          objectFit: "cover",
          display: "block",
          background: "#e2e8f0",
        }}
        onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
      />

      {/* Body */}
      <div style={{ padding: "18px 20px 20px" }}>
        {/* Dateline row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {editionNum && (
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase",
              color: "#D80100", background: "#fff0f0", border: "1px solid #ffd0d0",
              padding: "2px 9px", borderRadius: 999,
            }}>
              Edition {editionNum}
            </span>
          )}
          {shortDate && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8" }}>
              <CalendarIcon />
              {shortDate}
            </span>
          )}
          {fresh && (
            <span style={{
              fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase",
              color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0",
              padding: "2px 7px", borderRadius: 999,
            }}>
              New
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 15, fontWeight: 600, color: "#0f172a",
          lineHeight: 1.45, marginBottom: 7,
        }}>
          {title}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: 12, fontWeight: 300, color: "#475569",
          lineHeight: 1.7, marginBottom: 16,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {description}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); onViewDetails(); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11.5, fontWeight: 500, fontFamily: "'Poppins', sans-serif",
              color: "#ffffff", background: "#D80100", border: "none",
              padding: "7px 16px", borderRadius: 999, cursor: "pointer",
              transition: "background .18s", whiteSpace: "nowrap", flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#b80000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#D80100"; }}
          >
            <EyeIcon />
            View Details
          </button>

          {publishTime && (
            <span style={{
              fontSize: 11, color: "#94a3b8",
              display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
            }}>
              <ClockIcon />
              {publishTime}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function NewsletterSkeleton() {
  return (
    <article style={{
      borderRadius: 12, border: "1px solid #e2e8f0",
      background: "#ffffff", overflow: "hidden",
    }}>
      <div style={{ height: 160, background: "#e2e8f0", animation: "pulse 1.4s ease-in-out infinite" }} />
      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ height: 18, width: 70, borderRadius: 999, background: "#e2e8f0", animation: "pulse 1.4s ease-in-out infinite" }} />
          <div style={{ height: 18, width: 90, borderRadius: 999, background: "#e2e8f0", animation: "pulse 1.4s ease-in-out infinite" }} />
        </div>
        <div style={{ height: 16, width: "80%", borderRadius: 4, background: "#e2e8f0", marginBottom: 8, animation: "pulse 1.4s ease-in-out infinite" }} />
        <div style={{ height: 12, borderRadius: 4, background: "#e2e8f0", marginBottom: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
        <div style={{ height: 12, width: "70%", borderRadius: 4, background: "#e2e8f0", marginBottom: 16, animation: "pulse 1.4s ease-in-out infinite" }} />
        <div style={{ height: 32, width: 110, borderRadius: 999, background: "#e2e8f0", animation: "pulse 1.4s ease-in-out infinite" }} />
      </div>
    </article>
  );
}

/* ─── main page ─── */
export default function NewsletterPage() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNewsletterId, setSelectedNewsletterId] = useState(null);
  const previewRef = useRef(null);

  const scrollToPreview = useCallback(() => {
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchNewsletters = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(apiUrl("/newsletters"), { signal: controller.signal });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        const items = getNewsletterItems(data);
        setNewsletters(items);
        setSelectedNewsletterId((cur) => cur || items[0]?.id || null);
      } catch (err) {
        if (err?.name !== "AbortError") setError("Unable to load newsletters right now.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchNewsletters();
    return () => controller.abort();
  }, []);

  const visibleNewsletters = useMemo(() => newsletters.slice(0, 9), [newsletters]);

  const selectedNewsletter = useMemo(() => {
    if (!visibleNewsletters.length) return null;
    return (
      visibleNewsletters.find((n) => n?.id === selectedNewsletterId) ||
      visibleNewsletters[0]
    );
  }, [selectedNewsletterId, visibleNewsletters]);

  const selectedHtml = getNewsletterHtml(selectedNewsletter);
  const selectedTitle = selectedNewsletter?.title || selectedNewsletter?.subject || "Newsletter";

  const styles = {
    page: {
      minHeight: "100vh",
      fontFamily: "'Poppins', sans-serif",
    },
    inner: {
      width: "var(--site-content-width)",
      maxWidth: "var(--site-content-width)",
      margin: "0 auto",
      padding: "40px 0 60px",
    },
    hero: { textAlign: "center", marginBottom: 48 },
    heroTag: {
      display: "inline-block", fontSize: 10, fontWeight: 500,
      letterSpacing: ".18em", textTransform: "uppercase",
      color: "#D80100", border: "1px solid #ffd0d0", background: "#fff0f0",
      padding: "5px 14px", borderRadius: 999, marginBottom: 18,
    },
    heroH1: {
      fontSize: 36, fontWeight: 600, color: "#0f172a",
      lineHeight: 1.2, marginBottom: 12,
    },
    heroP: {
      fontSize: 13.5, fontWeight: 300, color: "#475569",
      lineHeight: 1.8, maxWidth: 480, margin: "0 auto",
    },
    previewWrap: {
      marginBottom: 48, borderRadius: 12,
      border: "1px solid #e2e8f0", background: "#ffffff", overflow: "hidden",
    },
    previewHeader: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 20px", borderBottom: "1px solid #e2e8f0",
    },
    previewDots: { display: "flex", gap: 6 },
    previewTitle: { fontSize: 12, color: "#94a3b8" },
    previewPlaceholder: {
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 10, padding: "72px 24px", background: "#f1f5f9",
    },
    previewIconWrap: {
      width: 48, height: 48, borderRadius: "50%", background: "#e2e8f0",
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    sectionLabel: {
      fontSize: 10, fontWeight: 500, letterSpacing: ".16em",
      textTransform: "uppercase", color: "#94a3b8", marginBottom: 20,
      display: "block",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 16,
    },
    errorBar: {
      background: "#fff5f5", border: "1px solid #ffd0d0",
      color: "#991b1b", borderRadius: 8, padding: "12px 16px",
      fontSize: 13, marginBottom: 24,
    },
    emptyWrap: {
      textAlign: "center", padding: "60px 24px",
      borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff",
    },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      `}</style>

      <main style={styles.page}>
        <div style={styles.inner}>

          {/* Hero */}
          <div style={styles.hero}>
            <div style={styles.heroTag}>News4Bharat Dispatch</div>
            <h1 style={styles.heroH1}>Latest Newsletters</h1>
            <p style={styles.heroP}>
              Curated editions with the biggest headlines, sharper context, and essential updates from across Bharat.
            </p>
          </div>

          {/* Preview window */}
          <div ref={previewRef} style={styles.previewWrap}>
            <div style={styles.previewHeader}>
              <div style={styles.previewDots}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fc625d", display: "block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fdbc40", display: "block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#35cd4b", display: "block" }} />
              </div>
              <span style={styles.previewTitle}>{selectedNewsletter ? selectedTitle : "Newsletter preview"}</span>
              <span style={{ width: 60 }} />
            </div>

            {selectedHtml ? (
              <iframe
                title={selectedTitle}
                srcDoc={selectedHtml}
                style={{ display: "block", height: 720, width: "100%", border: 0, background: "#fff" }}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            ) : selectedNewsletter ? (
              <div style={{ padding: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>{selectedTitle}</h2>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                  {selectedNewsletter?.description || selectedNewsletter?.summary || "No preview available for this newsletter."}
                </p>
                {getReadMoreUrl(selectedNewsletter) !== "#" && (
                  <a
                    href={getReadMoreUrl(selectedNewsletter)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex", marginTop: 16,
                      background: "#D80100", color: "#fff",
                      padding: "7px 18px", borderRadius: 999,
                      fontSize: 12, fontWeight: 500, textDecoration: "none",
                    }}
                  >
                    Open Link
                  </a>
                )}
              </div>
            ) : (
              <div style={styles.previewPlaceholder}>
                <div style={styles.previewIconWrap}><MailIcon /></div>
                <div>
                  <strong style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#475569" }}>
                    Select a newsletter below
                  </strong>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Click any card to preview it here</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && <div style={styles.errorBar}>{error}</div>}

          {/* Cards */}
          <span style={styles.sectionLabel}>All editions</span>

          {loading ? (
            <div style={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => <NewsletterSkeleton key={i} />)}
            </div>
          ) : visibleNewsletters.length ? (
            <div style={styles.grid}>
              {visibleNewsletters.map((newsletter, index) => (
                <NewsletterCard
                  key={newsletter?.id || newsletter?.slug || index}
                  newsletter={newsletter}
                  isActive={selectedNewsletter === newsletter}
                  onSelect={() => setSelectedNewsletterId(newsletter?.id || null)}
                  onViewDetails={scrollToPreview}
                />
              ))}
            </div>
          ) : (
            <div style={styles.emptyWrap}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: "#0f172a", marginBottom: 6 }}>
                No newsletters published yet.
              </h2>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>
                Fresh editions will appear here as soon as they are available.
              </p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
