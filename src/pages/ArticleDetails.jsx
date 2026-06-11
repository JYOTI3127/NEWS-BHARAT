import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { signalPrerenderReady } from '../lib/prerender';
import {
  Clock, User, Facebook, Link2,
  ChevronRight, Newspaper, Tag,
  Instagram, Youtube, Linkedin, TrendingUp,
  Bookmark, Minus, Plus, Share2, Type, Volume2,
} from "lucide-react";
import {
  apiUrl,
  fetchPaginatedArticles,
  formatArticleDateTimeIST,
  getArticleDateValue,
} from "../lib/api";
import { buildAuthorSlug, getArticleAuthorSlug } from "../lib/authors";
import {
  getCanonicalArticleUrl,
  getArticlePath,
  normalizeCanonicalUrl,
} from "../lib/articleUrl";
import { trackSocialShare } from "../lib/analytics";
import { YOUTUBE_CHANNEL_URL } from "../lib/socialLinks";
import AdvertisementSlot from "../components/AdvertisementSlot";

const SITE_URL = "https://news4bharat.com";
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/news4bharat-share.png`;
const SITE_NAME = "News4Bharat";
const TWITTER_HANDLE = "@news4_bharat";
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

/* ─────────────────────────────────────────────
   1. READING PROGRESS BAR
   ───────────────────────────────────────────── */
const ReadingProgressBar = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setProgress(pct);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "3px",
        background: "rgba(216,1,0,0.15)",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "#D80100",
          transition: "width 0.1s linear",
        }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────
   2. FLOATING SHARE BAR (desktop left / mobile bottom)
   ───────────────────────────────────────────── */
const FloatingShareBar = ({ article, onShare, copied }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!article) return null;

  const buttons = [
    { platform: "twitter", bg: "#000", label: "X" },
    { platform: "facebook", bg: "#1877F2", label: "f" },
    { platform: "whatsapp", bg: "#25D366", label: "W" },
    { platform: "linkedin", bg: "#0A66C2", label: "in" },
    { platform: "copy", bg: "#6b7280", label: copied ? "✓" : "🔗" },
  ];

  return (
    <>
      {/* Desktop: left floating vertical bar */}
      <div
        style={{
          position: "fixed",
          left: "max(12px, calc(50vw - 680px))",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 100,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
        className="floating-share-desktop"
      >
        {buttons.map(({ platform, bg, label }) => (
          <button
            key={platform}
            onClick={() => onShare(platform)}
            title={`Share on ${platform}`}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: bg,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mobile: bottom fixed bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "10px 16px",
          zIndex: 100,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
        }}
        className="floating-share-mobile"
      >
        <span style={{ fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Share
        </span>
        {buttons.map(({ platform, bg, label }) => (
          <button
            key={platform}
            onClick={() => onShare(platform)}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: bg,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <style>{`
        @media (min-width: 769px) { .floating-share-mobile { display: none !important; } }
        @media (max-width: 768px) { .floating-share-desktop { display: none !important; } }
      `}</style>
    </>
  );
};

/* ─────────────────────────────────────────────
   3. READING TIME CALCULATOR
   ───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   existing helpers — unchanged
   ───────────────────────────────────────────── */
const isPrerenderUserAgent = () => {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator?.userAgent || "";
  return /HeadlessChrome|prerender|LinkedInBot|Twitterbot|facebookexternalhit|Slackbot|WhatsApp|TelegramBot/i.test(userAgent);
};

const fetchWithRetry = async (url, options, attempts = 3) => {
  let lastResponse = null;
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === attempts - 1) return response;
      lastResponse = response;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError || new Error("Request failed");
};

const getPrerenderArticles = () => {
  if (typeof window === "undefined") return [];
  const articles = window.__N4B_PRERENDER_DATA__?.articles;
  return Array.isArray(articles) ? articles : [];
};

const toCategoryArray = (categoryDetails) => {
  if (Array.isArray(categoryDetails)) return categoryDetails;
  return categoryDetails ? [categoryDetails] : [];
};

const getPlainText = (value) =>
  String(value || "")
    .replace(/&nbsp;?|&#160;?|&#xa0;?/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getArticleReadTime = (article) => {
  const directValue =
    article?.read_time ||
    article?.reading_time ||
    article?.estimated_read_time ||
    article?.readTime;

  if (directValue) {
    const directText = String(directValue).trim();
    if (/read/i.test(directText)) return directText;
    if (/min/i.test(directText)) return `${directText} read`;
    return `${directText} min read`;
  }

  const wordCount = getPlainText(
    article?.content_html ||
    article?.content ||
    article?.content_clean ||
    article?.content_raw ||
    article?.articleBody ||
    article?.body ||
    article?.subtitle ||
    article?.summary ||
    article?.description ||
    article?.excerpt ||
    ""
  ).split(/\s+/).filter(Boolean).length;

  return `${Math.max(1, Math.ceil(wordCount / 220))} min read`;
};

const decodeHtmlEntities = (value) => {
  const text = String(value || "");
  if (!text) return "";
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }
  return text
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
};

const formatArticleDateTimeForDisplay = (articleOrDate) =>
  String(formatArticleDateTimeIST(articleOrDate) || "")
    .replace(/\s+at\s+/gi, " - ")
    .trim();

const getArticlePublishedDateValue = (article) =>
  article?.published_at ||
  article?.published_date ||
  article?.created_at ||
  article?.date ||
  "";

const getArticleUpdatedLabel = (article) => {
  const explicitDisplay = String(article?.updated_display || "").trim();
  if (explicitDisplay) {
    return explicitDisplay.replace(/\s+at\s+/gi, " - ").trim();
  }

  const updatedAt = article?.updated_at;
  if (!updatedAt) return "";

  const publishedAt = getArticlePublishedDateValue(article);
  const updatedTime = new Date(updatedAt).getTime();
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : 0;
  const hasMeaningfulUpdatedTime =
    Number.isFinite(updatedTime) &&
    (!Number.isFinite(publishedTime) || publishedTime <= 0 || updatedTime - publishedTime > 60000);

  if (!article?.is_updated && !hasMeaningfulUpdatedTime) return "";

  const formatted = formatArticleDateTimeForDisplay(updatedAt);
  return formatted ? `Updated ${formatted}` : "";
};

const normalizeKeywordPhrase = (value) =>
  String(value || "").replace(/^\s*hy(\b)/i, "why$1").trim();

const truncateText = (value, maxLength) => {
  const text = getPlainText(value);
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const normalizeSlugValue = (value) =>
  String(value || "").trim().replace(/^\/+|\/+$/g, "");

const safeDecodeSlug = (value) => {
  const normalized = normalizeSlugValue(value);
  if (!normalized) return "";
  try { return normalizeSlugValue(decodeURIComponent(normalized)); } catch { return normalized; }
};

const collectSlugCandidates = (...values) => {
  const seen = new Set();
  const result = [];
  const add = (value) => {
    const normalized = normalizeSlugValue(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  };
  values.forEach((value) => {
    const raw = normalizeSlugValue(value);
    if (!raw) return;
    const decoded = safeDecodeSlug(raw);
    add(raw); add(decoded); add(raw.toLowerCase()); add(decoded.toLowerCase());
  });
  return result;
};

const getSlugFromUrlLikeValue = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized, SITE_URL);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return normalizeSlugValue(parts[parts.length - 1] || "");
  } catch {
    const cleaned = normalized.split("?")[0].split("#")[0];
    const parts = cleaned.split("/").filter(Boolean);
    return normalizeSlugValue(parts[parts.length - 1] || "");
  }
};

const getBrowserTitle = (article) => {
  const apiMetaTitle = [
    article?.meta_title, article?.metaTitle, article?.seo_title, article?.seoTitle,
    article?.seo?.meta_title, article?.seo?.metaTitle, article?.seo?.seo_title, article?.seo?.seoTitle,
  ].map((value) => getPlainText(value)).find(Boolean);
  if (apiMetaTitle) return apiMetaTitle;
  const baseTitle = String(article?.title || "").trim();
  if (!baseTitle) return `Latest News | ${SITE_NAME}`;
  return `${baseTitle} | ${SITE_NAME}`;
};

const toAbsoluteSiteUrl = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  try { return new URL(normalized, SITE_URL).toString(); } catch { return null; }
};

const getCleanSegments = (pathname) =>
  String(pathname || "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

const toCanonicalSiteUrl = (value) => {
  const absolute = toAbsoluteSiteUrl(value);
  if (!absolute) return null;
  try {
    const parsed = new URL(absolute);
    if (parsed.origin !== SITE_URL) return absolute;
    parsed.pathname = `/${getCleanSegments(parsed.pathname).join("/")}`;
    return normalizeCanonicalUrl(parsed.toString());
  } catch {
    return absolute;
  }
};

const buildCanonicalFromRoute = (categorySlug, articleSlug) => {
  const category = normalizeSlugValue(categorySlug);
  const slug = normalizeSlugValue(articleSlug);
  if (!category || !slug) return "";
  return normalizeCanonicalUrl(`${SITE_URL}/${category}/${slug}`);
};

const getSeoEndpointMeta = (payload) =>
  isSchemaPlainObject(payload?.meta) ? payload.meta : {};

const splitSeoKeywordText = (value) =>
  String(value || "")
    .split(",")
    .map((item) => normalizeKeywordPhrase(item))
    .filter(Boolean);

const getArticleImage = (article) => {
  const candidates = [article?.image_url, article?.image];
  return candidates.find((value) => typeof value === "string" && value.trim().length > 0) || null;
};

const getFormattingSignalScore = (value) => {
  if (typeof value !== "string" || !value.trim()) return 0;
  const text = value;
  const countMatches = (regex) => (text.match(regex) || []).length;
  return (
    countMatches(/<(strong|b|em|i|u)\b/gi) * 3 +
    countMatches(/<h[2-6]\b/gi) * 2 +
    countMatches(/<(ul|ol|li|table|blockquote)\b/gi) * 2 +
    Math.min(8, Math.floor(text.length / 1800))
  );
};

const getArticleBodyPayload = (article) => {
  const candidates = [
    ["content_html", article?.content_html],
    ["content_raw", article?.content_raw],
    ["article_content_raw", article?.article_content_raw],
    ["content", article?.content],
    ["content_clean", article?.content_clean],
    ["clean_content", article?.clean_content],
    ["sanitized_content_html", article?.sanitized_content_html],
    ["normalized_content_html", article?.normalized_content_html],
    ["article_content_html", article?.article_content_html],
    ["article_content", article?.article_content],
    ["body_html", article?.body_html],
    ["body", article?.body],
    ["article_body", article?.article_body],
    ["full_content", article?.full_content],
    ["description_html", article?.description_html],
    ["description", article?.description],
  ];

  const validCandidates = candidates
    .map(([source, value]) => [source, typeof value === "string" ? value.trim() : ""])
    .filter(([, value]) => value.length > 0);

  if (validCandidates.length === 0) return { html: "", source: "" };

  const sourceBias = {
    content_html: 26,
    content_raw: 12,
    article_content_raw: 16,
    article_content_html: 14,
    content: 12,
    article_content: 12,
    body_html: 12,
    full_content: 11,
    body: 10,
    article_body: 10,
    description_html: 8,
    description: 7,
    content_clean: 4,
    clean_content: 4,
    sanitized_content_html: 4,
    normalized_content_html: 4,
  };

  const scoreCandidate = (source, html) => {
    const formattingScore = getFormattingSignalScore(html);
    const plainLengthScore = Math.min(24, Math.floor(getPlainText(html).length / 350));
    const sourceScore = sourceBias[source] ?? 5;
    const noisyAttrPenalty = Math.min(
      30,
      (html.match(/\sdata-(start|end|section-id|state|testid|message-model-slug)=/gi) || []).length
    );
    const presentationNoisePenalty =
      Math.min(24, (html.match(/<font\b/gi) || []).length) +
      Math.min(24, (html.match(/\sstyle=["']/gi) || []).length);
    return formattingScore * 6 + plainLengthScore + sourceScore - noisyAttrPenalty - presentationNoisePenalty;
  };

  let best = null;
  validCandidates.forEach(([source, html]) => {
    const score = scoreCandidate(source, html);
    if (!best || score > best.score) {
      best = { source, html, score };
    }
  });

  if (best) return { html: best.html, source: best.source };

  return { html: "", source: "" };
};

const getArticleBodyHtml = (article) => getArticleBodyPayload(article).html;

const hasRenderableArticleBody = (article) => Boolean(getArticleBodyHtml(article));

const normalizeCategoryToken = (value) => String(value || "").trim().toLowerCase();

const getArticleCategoryDetails = (article) => {
  const candidates = [
    ...toCategoryArray(article?.category_details),
    ...toCategoryArray(article?.primary_category_details),
    ...toCategoryArray(article?.primary_category),
    ...toCategoryArray(article?.category),
    ...(Array.isArray(article?.categories) ? article.categories : []),
  ].filter((value) => value && typeof value === "object");
  const seen = new Set();
  return candidates.filter((category) => {
    const key = String(category?.slug || category?.id || category?.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getArticleCategoryTokens = (article) => {
  const tokens = new Set();
  const add = (value) => { const normalized = normalizeCategoryToken(value); if (normalized) tokens.add(normalized); };
  const includeCategoryValue = (value) => {
    if (!value) return;
    if (typeof value === "string" || typeof value === "number") { add(value); return; }
    if (typeof value === "object") { add(value.id); add(value.slug); add(value.category_slug); add(value.name); add(value.title); }
  };
  [...toCategoryArray(article?.category_details), ...toCategoryArray(article?.category),
  ...toCategoryArray(article?.primary_category), ...(Array.isArray(article?.categories) ? article.categories : []),
  ].forEach(includeCategoryValue);
  return tokens;
};

const getArticleTags = (article) => {
  if (Array.isArray(article?.tags_list)) return article.tags_list.filter(Boolean);
  return String(article?.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
};

const getFallbackArticleKeywords = (article, title = "", categoryName = "") => {
  const cleanTitle = getPlainText(title || article?.title || "");
  const cleanCategory = getPlainText(categoryName);
  const slugTitle = getPlainText(String(article?.slug || "").replace(/[-_]+/g, " "));
  const values = [
    cleanTitle,
    slugTitle && slugTitle.toLowerCase() !== cleanTitle.toLowerCase() ? slugTitle : "",
    cleanCategory,
    cleanCategory ? `${cleanCategory} news` : "",
    cleanCategory ? `${cleanCategory} latest updates` : "",
    SITE_NAME,
  ];

  return Array.from(new Set(values.map(normalizeKeywordPhrase).filter(Boolean))).slice(0, 8);
};

const getArticleTimestamp = (article) =>
  new Date(getArticleDateValue(article) || article?.updated_at || 0).getTime() || 0;

const sortArticlesByNewest = (list) =>
  [...list].sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

const sharesCategoryWithArticle = (candidate, currentArticle) => {
  const currentTokens = getArticleCategoryTokens(currentArticle);
  const candidateTokens = getArticleCategoryTokens(candidate);
  for (const token of currentTokens) { if (candidateTokens.has(token)) return true; }
  return false;
};

const getRobotsContent = (article) => {
  const parts = [article?.noindex ? "noindex" : "index", article?.nofollow ? "nofollow" : "follow"];
  if (!article?.noindex) parts.push("max-snippet:-1", "max-image-preview:large", "max-video-preview:-1");
  return parts.join(",");
};

const STRUCTURED_DATA_CONTAINER_KEYS = [
  "schemas",
  "schema",
  "schema_list",
  "structured_data",
  "structured_datakey",
  "faq_schema",
  "faq_schemas",
  "faqpage",
  "faq_page",
  "faq",
  "json_ld",
  "jsonld",
  "custom_json_ld",
  "custom_schema",
  "custom_schemas",
  "payload",
  "data",
  "result",
  "results",
  "items",
];

const parseJsonMaybe = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
};

const isSchemaPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const looksLikeSchemaObject = (value) =>
  isSchemaPlainObject(value) &&
  (Object.prototype.hasOwnProperty.call(value, "@type") ||
    Object.prototype.hasOwnProperty.call(value, "@context"));

const extractStructuredDataSchemas = (input, depth = 0, seen = new Set()) => {
  if (depth > 10 || input == null) return [];

  const parsed = parseJsonMaybe(input);
  if (parsed !== input) {
    return extractStructuredDataSchemas(parsed, depth + 1, seen);
  }

  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => extractStructuredDataSchemas(item, depth + 1, seen));
  }

  if (!isSchemaPlainObject(parsed)) return [];
  if (seen.has(parsed)) return [];
  seen.add(parsed);

  if (looksLikeSchemaObject(parsed)) return [parsed];

  const prioritized = STRUCTURED_DATA_CONTAINER_KEYS.flatMap((key) =>
    Object.prototype.hasOwnProperty.call(parsed, key)
      ? extractStructuredDataSchemas(parsed[key], depth + 1, seen)
      : []
  );
  if (prioritized.length > 0) return prioritized;

  return Object.values(parsed).flatMap((value) =>
    extractStructuredDataSchemas(value, depth + 1, seen)
  );
};

const getSchemaTypeTokens = (schema) => {
  const raw = schema?.["@type"];
  if (Array.isArray(raw)) return raw.map((item) => String(item || "").trim()).filter(Boolean);
  const one = String(raw || "").trim();
  return one ? [one] : [];
};

const schemaHasType = (schema, expectedType) =>
  getSchemaTypeTokens(schema).some((type) => type.toLowerCase() === String(expectedType || "").toLowerCase());

const normalizeStructuredSchemaObject = (schema) => {
  if (!looksLikeSchemaObject(schema)) return null;
  const normalized = { ...schema };
  if (!normalized["@context"]) normalized["@context"] = "https://schema.org";
  return normalized;
};

const dedupeStructuredSchemas = (schemas) => {
  const seen = new Set();
  const unique = [];
  schemas.forEach((schema) => {
    const normalized = normalizeStructuredSchemaObject(schema);
    if (!normalized) return;
    const key = JSON.stringify(normalized);
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(normalized);
  });
  return unique;
};

const FAQ_CONTENT_KEYS = [
  "faq",
  "faqs",
  "faq_items",
  "faqItems",
  "faq_schema_items",
  "faqSchemaItems",
  "faq_schema",
  "faq_schemas",
  "faqpage",
  "faq_page",
  "mainEntity",
  "items",
  "questions",
];

const getFaqAnswerText = (value) => {
  const parsed = parseJsonMaybe(value);
  if (typeof parsed === "string") return getPlainText(decodeHtmlEntities(parsed));
  if (Array.isArray(parsed)) return parsed.map(getFaqAnswerText).filter(Boolean).join(" ");
  if (!isSchemaPlainObject(parsed)) return "";

  return getPlainText(decodeHtmlEntities(
    parsed.text ||
    parsed.answer ||
    parsed.content ||
    parsed.description ||
    parsed.value ||
    ""
  ));
};

const getFaqQuestionText = (value) =>
  getPlainText(decodeHtmlEntities(
    value?.name ||
    value?.question ||
    value?.title ||
    value?.heading ||
    ""
  ));

const hasOwn = (value, key) =>
  isSchemaPlainObject(value) && Object.prototype.hasOwnProperty.call(value, key);

const hasAnyOwn = (value, keys) =>
  keys.some((key) => hasOwn(value, key));

const looksLikeFaqQuestionObject = (value) =>
  schemaHasType(value, "Question") ||
  hasAnyOwn(value, ["question", "acceptedAnswer", "accepted_answer", "answers"]);

const extractFaqItems = (input, depth = 0, seen = new Set()) => {
  if (depth > 10 || input == null) return [];

  const parsed = parseJsonMaybe(input);
  if (parsed !== input) return extractFaqItems(parsed, depth + 1, seen);

  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => extractFaqItems(item, depth + 1, seen));
  }

  if (!isSchemaPlainObject(parsed)) return [];
  if (seen.has(parsed)) return [];
  seen.add(parsed);

  if (schemaHasType(parsed, "FAQPage")) {
    return extractFaqItems(parsed.mainEntity || parsed.main_entity || parsed.items, depth + 1, seen);
  }

  const question = getFaqQuestionText(parsed);
  const answer = getFaqAnswerText(
    parsed.acceptedAnswer ||
    parsed.accepted_answer ||
    parsed.answer ||
    parsed.answers ||
    parsed.text ||
    parsed.description
  );

  if (looksLikeFaqQuestionObject(parsed) && question && answer) return [{ question, answer }];

  return FAQ_CONTENT_KEYS.flatMap((key) =>
    Object.prototype.hasOwnProperty.call(parsed, key)
      ? extractFaqItems(parsed[key], depth + 1, seen)
      : []
  );
};

const dedupeFaqItems = (items) => {
  const seen = new Set();
  const unique = [];
  items.forEach((item) => {
    const question = getPlainText(item?.question);
    const answer = getPlainText(item?.answer);
    const key = `${question.toLowerCase()}::${answer.toLowerCase()}`;
    if (!question || !answer || seen.has(key)) return;
    seen.add(key);
    unique.push({ question, answer });
  });
  return unique;
};

const ArticleFaqAccordion = ({ items = [], maxWidth, title = "Frequently Asked Questions" }) => {
  const [openIndex, setOpenIndex] = useState(0);
  if (!items.length) return null;

  return (
    <section className="article-faq" style={{ width: "100%", maxWidth, marginLeft: 0, marginRight: 0 }} aria-labelledby="article-faq-heading">
      <div className="article-faq__header">
        <h2 id="article-faq-heading">{title}</h2>
      </div>
      <div className="article-faq__list">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <article key={`${item.question}-${index}`} className={`article-faq__item${isOpen ? " article-faq__item--open" : ""}`}>
              <button
                type="button"
                className="article-faq__question"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <span className="article-faq__icon" aria-hidden="true">{isOpen ? "×" : "+"}</span>
              </button>
              {isOpen ? (
                <p className="article-faq__answer">{item.answer}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
};

const XIcon = ({ size = 15 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2H21.5l-7.11 8.128L22.75 22h-6.547l-5.126-6.697L5.215 22H1.957l7.605-8.692L1.25 2h6.713l4.634 6.115L18.244 2Zm-1.141 18h1.804L6.978 3.895H5.043L17.103 20Z" />
  </svg>
);

const ArticleTweetEmbed = ({ id }) => {
  const tweetId = String(id || "").trim();
  if (!tweetId) return null;

  const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
  const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(tweetId)}&dnt=true&theme=light`;

  return (
    <div className="my-4 flex flex-col items-center" suppressHydrationWarning>
      <iframe
        src={embedUrl}
        title="Embedded X post"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="w-full max-w-[560px] rounded-xl border border-gray-200 bg-white"
        style={{ minHeight: 320, height: 360 }}
      />
      <noscript>
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
          View post on X
        </a>
      </noscript>
    </div>
  );
};

