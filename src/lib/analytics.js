export const trackAnalyticsEvent = (eventName, params = {}) => {
  if (typeof window === "undefined") return;

  const payload = {
    ...params,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...payload,
  });

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      ...payload,
      send_to: window.N4B_GA_ID || "G-NR6G1PPS6N",
    });
  }
};

export const trackSocialShare = (platform, params = {}) =>
  trackAnalyticsEvent("social_share_click", {
    platform,
    event_category: "social_share",
    ...params,
  });

export const trackSocialFollow = (platform, params = {}) =>
  trackAnalyticsEvent("social_follow_click", {
    platform,
    event_category: "social_follow",
    ...params,
  });
