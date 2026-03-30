import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Clock, User, Facebook, Link2,
  ChevronRight, Newspaper, Tag, ArrowLeft,
  Instagram, Youtube, Linkedin,
} from "lucide-react";

const API_BASE = "https://news4bharat.cloud/api";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).replace(/am|pm/i, (match) => match.toUpperCase())
    : "";

const getArticleImage = (article) => {
  const candidates = [article?.image_url, article?.image];
  return candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  ) || null;
};

const XIcon = ({ size = 15 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.244 2H21.5l-7.11 8.128L22.75 22h-6.547l-5.126-6.697L5.215 22H1.957l7.605-8.692L1.25 2h6.713l4.634 6.115L18.244 2Zm-1.141 18h1.804L6.978 3.895H5.043L17.103 20Z" />
  </svg>
);

const normalizeArticleContent = (html) => {
  if (typeof html !== "string" || !html.trim()) return "";

  // Remove presentational tags/attributes from pasted rich text so frontend typography stays in control.
  let normalized = html
    .replace(/<\/?font\b[^>]*>/gi, "")
    .replace(/\s(?:size|face)=["'][^"']*["']/gi, "");

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return normalized;
  }

  const doc = new DOMParser().parseFromString(normalized, "text/html");
  const elements = doc.body.querySelectorAll("*");

  elements.forEach((element) => {
    element.removeAttribute("width");
    element.removeAttribute("height");

    const style = element.getAttribute("style");
    if (!style) return;

    const cleanedStyle = style
      .split(";")
      .map((rule) => rule.trim())
      .filter(Boolean)
      .filter((rule) => {
        const prop = rule.split(":")[0]?.trim().toLowerCase();
        return ![
          "font-size",
          "line-height",
          "font-family",
          "font-weight",
          "font-style",
        ].includes(prop);
      })
      .join("; ");

    if (cleanedStyle) {
      element.setAttribute("style", cleanedStyle);
    } else {
      element.removeAttribute("style");
    }
  });

  return doc.body.innerHTML;
};