const DIRECT_VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i;
const TWEET_URL_REGEX = /https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/(?:[A-Za-z0-9_]+\/status(?:es)?|i\/web\/status|i\/status)\/(\d+)(?:[^\s"'<>]*)?/i;

const parseTimeToSeconds = (value) => {
  if (!value) return 0;
  const normalized = String(value).trim().toLowerCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  const match = normalized.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return 0;
  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const getYouTubeEmbedUrl = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    let videoId = "";
    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        const markerIndex = parts.findIndex((part) => ["embed", "shorts", "live"].includes(part));
        if (markerIndex >= 0) videoId = parts[markerIndex + 1] || "";
      }
    }
    if (!videoId) return null;
    const start = parseTimeToSeconds(url.searchParams.get("t")) || parseTimeToSeconds(url.searchParams.get("start"));
    const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    if (start > 0) embedUrl.searchParams.set("start", String(start));
    return embedUrl.toString();
  } catch { return null; }
};

const getTweetEmbedData = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const extracted = raw.match(TWEET_URL_REGEX);
  const platformEmbedId = (() => {
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      if (host === "platform.twitter.com" && url.pathname.toLowerCase() === "/embed/tweet.html") return url.searchParams.get("id") || "";
    } catch { return ""; }
    return "";
  })();
  const tweetId = extracted?.[1] || platformEmbedId;
  if (!tweetId) return null;
  const cleanUrl = `https://twitter.com/i/web/status/${tweetId}`;
  try { new URL(cleanUrl); return { id: tweetId, url: cleanUrl }; } catch { return null; }
};

const getEmbedDescriptor = (value) => {
  const url = String(value || "").trim();
  if (!url) return null;
  const youtubeEmbed = getYouTubeEmbedUrl(url);
  if (youtubeEmbed) return { type: "iframe", src: youtubeEmbed, title: "Embedded YouTube video" };
  const tweetData = getTweetEmbedData(url);
  if (tweetData) return { type: "tweet", ...tweetData };
  if (DIRECT_VIDEO_FILE_REGEX.test(url)) return { type: "video", src: url };
  return null;
};

const isStandaloneLinkElement = (element) => {
  const childNodes = Array.from(element.childNodes);
  const meaningfulChildren = childNodes.filter((node) => {
    if (node.nodeType === 3) return node.textContent && node.textContent.trim().length > 0;
    return node.nodeName !== "BR";
  });
  return meaningfulChildren.length === 1 && meaningfulChildren[0].nodeName === "A";
};

const createEmbedNode = (doc, descriptor) => {
  if (descriptor.type === "tweet") {
    const wrapper = doc.createElement("div");
    wrapper.className = "react-tweet-placeholder";
    wrapper.setAttribute("data-tweet-id", descriptor.id);
    return wrapper;
  }
  const wrapper = doc.createElement("div");
  wrapper.className = descriptor.type === "video" ? "article-media-frame article-native-video" : "article-media-frame";
  if (descriptor.type === "iframe") {
    const iframe = doc.createElement("iframe");
    iframe.src = descriptor.src;
    iframe.title = descriptor.title || "Embedded media";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.setAttribute("allowfullscreen", "");
    wrapper.appendChild(iframe);
  } else if (descriptor.type === "video") {
    const video = doc.createElement("video");
    video.src = descriptor.src;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    wrapper.appendChild(video);
  }
  return wrapper;
};

const replaceTweetUrlsWithPlaceholders = (doc) => {
  if (!doc?.body) return;

  const replaceElementWithTweet = (element, tweetData) => {
    if (!element || !tweetData) return;
    if (element.closest("table, thead, tbody, tfoot, tr, td, th, .react-tweet-placeholder")) return;
    const target = element.closest("blockquote, p, div, li") || element;
    target.replaceWith(createEmbedNode(doc, { type: "tweet", ...tweetData }));
  };

  Array.from(doc.body.querySelectorAll("a[href]")).forEach((anchor) => {
    const tweetData = getTweetEmbedData(anchor.href || anchor.textContent);
    if (tweetData) replaceElementWithTweet(anchor, tweetData);
  });

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const tweetData = getTweetEmbedData(node.textContent || "");
    if (!tweetData) return;
    const parent = node.parentElement;
    replaceElementWithTweet(parent, tweetData);
  });
};

