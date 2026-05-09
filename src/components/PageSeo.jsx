import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://news4bharat.com";

export default function PageSeo({ title, description, keywords = "", path = "/" }) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${SITE_URL}${normalizedPath}`;
  const keywordContent = Array.isArray(keywords) ? keywords.join(", ") : keywords;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const readyTimer = window.setTimeout(() => {
      window.prerenderReady = true;
      document.dispatchEvent(new Event("prerender-ready"));
    }, 100);

    return () => window.clearTimeout(readyTimer);
  }, [canonicalUrl, description, keywordContent, title]);

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

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={canonicalUrl} />
    </Helmet>
  );
}
