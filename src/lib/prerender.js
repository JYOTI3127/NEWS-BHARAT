let fired = false;

export const signalPrerenderReady = () => {
  if (fired) return;
  fired = true;
  if (typeof window === "undefined") return;
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
