import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Tweet } from "react-tweet";
import {
  Clock, User, Facebook, Link2,
  ChevronRight, Newspaper, Tag, ArrowLeft,
  Instagram, Youtube, Linkedin,
} from "lucide-react";
import {
  apiUrl,
  fetchPaginatedArticles,
  formatArticleDateTimeIST,
  getArticleDateValue,
} from "../lib/api";
import { buildAuthorSlug } from "../lib/authors";
import {
  getCanonicalArticleUrl,
  getArticlePath,
} from "../lib/articleUrl";
import { YOUTUBE_CHANNEL_URL } from "../lib/socialLinks";
import AdvertisementSlot from "../components/AdvertisementSlot";

const SITE_URL = "https://news4bharat.com";
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/news4bharat-share.png`;
const SITE_NAME = "News4Bharat";
const TWITTER_HANDLE = "@news4_bharat";
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const isPrerenderUserAgent = () => {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator?.userAgent || "";
  return /HeadlessChrome|prerender/i.test(userAgent);
};

const fetchWithRetry = async (url, options, attempts = 3) => {
  let lastResponse = null;
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      if (
        !RETRYABLE_STATUS_CODES.has(response.status) ||
        attempt === attempts - 1
      ) {
        return response;
      }

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

const toCategoryArray = (categoryDetails) => {
  if (Array.isArray(categoryDetails)) return categoryDetails;
  return categoryDetails ? [categoryDetails] : [];
};

const getPlainText = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeKeywordPhrase = (value) =>
  String(value || "")
    .replace(/^\s*hy(\b)/i, "why$1")
    .trim();

const truncateText = (value, maxLength) => {
  const text = getPlainText(value);
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const normalizeSlugValue = (value) =>
  String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

const safeDecodeSlug = (value) => {
  const normalized = normalizeSlugValue(value);
  if (!normalized) return "";

  try {
    return normalizeSlugValue(decodeURIComponent(normalized));
  } catch {
    return normalized;
  }
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
    add(raw);
    add(decoded);
    add(raw.toLowerCase());
    add(decoded.toLowerCase());
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
    article?.meta_title,
    article?.metaTitle,
    article?.seo_title,
    article?.seoTitle,
    article?.seo?.meta_title,
    article?.seo?.metaTitle,
    article?.seo?.seo_title,
    article?.seo?.seoTitle,
  ]
    .map((value) => getPlainText(value))
    .find(Boolean);

  if (apiMetaTitle) return apiMetaTitle;

  const baseTitle = String(article?.title || "").trim();
  if (!baseTitle) return `Latest News | ${SITE_NAME}`;
  return `${baseTitle} | ${SITE_NAME}`;
};

const toAbsoluteSiteUrl = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  try {
    return new URL(normalized, SITE_URL).toString();
  } catch {
    return null;
  }
};

const getArticleImage = (article) => {
  const candidates = [article?.image_url, article?.image];
  return candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  ) || null;
};

const normalizeCategoryToken = (value) =>
  String(value || "").trim().toLowerCase();

const getArticleCategoryDetails = (article) => {
  const candidates = [
    ...toCategoryArray(article?.category_details),
    ...toCategoryArray(article?.category),
    ...(Array.isArray(article?.categories) ? article.categories : []),
  ].filter((value) => value && typeof value === "object");

  const seen = new Set();

  return candidates.filter((category) => {
    const key = String(
      category?.slug || category?.id || category?.name || ""
    )
      .trim()
      .toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getArticleCategoryTokens = (article) => {
  const tokens = new Set();
  const add = (value) => {
    const normalized = normalizeCategoryToken(value);
    if (normalized) tokens.add(normalized);
  };

  const includeCategoryValue = (value) => {
    if (!value) return;
    if (typeof value === "string" || typeof value === "number") {
      add(value);
      return;
    }
    if (typeof value === "object") {
      add(value.id);
      add(value.slug);
      add(value.category_slug);
      add(value.name);
      add(value.title);
    }
  };

  [
    ...toCategoryArray(article?.category_details),
    ...toCategoryArray(article?.category),
    ...toCategoryArray(article?.primary_category),
    ...(Array.isArray(article?.categories) ? article.categories : []),
  ].forEach(includeCategoryValue);

  return tokens;
};

const getArticleTags = (article) => {
  if (Array.isArray(article?.tags_list)) {
    return article.tags_list.filter(Boolean);
  }
  return String(article?.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const getArticleTimestamp = (article) =>
  new Date(getArticleDateValue(article) || article?.updated_at || 0).getTime() || 0;

const sortArticlesByNewest = (list) =>
  [...list].sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

const sharesCategoryWithArticle = (candidate, currentArticle) => {
  const currentTokens = getArticleCategoryTokens(currentArticle);
  const candidateTokens = getArticleCategoryTokens(candidate);

  for (const token of currentTokens) {
    if (candidateTokens.has(token)) return true;
  }

  return false;
};

const getRobotsContent = (article) => {
  const parts = [
    article?.noindex ? "noindex" : "index",
    article?.nofollow ? "nofollow" : "follow",
  ];
  if (!article?.noindex) {
    parts.push("max-snippet:-1", "max-image-preview:large");
  }
  return parts.join(",");
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

const DIRECT_VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i;
const TWEET_URL_REGEX =
  /https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/(?:[A-Za-z0-9_]+\/status(?:es)?|i\/web\/status|i\/status)\/(\d+)(?:[^\s"'<>]*)?/i;

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
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        const markerIndex = parts.findIndex((part) =>
          ["embed", "shorts", "live"].includes(part)
        );
        if (markerIndex >= 0) {
          videoId = parts[markerIndex + 1] || "";
        }
      }
    }

    if (!videoId) return null;

    const start =
      parseTimeToSeconds(url.searchParams.get("t")) ||
      parseTimeToSeconds(url.searchParams.get("start"));

    const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    if (start > 0) {
      embedUrl.searchParams.set("start", String(start));
    }
    return embedUrl.toString();
  } catch {
    return null;
  }
};

const getTweetEmbedData = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const extracted = raw.match(TWEET_URL_REGEX);
  const platformEmbedId = (() => {
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      if (
        host === "platform.twitter.com" &&
        url.pathname.toLowerCase() === "/embed/tweet.html"
      ) {
        return url.searchParams.get("id") || "";
      }
    } catch {
      return "";
    }
    return "";
  })();

  const tweetId = extracted?.[1] || platformEmbedId;
  if (!tweetId) return null;

  const cleanUrl = `https://twitter.com/i/web/status/${tweetId}`;
  try {
    new URL(cleanUrl);
    return { id: tweetId, url: cleanUrl };
  } catch {
    return null;
  }
};