export default function ArticleDetails() {
  const params = useParams();
  const slug = params.slug || params.id;

  const [article, setArticle] = useState(null);
  const [allArticles, setAllArticles] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setArticle(null);
    setNotFound(false);
    window.scrollTo(0, 0);

    fetch(`${API_BASE}/articles/`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setAllArticles(list);
        const found = list.find((a) => a.slug === slug);
        if (found) setArticle(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  const relatedArticles = article
    ? allArticles
      .filter((a) => {
        if (a.slug === slug) return false;
        const currentCatIds = article.categories || [];
        const aCatIds = a.categories || [];
        return currentCatIds.some((id) => aCatIds.includes(id));
      })
      .slice(0, 3)
    : [];

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = article?.title || "";
    if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "instagram") {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
      window.open("https://www.instagram.com/", "_blank");
    } else if (platform === "youtube") {
      window.open("https://www.youtube.com/@news4bharat", "_blank");
    } else if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`, "_blank");
    } else if (platform === "linkedin") {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Newspaper size={48} color="#ccc" />
        <p className="text-xl font-bold text-gray-700 mt-4">Article not found</p>
        <Link to="/" className="mt-4 text-red-600 text-sm font-semibold hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-9 h-9 border-[3px] border-[#f0ece8] border-t-[#D80100] rounded-full animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Loading article...</p>
      </div>
    );
  }

  const date = article.published_at || article.created_at;
  const imageUrl = getArticleImage(article);
  const imageAlt = article.image_alt?.trim() || article.title;
  const imageSource = article.image_source?.trim() || "";
  const normalizedContent = normalizeArticleContent(article.content);
  const primaryCategory = article.category_details?.[0];

  const tags = Array.isArray(article.tags_list) ? article.tags_list : [];
  return (
    <div className="min-h-screen bg-[#f7f4f0] font-[Poppins,_sans-serif]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

        {/* ── MAIN ARTICLE ── */}
        <article className="min-w-0">

          {/* Back */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 mb-5 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Home
          </Link>

          {/* Category Badge */}
          {primaryCategory && (
            <div className="mb-3">
              <Link
                to={`/category/${primaryCategory.slug}`}
                className="inline-flex items-center gap-1 bg-red-600 text-white text-[11px] font-bold uppercase px-3 py-1 rounded tracking-wide hover:bg-red-700 transition-colors"
              >
                <Tag size={10} />
                {primaryCategory.name}
              </Link>
            </div>
          )}

          {/* Title */}
          <h1 className="text-[clamp(20px,4vw,36px)] font-extrabold leading-[1.3] text-gray-900 mb-3 tracking-tight">
            {article.title}
          </h1>

          {/* Subtitle */}
          {article.subtitle && (
            <p className="text-[15px] text-gray-500 mb-4 leading-[1.7]">
              {article.subtitle}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-gray-500 mb-5 pb-5 border-b border-gray-200">
            <span className="flex items-center gap-1.5 font-semibold text-red-600">
              <User size={13} />
              News4Bharat
            </span>
            {date && (
              <span className="flex items-center gap-1.5 text-gray-500">
                <Clock size={13} /> {formatDate(date)}
              </span>
            )}
          </div>

          {/* Hero Image */}
          {imageUrl && (
            <div className="w-full rounded-xl overflow-hidden mb-7 shadow-sm">
              <img
                src={imageUrl}
                alt={imageAlt}
                className="w-full object-cover max-h-[480px]"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width={1200}
                height={480}
              />
              {imageSource && (
                <div className="bg-white px-4 py-2 text-[12px] text-gray-500 border-t border-gray-100">
                  Source: {imageSource}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div
            className="text-gray-700 text-left md:text-justify
  [&_p]:text-[16px] [&_p]:leading-[1.6] [&_p]:mb-[1.2rem]
  [&_h1]:text-[18px] [&_h1]:leading-[1.4] [&_h1]:mb-[1.2rem] [&_h1]:font-bold
  [&_h2]:text-[18px] [&_h2]:leading-[1.4] [&_h2]:mb-[1.2rem] [&_h2]:font-bold
  [&_h3]:text-[18px] [&_h3]:leading-[1.4] [&_h3]:mb-[1.2rem] [&_h3]:font-bold
  [&_img]:w-full [&_img]:rounded-lg [&_img]:my-6
  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
  [&_li]:text-[16px] [&_li]:leading-[1.6] [&_li]:mb-1"
            style={{ userSelect: "text", WebkitUserSelect: "text" }}
            dangerouslySetInnerHTML={{ __html: normalizedContent }}
          />

          {/* ✅ TAGS SECTION — Share Bar se pehle */}
          {tags.length > 0 && (
            <div className="mt-8 pt-5 border-t border-gray-200">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 text-[12px] font-medium px-3 py-1 rounded-full transition-colors border border-gray-200 cursor-pointer"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share Bar */}
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Share this article
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleShare("twitter")} title="Share on Twitter"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black hover:bg-[#222] text-white transition-colors">
                <XIcon size={15} />
              </button>
              <button onClick={() => handleShare("facebook")} title="Share on Facebook"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1877F2] hover:bg-[#0d65d8] text-white transition-colors">
                <Facebook size={15} />
              </button>
              <button onClick={() => handleShare("instagram")} title="Share on Instagram"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] hover:opacity-85 text-white transition-opacity">
                <Instagram size={15} />
              </button>
              <button onClick={() => handleShare("youtube")} title="Share on YouTube"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FF0000] hover:bg-[#cc0000] text-white transition-colors">
                <Youtube size={15} />
              </button>
              <button onClick={() => handleShare("whatsapp")} title="Share on WhatsApp"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </button>
              <button onClick={() => handleShare("linkedin")} title="Share on LinkedIn"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0A66C2] hover:bg-[#0958a8] text-white transition-colors">
                <Linkedin size={15} />
              </button>
              <button onClick={() => handleShare("copy")} title="Copy link"
                className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-semibold transition-colors">
                <Link2 size={13} /> {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </article>

        {/* ── SIDEBAR ── */}
        <aside className="flex flex-col gap-6 lg:order-last">

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-red-600 text-xs font-bold uppercase tracking-wider text-slate-900">
                <Newspaper size={14} color="#D80100" />
                <span>Related Articles</span>
              </div>
              <div className="divide-y divide-slate-100">
                {relatedArticles.map((rel) => (
                  <Link key={rel.id} to={`/article/${rel.slug || rel.id}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-shrink-0 w-16 h-14 rounded-md overflow-hidden bg-slate-100">
                          {getArticleImage(rel) ? (
                            <img
                              src={getArticleImage(rel)}
                              alt={rel.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            decoding="async"
                            width={64}
                            height={56}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100">
                            <Newspaper size={16} color="#ccc" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug">{rel.title}</p>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                          <Clock size={10} />{formatDate(rel.published_at || rel.created_at)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* More from category */}
          {primaryCategory && (() => {
            const moreCatArticles = allArticles
              .filter((a) =>
                a.slug !== slug &&
                Array.isArray(a.categories) &&
                a.categories.includes(primaryCategory.id)
              )
              .slice(0, 3);
            if (moreCatArticles.length === 0) return null;
            return (
              <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-red-600">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    More in {primaryCategory.name}
                  </span>
                  <Link to={`/category/${primaryCategory.slug}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-red-600 font-semibold hover:underline flex items-center gap-0.5">
                    View All <ChevronRight size={11} />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {moreCatArticles.map((a) => (
                    <Link key={a.id} to={`/article/${a.slug || a.id}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-shrink-0 w-16 h-14 rounded-md overflow-hidden bg-slate-100">
                          {getArticleImage(a) ? (
                            <img
                              src={getArticleImage(a)}
                              alt={a.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              width={64}
                              height={56}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100">
                              <Newspaper size={16} color="#ccc" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug">{a.title}</p>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                            <Clock size={10} />{formatDate(a.published_at || a.created_at)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
        </aside>
      </div>
    </div>
  );
}
