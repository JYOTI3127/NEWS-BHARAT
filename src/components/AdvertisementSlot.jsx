import { memo, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { apiUrl } from "../lib/api";
import "../style.css";

const SLOT_SIZES = {
  leaderboard: { width: 728, height: 90 },
  mobileStrip: { width: 300, height: 50 },
  mediumRectangle: { width: 300, height: 250 },
  largeRectangle: { width: 336, height: 280 },
  sideRail: { width: 160, height: 600 },
};

const requestCache = new Map();
const DEFAULT_ROTATION_INTERVAL_MS = 5000;
const ROTATION_FADE_MS = 260;

const getAdImageUrl = (ad) => {
  const image = ad?.image_url || ad?.ad_image_url || ad?.image || ad?.ad_image;
  if (!image) return "";
  if (typeof image === "string") return image;
  return image?.url || "";
};

const getAdLinkUrl = (ad) => ad?.link_url || ad?.ad_link_url || ad?.ad_link || "";
const getAdAltText = (ad, fallback = "") =>
  String(ad?.alt || ad?.image_alt || ad?.name || ad?.title || fallback || "Sponsored advertisement").trim();

const getAdPlacement = (ad) =>
  String(ad?.placement || ad?.slot || ad?.slot_name || ad?.position || ad?.location || "").trim();

const normalizePlacement = (value) => String(value || "").trim().toLowerCase();

const isSamePlacement = (ad, placement) =>
  normalizePlacement(getAdPlacement(ad)) === normalizePlacement(placement);

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

  const exactMatch = ads.find((ad) => isSamePlacement(ad, placement));
  if (exactMatch) return exactMatch;

  const hasPlacementData = ads.some((ad) => getAdPlacement(ad));
  if (!hasPlacementData && allowUnmatchedPlacement) return ads[0];

  return null;
};

const getRotationBanners = (payload, placement) => {
  const list = Array.isArray(payload?.rotation_banners) ? payload.rotation_banners : [];
  const eligible = list.filter((ad) => isAdActive(ad) && getAdImageUrl(ad));
  if (eligible.length === 0) return [];

  const withPlacement = eligible.filter((ad) => getAdPlacement(ad));
  if (withPlacement.length === 0) return eligible;

  const exact = eligible.filter((ad) => isSamePlacement(ad, placement));
  return exact.length > 0 ? exact : eligible;
};

const toAdIdentity = (ad, index = 0) =>
  String(
    ad?.id ||
    ad?.slug ||
    ad?.banner_id ||
    ad?.ad_id ||
    getAdImageUrl(ad) ||
    index
  ).trim().toLowerCase();

const mergeUniqueAds = (...lists) => {
  const merged = [];
  const seen = new Set();

  lists.flat().forEach((ad, index) => {
    if (!ad || !getAdImageUrl(ad) || !isAdActive(ad)) return;
    const key = toAdIdentity(ad, index);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(ad);
  });

  return merged;
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  return false;
};

const buildAdSlotState = (payload, placement, allowUnmatchedPlacement) => {
  const primaryAd = pickAdForPlacement(payload, placement, allowUnmatchedPlacement);
  if (!primaryAd) return null;
  const slotAltText = getAdAltText(primaryAd, payload?.alt);

  const rotationEnabled = parseBoolean(payload?.rotation_enabled);
  const intervalSeconds = Number(payload?.rotation_interval_seconds);
  const rotationIntervalMs = Number.isFinite(intervalSeconds) && intervalSeconds > 0
    ? intervalSeconds * 1000
    : DEFAULT_ROTATION_INTERVAL_MS;

  let rotationAds = getRotationBanners(payload, placement);
  rotationAds = mergeUniqueAds([primaryAd], rotationAds);
  const rotationCount = Number(payload?.rotation_count);
  if (Number.isFinite(rotationCount) && rotationCount > 0) {
    rotationAds = rotationAds.slice(0, rotationCount);
  }

  if (!(rotationEnabled && rotationAds.length > 1)) {
    return {
      primaryAd,
      rotationAds: [primaryAd],
      rotationEnabled: false,
      rotationIntervalMs,
      slotAltText,
    };
  }

  return {
    primaryAd,
    rotationAds,
    rotationEnabled: true,
    rotationIntervalMs,
    slotAltText,
  };
};

const buildCurrentAdPath = (endpoint, { page, placement, size }) => {
  const params = new URLSearchParams();
  const normalizedPage = String(page || "").trim();
  const normalizedPlacement = String(placement || "").trim();
  const normalizedSize = String(size || "").trim();

  if (normalizedPage) params.set("page", normalizedPage);
  if (normalizedPlacement) params.set("placement", normalizedPlacement);
  if (normalizedSize) params.set("size", normalizedSize);

  const query = params.toString();
  return `/homepage/${endpoint}/current/${query ? `?${query}` : ""}`;
};