const getEmbedDescriptor = (value) => {
  const url = String(value || "").trim();
  if (!url) return null;

  const youtubeEmbed = getYouTubeEmbedUrl(url);
  if (youtubeEmbed) {
    return { type: "iframe", src: youtubeEmbed, title: "Embedded YouTube video" };
  }

  const tweetData = getTweetEmbedData(url);
  if (tweetData) {
    return { type: "tweet", ...tweetData };
  }

  if (DIRECT_VIDEO_FILE_REGEX.test(url)) {
    return { type: "video", src: url };
  }

  return null;
};

const isStandaloneLinkElement = (element) => {
  const childNodes = Array.from(element.childNodes);
  const meaningfulChildren = childNodes.filter((node) => {
    if (node.nodeType === 3) {
      return node.textContent && node.textContent.trim().length > 0;
    }
    return node.nodeName !== "BR";
  });
  return (
    meaningfulChildren.length === 1 &&
    meaningfulChildren[0].nodeName === "A"
  );
};

// ── Tweet ke liye sirf placeholder div banao — react-tweet render karega ──
const createEmbedNode = (doc, descriptor) => {
  if (descriptor.type === "tweet") {
    const wrapper = doc.createElement("div");
    wrapper.className = "react-tweet-placeholder";
    wrapper.setAttribute("data-tweet-id", descriptor.id);
    return wrapper;
  }

  const wrapper = doc.createElement("div");
  wrapper.className =
    descriptor.type === "video"
      ? "article-media-frame article-native-video"
      : "article-media-frame";

  if (descriptor.type === "iframe") {
    const iframe = doc.createElement("iframe");
    iframe.src = descriptor.src;
    iframe.title = descriptor.title || "Embedded media";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
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

const useIs2K = () => {
  const getValue = () =>
    typeof window !== "undefined" &&
    window.innerWidth >= 1441 &&
    window.innerWidth <= 2560;

  const [is2K, setIs2K] = useState(getValue);

  useEffect(() => {
    const onResize = () => setIs2K(getValue());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return is2K;
};

const normalizeArticleContent = (html) => {
  if (typeof html !== "string" || !html.trim()) return "";

  let normalized = html
    .replace(/<\/?font\b[^>]*>/gi, "")
    .replace(/\s(?:size|face)=["'][^"']*["']/gi, "")
    .replace(/<h1(\b[^>]*)>/gi, "<h2$1>")
    .replace(/<\/h1>/gi, "</h2>");

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return normalized;
  }

  const doc = new DOMParser().parseFromString(normalized, "text/html");
  Array.from(
    doc.body.querySelectorAll("head, title, meta, link, base, script, noscript")
  ).forEach((node) => node.remove());

  Array.from(doc.body.querySelectorAll("h1")).forEach((heading) => {
    const replacement = doc.createElement("h2");
    Array.from(heading.attributes).forEach((attribute) =>
      replacement.setAttribute(attribute.name, attribute.value)
    );
    replacement.innerHTML = heading.innerHTML;
    heading.replaceWith(replacement);
  });

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

  Array.from(doc.body.querySelectorAll("iframe")).forEach((iframe) => {
    if (iframe.closest(".article-media-frame")) return;

    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

    if (!iframe.getAttribute("title")) {
      iframe.setAttribute("title", "Embedded media");
    }
    if (!iframe.getAttribute("allow")) {
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      );
    }
    iframe.setAttribute("allowfullscreen", "");

    const wrapper = doc.createElement("div");
    wrapper.className = "article-media-frame";
    iframe.parentNode?.insertBefore(wrapper, iframe);
    wrapper.appendChild(iframe);
  });

  Array.from(doc.body.querySelectorAll("video")).forEach((video) => {
    if (video.closest(".article-media-frame")) return;

    video.setAttribute("controls", "");
    video.setAttribute("preload", "metadata");
    video.setAttribute("playsinline", "");

    const wrapper = doc.createElement("div");
    wrapper.className = "article-media-frame article-native-video";
    video.parentNode?.insertBefore(wrapper, video);
    wrapper.appendChild(video);
  });

  Array.from(doc.body.querySelectorAll("blockquote.twitter-tweet")).forEach(
    (blockquote) => {
      if (blockquote.closest(".react-tweet-placeholder")) return;

      const tweetAnchor = Array.from(blockquote.querySelectorAll("a[href]"))
        .find((anchor) => getTweetEmbedData(anchor.href));
      const tweetData = getTweetEmbedData(tweetAnchor?.href);
      if (!tweetData) return;

      blockquote.replaceWith(createEmbedNode(doc, { type: "tweet", ...tweetData }));
    }
  );

  Array.from(doc.body.querySelectorAll(".article-twitter-embed")).forEach(
    (element) => {
      const tweetAnchor = element.querySelector("a[href]");
      const tweetIframe = element.querySelector("iframe[src]");
      const tweetData =
        getTweetEmbedData(element.getAttribute("data-tweet-url")) ||
        getTweetEmbedData(tweetAnchor?.href) ||
        getTweetEmbedData(tweetIframe?.src) ||
        getTweetEmbedData(element.textContent);
      const tweetId =
        String(element.getAttribute("data-tweet-id") || tweetData?.id || "").trim();

      if (!tweetId) return;

      element.replaceWith(
        createEmbedNode(doc, {
          type: "tweet",
          id: tweetId,
          url: tweetData?.url || `https://twitter.com/i/web/status/${tweetId}`,
        })
      );
    }
  );

  Array.from(
    doc.body.querySelectorAll('iframe[src*="platform.twitter.com/embed/Tweet.html"]')
  ).forEach((iframe) => {
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

    // Case 1: <a href> mein tweet/youtube URL
    if (anchors.length >= 1) {
      for (const anchor of anchors) {
        const d = getEmbedDescriptor(anchor.href);
        if (d && (d.type === "tweet" || isStandaloneLinkElement(element))) {
          descriptor = d;
          break;
        }
      }
    }

    // Case 2: plain text mein tweet URL
    if (!descriptor) {
      const fullText = element.textContent || "";
      const match = fullText.match(TWEET_URL_REGEX);
      if (match) {
        descriptor = getEmbedDescriptor(match[0]);
      }
    }

    // Case 3: YouTube / video
    if (!descriptor) {
      const rawText = (element.textContent || "").trim();
      const tweetMatch = rawText.match(TWEET_URL_REGEX);
      if (tweetMatch) {
        descriptor = getEmbedDescriptor(tweetMatch[0]);
      } else if (element.children.length === 0) {
        descriptor = getEmbedDescriptor(rawText);
      }
    }

    if (descriptor) {
      element.replaceWith(createEmbedNode(doc, descriptor));
    }
  });

  return doc.body.innerHTML;
};

// ── Article body ko parts mein split karo — tweets React se render honge ──
const ArticleBody = ({ html, className, style, contentRef }) => {
  const parts = useMemo(() => {
    if (!html) return [];
    const result = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const children = Array.from(doc.body.childNodes);
    let buffer = "";

    children.forEach((node, i) => {
      if (
        node.nodeType === 1 &&
        node.classList?.contains("react-tweet-placeholder")
      ) {
        if (buffer) {
          result.push({ type: "html", content: buffer, key: `html-${i}` });
          buffer = "";
        }
        result.push({
          type: "tweet",
          id: node.getAttribute("data-tweet-id"),
          key: `tweet-${i}`,
        });
      } else {
        const temp = document.createElement("div");
        temp.appendChild(node.cloneNode(true));
        buffer += temp.innerHTML;
      }
    });

    if (buffer) {
      result.push({ type: "html", content: buffer, key: "html-last" });
    }

    return result;
  }, [html]);

  return (
    <div ref={contentRef} className={className} style={style}>
      {parts.map((part) =>
        part.type === "tweet" ? (
          <div key={part.key} className="my-4 flex justify-center">
            <Tweet id={part.id} />
          </div>
        ) : (
          <div
            key={part.key}
            dangerouslySetInnerHTML={{ __html: part.content }}
          />
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

    if (typeof window === "undefined") {
      return collectSlugCandidates(fromRoute);
    }

    const parts = window.location.pathname.split("/").filter(Boolean);
    const lastSegment = parts[parts.length - 1] || "";
    return collectSlugCandidates(lastSegment, fromRoute);
  }, [routeParam]);
  const articleSlug = articleLookupCandidates[0] || "";
  const is2K = useIs2K();

  const [article, setArticle] = useState(null);
  const [allArticles, setAllArticles] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [categoryMoreArticles, setCategoryMoreArticles] = useState([]);
  const [copied, setCopied] = useState(false);
  const [moreInListMaxHeight, setMoreInListMaxHeight] = useState(null);
  const mainArticleRef = useRef(null);
  const articleContentRef = useRef(null);
  const moreInListRef = useRef(null);
  const articleBodyHtml = article?.content_html || article?.content || "";
  const normalizedContent = useMemo(
    () => normalizeArticleContent(articleBodyHtml),
    [articleBodyHtml]
  );
  const plainArticleContent = useMemo(
    () => getPlainText(articleBodyHtml),
    [articleBodyHtml]
  );

  useEffect(() => {
    const controller = new AbortController();

    setArticle(null);
    setAllArticles([]);
    setCategoryMoreArticles([]);
    setNotFound(false);
    setLoadError(false);
    window.scrollTo(0, 0);

    const loadArticle = async () => {
      try {
        const fetchArticleDetail = async () => {
          for (const candidate of articleLookupCandidates) {
            const response = await fetchWithRetry(
              apiUrl(`/articles/slug/${encodeURIComponent(candidate)}/`),
              {
                signal: controller.signal,
                cache: "no-store",
              },
              3
            );

            if (response.ok) return response;
            if (response.status !== 404) {
              throw new Error(`Failed to fetch article detail: ${response.status}`);
            }
          }

          return null;
        };

        const detailResponse = await fetchArticleDetail();
        let sortedList = [];
        let listFetchFailed = false;

        try {
          const listResponse = await fetchWithRetry(
            apiUrl("/articles/?page=1&limit=500"),
            {
              signal: controller.signal,
              cache: "no-store",
            },
            3
          );

          if (!listResponse.ok) {
            throw new Error(`Failed to fetch articles list: ${listResponse.status}`);
          }

          const listData = await listResponse.json();
          const list = Array.isArray(listData)
            ? listData
            : Array.isArray(listData?.value)
              ? listData.value
              : listData?.results || [];
          sortedList = sortArticlesByNewest(list);
          setAllArticles(sortedList);
        } catch (error) {
          if (error?.name === "AbortError") throw error;
          listFetchFailed = true;
          setAllArticles([]);
          console.error("Related articles list fetch failed:", error);
        }

        if (!detailResponse) {
          if (listFetchFailed) {
            setLoadError(true);
            return;
          }

          const requestedPath =
            categorySlug && articleSlug ? `/${categorySlug}/${articleSlug}/` : "";
          const lookupSet = new Set(
            articleLookupCandidates.map((value) => normalizeSlugValue(value).toLowerCase())
          );
          const listMatch = sortedList.find((candidate) => {
            const articlePath = getArticlePath(candidate);
            const slugCandidates = collectSlugCandidates(
              candidate?.slug,
              getSlugFromUrlLikeValue(candidate?.public_url),
              getSlugFromUrlLikeValue(candidate?.canonical_url),
              getSlugFromUrlLikeValue(candidate?.url),
              getSlugFromUrlLikeValue(candidate?.link)
            ).map((value) => normalizeSlugValue(value).toLowerCase());

            return (
              (requestedPath && articlePath === requestedPath) ||
              slugCandidates.some((slug) => lookupSet.has(slug))
            );
          });

          if (listMatch && (listMatch.slug || listMatch.id)) {
            const hasSeoTitle = [
              listMatch?.meta_title,
              listMatch?.metaTitle,
              listMatch?.seo_title,
              listMatch?.seoTitle,
              listMatch?.seo?.meta_title,
              listMatch?.seo?.metaTitle,
              listMatch?.seo?.seo_title,
              listMatch?.seo?.seoTitle,
            ]
              .map((value) => getPlainText(value))
              .some(Boolean);

            if (!hasSeoTitle && listMatch?.id) {
              try {
                const idDetailResponse = await fetchWithRetry(
                  apiUrl(`/articles/${encodeURIComponent(String(listMatch.id))}/`),
                  {
                    signal: controller.signal,
                    cache: "no-store",
                  },
                  3
                );

                if (idDetailResponse.ok) {
                  const idDetailData = await idDetailResponse.json();
                  const hydratedArticle = Array.isArray(idDetailData)
                    ? idDetailData[0]
                    : idDetailData;

                  if (hydratedArticle && (hydratedArticle.slug || hydratedArticle.id)) {
                    setArticle({ ...listMatch, ...hydratedArticle });
                    return;
                  }
                }
              } catch (error) {
                if (error?.name === "AbortError") throw error;
              }
            }

            setArticle(listMatch);
            return;
          }

          setNotFound(true);
          return;
        }

        const detailData = await detailResponse.json();
        const found = Array.isArray(detailData) ? detailData[0] : detailData;

        if (found && (found.slug || found.id)) {
          setArticle(found);
          return;
        }

        setNotFound(true);
      } catch (error) {
        if (error.name === "AbortError") return;
        setLoadError(true);
      }
    };

    loadArticle();

    return () => controller.abort();
  }, [articleLookupCandidates, articleSlug, categorySlug]);

  useEffect(() => {
    if (!article) {
      setCategoryMoreArticles([]);
      return;
    }

    const primary = getArticleCategoryDetails(article)[0];
    const primarySlug = String(
      primary?.slug || primary?.category_slug || categorySlug || ""
    ).trim();

    if (!primarySlug) {
      setCategoryMoreArticles([]);
      return;
    }

    const controller = new AbortController();

    const loadCategoryArticles = async () => {
      try {
        const list = await fetchPaginatedArticles({
          category: primarySlug,
          limit: 100,
          maxPages: 10,
        });
        const filtered = sortArticlesByNewest(list).filter(
          (candidate) =>
            String(candidate?.slug || candidate?.id || "") !==
            String(article?.slug || article?.id || "")
        );
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
    if (!article && !notFound && !loadError) return;

    // Prerender must always receive a terminal ready signal; otherwise route times out.
    // For article routes, wait until body + JSON-LD are mounted, then emit.
    let intervalId = 0;
    let timeoutId = 0;
    let rafId = 0;

    const emitReady = () => document.dispatchEvent(new Event("prerender-ready"));

    const isArticleRenderReady = () => {
      if (!article || !isPrerenderRequest) return true;

      const bodyText = articleContentRef.current?.textContent?.trim() || "";
      const hasBodyContent = bodyText.length >= 120;

      const jsonLdScripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      const hasNewsArticleSchema = jsonLdScripts.some((node) =>
        /"@type"\s*:\s*"NewsArticle"|"@type"\s*:\s*\[\s*"NewsArticle"/i.test(
          node.textContent || ""
        )
      );
      const hasBreadcrumbSchema = jsonLdScripts.some((node) =>
        /"@type"\s*:\s*"BreadcrumbList"/i.test(node.textContent || "")
      );

      return hasBodyContent && hasNewsArticleSchema && hasBreadcrumbSchema;
    };

    if (!isPrerenderRequest || !article) {
      rafId = window.requestAnimationFrame(emitReady);
      return () => window.cancelAnimationFrame(rafId);
    }

    const checkAndEmit = () => {
      if (isArticleRenderReady()) {
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
        emitReady();
      }
    };

    // Fast path
    rafId = window.requestAnimationFrame(checkAndEmit);

    // Keep checking briefly; force emit after 12s so prerender doesn't hang.
    intervalId = window.setInterval(checkAndEmit, 120);
    timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      emitReady();
    }, 12000);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [article, articleSlug, isPrerenderRequest, loadError, notFound]);

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

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateMoreInHeight())
        : null;

    if (resizeObserver) {
      resizeObserver.observe(mainArticleRef.current);
      resizeObserver.observe(moreInListRef.current);
    }

    window.addEventListener("resize", updateMoreInHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateMoreInHeight);
    };
  }, [article, articleSlug, allArticles.length, categoryMoreArticles.length]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document
      .querySelectorAll('[data-prerender-fallback="article-main"]')
      .forEach((node) => node.remove());
  }, []);

  useEffect(() => {
    if (!article) return;
    document.title = getBrowserTitle(article);
  }, [article]);

  const sidebarBaseArticles = article
    ? allArticles.filter(
      (a) => String(a?.slug || a?.id || "") !== String(article?.slug || article?.id || "")
    )
    : [];

  const moreInArticles = article
    ? sidebarBaseArticles.filter((a) => sharesCategoryWithArticle(a, article))
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
      window.open(YOUTUBE_CHANNEL_URL, "_blank");
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
      <>
        <Helmet>
          <title>Article Not Found | News4Bharat</title>
          <meta name="robots" content="noindex, nofollow" />
          <meta name="description" content="This article is unavailable." />
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Newspaper size={48} color="#ccc" />
          <p className="text-xl font-bold text-gray-700 mt-4">Article not found</p>
          <Link to="/" className="mt-4 text-red-600 text-sm font-semibold hover:underline">
            ← Back to Home
          </Link>
        </div>
      </>
    );
  }

  if (loadError && !isPrerenderRequest) {
    return (
      <>
        <Helmet>
          <title>Article Unavailable | News4Bharat</title>
          <meta
            name="description"
            content="We could not load this article right now. Please try again shortly."
          />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Newspaper size={48} color="#ccc" />
          <p className="text-xl font-bold text-gray-700 mt-4">Article is temporarily unavailable</p>
          <p className="text-sm text-gray-500 mt-2 max-w-md">
            Please refresh the page after a short while.
          </p>
          <Link to="/" className="mt-4 text-red-600 text-sm font-semibold hover:underline">
            ← Back to Home
          </Link>
        </div>
      </>
    );
  }

  if (loadError && isPrerenderRequest) {
    return (
      <>
        <Helmet>
          <title>Article Unavailable | News4Bharat</title>
          <meta
            name="description"
            content="We could not load this article right now. Please try again shortly."
          />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-[1px]" />
      </>
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

  const date = getArticleDateValue(article);
  const modifiedDate = article.updated_at || getArticleDateValue(article);
  const imageUrl = getArticleImage(article);
  const imageAlt = article.image_alt?.trim() || article.title;
  const imageSource = article.image_source?.trim() || "";
  const absoluteImageUrl = toAbsoluteSiteUrl(imageUrl) || DEFAULT_SHARE_IMAGE;
  const primaryCategory = getArticleCategoryDetails(article)[0] || null;
  const categoryName = primaryCategory?.name?.trim() || "";
  const moreInCategorySlug = String(
    primaryCategory?.slug || primaryCategory?.category_slug || categorySlug || ""
  ).trim();
  const moreInCategoryLabel =
    primaryCategory?.name?.trim() ||
    String(categorySlug || "")
      .replace(/-/g, " ")
      .trim();
  const normalizedCategorySlug = normalizeSlugValue(
    primaryCategory?.slug || primaryCategory?.category_slug || categorySlug || ""
  );
  const canonicalUrl = getCanonicalArticleUrl(article) || "";
  const articlePath = getArticlePath(article) || "";
  const articleUrlForSchema = canonicalUrl || (articlePath ? `${SITE_URL}${articlePath}` : "");
  const displayMoreArticles =
    categoryMoreArticles.length > 0 ? categoryMoreArticles : moreInArticles;

  const tags = getArticleTags(article);
  const authorDisplayName =
    article.display_author_name?.trim() ||
    article.author_display_name?.trim() ||
    article.author_name?.trim() ||
    article.posted_by_fullname?.trim() ||
    "News4Bharat";
  const authorPosition = article.author_display_position?.trim() || "";
  const authorPagePath = `/author/${buildAuthorSlug(authorDisplayName)}`;
  const absoluteAuthorUrl =
    authorDisplayName === SITE_NAME
      ? SITE_URL
      : `${SITE_URL}${authorPagePath}`;
  const authorPhotoUrl = toAbsoluteSiteUrl(article.author_display_photo?.trim());
  const shellStyle = is2K
    ? {
      width: "var(--site-content-width)",
      maxWidth: "var(--site-content-width)",
      paddingLeft: 0,
      paddingRight: 0,
    }
    : undefined;
  const heroImageWrapStyle = is2K
    ? { display: "flex", justifyContent: "flex-start", alignItems: "center" }
    : undefined;
  const heroImageCardClassName = is2K
    ? "w-fit max-w-full mr-auto rounded-xl overflow-hidden mb-7 shadow-sm"
    : "w-full rounded-xl overflow-hidden mb-7 shadow-sm";
  const heroImageStyle = is2K
    ? {
      width: "min(100%, 1480px)",
      height: "auto",
      maxWidth: "100%",
      maxHeight: "min(72vh, 820px)",
      objectFit: "contain",
      objectPosition: "left center",
      margin: "0",
    }
    : undefined;

  const articleSummaryText =
    getPlainText(article.subtitle) ||
    getPlainText(article.description) ||
    getPlainText(article.summary) ||
    getPlainText(article.excerpt);

  const visibleSummary =
    articleSummaryText ||
    truncateText(plainArticleContent, 220) ||
    article.title;

  const seoTitle = getBrowserTitle(article);
  const metaDescription =
    getPlainText(article.meta_description) ||
    articleSummaryText ||
    getPlainText(plainArticleContent) ||
    article.title;
  const secondaryKeywords = Array.isArray(article.secondary_keywords_list)
    ? article.secondary_keywords_list.map(normalizeKeywordPhrase).filter(Boolean)
    : String(article.secondary_keywords || "")
      .split(",")
      .map((item) => normalizeKeywordPhrase(item))
      .filter(Boolean);
  const focusKeyword = normalizeKeywordPhrase(article.focus_keyword);
  const metaKeywords = Array.from(
    new Set(
      [focusKeyword, ...secondaryKeywords, ...tags]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  ).join(", ");
  const articleTags = tags.filter(Boolean);
  const robotsContent = getRobotsContent(article);
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
    ...(canonicalUrl
      ? { mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl } }
      : {}),
    author: {
      "@type": authorDisplayName === SITE_NAME ? "Organization" : "Person",
      name: authorDisplayName,
      url: absoluteAuthorUrl,
      ...(authorPosition ? { jobTitle: authorPosition } : {}),
      ...(authorPhotoUrl
        ? { image: { "@type": "ImageObject", url: authorPhotoUrl } }
        : {}),
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/Fevicon (1).png`,
      },
    },
    isAccessibleForFree: !article.is_paid,
    ...(absoluteImageUrl
      ? {
        image: { "@type": "ImageObject", url: absoluteImageUrl, caption: imageAlt },
        thumbnailUrl: absoluteImageUrl,
      }
      : {}),
    ...(categoryName ? { articleSection: categoryName } : {}),
    ...(metaKeywords ? { keywords: metaKeywords } : {}),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      ...(normalizedCategorySlug
        ? [
          {
            "@type": "ListItem",
            position: 2,
            name:
                categoryName ||
                moreInCategoryLabel ||
                normalizedCategorySlug.replace(/-/g, " "),
            item: `${SITE_URL}/category/${normalizedCategorySlug}`,
          },
        ]
        : []),
      {
        "@type": "ListItem",
        position: normalizedCategorySlug ? 3 : 2,
        name: article.title,
        ...(articleUrlForSchema ? { item: articleUrlForSchema } : {}),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white pt-[62px] font-[Poppins,_sans-serif]">
      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot
          page="home"
          placement="home_side_left"
          variant="sideRail"
          className="home-side-ad home-side-ad--left"
          dismissible
          minWidth={768}
        />
      </aside>

      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="author" content={authorDisplayName} />
        {metaKeywords && <meta name="keywords" content={metaKeywords} />}
        {articleTags.length > 0 && (
          <meta name="news_keywords" content={articleTags.join(", ")} />
        )}
        {article.focus_keyword && (
          <meta name="focus_keyword" content={focusKeyword} />
        )}
        {secondaryKeywords.length > 0 && (
          <meta name="secondary_keywords" content={secondaryKeywords.join(", ")} />
        )}
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
        {articleTags.map((tag) => (
          <meta key={`article-tag-${tag}`} property="article:tag" content={tag} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={TWITTER_HANDLE} />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {canonicalUrl && <meta name="twitter:url" content={canonicalUrl} />}
        <meta name="twitter:image" content={absoluteImageUrl} />
        <meta name="twitter:image:alt" content={imageAlt} />
        {date && <meta property="article:published_time" content={date} />}
        {modifiedDate && (
          <meta property="article:modified_time" content={modifiedDate} />
        )}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <AdvertisementSlot
        page="article_detail"
        placement="home_top"
        variant="leaderboard"
        className="home-top-ad home-top-ad--desktop"
        minWidth={769}
      />
      <AdvertisementSlot
        page="article_detail"
        placement="home_top_mobile"
        variant="mobileStrip"
        className="home-top-ad home-top-ad--mobile"
        maxWidth={768}
      />

      <div
        className="category-page-align mx-auto px-4 sm:px-6 pb-8 pt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start"
        style={shellStyle}
      >

        {/* ── MAIN ARTICLE ── */}
        <article ref={mainArticleRef} className="min-w-0">

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 mb-5 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Home
          </Link>

          <h1 className="text-[clamp(20px,4vw,36px)] font-extrabold leading-[1.3] text-gray-900 mb-3 tracking-tight">
            {article.title}
          </h1>

          {visibleSummary && (
            <p className="article-summary text-[15px] text-gray-500 mb-4 leading-[1.7]">
              {visibleSummary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-gray-500 mb-5 pb-5 border-b border-gray-200">
            <Link
              to={authorPagePath}
              className="inline-flex items-center gap-1.5 font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer pointer-events-auto relative z-[1]"
              style={{ textDecoration: "none" }}
            >
              <User size={13} />
              {authorDisplayName}
            </Link>
            {authorPosition && (
              <span className="text-gray-400">{authorPosition}</span>
            )}
            {date && (
              <span className="flex items-center gap-1.5 text-gray-500">
                <Clock size={13} />
                {article.updated_display
                  ? article.updated_display
                  : formatArticleDateTimeIST(article)}
              </span>
            )}
          </div>

          {imageUrl && (
            <div className={heroImageCardClassName}>
              <div style={heroImageWrapStyle}>
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className={is2K ? "block" : "w-full object-cover max-h-[480px]"}
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

          {/* ── ARTICLE BODY — tweets React se render honge ── */}
          <ArticleBody
            html={normalizedContent}
            contentRef={articleContentRef}
            className="article-content text-gray-700 text-left md:text-justify
  [&_p]:text-[16px] [&_p]:leading-[1.6] [&_p]:mb-[1.2rem]
  [&_h2]:text-[18px] [&_h2]:leading-[1.4] [&_h2]:mb-[1.2rem] [&_h2]:font-bold
  [&_h3]:text-[18px] [&_h3]:leading-[1.4] [&_h3]:mb-[1.2rem] [&_h3]:font-bold
  [&_img]:w-full [&_img]:rounded-lg [&_img]:my-6
  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
  [&_li]:text-[16px] [&_li]:leading-[1.6] [&_li]:mb-1"
            style={{ userSelect: "text", WebkitUserSelect: "text" }}
          />

          {tags.length > 0 && (
            <div className="mt-8 pt-5 border-t border-gray-200">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <Link
                    key={i}
                    to={`/tag/${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 text-[12px] font-medium px-3 py-1 rounded-full transition-colors border border-gray-200 cursor-pointer"
                  >
                    <Tag size={10} />
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

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

          {displayMoreArticles.length > 0 && (() => {
            return (
              <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-red-600">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    {moreInCategoryLabel ? `More in ${moreInCategoryLabel}` : "More in"}
                  </span>
                  <Link to={moreInCategorySlug ? `/category/${moreInCategorySlug}` : "/"}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-red-600 font-semibold hover:underline flex items-center gap-0.5">
                    View All <ChevronRight size={11} />
                  </Link>
                </div>
                <div
                  ref={moreInListRef}
                  className="scrollbar-invisible overflow-y-auto divide-y divide-slate-100"
                  style={
                    moreInListMaxHeight
                      ? { maxHeight: `${moreInListMaxHeight}px` }
                      : { maxHeight: "540px" }
                  }
                >
                  {displayMoreArticles.map((a) => (
                    <Link key={a.id} to={getArticlePath(a)}
                      target="_blank" rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-shrink-0 w-16 h-14 rounded-md overflow-hidden bg-slate-100">
                          {getArticleImage(a) ? (
                            <img src={getArticleImage(a)} alt={a.title}
                              className="w-full h-full object-cover" loading="lazy"
                              decoding="async" width={64} height={56} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100">
                              <Newspaper size={16} color="#ccc" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug">{a.title}</p>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                            <Clock size={10} />{formatArticleDateTimeIST(a)}
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

      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot
          page="home"
          placement="home_side_right"
          variant="sideRail"
          className="home-side-ad home-side-ad--right"
          dismissible
          minWidth={768}
        />
      </aside>
    </div>
  );
}
