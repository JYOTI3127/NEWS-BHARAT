let fired = false;

export const ensurePrerenderStatusMeta = (statusCode = 200) => {
  if (typeof document === "undefined") return;

  let meta = document.querySelector('meta[name="prerender-status-code"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "prerender-status-code");
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", String(statusCode || 200));
};

export const signalPrerenderReady = (statusCode = 200) => {
  if (fired) return;
  fired = true;
  if (typeof window === "undefined") return;
  ensurePrerenderStatusMeta(statusCode);
  window.prerenderReady = true;
  try {
    document.dispatchEvent(new Event("prerender-ready"));
  } catch (e) {}
};

// Safety net: allow slow article and SEO fetches to complete before falling back.
if (typeof window !== "undefined") {
  const ua = window.navigator?.userAgent || "";
  if (/HeadlessChrome|prerender/i.test(ua)) {
    setTimeout(() => {
      if (!window.prerenderReady) {
        signalPrerenderReady();
      }
    }, 20000);
  }
}
