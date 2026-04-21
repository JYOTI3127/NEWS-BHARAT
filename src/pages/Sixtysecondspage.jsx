import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Twitter, Facebook, Link2, ArrowLeft, Clock, User } from "lucide-react";
import { API_BASE } from "../lib/api";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  }) : "";

// ── Static fallback — jab API se article na mile ──────────────
const STATIC_ARTICLE = {
  title: "IndiaAI Mission: Building the Digital Rails of the Economy",
  subtitle: "Most countries are today racing to showcase flashy AI demos. IndiaAI Mission, at its core, is attempting something harder.",
  content: `<p>Most countries are today racing to showcase flashy AI demos. IndiaAI Mission, at its core, is attempting something harder — building the unglamorous but essential infrastructure that makes AI actually work at scale: compute, data, talent pipelines, and startup support.</p>
<p>The ₹10,371 crore programme is structured around seven pillars. The most capital-intensive is the AI compute infrastructure pillar, which targets 10,000+ GPU capacity for researchers and startups who cannot afford hyperscaler pricing.</p>
<p>On data, the India Datasets Platform is meant to aggregate high-quality, consent-based datasets — addressing one of the biggest gaps for building India-specific models.</p>
<p>The FutureSkills and startup financing pillars are aimed at the talent and funding gaps that cause promising AI work to stall.</p>
<h2>What to Watch</h2>
<p>The real test is execution speed and whether the GPU cluster actually becomes accessible to mid-size startups, not just large institutions. Watch for: tender awards on compute procurement, dataset platform adoption numbers, and whether IndiaAI-backed startups begin showing up in international benchmarks.</p>
<p><strong>Bottom line:</strong> IndiaAI Mission is the right structural bet. The question is whether bureaucratic timelines will match the pace at which global AI is moving.</p>`,
  author: { username: "News4Bharat" },
  category_details: [{ name: "Artificial Intelligence" }],
  published_at: new Date().toISOString(),
  created_at:   new Date().toISOString(),
};

export default function SixtySecondsPage() {
  const { slug }   = useParams();
  const navigate   = useNavigate();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    setArticle(null);
    setLoading(true);
    window.scrollTo(0, 0);

    fetch(`${API_BASE}/articles/?page=1&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        const list  = Array.isArray(data) ? data : (data.results || []);
        const found = list.find((a) => a.slug === slug);
        // API se mila → use karo, nahi mila → static fallback
        setArticle(found || STATIC_ARTICLE);
        setLoading(false);
      })
      .catch(() => {
        // API fail → static fallback
        setArticle(STATIC_ARTICLE);
        setLoading(false);
      });
  }, [slug]);

  const handleShare = (platform) => {
    const url   = window.location.href;
    const title = article?.title || "";
    if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`, "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "60vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", fontFamily: "Poppins, sans-serif",
      }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid #f0ece8",
          borderTop: "3px solid #D80100",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: 12,
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#999", fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  const date    = article.published_at || article.created_at;
  const catName = article.category_details?.[0]?.name || "60 Seconds";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f7f4f0",
      fontFamily: "Poppins, sans-serif",
      padding: "32px 16px",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sixty-card { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.09); overflow: hidden; }
        .sixty-top-bar { background: #D80100; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; }
        .sixty-badge { color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
        .sixty-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: pulse 1.2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .sixty-body { padding: 28px 28px 24px; }
        .sixty-cat { display: inline-block; background: #fff0f0; color: #D80100; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; }
        .sixty-title { font-size: clamp(18px, 3vw, 26px); font-weight: 800; color: #111; line-height: 1.35; margin-bottom: 14px; letter-spacing: -0.3px; }
        .sixty-meta { display: flex; align-items: center; gap: 16px; font-size: 12px; color: #888; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0ece8; }
        .sixty-meta span { display: flex; align-items: center; gap: 4px; }
        .sixty-content { font-size: 15px; color: #444; line-height: 1.85; word-break: break-word; }
        .sixty-content p { margin-bottom: 14px; }
        .sixty-content h2 { font-size: 18px; font-weight: 700; color: #111; margin: 20px 0 10px; }
        .sixty-content h3 { font-size: 16px; font-weight: 600; color: #222; margin: 16px 0 8px; }
        .sixty-content ul, .sixty-content ol { padding-left: 20px; margin-bottom: 14px; }
        .sixty-content li { margin-bottom: 6px; }
        .sixty-content b, .sixty-content strong { color: #111; }
        .sixty-content img { width: 100%; border-radius: 8px; margin: 12px 0; }
        .sixty-divider { height: 1px; background: #f0ece8; margin: 24px 0; }
        .sixty-share-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #bbb; margin-bottom: 12px; }
        .sixty-share-btns { display: flex; flex-wrap: wrap; gap: 8px; }
        .sixty-share-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 20px; border: 1.5px solid #eee; background: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; color: #444; }
        .sixty-share-btn:hover { background: #fff0f0; border-color: #D80100; color: #D80100; }
      `}</style>

      {/* Back button */}
      <div
        style={{ maxWidth: 680, margin: "0 auto 16px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#888" }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={13} /> Back
      </div>

      {/* Card */}
      <div className="sixty-card">

        {/* Red top bar */}
        <div className="sixty-top-bar">
          <div className="sixty-badge">
            <div className="sixty-badge-dot" />
            60 Second Read
          </div>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
            {formatDate(date)}
          </span>
        </div>

        {/* Body */}
        <div className="sixty-body">

          {/* Category */}
          <span className="sixty-cat">{catName}</span>

          {/* Title */}
          <h1 className="sixty-title">{article.title}</h1>

          {/* Meta */}
          <div className="sixty-meta">
            {article.author?.username && (
              <span><User size={12} /> {article.author.username}</span>
            )}
            {date && (
              <span><Clock size={12} /> {formatDate(date)}</span>
            )}
          </div>

          {/* Subtitle */}
          {article.subtitle && (
            <p style={{
              fontSize: 15, color: "#666", lineHeight: 1.7,
              marginBottom: 18, fontStyle: "italic",
              borderLeft: "3px solid #D80100", paddingLeft: 12,
            }}>
              {article.subtitle}
            </p>
          )}

          {/* Content — HTML as-is */}
          <div
            className="sixty-content"
            dangerouslySetInnerHTML={{ __html: article.content || "" }}
            suppressHydrationWarning={true}
          />

          {/* Divider */}
          <div className="sixty-divider" />

          {/* Share */}
          <div className="sixty-share-label">Share this</div>
          <div className="sixty-share-btns">
            <button className="sixty-share-btn" onClick={() => handleShare("twitter")}>
              <Twitter size={14} color="#1DA1F2" /> Twitter
            </button>
            <button className="sixty-share-btn" onClick={() => handleShare("facebook")}>
              <Facebook size={14} color="#1877F2" /> Facebook
            </button>
            <button className="sixty-share-btn" onClick={() => handleShare("whatsapp")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button className="sixty-share-btn" onClick={() => handleShare("copy")}>
              <Link2 size={14} /> {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
