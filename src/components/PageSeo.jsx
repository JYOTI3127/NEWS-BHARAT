import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://news4bharat.com";
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/news4bharat-share.png`;
const SITE_NAME = "News4Bharat";
const TWITTER_HANDLE = "@news4_bharat";

const getCanonicalPath = (path = "/") => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return "";
  const [pathname, query = ""] = normalized.split("?");
  const cleanPathname = pathname.replace(/\/+$/, "");
  return query ? `${cleanPathname}?${query}` : cleanPathname;
};

const isPrerenderRequest = () => {
  if (typeof window === "undefined") return false;
  return /HeadlessChrome|prerender/i.test(window.navigator?.userAgent || "");
};

const READY_SELECTORS_BY_PATH = {
  "/about-us": ".about-page",
  "/privacy-policy": ".privacy-page .priv-content",
  "/editorial-policy": ".ep-page .ep-section",
  "/contact-us": ".contact-page .ct-main",
  "/founders-note": ".founder-page, .founders-page, main, section",
  "/disclaimer": ".disclaimer-page, main, section",
  "/terms-and-conditions": ".terms-page, main, section",
  "/careers": ".careers-page, main, section",
};

const dispatchPrerenderReady = () => {
  if (typeof window === "undefined") return;
  window.prerenderReady = true;
  document.dispatchEvent(new Event("prerender-ready"));
};

export default function PageSeo({ title, description, keywords = "", path = "/" }) {
  const normalizedPath = getCanonicalPath(path);
  const canonicalUrl = `${SITE_URL}${normalizedPath}`;
  const keywordContent = Array.isArray(keywords) ? keywords.join(", ") : keywords;
  const breadcrumbName =
    normalizedPath === "/"
      ? "Home"
      : String(title || "")
        .replace(/\s*\|\s*News4Bharat.*$/i, "")
        .trim();
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
      ...(normalizedPath === "/"
        ? []
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: breadcrumbName || SITE_NAME,
              item: canonicalUrl,
            },
          ]),
    ],
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    if (!isPrerenderRequest()) {
      const readyTimer = window.requestAnimationFrame(dispatchPrerenderReady);
      return () => window.cancelAnimationFrame(readyTimer);
    }

    const readySelector = READY_SELECTORS_BY_PATH[normalizedPath] || "main, section, #root > *";
    let intervalId = 0;
    let timeoutId = 0;
    let rafId = 0;
    let emitted = false;

    const hasRouteContent = () => {
      const routeNode = document.querySelector(readySelector);
      if (!routeNode) return false;
      const rootText = document.getElementById("root")?.textContent?.trim() || "";
      return rootText.length > 80;
    };

    const emitReady = () => {
      if (emitted) return;
      emitted = true;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      dispatchPrerenderReady();
    };

    const checkReady = () => {
      if (hasRouteContent()) emitReady();
    };

    rafId = window.requestAnimationFrame(checkReady);
    intervalId = window.setInterval(checkReady, 150);
    timeoutId = window.setTimeout(emitReady, 15000);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [canonicalUrl, description, keywordContent, normalizedPath, title]);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywordContent ? <meta name="keywords" content={keywordContent} /> : null}
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="News4Bharat" />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:image" content={DEFAULT_SHARE_IMAGE} />
      <meta property="og:image:alt" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:image" content={DEFAULT_SHARE_IMAGE} />
      <meta name="twitter:image:alt" content={SITE_NAME} />
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
    </Helmet>
  );
}