const splitHtmlByTweetPlaceholders = (html) => {
  const parts = [];
  const placeholderRegex = /<([a-z0-9]+)\b(?=[^>]*\bclass=["'][^"']*\breact-tweet-placeholder\b[^"']*["'])(?=[^>]*\bdata-tweet-id=["'](\d+)["'])[^>]*>(?:\s*<\/\1>)?/gi;
  let lastIndex = 0;
  let match;

  while ((match = placeholderRegex.exec(html))) {
    if (match.index > lastIndex) {
      parts.push({ type: "html", content: html.slice(lastIndex, match.index) });
    }
    parts.push({ type: "tweet", id: match[2] });
    lastIndex = placeholderRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    parts.push({ type: "html", content: html.slice(lastIndex) });
  }

  return parts;
};

const useIs2K = () => {
  const getValue = () => typeof window !== "undefined" && window.innerWidth >= 1441 && window.innerWidth <= 2560;
  const [is2K, setIs2K] = useState(getValue);
  useEffect(() => {
    const onResize = () => setIs2K(getValue());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return is2K;
};

const INLINE_ELEMENT_TAGS = new Set([
  "A", "ABBR", "B", "BDI", "BDO", "BR", "CITE", "CODE", "EM", "I", "IMG", "KBD",
  "MARK", "Q", "S", "SAMP", "SMALL", "SPAN", "STRONG", "SUB", "SUP", "TIME", "U",
]);

const HEADING_ELEMENT_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);

const normalizeHeadingStructure = (doc) => {
  const headings = Array.from(doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  headings.forEach((heading) => {
    const inlineNodes = [];
    const blockNodes = [];

    Array.from(heading.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (String(node.textContent || "").trim().length > 0) inlineNodes.push(node.cloneNode(true));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = String(node.tagName || "").toUpperCase();
      if (INLINE_ELEMENT_TAGS.has(tag)) inlineNodes.push(node.cloneNode(true));
      else blockNodes.push(node.cloneNode(true));
    });

    const inlineText = getPlainText(inlineNodes.map((node) => node.textContent || "").join(" "));

    if (blockNodes.length > 0) {
      if (!inlineText) {
        const fragment = doc.createDocumentFragment();
        blockNodes.forEach((node) => {
          const tag = String(node.tagName || "").toUpperCase();
          if ((tag === "DIV" || tag === "SPAN") && node.childNodes.length > 0) {
            while (node.firstChild) fragment.appendChild(node.firstChild);
            return;
          }
          if (HEADING_ELEMENT_TAGS.has(tag) && getPlainText(node.textContent || "").length > 0) {
            const replacement = doc.createElement("h3");
            replacement.innerHTML = node.innerHTML;
            fragment.appendChild(replacement);
            return;
          }
          fragment.appendChild(node);
        });
        heading.replaceWith(fragment);
        return;
      }

      heading.innerHTML = "";
      inlineNodes.forEach((node) => heading.appendChild(node));
      let anchor = heading;
      blockNodes.forEach((node) => {
        anchor.parentNode?.insertBefore(node, anchor.nextSibling);
        anchor = node;
      });
    }

    if (getPlainText(heading.textContent || "").length === 0) {
      if (heading.querySelector("img, iframe, video")) {
        const figure = doc.createElement("figure");
        while (heading.firstChild) figure.appendChild(heading.firstChild);
        heading.replaceWith(figure);
        return;
      }
      heading.remove();
    }
  });
};

const normalizeArticleContent = (html) => {
  if (typeof html !== "string" || !html.trim()) return "";
  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const entityDecodedHtml = /&lt;\/?(?:h[1-6]|p|div|ul|ol|li|blockquote|table|strong|b|em|i|a|br)\b/i.test(html)
    ? decodeHtmlEntities(html)
    : html;
  let normalized = entityDecodedHtml
    .replace(/&nbsp;?|&#160;?|&#xa0;?/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/<\/?font\b[^>]*>/gi, "")
    .replace(/\s(?:size|face)=["'][^"']*["']/gi, "")
    // Some editor payloads keep a trailing "\" before blockquote markup.
    .replace(/\\+\s*(?=<blockquote\b)/gi, "")
    // Repair invalid editor output such as <h2><p>Title</p><p></h2></p>.
    .replace(/<h([1-6])(\b[^>]*)>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*(?:<p\b[^>]*>\s*)?<\/h\1>\s*(?:<\/p>)?/gi, "<h$1$2>$3</h$1>")
    .replace(/<h([1-6])(\b[^>]*)>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/h\1>/gi, "<h$1$2>$3</h$1>");

  // Preserve paragraph/block formatting for raw text payloads.
  // When backend sends plain text in content_raw, convert newlines into block HTML.
  const hasHtmlMarkup = /<\/?[a-z][\s\S]*>/i.test(normalized);
  const hasBlockTags = /<(p|h[2-6]|ul|ol|li|blockquote|div)\b/i.test(normalized);
  if (hasHtmlMarkup && !hasBlockTags) {
    normalized = normalized
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");
  }
  if (!hasHtmlMarkup) {
    const blocks = normalized
      .replace(/\r\n?/g, "\n")
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (blocks.length > 0) {
      normalized = blocks
        .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
        .join("");
    }
  }

  if (typeof window === "undefined" || typeof DOMParser === "undefined") return normalized;
  const sourcePlainText = getPlainText(normalized);
  const doc = new DOMParser().parseFromString(normalized, "text/html");
  Array.from(doc.body.querySelectorAll("head, title, meta, link, base, script, noscript")).forEach((node) => node.remove());
  normalizeHeadingStructure(doc);
  Array.from(doc.body.querySelectorAll("li")).forEach((item) => {
    while (item.lastChild) {
      const lastChild = item.lastChild;
      if (lastChild.nodeType === Node.TEXT_NODE && !String(lastChild.textContent || "").trim()) {
        lastChild.remove();
        continue;
      }
      if (lastChild.nodeType === Node.ELEMENT_NODE && lastChild.tagName === "BR") {
        lastChild.remove();
        continue;
      }
      break;
    }
  });
  Array.from(doc.body.querySelectorAll("*")).forEach((element) => {
    Array.from(element.childNodes).forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const cleanedValue = String(node.textContent || "").replace(/\u00a0/g, " ");
      if (cleanedValue !== node.textContent) node.textContent = cleanedValue;
    });
  });
  Array.from(doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6")).forEach((heading) => {
    if (getPlainText(heading.textContent || "").length > 0) return;
    if (heading.querySelector("img, iframe, video")) {
      const figure = doc.createElement("figure");
      while (heading.firstChild) figure.appendChild(heading.firstChild);
      heading.replaceWith(figure);
      return;
    }
    heading.remove();
  });
  Array.from(doc.body.querySelectorAll("p, div, span")).forEach((node) => {
    const childElements = Array.from(node.children);
    if (
      childElements.length === 1 &&
      ["P", "DIV", "SPAN"].includes(childElements[0].tagName) &&
      getPlainText(node.textContent || "").length > 0
    ) {
      node.replaceWith(childElements[0]);
    }
  });
  Array.from(doc.body.querySelectorAll("p, div, span")).forEach((node) => {
    const hasMediaChild = node.querySelector("img, iframe, video, table, .react-tweet-placeholder, .article-media-frame");
    if (hasMediaChild) return;
    if (getPlainText(node.textContent || "").length === 0) node.remove();
  });

  const normalizeAlsoReadText = (node) => {
    const text = getPlainText(node.textContent || "");
    if (!/^also\s+read\b/i.test(text)) return;

    const title = text
      .replace(/^also\s+read\s*(?:[:|])?\s*/i, "")
      .replace(/^\|\s*/, "")
      .trim();
    if (!title) return;
    const link = node.matches?.("a[href]") ? node : node.querySelector?.("a[href]");
    const href = link?.getAttribute("href");
    const titleMarkup = href
      ? `<a class="article-also-read__title" href="${escapeHtml(href)}">${escapeHtml(title)}</a>`
      : `<span class="article-also-read__title">${escapeHtml(title)}</span>`;

    Array.from(node.attributes).forEach((attribute) => node.removeAttribute(attribute.name));
    node.className = "article-also-read";
    node.innerHTML = `<strong class="article-also-read__label">Also Read</strong><span class="article-also-read__divider" aria-hidden="true">|</span>${titleMarkup}`;
  };

  Array.from(doc.body.querySelectorAll("p, div, span")).forEach((node) => {
    if (node.closest("table, thead, tbody, tfoot, tr, td, th, blockquote, .article-table-wrapper, .article-media-frame, .react-tweet-placeholder")) return;
    if (node.querySelector("img, iframe, video, table")) return;
    normalizeAlsoReadText(node);
  });

  const inlineRootTags = new Set(["SPAN", "STRONG", "B", "I", "EM", "U", "A", "SMALL", "MARK", "SUB", "SUP", "BR"]);
  const rebuiltRootNodes = [];
  let inlineRootBuffer = [];
  const flushInlineRootBuffer = () => {
    if (inlineRootBuffer.length === 0) return;
    const paragraph = doc.createElement("p");
    inlineRootBuffer.forEach((node, index) => {
      if (index > 0) paragraph.appendChild(doc.createTextNode(" "));
      paragraph.appendChild(node);
    });
    rebuiltRootNodes.push(paragraph);
    inlineRootBuffer = [];
  };

  Array.from(doc.body.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (String(node.textContent || "").trim()) inlineRootBuffer.push(node);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE && inlineRootTags.has(node.tagName)) {
      inlineRootBuffer.push(node);
      return;
    }

    flushInlineRootBuffer();
    rebuiltRootNodes.push(node);
  });
  flushInlineRootBuffer();

  if (rebuiltRootNodes.length > 0) {
    doc.body.innerHTML = "";
    rebuiltRootNodes.forEach((node) => doc.body.appendChild(node));
  }

  Array.from(doc.body.querySelectorAll("p, div, span, h1, h2, h3, h4, h5, h6")).forEach((node) => {
    if (node.closest("table, thead, tbody, tfoot, tr, td, th, blockquote, .article-table-wrapper, .article-media-frame, .react-tweet-placeholder")) return;
    if (node.querySelector("img, iframe, video, table")) return;
    normalizeAlsoReadText(node);
  });

  Array.from(doc.body.querySelectorAll("div, span")).forEach((node) => {
    if (node.parentElement !== doc.body) return;
    if (node.closest("table, thead, tbody, tfoot, tr, td, th, blockquote, .article-table-wrapper, .article-media-frame, .react-tweet-placeholder")) return;
    if (node.querySelector("h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote, div, img, iframe, video")) return;
    if (getPlainText(node.textContent || "").length === 0) return;
    const paragraph = doc.createElement("p");
    Array.from(node.attributes).forEach((attribute) => paragraph.setAttribute(attribute.name, attribute.value));
    paragraph.innerHTML = node.innerHTML;
    node.replaceWith(paragraph);
  });

  const isPlainTextBlock = (node) => {
    if (node?.classList?.contains("article-also-read")) return false;
    if (!node?.matches?.("p, div, span")) return false;
    if (node.closest("table, thead, tbody, tfoot, tr, td, th, blockquote, .article-table-wrapper, .article-media-frame, .react-tweet-placeholder")) return false;
    if (node.querySelector("h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote, img, iframe, video")) return false;
    return getPlainText(node.textContent || "").length > 0;
  };

  const textBlocks = Array.from(doc.body.querySelectorAll("p, div, span")).filter(isPlainTextBlock);

  const looksLikeEditorHeading = (node, index) => {
    if (!isPlainTextBlock(node)) return false;

    const text = getPlainText(node.textContent || "");
    if (text.length < 12 || text.length > 150) return false;
    if (/^also\s+read\s*:/i.test(text)) return false;
    if (/[.!:;][)"'”’]*$/.test(text)) return false;

    const previousText = getPlainText(textBlocks[index - 1]?.textContent || "");
    const nextText = getPlainText(textBlocks[index + 1]?.textContent || "");
    const isFirstTextBlock = !previousText;
    const followsBodyCopy = previousText.length > 120 || /[.!?]"?$/.test(previousText);
    const hasBodyAfter = nextText.length > 40;
    const words = text.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word));
    const titleLikeWords = words.filter((word) =>
      /^(?:["'“‘(]*[A-Z0-9]|[A-Z]{2,})/.test(word)
    );
    const isTitleLikeLine = words.length >= 4 && titleLikeWords.length / words.length >= 0.45;

    const boldText = Array.from(node.querySelectorAll("strong, b"))
      .map((child) => getPlainText(child.textContent || ""))
      .join(" ");
    const boldCoverage = boldText.length / Math.max(text.length, 1);
    const style = String(node.getAttribute("style") || "");
    const hasBoldStyle = /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(style);

    return boldCoverage >= 0.65 || hasBoldStyle || (isTitleLikeLine && hasBodyAfter && (isFirstTextBlock || followsBodyCopy));
  };

  textBlocks.forEach((node, index) => {
    if (!looksLikeEditorHeading(node, index)) return;
    const heading = doc.createElement("h2");
    Array.from(node.attributes).forEach((attribute) => heading.setAttribute(attribute.name, attribute.value));
    heading.innerHTML = node.innerHTML;
    node.replaceWith(heading);
  });

  const bulletParagraphPattern = /^\s*(?:[•●▪◦*-]|(?:\d+|[a-z])[).])\s+/i;
  const getParagraphListMarker = (paragraph) => {
    const text = String(paragraph?.textContent || "").replace(/\u00a0/g, " ").trim();
    const match = text.match(bulletParagraphPattern);
    if (!match) return null;
    return {
      marker: match[0],
      isOrdered: /^(?:\d+|[a-z])[).]\s+/i.test(match[0].trim()),
      text: text.slice(match[0].length).trim(),
    };
  };

  let paragraphListRun = [];
  const flushParagraphListRun = () => {
    if (paragraphListRun.length < 2) {
      paragraphListRun = [];
      return;
    }

    const listTag = paragraphListRun.every(({ marker }) => marker.isOrdered) ? "ol" : "ul";
    const list = doc.createElement(listTag);
    const firstParagraph = paragraphListRun[0].paragraph;
    firstParagraph.parentNode?.insertBefore(list, firstParagraph);
    paragraphListRun.forEach(({ paragraph, marker }) => {
      const item = doc.createElement("li");
      item.textContent = marker.text;
      list.appendChild(item);
      paragraph.remove();
    });
    paragraphListRun = [];
  };

  Array.from(doc.body.children).forEach((node) => {
    if (node.classList?.contains("article-also-read")) {
      flushParagraphListRun();
      return;
    }
    if (!node.matches?.("p")) {
      flushParagraphListRun();
      return;
    }

    const marker = getParagraphListMarker(node);
    if (!marker?.text) {
      flushParagraphListRun();
      return;
    }

    paragraphListRun.push({ paragraph: node, marker });
  });
  flushParagraphListRun();

  const listHeadingPattern = /^(confirmed|still unconfirmed|what we know|what we don'?t know|key details|full story in brief|news summary)$/i;
  Array.from(doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6")).forEach((heading) => {
    const headingText = getPlainText(heading.textContent || "");
    if (!listHeadingPattern.test(headingText)) return;

    const candidates = [];
    let current = heading.nextElementSibling;
    while (current && current.matches("p")) {
      const text = getPlainText(current.textContent || "");
      if (!text || /^also read:/i.test(text) || text.length > 140 || /[.!?]\s*$/.test(text)) break;
      candidates.push(current);
      current = current.nextElementSibling;
    }

    if (candidates.length < 3) return;

    const ul = doc.createElement("ul");
    ul.className = "article-auto-list";
    candidates.forEach((paragraph) => {
      const li = doc.createElement("li");
      li.innerHTML = paragraph.innerHTML;
      ul.appendChild(li);
    });
    candidates[0].parentNode?.insertBefore(ul, candidates[0]);
    candidates.forEach((paragraph) => paragraph.remove());
  });
  const hasGoogleSheetsMarkup = Boolean(
    doc.body.querySelector("google-sheets-html-origin, [data-sheets-root], [data-sheets-baot]")
  );

  const isChatExportLike = Boolean(
    doc.body.querySelector(
      '[data-message-model-slug], [data-testid^="conversation-turn"], .markdown-new-styling'
    )
  );

  if (isChatExportLike && !hasGoogleSheetsMarkup) {
    const snapshotHtmlBeforeChatCleanup = doc.body.innerHTML;
    const snapshotPlainBeforeChatCleanup = getPlainText(doc.body.textContent || "");
    const topLevelBlockTags = new Set([
      "H1", "H2", "H3", "H4", "H5", "H6", "P", "UL", "OL", "TABLE", "BLOCKQUOTE", "DIV", "GOOGLE-SHEETS-HTML-ORIGIN",
    ]);
    const inlinePassTags = new Set([
      "SPAN", "STRONG", "B", "I", "EM", "U", "A", "SMALL", "MARK", "SUB", "SUP", "BR",
    ]);
    const bodyChildren = Array.from(doc.body.childNodes);
    const rebuilt = [];
    let inlineBuffer = [];

    const flushInlineBuffer = () => {
      if (inlineBuffer.length === 0) return;
      const paragraph = doc.createElement("p");
      inlineBuffer.forEach((node) => paragraph.appendChild(node));
      rebuilt.push(paragraph);
      inlineBuffer = [];
    };

    const isInlineLikeNode = (node) => {
      if (!node) return false;
      if (node.nodeType === Node.TEXT_NODE) return String(node.textContent || "").trim().length > 0;
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      const tag = node.tagName.toUpperCase();
      if (inlinePassTags.has(tag)) return true;
      if (topLevelBlockTags.has(tag)) return false;
      return true;
    };

    bodyChildren.forEach((node) => {
      if (isInlineLikeNode(node)) {
        inlineBuffer.push(node);
        return;
      }
      flushInlineBuffer();
      rebuilt.push(node);
    });
    flushInlineBuffer();

    if (rebuilt.length > 0) {
      doc.body.innerHTML = "";
      rebuilt.forEach((node) => doc.body.appendChild(node));
    }

    const extracted = [];
    const seen = new Set();
    const candidates = Array.from(doc.body.children).filter((node) => {
      const tag = node.tagName.toLowerCase();
      return ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "table", "blockquote", "div", "google-sheets-html-origin"].includes(tag);
    });

    const getTextSignature = (node) =>
      getPlainText(node?.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    candidates.forEach((node) => {
      if (!node || node.closest("td, th")) return;

      const tag = node.tagName.toLowerCase();
      const textSig = getTextSignature(node);

      // Keep only meaningful neutral wrappers to avoid duplicate container extraction.
      if (tag === "div" && node.querySelector("h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote, div")) return;

      if (tag === "div") {
        if (textSig.length < 20) return;
      } else if (tag !== "table" && textSig.length < 2) return;

      let signature = `${tag}|${textSig.slice(0, 320)}`;
      if (tag === "table") {
        const rows = node.querySelectorAll("tr").length;
        const cols = node.querySelectorAll("tr:first-child th, tr:first-child td").length;
        signature = `table|${rows}|${cols}|${textSig.slice(0, 320)}`;
      }

      if (seen.has(signature)) return;
      seen.add(signature);
      extracted.push(node.cloneNode(true));
    });

    if (extracted.length > 0) {
      doc.body.innerHTML = "";
      extracted.forEach((node) => doc.body.appendChild(node));
    }

    // Safety: if chat-cleanup removes a large chunk of article text, revert it.
    const snapshotPlainAfterChatCleanup = getPlainText(doc.body.textContent || "");
    if (
      snapshotPlainBeforeChatCleanup.length > 800 &&
      snapshotPlainAfterChatCleanup.length < snapshotPlainBeforeChatCleanup.length * 0.75
    ) {
      doc.body.innerHTML = snapshotHtmlBeforeChatCleanup;
    }
  }

  // Keep editor layout classes that carry authoring intent (image alignment,
  // captions, quote cards), while still dropping random utility classes.
  Array.from(doc.body.querySelectorAll("*")).forEach((element) => {
    const classAttr = element.getAttribute("class");
    if (!classAttr) return;
    const keep = classAttr
      .split(/\s+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) =>
        name === "react-tweet-placeholder" ||
        name.startsWith("article-") ||
        name.startsWith("image") ||
        name.startsWith("ck-") ||
        name.startsWith("ql-") ||
        name.startsWith("wp-") ||
        /^align(?:left|right|center|none)$/i.test(name) ||
        /^caption$/i.test(name) ||
        /^media$/i.test(name) ||
        /^quote(?:-|_)?/i.test(name)
      );
    if (keep.length > 0) element.setAttribute("class", keep.join(" "));
    else element.removeAttribute("class");
  });

  const elements = doc.body.querySelectorAll("*");
  elements.forEach((element) => {
    const tagName = String(element.tagName || "").toUpperCase();
    const isTableStructuralElement = new Set([
      "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH", "COLGROUP", "COL",
    ]).has(tagName);
    if (isTableStructuralElement) return;

    const isMediaOrEditorLayoutElement = new Set([
      "IMG", "FIGURE", "FIGCAPTION", "BLOCKQUOTE", "DIV", "SECTION", "ASIDE",
    ]).has(tagName);
    const isIntrinsicMediaElement = new Set(["IMG", "VIDEO", "IFRAME"]).has(tagName);

    if (!isIntrinsicMediaElement) {
      element.removeAttribute("width");
      element.removeAttribute("height");
    }
    if (!isMediaOrEditorLayoutElement) {
      element.removeAttribute("align");
    }

    const style = element.getAttribute("style");
    if (!style) return;
    const blockedProps = new Set([
      "position", "left", "right", "top", "bottom",
      "columns", "column-count", "column-width", "transform",
    ]);
    const mediaLayoutProps = new Set([
      "float", "clear", "width", "min-width", "max-width", "height", "min-height",
      "max-height", "display", "text-align", "margin", "margin-left", "margin-right",
      "margin-top", "margin-bottom", "vertical-align", "object-fit", "aspect-ratio",
      "gap", "align-items", "justify-content", "flex-direction", "flex-wrap",
    ]);
    const cleanedStyle = style
      .split(";")
      .map((rule) => rule.trim())
      .filter(Boolean)
      .filter((rule) => {
        const prop = rule.split(":")[0]?.trim().toLowerCase();
        if (!prop) return false;
        if (blockedProps.has(prop)) return false;
        if (mediaLayoutProps.has(prop)) return isMediaOrEditorLayoutElement || isIntrinsicMediaElement;
        return true;
      })
      .join("; ");

    if (cleanedStyle) element.setAttribute("style", cleanedStyle);
    else element.removeAttribute("style");
  });

  // ✅ Table fix — width:0 wali tables ko proper banao
  // Normalize blockquote input from editor:
  // 1) remove standalone "\" rows
  // 2) trim trailing "\" before blockquote
  // 3) ensure quote text stays in a stable block wrapper
  Array.from(doc.body.querySelectorAll("blockquote:not(.twitter-tweet)")).forEach((blockquote) => {
    const previousElement = blockquote.previousElementSibling;
    if (previousElement && previousElement.matches("p, div, span")) {
      const rawText = String(previousElement.textContent || "");
      const trimmedRawText = rawText.trim();
      const cleanedText = rawText.replace(/[ \t]*\\+\s*$/g, "").trim();
      if (trimmedRawText === "\\" || cleanedText !== trimmedRawText) {
        if (!cleanedText) previousElement.remove();
        else previousElement.textContent = cleanedText;
      }
    }

    const hasBlockChild = Array.from(blockquote.children).some((child) =>
      ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL"].includes(child.tagName)
    );

    if (!hasBlockChild) {
      const quoteText = getPlainText(blockquote.textContent || "");
      blockquote.innerHTML = "";
      if (quoteText) {
        const paragraph = doc.createElement("p");
        paragraph.textContent = quoteText;
        blockquote.appendChild(paragraph);
      }
    }
  });

  Array.from(doc.body.querySelectorAll("p, div, span")).forEach((node) => {
    const text = String(node.textContent || "").replace(/\u00a0/g, " ").trim();
    if (text === "\\") node.remove();
  });

  Array.from(doc.body.querySelectorAll("table")).forEach((table) => {
    const firstRow = table.querySelector("tr");
    const colCount = firstRow ? firstRow.querySelectorAll("th, td").length : 0;
    table.removeAttribute("width");
    table.removeAttribute("cellspacing");
    table.removeAttribute("cellpadding");
    table.style.width = "100%";
    table.style.minWidth = colCount >= 4 ? "680px" : "100%";
    table.style.maxWidth = "100%";
    table.style.tableLayout = "auto";
    table.style.borderCollapse = "collapse";
    table.style.float = "none";
    table.style.clear = "both";
    table.style.margin = "0";

    // colgroup col width override
    Array.from(table.querySelectorAll("col")).forEach((col) => {
      col.removeAttribute("width");
      col.style.width = "auto";
    });

    // google-sheets-html-origin wrapper ko block banao
    const gsOrigin = table.closest("google-sheets-html-origin");
    if (gsOrigin) {
      gsOrigin.style.display = "block";
      gsOrigin.style.width = "100%";
      gsOrigin.style.overflowX = "auto";
    }
  });

  // ✅ Empty rows hatao — Google Sheets ke blank tr/td
  Array.from(doc.body.querySelectorAll("table tr")).forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td, th"));
    const isEmpty = cells.every((cell) => {
      const text = cell.textContent?.trim() || "";
      const hasChildren = cell.children.length > 0 &&
        Array.from(cell.children).some((child) => child.textContent?.trim());
      return !text && !hasChildren;
    });
    if (isEmpty) row.remove();
  });

  // ✅ Empty thead hatao
  Array.from(doc.body.querySelectorAll("thead")).forEach((thead) => {
    const hasContent = thead.textContent?.trim().length > 0;
    if (!hasContent) thead.remove();
  });

  // ✅ Saari tables ko proper wrapper mein daalo
  Array.from(doc.body.querySelectorAll("table")).forEach((table) => {
    const nestedTable = Array.from(table.querySelectorAll("table")).find((inner) => inner !== table);
    if (nestedTable) {
      const wrapper = doc.createElement("div");
      wrapper.className = "article-table-wrapper";
      wrapper.style.overflowX = "auto";
      wrapper.style.width = "100%";
      wrapper.style.maxWidth = "100%";
      wrapper.style.margin = "24px 0";

      const cleanTable = nestedTable.cloneNode(true);
      cleanTable.style.width = "100%";
      cleanTable.style.minWidth = "100%";
      cleanTable.style.maxWidth = "100%";
      cleanTable.style.tableLayout = "auto";
      cleanTable.style.borderCollapse = "collapse";
      cleanTable.style.float = "none";
      cleanTable.style.clear = "both";
      cleanTable.style.margin = "0";

      wrapper.appendChild(cleanTable);
      table.replaceWith(wrapper);
      return;
    }

    const parentTag = table.parentElement?.tagName || "";
    const isNestedInsideCell = parentTag === "TD" || parentTag === "TH";
    if (!table.closest(".article-table-wrapper") && !isNestedInsideCell) {
      const wrapper = doc.createElement("div");
      wrapper.className = "article-table-wrapper";
      wrapper.style.overflowX = "auto";
      wrapper.style.width = "100%";
      wrapper.style.maxWidth = "100%";
      wrapper.style.margin = "24px 0";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
  // Inner table cells fix
  // ✅ Saari tables ke cells fix karo — vertical align top + proper padding
  Array.from(doc.body.querySelectorAll("table td, table th")).forEach((cell) => {
    cell.style.verticalAlign = "top";
    cell.style.whiteSpace = "normal";
    cell.style.overflow = "visible";
    cell.style.wordBreak = "normal";
    cell.style.overflowWrap = "normal";
    cell.style.hyphens = "none";
    cell.style.padding = "8px 12px";
    cell.style.textAlign = "left";
    cell.style.border = "1px solid #e2e8f0";
    cell.style.fontSize = "14px";
    cell.style.lineHeight = "1.6";
  });

  // ✅ th ko bold + background
  Array.from(doc.body.querySelectorAll("table th")).forEach((th) => {
    th.style.fontWeight = "700";
    th.style.background = "#f8fafc";
  });

  Array.from(doc.body.querySelectorAll("iframe")).forEach((iframe) => {
    if (iframe.closest(".article-media-frame")) return;
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    if (!iframe.getAttribute("title")) iframe.setAttribute("title", "Embedded media");
    if (!iframe.getAttribute("allow")) iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
    iframe.setAttribute("allowfullscreen", "");
    const wrapper = doc.createElement("div");
    wrapper.className = "article-media-frame";
    iframe.parentNode?.insertBefore(wrapper, iframe);
    wrapper.appendChild(iframe);
  });
  Array.from(doc.body.querySelectorAll("video")).forEach((video) => {
    if (video.closest(".article-media-frame")) return;
    video.setAttribute("controls", ""); video.setAttribute("preload", "metadata"); video.setAttribute("playsinline", "");
    const wrapper = doc.createElement("div");
    wrapper.className = "article-media-frame article-native-video";
    video.parentNode?.insertBefore(wrapper, video);
    wrapper.appendChild(video);
  });
  Array.from(doc.body.querySelectorAll("blockquote.twitter-tweet")).forEach((blockquote) => {
    if (blockquote.closest(".react-tweet-placeholder")) return;
    const tweetAnchor = Array.from(blockquote.querySelectorAll("a[href]")).find((anchor) => getTweetEmbedData(anchor.href));
    const tweetData = getTweetEmbedData(tweetAnchor?.href);
    if (!tweetData) return;
    blockquote.replaceWith(createEmbedNode(doc, { type: "tweet", ...tweetData }));
  });
  Array.from(doc.body.querySelectorAll(".article-twitter-embed")).forEach((element) => {
    const tweetAnchor = element.querySelector("a[href]");
    const tweetIframe = element.querySelector("iframe[src]");
    const tweetData = getTweetEmbedData(element.getAttribute("data-tweet-url")) || getTweetEmbedData(tweetAnchor?.href) || getTweetEmbedData(tweetIframe?.src) || getTweetEmbedData(element.textContent);
    const tweetId = String(element.getAttribute("data-tweet-id") || tweetData?.id || "").trim();
    if (!tweetId) return;
    element.replaceWith(createEmbedNode(doc, { type: "tweet", id: tweetId, url: tweetData?.url || `https://twitter.com/i/web/status/${tweetId}` }));
  });
  Array.from(doc.body.querySelectorAll('iframe[src*="platform.twitter.com/embed/Tweet.html"]')).forEach((iframe) => {
    if (iframe.closest(".react-tweet-placeholder")) return;
    const tweetData = getTweetEmbedData(iframe.src);
    if (!tweetData) return;
    iframe.replaceWith(createEmbedNode(doc, { type: "tweet", ...tweetData }));
  });
  Array.from(doc.body.querySelectorAll("p, div, blockquote")).forEach((element) => {
    if (element.closest(".article-media-frame, .react-tweet-placeholder")) return;
    if (element.querySelector("iframe, video, .react-tweet-placeholder")) return;
    let descriptor = null;
    const anchors = Array.from(element.querySelectorAll("a[href]"));
    if (anchors.length >= 1) {
      for (const anchor of anchors) {
        const d = getEmbedDescriptor(anchor.href);
        if (d && (d.type === "tweet" || isStandaloneLinkElement(element))) { descriptor = d; break; }
      }
    }
    if (!descriptor) { const fullText = element.textContent || ""; const match = fullText.match(TWEET_URL_REGEX); if (match) descriptor = getEmbedDescriptor(match[0]); }
    if (!descriptor) {
      const rawText = (element.textContent || "").trim();
      const tweetMatch = rawText.match(TWEET_URL_REGEX);
      if (tweetMatch) descriptor = getEmbedDescriptor(tweetMatch[0]);
      else if (element.children.length === 0) descriptor = getEmbedDescriptor(rawText);
    }
    if (descriptor) element.replaceWith(createEmbedNode(doc, descriptor));
  });
  Array.from(doc.body.querySelectorAll("p, div, span, h1, h2, h3, h4, h5, h6")).forEach((node) => {
    if (node.closest("table, thead, tbody, tfoot, tr, td, th, blockquote, .article-table-wrapper, .article-media-frame, .react-tweet-placeholder")) return;
    if (node.querySelector("img, iframe, video, table")) return;
    normalizeAlsoReadText(node);
  });

  const finalHtml = doc.body.innerHTML;
  const finalPlainText = getPlainText(finalHtml);

  // Final guardrail: never ship a heavily truncated body after normalization.
  if (sourcePlainText.length > 800 && finalPlainText.length < sourcePlainText.length * 0.65) {
    return normalized;
  }

  return finalHtml;
};

const ArticleBody = ({ html, className, style, contentRef }) => {
  const parts = useMemo(() => {
    if (!html) return [];
    const result = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const escapeInlineHtml = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    Array.from(doc.body.querySelectorAll("p, div, span, h1, h2, h3, h4, h5, h6")).forEach((node) => {
      if (node.closest("table, thead, tbody, tfoot, tr, td, th, blockquote, .article-table-wrapper, .article-media-frame, .react-tweet-placeholder")) return;
      if (node.querySelector("img, iframe, video, table")) return;
      const text = getPlainText(node.textContent || "");
      if (!/^also\s+read\b/i.test(text)) return;
      const title = text
        .replace(/^also\s+read\s*(?:[:|])?\s*/i, "")
        .replace(/^\|\s*/, "")
        .trim();
      if (!title) return;
      const link = node.matches?.("a[href]") ? node : node.querySelector?.("a[href]");
      const href = link?.getAttribute("href");
      const titleMarkup = href
        ? `<a class="article-also-read__title" href="${escapeInlineHtml(href)}">${escapeInlineHtml(title)}</a>`
        : `<span class="article-also-read__title">${escapeInlineHtml(title)}</span>`;
      Array.from(node.attributes).forEach((attribute) => node.removeAttribute(attribute.name));
      node.className = "article-also-read";
      node.innerHTML = `<strong class="article-also-read__label">Also Read</strong><span class="article-also-read__divider" aria-hidden="true">|</span>${titleMarkup}`;
    });
    replaceTweetUrlsWithPlaceholders(doc);
    const hasGoogleSheetsMarkup = Boolean(
      doc.body.querySelector("google-sheets-html-origin, [data-sheets-root], [data-sheets-baot]")
    );
    const firstTextBlock = hasGoogleSheetsMarkup
      ? Array.from(doc.body.querySelectorAll("p")).find((node) => getPlainText(node?.textContent || "").length > 1)
      : Array.from(doc.body.querySelectorAll("p, div, span")).find((node) => {
        if (!node) return false;
        if (node.closest("table, thead, tbody, tfoot, tr, td, th, .article-table-wrapper, .article-media-frame, .react-tweet-placeholder")) return false;
        if (node.closest("blockquote")) return false;
        if (node.matches("div, span") && node.querySelector("h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote, div")) return false;
        const text = getPlainText(node.textContent || "");
        return text.length > 1;
      });
    if (firstTextBlock && !firstTextBlock.closest("ul, ol")) {
      firstTextBlock.classList.add("article-dropcap-first");
      if (firstTextBlock.tagName.toLowerCase() === "span") {
        firstTextBlock.style.display = "block";
      }
    }
    splitHtmlByTweetPlaceholders(doc.body.innerHTML).forEach((part, index) => {
      if (part.type === "tweet") {
        result.push({ ...part, key: `tweet-${part.id}-${index}` });
      } else if (part.content.trim()) {
        result.push({ ...part, key: `html-${index}` });
      }
    });
    return result;
  }, [html]);

  return (
    <div ref={contentRef} className={className} style={style}>
      {parts.map((part) =>
        part.type === "tweet" ? (
          <ArticleTweetEmbed key={part.key} id={part.id} />
        ) : (
          <div key={part.key} dangerouslySetInnerHTML={{ __html: part.content }} />
        )
      )}
    </div>
  );
};

export default function ArticleDetails() {
  const params = useParams();
  const routeParam = params.slug || params.id || "";
  const categorySlug = params.categorySlug || "";
  const isPrerenderRequest = isPrerenderUserAgent();
  const articleLookupCandidates = useMemo(() => {
    const fromRoute = normalizeSlugValue(routeParam);
    if (typeof window === "undefined") return collectSlugCandidates(fromRoute);
    const parts = window.location.pathname.split("/").filter(Boolean);
    const lastSegment = parts[parts.length - 1] || "";
    return collectSlugCandidates(lastSegment, fromRoute);
  }, [routeParam]);
  const articleSlug = articleLookupCandidates[0] || "";
  const prerenderSeedArticles = useMemo(() => getPrerenderArticles(), []);
  const prerenderArticle = useMemo(() => {
    if (!isPrerenderRequest || prerenderSeedArticles.length === 0) return null;
    const requestedPath = categorySlug && articleSlug ? `/${categorySlug}/${articleSlug}/` : "";
    const lookupSet = new Set(
      articleLookupCandidates.map((value) => normalizeSlugValue(value).toLowerCase())
    );

    return prerenderSeedArticles.find((candidate) => {
      if (!candidate) return false;
      const articlePath = getArticlePath(candidate);
      const slugCandidates = collectSlugCandidates(
        candidate?.slug,
        getSlugFromUrlLikeValue(candidate?.public_url),
        getSlugFromUrlLikeValue(candidate?.canonical_url),
        getSlugFromUrlLikeValue(candidate?.url),
        getSlugFromUrlLikeValue(candidate?.link)
      ).map((value) => normalizeSlugValue(value).toLowerCase());

      return (requestedPath && articlePath === requestedPath) || slugCandidates.some((slug) => lookupSet.has(slug));
    }) || null;
  }, [articleLookupCandidates, articleSlug, categorySlug, isPrerenderRequest, prerenderSeedArticles]);
  const is2K = useIs2K();

  const [article, setArticle] = useState(() => prerenderArticle);
  const [allArticles, setAllArticles] = useState(() => prerenderSeedArticles);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [seoEndpointSchemaState, setSeoEndpointSchemaState] = useState({ slug: "", schemas: [], meta: {} });
  const [categoryMoreArticles, setCategoryMoreArticles] = useState([]);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [textScale, setTextScale] = useState(1);
  const [moreInListMaxHeight, setMoreInListMaxHeight] = useState(null);
  const mainArticleRef = useRef(null);
  const articleContentRef = useRef(null);
  const moreInListRef = useRef(null);
  const articleBodyPayload = getArticleBodyPayload(article);
  const articleBodyHtml = articleBodyPayload.html;
  const normalizedContent = useMemo(
    () => normalizeArticleContent(articleBodyHtml),
    [articleBodyHtml]
  );
  const plainArticleContent = useMemo(() => getPlainText(articleBodyHtml), [articleBodyHtml]);

  useEffect(() => {
    const root = articleContentRef.current;
    if (!root) return;

    const normalizeRenderedAlsoRead = (node) => {
      if (!node || node.closest?.("table, thead, tbody, tfoot, tr, td, th, blockquote, .article-table-wrapper, .article-media-frame, .react-tweet-placeholder")) return;
      if (node.querySelector?.("img, iframe, video, table")) return;

      const text = getPlainText(node.textContent || "");
      if (!/^also\s+read\b/i.test(text)) return;

      const title = text
        .replace(/^also\s+read\s*(?:[:|])?\s*/i, "")
        .replace(/^\|\s*/, "")
        .trim();
      if (!title) return;
      const link = node.matches?.("a[href]") ? node : node.querySelector?.("a[href]");
      const href = link?.getAttribute("href");

      const label = document.createElement("strong");
      label.className = "article-also-read__label";
      label.textContent = "Also Read";

      const divider = document.createElement("span");
      divider.className = "article-also-read__divider";
      divider.setAttribute("aria-hidden", "true");
      divider.textContent = "|";

      const titleNode = href ? document.createElement("a") : document.createElement("span");
      titleNode.className = "article-also-read__title";
      titleNode.textContent = title;
      if (href) titleNode.setAttribute("href", href);

      Array.from(node.attributes || []).forEach((attribute) => node.removeAttribute(attribute.name));
      node.className = "article-also-read";
      node.replaceChildren(label, divider, titleNode);
    };

    Array.from(root.querySelectorAll("p, div, span, h1, h2, h3, h4, h5, h6")).forEach(normalizeRenderedAlsoRead);
  }, [normalizedContent]);

  useEffect(() => {
    const controller = new AbortController();
    if (isPrerenderRequest && prerenderArticle && hasRenderableArticleBody(prerenderArticle)) {
      setArticle(prerenderArticle);
      setAllArticles(prerenderSeedArticles);
      setCategoryMoreArticles([]);
      setNotFound(false);
      setLoadError(false);
      return () => controller.abort();
    }

    setArticle(null); setAllArticles([]); setCategoryMoreArticles([]);
    setNotFound(false); setLoadError(false);
    window.scrollTo(0, 0);
    const loadArticle = async () => {
      try {
        const fetchArticleDetail = async () => {
          for (const candidate of articleLookupCandidates) {
            const response = await fetchWithRetry(apiUrl(`/articles/slug/${encodeURIComponent(candidate)}/`), { signal: controller.signal, cache: "no-store" }, 3);
            if (response.ok) return response;
            if (response.status !== 404) throw new Error(`Failed to fetch article detail: ${response.status}`);
          }
          return null;
        };
        const detailResponse = await fetchArticleDetail();

        if (isPrerenderRequest && detailResponse) {
          const detailData = await detailResponse.json();
          const found = Array.isArray(detailData) ? detailData[0] : detailData;
          if (found && (found.slug || found.id)) {
            if (!hasRenderableArticleBody(found) && found.id) {
              try {
                const idDetailResponse = await fetchWithRetry(apiUrl(`/articles/${encodeURIComponent(String(found.id))}/`), { signal: controller.signal, cache: "no-store" }, 3);
                if (idDetailResponse.ok) {
                  const idDetailData = await idDetailResponse.json();
                  const hydratedArticle = Array.isArray(idDetailData) ? idDetailData[0] : idDetailData;
                  if (hydratedArticle && (hydratedArticle.slug || hydratedArticle.id)) {
                    setArticle({ ...found, ...hydratedArticle });
                    return;
                  }
                }
              } catch (error) {
                if (error?.name === "AbortError") throw error;
              }
            }
            setArticle(found);
            return;
          }
        }

        let sortedList = [];
        let listFetchFailed = false;
        try {
          const listResponse = await fetchWithRetry(apiUrl("/articles/?page=1&limit=500"), { signal: controller.signal, cache: "no-store" }, 3);
          if (!listResponse.ok) throw new Error(`Failed to fetch articles list: ${listResponse.status}`);
          const listData = await listResponse.json();
          const list = Array.isArray(listData) ? listData : Array.isArray(listData?.value) ? listData.value : listData?.results || [];
          sortedList = sortArticlesByNewest(list);
          setAllArticles(sortedList);
        } catch (error) {
          if (error?.name === "AbortError") throw error;
          listFetchFailed = true; setAllArticles([]);
          console.error("Related articles list fetch failed:", error);
        }
        if (!detailResponse) {
          if (listFetchFailed) { setLoadError(true); return; }
          const requestedPath = categorySlug && articleSlug ? `/${categorySlug}/${articleSlug}/` : "";
          const lookupSet = new Set(articleLookupCandidates.map((value) => normalizeSlugValue(value).toLowerCase()));
          const listMatch = sortedList.find((candidate) => {
            const articlePath = getArticlePath(candidate);
            const slugCandidates = collectSlugCandidates(candidate?.slug, getSlugFromUrlLikeValue(candidate?.public_url), getSlugFromUrlLikeValue(candidate?.canonical_url), getSlugFromUrlLikeValue(candidate?.url), getSlugFromUrlLikeValue(candidate?.link)).map((value) => normalizeSlugValue(value).toLowerCase());
            return (requestedPath && articlePath === requestedPath) || slugCandidates.some((slug) => lookupSet.has(slug));
          });
          if (listMatch && (listMatch.slug || listMatch.id)) {
            const hasSeoTitle = [listMatch?.meta_title, listMatch?.metaTitle, listMatch?.seo_title, listMatch?.seoTitle, listMatch?.seo?.meta_title, listMatch?.seo?.metaTitle, listMatch?.seo?.seo_title, listMatch?.seo?.seoTitle].map((value) => getPlainText(value)).some(Boolean);
            if ((!hasSeoTitle || !hasRenderableArticleBody(listMatch)) && listMatch?.id) {
              try {
                const idDetailResponse = await fetchWithRetry(apiUrl(`/articles/${encodeURIComponent(String(listMatch.id))}/`), { signal: controller.signal, cache: "no-store" }, 3);
                if (idDetailResponse.ok) {
                  const idDetailData = await idDetailResponse.json();
                  const hydratedArticle = Array.isArray(idDetailData) ? idDetailData[0] : idDetailData;
                  if (hydratedArticle && (hydratedArticle.slug || hydratedArticle.id)) { setArticle({ ...listMatch, ...hydratedArticle }); return; }
                }
              } catch (error) { if (error?.name === "AbortError") throw error; }
            }
            setArticle(listMatch); return;
          }
          setNotFound(true); return;
        }
        const detailData = await detailResponse.json();
        const found = Array.isArray(detailData) ? detailData[0] : detailData;
        if (found && (found.slug || found.id)) {
          if (!hasRenderableArticleBody(found) && found.id) {
            try {
              const idDetailResponse = await fetchWithRetry(apiUrl(`/articles/${encodeURIComponent(String(found.id))}/`), { signal: controller.signal, cache: "no-store" }, 3);
              if (idDetailResponse.ok) {
                const idDetailData = await idDetailResponse.json();
                const hydratedArticle = Array.isArray(idDetailData) ? idDetailData[0] : idDetailData;
                if (hydratedArticle && (hydratedArticle.slug || hydratedArticle.id)) {
                  setArticle({ ...found, ...hydratedArticle });
                  return;
                }
              }
            } catch (error) {
              if (error?.name === "AbortError") throw error;
            }
          }
          setArticle(found);
          return;
        }
        setNotFound(true);
      } catch (error) {
        if (error.name === "AbortError") return;
        setLoadError(true);
      }
      // prerender signal handled exclusively by polling useEffect
    };
    loadArticle();
    return () => controller.abort();
  }, [articleLookupCandidates, articleSlug, categorySlug, isPrerenderRequest, prerenderArticle, prerenderSeedArticles]);

  useEffect(() => {
    if (!article) return;

    const controller = new AbortController();
    let ignore = false;
    const currentSlug = normalizeSlugValue(article?.slug || articleSlug);

    const seoSlugCandidates = collectSlugCandidates(
      article?.slug,
      ...articleLookupCandidates,
      getSlugFromUrlLikeValue(article?.public_url),
      getSlugFromUrlLikeValue(article?.canonical_url),
      getSlugFromUrlLikeValue(article?.url),
      getSlugFromUrlLikeValue(article?.link)
    );

    const loadSeoSchemas = async () => {
      for (const slugCandidate of seoSlugCandidates) {
        try {
          const response = await fetchWithRetry(
            apiUrl(`/seo/article/${encodeURIComponent(slugCandidate)}/`),
            { signal: controller.signal, cache: "no-store" },
            2
          );

          if (!response.ok) {
            if (response.status === 404) continue;
            break;
          }

          const payload = await response.json();
          const schemas = dedupeStructuredSchemas(extractStructuredDataSchemas(payload));
          const meta = getSeoEndpointMeta(payload);
          if (schemas.length > 0 || Object.keys(meta).length > 0) {
            if (!ignore) {
              setSeoEndpointSchemaState({
                slug: currentSlug || slugCandidate,
                schemas,
                meta,
              });
            }
            return;
          }
        } catch (error) {
          if (error?.name === "AbortError") return;
          break;
        }
      }

      if (!ignore) {
        setSeoEndpointSchemaState({
          slug: currentSlug,
          schemas: [],
          meta: {},
        });
      }
    };

    loadSeoSchemas();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [article, articleLookupCandidates, articleSlug]);

  useEffect(() => {
    if (!article) { setCategoryMoreArticles([]); return; }
    const primary = getArticleCategoryDetails(article)[0];
    const primarySlug = String(primary?.slug || primary?.category_slug || categorySlug || "").trim();
    if (!primarySlug) { setCategoryMoreArticles([]); return; }
    const controller = new AbortController();
    const loadCategoryArticles = async () => {
      try {
        const list = await fetchPaginatedArticles({ category: primarySlug, limit: 100, maxPages: 10 });
        const filtered = sortArticlesByNewest(list).filter((candidate) => String(candidate?.slug || candidate?.id || "") !== String(article?.slug || article?.id || ""));
        setCategoryMoreArticles(filtered);
      } catch (error) {
        if (error?.name === "AbortError") return;
        setCategoryMoreArticles([]);
      }
    };
    loadCategoryArticles();
    return () => controller.abort();
  }, [article, categorySlug]);

  useEffect(() => {
    if (!articleSlug) return;

    let intervalId = 0, timeoutId = 0, rafId = 0;
    let emitted = false;

    const emitReady = () => {
      if (emitted) return;
      emitted = true;
      signalPrerenderReady(article ? 200 : 404);
    };

    // Normal browser — turant emit karo
    if (!isPrerenderRequest) {
      rafId = window.requestAnimationFrame(emitReady);
      return () => window.cancelAnimationFrame(rafId);
    }

    // Prerender hai — article abhi load ho raha hai, wait karo
    if (!article && !notFound && !loadError) {
      return;
    }

    // Prerender hai — error ya notFound — turant emit karo
    if (!article) {
      rafId = window.requestAnimationFrame(emitReady);
      return () => window.cancelAnimationFrame(rafId);
    }

    // Prerender hai — article load ho gaya — content check karo
    const isArticleRenderReady = () => {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      const hasStructuredData = jsonLdScripts.length > 0;
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      const hasCanonical = Boolean(canonicalLink?.href);
      const titleText = mainArticleRef.current?.querySelector("h1")?.textContent?.trim() || "";
      const articleTitleStart = String(article?.title || "").trim().slice(0, 24);
      const hasArticleTitle = Boolean(articleTitleStart && titleText.includes(articleTitleStart));
      const bodyText = articleContentRef.current?.textContent?.trim() || "";
      const hasBodyContent = bodyText.length >= 50;
      const articleHasNoContent = !articleBodyHtml || articleBodyHtml.trim().length === 0;
      if (articleHasNoContent) return false;
      return hasArticleTitle && hasBodyContent && hasStructuredData && hasCanonical;
    };

    const checkAndEmit = () => {
      if (isArticleRenderReady()) {
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
        emitReady();
      }
    };

    rafId = window.requestAnimationFrame(checkAndEmit);
    intervalId = window.setInterval(checkAndEmit, 300);

    timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      emitReady();
    }, 25000);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [article, articleSlug, isPrerenderRequest, loadError, notFound, articleBodyHtml]);

  useEffect(() => {
    if (!article || !mainArticleRef.current || !moreInListRef.current) return;
    const updateMoreInHeight = () => {
      const mainArticleRect = mainArticleRef.current?.getBoundingClientRect();
      const moreInRect = moreInListRef.current?.getBoundingClientRect();
      if (!mainArticleRect || !moreInRect) return;
      const articleBottom = mainArticleRect.bottom + window.scrollY;
      const moreInTop = moreInRect.top + window.scrollY;
      const availableHeight = Math.floor(articleBottom - moreInTop);
      setMoreInListMaxHeight(availableHeight > 220 ? availableHeight : 220);
    };
    updateMoreInHeight();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateMoreInHeight()) : null;
    if (resizeObserver) { resizeObserver.observe(mainArticleRef.current); resizeObserver.observe(moreInListRef.current); }
    window.addEventListener("resize", updateMoreInHeight);
    return () => { resizeObserver?.disconnect(); window.removeEventListener("resize", updateMoreInHeight); };
  }, [article, articleSlug, allArticles.length, categoryMoreArticles.length]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.querySelectorAll('[data-prerender-fallback="article-main"]').forEach((node) => node.remove());
  }, []);

  useEffect(() => { if (!article) return; document.title = getBrowserTitle(article); }, [article]);

  useEffect(() => {
    if (!article || typeof window === "undefined") return;
    const key = String(article?.slug || article?.id || "");
    if (!key) return;
    try {
      const savedArticles = JSON.parse(window.localStorage.getItem("n4b_saved_articles") || "[]");
      setSaved(Array.isArray(savedArticles) && savedArticles.some((item) => String(item?.key) === key));
    } catch {
      setSaved(false);
    }
  }, [article]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [articleSlug]);

  const sidebarBaseArticles = article ? allArticles.filter((a) => String(a?.slug || a?.id || "") !== String(article?.slug || article?.id || "")) : [];
  const moreInArticles = article ? sidebarBaseArticles.filter((a) => sharesCategoryWithArticle(a, article)) : [];

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = article?.title || "";
    trackSocialShare(platform, {
      article_slug: article?.slug || articleSlug || "",
      article_title: title,
      content_type: "article",
    });
    if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, "_blank");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    else if (platform === "instagram") { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); window.open("https://www.instagram.com/", "_blank"); }
    else if (platform === "youtube") window.open(YOUTUBE_CHANNEL_URL, "_blank");
    else if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`, "_blank");
    else if (platform === "linkedin") window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
    else if (platform === "copy") { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }
  };

  const handleSaveArticle = () => {
    if (!article || typeof window === "undefined") return;
    const key = String(article?.slug || article?.id || "");
    if (!key) return;

    try {
      const savedArticles = JSON.parse(window.localStorage.getItem("n4b_saved_articles") || "[]");
      const safeSavedArticles = Array.isArray(savedArticles) ? savedArticles : [];
      const alreadySaved = safeSavedArticles.some((item) => String(item?.key) === key);
      const nextSavedArticles = alreadySaved
        ? safeSavedArticles.filter((item) => String(item?.key) !== key)
        : [
          {
            key,
            title: article.title,
            path: getArticlePath(article),
            savedAt: new Date().toISOString(),
          },
          ...safeSavedArticles,
        ].slice(0, 50);

      window.localStorage.setItem("n4b_saved_articles", JSON.stringify(nextSavedArticles));
      setSaved(!alreadySaved);
    } catch {
      setSaved((current) => !current);
    }
  };

  const handleListenArticle = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isListening) {
      window.speechSynthesis.cancel();
      setIsListening(false);
      return;
    }

    const text = [article?.title, visibleSummary, plainArticleContent]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(". ");
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 12000));
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.onend = () => setIsListening(false);
    utterance.onerror = () => setIsListening(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsListening(true);
  };

  const decreaseTextSize = () => setTextScale((value) => Math.max(0.9, Number((value - 0.08).toFixed(2))));
  const increaseTextSize = () => setTextScale((value) => Math.min(1.18, Number((value + 0.08).toFixed(2))));

  if (notFound) return (
    <>
      <Helmet><title>Article Not Found | News4Bharat</title><meta name="prerender-status-code" content="404" /><meta name="robots" content="noindex, nofollow" /><meta name="description" content="This article is unavailable." /></Helmet>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Newspaper size={48} color="#ccc" />
        <p className="text-xl font-bold text-gray-700 mt-4">Article not found</p>
        <Link to="/" className="mt-4 text-red-600 text-sm font-semibold hover:underline">← Back to Home</Link>
      </div>
    </>
  );

  if (loadError && !isPrerenderRequest) return (
    <>
      <Helmet><title>Article Unavailable | News4Bharat</title><meta name="prerender-status-code" content="404" /><meta name="description" content="We could not load this article right now." /><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Newspaper size={48} color="#ccc" />
        <p className="text-xl font-bold text-gray-700 mt-4">Article is temporarily unavailable</p>
        <p className="text-sm text-gray-500 mt-2 max-w-md">Please refresh the page after a short while.</p>
        <Link to="/" className="mt-4 text-red-600 text-sm font-semibold hover:underline">← Back to Home</Link>
      </div>
    </>
  );

  if (loadError && isPrerenderRequest) return (
    <>
      <Helmet><title>Article Unavailable | News4Bharat</title><meta name="prerender-status-code" content="404" /><meta name="description" content="We could not load this article right now." /><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="min-h-[1px]" />
    </>
  );

  if (!article) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-9 h-9 border-[3px] border-[#f0ece8] border-t-[#D80100] rounded-full animate-spin mb-3" />
      <p className="text-gray-400 text-sm">Loading article...</p>
    </div>
  );

  /* ── derived values ── */
  const currentArticleSlugToken = normalizeSlugValue(article?.slug || articleSlug).toLowerCase();
  const hasMatchingSeoEndpoint =
    currentArticleSlugToken &&
    normalizeSlugValue(seoEndpointSchemaState.slug).toLowerCase() === currentArticleSlugToken;
  const seoEndpointMeta = hasMatchingSeoEndpoint ? seoEndpointSchemaState.meta || {} : {};
  const seoEndpointOg = isSchemaPlainObject(seoEndpointMeta.og) ? seoEndpointMeta.og : {};
  const seoEndpointTwitter = isSchemaPlainObject(seoEndpointMeta.twitter) ? seoEndpointMeta.twitter : {};

  const date = getArticleDateValue(article);
  const modifiedDate = article.updated_at || getArticleDateValue(article);
  const articleUpdatedLabel = getArticleUpdatedLabel(article);
  const imageUrl = getArticleImage(article);
  const imageAlt = getPlainText(seoEndpointOg.image_alt) || article.image_alt?.trim() || article.title;
  const imageSource = article.image_source?.trim() || "";
  const absoluteImageUrl =
    toAbsoluteSiteUrl(seoEndpointOg.image || seoEndpointTwitter.image) ||
    toAbsoluteSiteUrl(imageUrl) ||
    DEFAULT_SHARE_IMAGE;
  const primaryCategory = getArticleCategoryDetails(article)[0] || null;
  const primaryCategorySlug = normalizeSlugValue(primaryCategory?.slug || primaryCategory?.category_slug || "");
  const primaryCategoryNameToken = normalizeCategoryToken(primaryCategory?.name || "");
  const isBfsiCategory = primaryCategorySlug === "bfsi" || primaryCategoryNameToken.includes("bfsi");
  const categoryName = isBfsiCategory ? "" : (primaryCategory?.name?.trim() || "");
  const moreInCategorySlug = String(primaryCategory?.slug || primaryCategory?.category_slug || categorySlug || "").trim();
  const moreInCategoryLabel = isBfsiCategory
    ? ""
    : (primaryCategory?.name?.trim() || String(categorySlug || "").replace(/-/g, " ").trim());
  const normalizedCategorySlug = isBfsiCategory
    ? ""
    : normalizeSlugValue(primaryCategory?.slug || primaryCategory?.category_slug || categorySlug || "");
  const breadcrumbCategoryLabel = categoryName || moreInCategoryLabel || normalizedCategorySlug.replace(/-/g, " ");
  const isWorldNewsArticle = ["world-news", "worldnews"].includes(normalizedCategorySlug);
  const routeCanonicalUrl = buildCanonicalFromRoute(normalizedCategorySlug || categorySlug, article?.slug || articleSlug);
  const canonicalUrl = toCanonicalSiteUrl(seoEndpointMeta.canonical) || getCanonicalArticleUrl(article) || routeCanonicalUrl;
  const articlePath = getArticlePath(article) || (routeCanonicalUrl ? new URL(routeCanonicalUrl).pathname : "");
  const articleUrlForSchema = canonicalUrl || (articlePath ? `${SITE_URL}${articlePath}` : "");
  const displayMoreArticles = categoryMoreArticles.length > 0 ? categoryMoreArticles : moreInArticles;
  const tags = getArticleTags(article);
  const authorDisplayName = getPlainText(seoEndpointMeta.author) || article.display_author_name?.trim() || article.author_display_name?.trim() || article.author_name?.trim() || article.posted_by_fullname?.trim() || "News4Bharat";
  const authorPosition = article.author_display_position?.trim() || "";
  const authorSlug = getArticleAuthorSlug(article) || buildAuthorSlug(authorDisplayName);
  const authorPagePath = `/author/${authorSlug}`;
  const absoluteAuthorUrl = authorDisplayName === SITE_NAME ? SITE_URL : `${SITE_URL}${authorPagePath}`;
  const authorPhotoUrl = toAbsoluteSiteUrl(article.author_display_photo?.trim());
  const authorInitials = authorDisplayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const authorBio = getPlainText(
    article.author_display_bio ||
    article.author_bio ||
    article.display_author_bio ||
    article.author?.bio ||
    article.author?.description ||
    ""
  );
  const authorBioText = authorBio || (
    authorDisplayName === SITE_NAME
      ? "News4Bharat editorial team brings you verified updates, explainers, and stories from Bharat and around the world."
      : `${authorDisplayName} is a contributor at News4Bharat. Read more stories and updates from this author on News4Bharat.`
  );
  const authorBioPreview = truncateText(authorBioText, 260);
  const authorSocialLinks = [
    { href: article.author_display_linkedin, icon: <Linkedin size={15} />, label: "LinkedIn" },
    { href: article.author_display_instagram, icon: <Instagram size={15} />, label: "Instagram" },
    { href: article.author_display_facebook, icon: <Facebook size={15} />, label: "Facebook" },
    { href: article.author_display_youtube, icon: <Youtube size={15} />, label: "YouTube" },
  ]
    .map((item) => ({ ...item, href: String(item.href || "").trim() }))
    .filter((item) => item.href);

  const articleReadTime = getArticleReadTime({
    ...article,
    content: articleBodyHtml || article.content,
  });

  const shellStyle = is2K ? { width: "var(--site-content-width)", maxWidth: "var(--site-content-width)", paddingLeft: 0, paddingRight: 0 } : undefined;
  const articleTextMaxWidth = is2K ? "1120px" : "720px";
  const contentGridStyle = is2K
    ? { ...shellStyle, gridTemplateColumns: "minmax(0, 1120px) 340px", columnGap: "24px", justifyContent: "space-between" }
    : shellStyle;
  const heroImageWrapStyle = is2K ? { display: "flex", justifyContent: "flex-start", alignItems: "center" } : undefined;
  const heroImageCardClassName = is2K
    ? "article-hero-image-card w-fit max-w-full mr-auto rounded-xl overflow-hidden mb-7 shadow-sm"
    : "article-hero-image-card w-full rounded-xl overflow-hidden mb-7 shadow-sm";
  const heroImageClassName = is2K
    ? "block"
    : `w-full max-h-[480px] ${isWorldNewsArticle ? "object-contain bg-[#f4f7fb]" : "object-cover"}`;
  const heroImageStyle = is2K
    ? { width: "min(100%, 1480px)", height: "auto", maxWidth: "100%", maxHeight: "min(72vh, 820px)", objectFit: "contain", objectPosition: "left center", margin: "0" }
    : undefined;

  const articleSummaryText = getPlainText(article.subtitle) || getPlainText(article.description) || getPlainText(article.summary) || getPlainText(article.excerpt);
  const visibleSummary = articleSummaryText || truncateText(plainArticleContent, 220) || article.title;
  const seoTitle =
    getPlainText(seoEndpointMeta.title) ||
    getPlainText(seoEndpointOg.title) ||
    getPlainText(seoEndpointTwitter.title) ||
    getBrowserTitle(article);
  const metaDescription =
    getPlainText(seoEndpointMeta.description) ||
    getPlainText(seoEndpointOg.description) ||
    getPlainText(seoEndpointTwitter.description) ||
    getPlainText(article.meta_description) ||
    articleSummaryText ||
    truncateText(plainArticleContent, 160) ||
    truncateText(article.title, 160);
  const secondaryKeywords = Array.isArray(article.secondary_keywords_list) ? article.secondary_keywords_list.map(normalizeKeywordPhrase).filter(Boolean) : String(article.secondary_keywords || "").split(",").map((item) => normalizeKeywordPhrase(item)).filter(Boolean);
  const focusKeyword = normalizeKeywordPhrase(article.focus_keyword);
  const seoKeywords = splitSeoKeywordText(seoEndpointMeta.keywords);
  const baseMetaKeywords = seoKeywords.length > 0
    ? Array.from(new Set(seoKeywords)).join(", ")
    : Array.from(new Set([focusKeyword, ...secondaryKeywords, ...tags].map((item) => String(item || "").trim()).filter(Boolean))).join(", ");
  const fallbackMetaKeywords = getFallbackArticleKeywords(article, article.title, categoryName).join(", ");
  const metaKeywords = baseMetaKeywords || fallbackMetaKeywords;
  const seoArticleTags = splitSeoKeywordText(seoEndpointOg["article:tag"]);
  const articleTags = (seoArticleTags.length > 0 ? seoArticleTags : tags).filter(Boolean);
  const robotsContent = getPlainText(seoEndpointMeta.robots) || getRobotsContent(article);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": ["NewsArticle", "Article"],
    ...(canonicalUrl ? { "@id": `${canonicalUrl}#article` } : {}),
    headline: article.title,
    alternativeHeadline: visibleSummary || article.title,
    description: metaDescription,
    articleBody: plainArticleContent,
    inLanguage: "en-IN",
    datePublished: date || "",
    dateModified: modifiedDate || "",
    ...(canonicalUrl ? { url: canonicalUrl } : {}),
    ...(canonicalUrl ? { mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl } } : {}),
    author: { "@type": authorDisplayName === SITE_NAME ? "Organization" : "Person", name: authorDisplayName, url: absoluteAuthorUrl, ...(authorPosition ? { jobTitle: authorPosition } : {}), ...(authorPhotoUrl ? { image: { "@type": "ImageObject", url: authorPhotoUrl } } : {}) },
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` } },
    isAccessibleForFree: !article.is_paid,
    ...(absoluteImageUrl ? { image: { "@type": "ImageObject", url: absoluteImageUrl, caption: imageAlt }, thumbnailUrl: absoluteImageUrl } : {}),
    ...(categoryName ? { articleSection: categoryName } : {}),
    ...(metaKeywords ? { keywords: metaKeywords } : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...(normalizedCategorySlug ? [{ "@type": "ListItem", position: 2, name: categoryName || moreInCategoryLabel || normalizedCategorySlug.replace(/-/g, " "), item: `${SITE_URL}/category/${normalizedCategorySlug}` }] : []),
      { "@type": "ListItem", position: normalizedCategorySlug ? 3 : 2, name: article.title, ...(articleUrlForSchema ? { item: articleUrlForSchema } : {}) },
    ],
  };
  const articlePayloadSchemas = dedupeStructuredSchemas(
    extractStructuredDataSchemas({
      structured_datakey: article?.structured_datakey,
      structured_data: article?.structured_data,
      schema: article?.schema,
      schemas: article?.schemas,
      seo: article?.seo,
    })
  );

  const seoEndpointSchemas =
    hasMatchingSeoEndpoint
      ? seoEndpointSchemaState.schemas
      : [];

  // Consume both sources fully so schema types like FAQPage are never dropped.
  const backendPreferredSchemas = dedupeStructuredSchemas([
    ...seoEndpointSchemas,
    ...articlePayloadSchemas,
  ]);
  const resolvedJsonLdSchemas = (() => {
    const extraBackendSchemas = backendPreferredSchemas.filter((schema) =>
      !schemaHasType(schema, "NewsArticle") &&
      !schemaHasType(schema, "Article") &&
      !schemaHasType(schema, "BreadcrumbList")
    );

    return dedupeStructuredSchemas([
      articleSchema,
      breadcrumbSchema,
      ...extraBackendSchemas,
    ]);
  })();
  // Frontend FAQ accordion shows article-authored FAQ content, including backend FAQ schema fields.
  const visualFaqItems = dedupeFaqItems(
    extractFaqItems({
      faq: article?.faq,
      faqs: article?.faqs,
      faq_items: article?.faq_items,
      faqItems: article?.faqItems,
      faq_schema_items: article?.faq_schema_items,
      faqSchemaItems: article?.faqSchemaItems,
      faq_schema: article?.faq_schema,
      faq_schemas: article?.faq_schemas,
      faqpage: article?.faqpage,
      faq_page: article?.faq_page,
    })
  );
  const visualFaqTitle =
    getPlainText(article?.faq_schema_title || article?.faqSchemaTitle) ||
    "Frequently Asked Questions";

  return (
    <div className="min-h-screen bg-white pt-[62px] font-[Poppins,_sans-serif]">

      {/* ── 1. READING PROGRESS BAR ── */}
      <ReadingProgressBar />

      {/* ── 2. FLOATING SHARE BAR ── */}


      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot page="home" placement="home_side_left" variant="sideRail" className="home-side-ad home-side-ad--left" dismissible minWidth={768} />
      </aside>

      <Helmet>
        <title>{seoTitle}</title>
        <meta name="prerender-status-code" content="200" />
        <meta name="description" content={metaDescription} />
        <meta name="author" content={authorDisplayName} />
        {metaKeywords && <meta name="keywords" content={metaKeywords} />}
        {articleTags.length > 0 && <meta name="news_keywords" content={articleTags.join(", ")} />}
        {article.focus_keyword && <meta name="focus_keyword" content={focusKeyword} />}
        {secondaryKeywords.length > 0 && <meta name="secondary_keywords" content={secondaryKeywords.join(", ")} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <meta name="robots" content={robotsContent} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={metaDescription} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:image" content={absoluteImageUrl} />
        <meta property="og:image:alt" content={imageAlt} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="en_IN" />
        <meta property="article:author" content={authorDisplayName} />
        {categoryName && <meta property="article:section" content={categoryName} />}
        {articleTags.map((tag) => <meta key={`article-tag-${tag}`} property="article:tag" content={tag} />)}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={TWITTER_HANDLE} />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {canonicalUrl && <meta name="twitter:url" content={canonicalUrl} />}
        <meta name="twitter:image" content={absoluteImageUrl} />
        <meta name="twitter:image:alt" content={imageAlt} />
        {date && <meta property="article:published_time" content={date} />}
        {modifiedDate && <meta property="article:modified_time" content={modifiedDate} />}
        {resolvedJsonLdSchemas.map((schema, index) => (
          <script key={`article-schema-${index}`} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
      </Helmet>

      <AdvertisementSlot page="article_detail" placement="home_top" variant="leaderboard" className="home-top-ad home-top-ad--desktop" minWidth={769} />
      <AdvertisementSlot page="article_detail" placement="home_top_mobile" variant="mobileStrip" className="home-top-ad home-top-ad--mobile" maxWidth={768} />

      <div
        className="category-page-align mx-auto px-4 sm:px-6 pb-8 pt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start"
        style={contentGridStyle}
      >

        {/* ── MAIN ARTICLE ── */}
        <article ref={mainArticleRef} className="min-w-0">

          <nav
            aria-label="Breadcrumb"
            className="mb-5 text-[12px] font-medium text-gray-500"
            style={{ maxWidth: articleTextMaxWidth }}
          >
            <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
              <li className="inline-flex items-center">
                <Link to="/" className="no-underline hover:text-red-600 transition-colors" style={{ textDecoration: "none" }}>
                  Home
                </Link>
              </li>
              {normalizedCategorySlug && (
                <>
                  <li className="inline-flex items-center text-gray-300" aria-hidden="true">
                    <ChevronRight size={13} />
                  </li>
                  <li className="inline-flex min-w-0 items-center">
                    <Link
                      to={`/category/${normalizedCategorySlug}`}
                      className="max-w-[180px] truncate capitalize no-underline hover:text-red-600 transition-colors sm:max-w-none"
                      style={{ textDecoration: "none" }}
                    >
                      {breadcrumbCategoryLabel}
                    </Link>
                  </li>
                </>
              )}
              <li className="inline-flex items-center text-gray-300" aria-hidden="true">
                <ChevronRight size={13} />
              </li>
              <li className="min-w-0 flex-1 text-gray-700" aria-current="page">
                <span className="block truncate">{article.title}</span>
              </li>
            </ol>
          </nav>

          <h1 className="text-[clamp(20px,4vw,36px)] font-extrabold leading-[1.3] text-gray-900 mb-3 tracking-tight" style={{ maxWidth: articleTextMaxWidth }}>
            {article.title}
          </h1>

          {visibleSummary && (
            <p className="article-summary text-[15px] text-gray-500 mb-4 leading-[1.7]" style={{ maxWidth: articleTextMaxWidth }}>
              {visibleSummary}
            </p>
          )}

          {/* ── 4. IMPROVED AUTHOR CARD ── */}
          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-gray-500 mb-5 pb-5 border-b border-gray-200">
            <Link
              to={authorPagePath}
              className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              style={{ textDecoration: "none" }}
            >
              {/* Author photo or initials circle */}
              {authorPhotoUrl ? (
                <img
                  src={authorPhotoUrl}
                  alt={authorDisplayName}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  width={32}
                  height={32}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: "#D80100" }}
                >
                  {authorInitials}
                </div>
              )}
              <div className="flex flex-col leading-none gap-0.5">
                <span className="font-semibold text-red-600 text-[13px]">{authorDisplayName}</span>
                {authorPosition && (
                  <span className="text-[11px] text-gray-400">{authorPosition}</span>
                )}
              </div>
            </Link>

            {date && (
              <span className="flex items-center gap-1.5 text-gray-500">
                <Clock size={13} />
                {articleUpdatedLabel || formatArticleDateTimeForDisplay(article)}
              </span>
            )}

            {articleReadTime && (
              <span className="flex items-center gap-1.5 text-gray-500">
                <Newspaper size={13} />
                {articleReadTime}
              </span>
            )}
          </div>

          <div className="article-action-toolbar" style={{ maxWidth: articleTextMaxWidth }}>
            <button type="button" onClick={() => handleShare("copy")} className="article-action-toolbar__button">
              <Share2 size={15} />
              {copied ? "Copied" : "Share"}
            </button>
            <button
              type="button"
              onClick={handleSaveArticle}
              className={`article-action-toolbar__button${saved ? " article-action-toolbar__button--active" : ""}`}
            >
              <Bookmark size={15} />
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleListenArticle}
              className={`article-action-toolbar__button${isListening ? " article-action-toolbar__button--active" : ""}`}
            >
              <Volume2 size={15} />
              {isListening ? "Stop" : "Listen"}
            </button>
            <div className="article-action-toolbar__text-controls" aria-label="Text size controls">
              <Type size={15} />
              <button type="button" onClick={decreaseTextSize} aria-label="Decrease text size">
                <Minus size={13} />
              </button>
              <button type="button" onClick={increaseTextSize} aria-label="Increase text size">
                <Plus size={13} />
              </button>
            </div>
          </div>

          {imageUrl && (
            <div className={heroImageCardClassName}>
              <div style={heroImageWrapStyle}>
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className={heroImageClassName}
                  style={heroImageStyle}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  width={1200}
                  height={480}
                />
              </div>
              {imageSource && (
                <div className="bg-white px-4 py-2 text-[12px] text-gray-500 border-t border-gray-100">
                  Source: {imageSource}
                </div>
              )}
            </div>
          )}

          {/* ── 6. ARTICLE BODY with max-width + drop cap ── */}
          <ArticleBody
            html={normalizedContent}
            contentRef={articleContentRef}
            className="article-content"
            style={{ userSelect: "text", WebkitUserSelect: "text", maxWidth: articleTextMaxWidth, fontSize: `${textScale}rem` }}
          />

          <style>{`
