import { memo, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { apiUrl } from "../lib/api";

const SLOT_SIZES = {
  leaderboard: { width: 728, height: 90 },
  mobileStrip: { width: 300, height: 50 },
  mediumRectangle: { width: 300, height: 250 },
  largeRectangle: { width: 336, height: 280 },
  sideRail: { width: 160, height: 600 },
};

const requestCache = new Map();

const getAdImageUrl = (ad) => {
  const image = ad?.image_url || ad?.ad_image_url || ad?.image || ad?.ad_image;
  if (!image) return "";
  if (typeof image === "string") return image;
  return image?.url || "";
};

const getAdLinkUrl = (ad) => ad?.link_url || ad?.ad_link_url || ad?.ad_link || "";

const getAdPlacement = (ad) =>
  String(ad?.placement || ad?.slot || ad?.slot_name || ad?.position || ad?.location || "").trim();

const isAdActive = (ad) => ad?.is_active !== false && ad?.active !== false;

const getListFromPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.ads)) return payload.ads;
  if (Array.isArray(payload?.banners)) return payload.banners;
  if (Array.isArray(payload?.data)) return payload.data;
  return payload ? [payload] : [];
};

const fetchCachedJson = (url) => {
  if (!requestCache.has(url)) {
    requestCache.set(
      url,
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(`Ad request failed: ${response.status}`);
        return response.json();
      })
    );
  }

  return requestCache.get(url);
};

const pickAdForPlacement = (payload, placement, allowUnmatchedPlacement) => {
  const ads = getListFromPayload(payload).filter((ad) => isAdActive(ad) && getAdImageUrl(ad));
  if (ads.length === 0) return null;

  const exactMatch = ads.find((ad) => getAdPlacement(ad) === placement);
  if (exactMatch) return exactMatch;

  const hasPlacementData = ads.some((ad) => getAdPlacement(ad));
  if (!hasPlacementData && allowUnmatchedPlacement) return ads[0];

  return null;
};

const buildCandidateUrls = (placement) => [
  apiUrl(`/homepage/ad_banner/current/?placement=${encodeURIComponent(placement)}`),
  apiUrl(`/homepage/ad_banners/current/?placement=${encodeURIComponent(placement)}`),
  apiUrl(`/homepage/ad_banner/${encodeURIComponent(placement)}/current/`),
  apiUrl("/homepage/ad_banner/current/"),
];

const buildViewportQuery = ({ minWidth, maxWidth }) => {
  const parts = [];
  if (Number.isFinite(minWidth)) parts.push(`(min-width: ${minWidth}px)`);
  if (Number.isFinite(maxWidth)) parts.push(`(max-width: ${maxWidth}px)`);
  return parts.join(" and ");
};

const getViewportSnapshot = (query) => {
  if (!query || typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(query).matches;
};

const subscribeViewport = (query, callback) => {
  if (!query || typeof window === "undefined" || !window.matchMedia) return () => {};

  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener?.("change", callback);
  mediaQuery.addListener?.(callback);

  return () => {
    mediaQuery.removeEventListener?.("change", callback);
    mediaQuery.removeListener?.(callback);
  };
};

const useViewportMatch = (query) =>
  useSyncExternalStore(
    (callback) => subscribeViewport(query, callback),
    () => getViewportSnapshot(query),
    () => true
  );

function AdvertisementSlot({
  placement,
  variant = "leaderboard",
  className = "",
  allowUnmatchedPlacement = false,
  dismissible = false,
  minWidth,
  maxWidth,
}) {
  const [adSlot, setAdSlot] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const size = SLOT_SIZES[variant] || SLOT_SIZES.leaderboard;
  const candidateUrls = useMemo(() => buildCandidateUrls(placement), [placement]);
  const viewportQuery = useMemo(
    () => buildViewportQuery({ minWidth, maxWidth }),
    [maxWidth, minWidth]
  );
  const isViewportMatch = useViewportMatch(viewportQuery);

  useEffect(() => {
    if (!isViewportMatch) return undefined;

    let ignore = false;

    async function loadAd() {
      for (const url of candidateUrls) {
        try {
          const payload = await fetchCachedJson(url);
          const picked = pickAdForPlacement(payload, placement, allowUnmatchedPlacement);

          if (picked) {
            if (!ignore) setAdSlot(picked);
            return;
          }
        } catch {
          continue;
        }
      }

      if (!ignore) setAdSlot(null);
    }

    loadAd();

    return () => {
      ignore = true;
    };
  }, [allowUnmatchedPlacement, candidateUrls, isViewportMatch, placement]);

  if (!isViewportMatch || dismissed) return null;

  const adImageUrl = getAdImageUrl(adSlot);
  if (!adImageUrl) return null;

  const adLinkUrl = getAdLinkUrl(adSlot);
  const image = (
    <img
      src={adImageUrl}
      alt={adSlot?.alt || adSlot?.title || "Sponsored advertisement"}
      loading="lazy"
      decoding="async"
      width={size.width}
      height={size.height}
      className="home-ad-image"
    />
  );

  return (
    <aside
      className={`home-ad-slot home-ad-slot--${variant} ${className}`.trim()}
      aria-label="Sponsored advertisement"
      style={{
        "--ad-width": `${size.width}px`,
        "--ad-height": `${size.height}px`,
        "--ad-ratio-width": `${size.width}`,
        "--ad-ratio-height": `${size.height}`,
      }}
    >
      {dismissible && (
        <button
          type="button"
          className="home-ad-close"
          aria-label="Close advertisement"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDismissed(true);
          }}
        >
          x
        </button>
      )}
      {adLinkUrl ? (
        <a
          href={adLinkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="home-ad-frame"
        >
          {image}
        </a>
      ) : (
        <div className="home-ad-frame">{image}</div>
      )}
    </aside>
  );
}

export default memo(AdvertisementSlot);