const buildCandidateUrls = ({ page, placement, size }) => {
  const normalizedPage = String(page || "").trim();

  if (normalizedPage) {
    return [
      apiUrl(buildCurrentAdPath("ad_banner", { page, placement, size })),
      apiUrl(buildCurrentAdPath("ad_banners", { page, placement, size })),
      apiUrl(buildCurrentAdPath("ad_banner", { placement, size })),
      apiUrl(buildCurrentAdPath("ad_banners", { placement, size })),
      apiUrl(`/homepage/ad_banner/${encodeURIComponent(placement)}/current/`),
      apiUrl("/homepage/ad_banner/current/"),
    ];
  }

  return [
    apiUrl(buildCurrentAdPath("ad_banner", { placement, size })),
    apiUrl(buildCurrentAdPath("ad_banners", { placement, size })),
    apiUrl(`/homepage/ad_banner/${encodeURIComponent(placement)}/current/`),
    apiUrl("/homepage/ad_banner/current/"),
  ];
};

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
  if (!query || typeof window === "undefined" || !window.matchMedia) return () => { };

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

const LABEL_HIDDEN_VARIANTS = ["sideRail"];

function AdvertisementSlot({
  page,
  placement,
  size: requestedSize,
  variant = "leaderboard",
  className = "",
  allowUnmatchedPlacement = false,
  dismissible = false,
  minWidth,
  maxWidth,
}) {

  const [adSlotState, setAdSlotState] = useState(null);
  const [activeRotationIndex, setActiveRotationIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const size = SLOT_SIZES[variant] || SLOT_SIZES.leaderboard;
  const isSideRail = variant === "sideRail";
  const candidateUrls = useMemo(
    () => buildCandidateUrls({ page, placement, size: requestedSize }),
    [page, placement, requestedSize]
  );
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
          const picked = buildAdSlotState(payload, placement, allowUnmatchedPlacement);

          if (picked) {
            if (!ignore) setAdSlotState(picked);
            return;
          }
        } catch {
          continue;
        }
      }

      if (!ignore) setAdSlotState(null);
    }

    loadAd();

    return () => {
      ignore = true;
    };
  }, [allowUnmatchedPlacement, candidateUrls, isViewportMatch, placement]);

  useEffect(() => {
    setActiveRotationIndex(0);
    setIsFading(false);
  }, [adSlotState]);

  useEffect(() => {
    if (!isViewportMatch || dismissed) return undefined;
    if (!adSlotState?.rotationEnabled || (adSlotState?.rotationAds?.length || 0) <= 1) return undefined;

    let fadeTimeout = null;
    const interval = setInterval(() => {
      setIsFading(true);
      fadeTimeout = setTimeout(() => {
        setActiveRotationIndex((prev) => (prev + 1) % adSlotState.rotationAds.length);
        setIsFading(false);
      }, ROTATION_FADE_MS);
    }, adSlotState.rotationIntervalMs);

    return () => {
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [adSlotState, dismissed, isViewportMatch]);

  if (!isViewportMatch || dismissed) return null;

  const rotationAds = adSlotState?.rotationAds || [];
  const activeAd = rotationAds.length > 0
    ? rotationAds[activeRotationIndex % rotationAds.length]
    : adSlotState?.primaryAd;

  const adImageUrl = getAdImageUrl(activeAd);
  if (!adImageUrl) return null;

  const adLinkUrl = getAdLinkUrl(activeAd);
  const adAltText = getAdAltText(activeAd, adSlotState?.slotAltText);
  const image = (
    <img
      src={adImageUrl}
      alt={adAltText}
      title={adAltText}
      loading="lazy"
      decoding="async"
      width={isSideRail ? undefined : size.width}
      height={isSideRail ? undefined : size.height}
      className={`home-ad-image${isSideRail ? " home-ad-image--sideRail" : ""}`}
      style={{ opacity: isFading ? 0 : 1, transition: `opacity ${ROTATION_FADE_MS}ms ease` }}
    />
  );

  return (
    <aside
      className={`home-ad-slot home-ad-slot--${variant} ${className}`.trim()}
      aria-label={adAltText}
      style={{
        "--ad-width": `${size.width}px`,
        "--ad-height": `${size.height}px`,
        "--ad-ratio-width": `${size.width}`,
        "--ad-ratio-height": `${size.height}`,
        position: "relative",
      }}
    >
      {!LABEL_HIDDEN_VARIANTS.includes(variant) && (
        <div className="home-ad-label">Advertisement</div>
      )}
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
          style={{
            position: "absolute",
            top: "65px",
            right: "4px",
            zIndex: 10,
          }}
        >
          ✕
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