.article-content .article-dropcap-first {
  display: block;
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
}
.article-content img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border-radius: 8px;
}
.article-content figure,
.article-content .image,
.article-content .image_resized,
.article-content .wp-caption {
  max-width: 100%;
  margin: 18px 0;
}
.article-content figure img,
.article-content .image img,
.article-content .wp-caption img {
  width: 100%;
  max-width: 100%;
}
.article-content figure[style*="width"] img,
.article-content .image_resized[style*="width"] img,
.article-content .wp-caption[style*="width"] img {
  width: 100%;
}
.article-content figcaption,
.article-content .wp-caption-text,
.article-content .caption {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px !important;
  line-height: 1.5 !important;
  font-weight: 500;
  text-align: inherit;
}
.article-content .alignleft,
.article-content .image-style-align-left,
.article-content figure[align="left"],
.article-content img[align="left"] {
  float: left !important;
  margin: 6px 18px 12px 0 !important;
}
.article-content .alignright,
.article-content .image-style-align-right,
.article-content figure[align="right"],
.article-content img[align="right"] {
  float: right !important;
  margin: 6px 0 12px 18px !important;
}
.article-content .aligncenter,
.article-content .image-style-align-center,
.article-content figure[align="center"],
.article-content img[align="center"] {
  float: none !important;
  margin-left: auto !important;
  margin-right: auto !important;
  text-align: center;
}
.article-content .image-style-side {
  float: right !important;
  margin: 6px 0 12px 18px !important;
  max-width: 50%;
}
.article-content :where(.quote, .quote-box, .ck-block-quote, blockquote) img:first-child {
  width: 72px;
  max-width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 999px;
  margin: 0;
  flex: 0 0 auto;
}
.article-content :where(.quote, .quote-box, .ck-block-quote, blockquote):has(img) {
  display: flex !important;
  align-items: flex-start;
  gap: 16px;
}
@media (max-width: 640px) {
  .article-content .alignleft,
  .article-content .alignright,
  .article-content .image-style-align-left,
  .article-content .image-style-align-right,
  .article-content .image-style-side {
    float: none !important;
    max-width: 100% !important;
    margin: 16px 0 !important;
  }
  .article-content :where(.quote, .quote-box, .ck-block-quote, blockquote):has(img) {
    flex-direction: column;
  }
}
            .article-content .article-dropcap-first::first-letter {
              float: left;
              font-size: 4.4rem;
              font-weight: 800;
              line-height: 0.85;
              margin-right: 0.5rem;
              margin-top: 0.25rem;
              color: #dc2626;
            }
          `}</style>

          <ArticleFaqAccordion items={visualFaqItems} maxWidth={articleTextMaxWidth} title={visualFaqTitle} />

          <section className="mt-8 border-t border-gray-200 pt-6" style={{ maxWidth: articleTextMaxWidth }}>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Link
                  to={authorPagePath}
                  className="mx-auto flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-50 text-red-600 no-underline sm:mx-0"
                  style={{ textDecoration: "none" }}
                  aria-label={`View author profile for ${authorDisplayName}`}
                >
                  {authorPhotoUrl ? (
                    <img
                      src={authorPhotoUrl}
                      alt={authorDisplayName}
                      className="h-full w-full object-cover"
                      width={80}
                      height={80}
                      loading="lazy"
                    />
                  ) : authorInitials ? (
                    <span className="text-xl font-extrabold">{authorInitials}</span>
                  ) : (
                    <User size={30} />
                  )}
                </Link>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    About the Author
                  </p>
                  <Link
                    to={authorPagePath}
                    className="mt-1 inline-block text-xl font-extrabold text-gray-900 no-underline hover:text-red-600 transition-colors"
                    style={{ textDecoration: "none" }}
                  >
                    {authorDisplayName}
                  </Link>
                  {authorPosition && (
                    <p className="mt-0.5 text-sm font-semibold text-red-600">{authorPosition}</p>
                  )}
                  <p className="mt-3 text-[14px] leading-[1.75] text-gray-600">
                    {authorBioPreview}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <Link
                      to={authorPagePath}
                      className="inline-flex h-9 items-center rounded-full bg-red-600 px-4 text-[12px] font-bold text-white no-underline hover:bg-red-700 transition-colors"
                      style={{ textDecoration: "none" }}
                    >
                      View Profile
                    </Link>
                    {authorSocialLinks.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 no-underline hover:bg-red-50 hover:text-red-600 transition-colors"
                        style={{ textDecoration: "none" }}
                        aria-label={item.label}
                        title={item.label}
                      >
                        {item.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 7. TAGS — "Related Topics" ── */}
          {tags.length > 0 && (
            <div className="mt-8 pt-5 border-t border-gray-200" style={{ maxWidth: articleTextMaxWidth }}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Related Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <Link
                    key={i}
                    to={`/tag/${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 hover:text-red-600 text-gray-700 text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                    style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", textDecoration: "none" }}
                  >
                    <Tag size={10} />
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── 8. SHARE SECTION (inline, kept for convenience) ── */}
          <div className="mt-10 pt-6 border-t border-gray-200" style={{ maxWidth: articleTextMaxWidth }}>
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
              <button onClick={() => handleShare("youtube")} title="Visit YouTube"
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
        <aside className="flex flex-col gap-6 lg:order-last" style={{ position: "sticky", top: "80px", alignSelf: "start" }}>

          {displayMoreArticles.length > 0 && (
            <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-red-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {moreInCategoryLabel ? `More in ${moreInCategoryLabel}` : "More in"}
                </span>
                <Link
                  to={moreInCategorySlug ? `/category/${moreInCategorySlug}` : "/"}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-red-600 font-semibold hover:underline flex items-center gap-0.5"
                >
                  View All <ChevronRight size={11} />
                </Link>
              </div>
              <div
                ref={moreInListRef}
                className="scrollbar-invisible overflow-y-auto divide-y divide-slate-100"
                style={moreInListMaxHeight ? { maxHeight: `${moreInListMaxHeight}px` } : { maxHeight: "540px" }}
              >
                {displayMoreArticles.map((a) => (
                  <Link key={a.id} to={getArticlePath(a)} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="px-4 py-3 hover:bg-slate-50 transition-colors group">
                      <p className="text-[13px] font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                        {a.title}
                      </p>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-1.5">
                        <Clock size={10} />
                        {formatArticleDateTimeForDisplay(a)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot page="home" placement="home_side_right" variant="sideRail" className="home-side-ad home-side-ad--right" dismissible minWidth={768} />
      </aside>
    </div>
  );
}
