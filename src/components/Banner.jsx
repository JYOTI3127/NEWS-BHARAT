import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getArticlePath } from "../lib/articleUrl";
import { formatArticleDateTimeIST } from "../lib/api";

const getCategoryLabel = (article) => {
  if (article?.primary_category?.name) return article.primary_category.name;
  const details = Array.isArray(article?.category_details) ? article.category_details : [];
  if (details[0]?.name) return details[0].name;
  return "News";
};

const getBannerTitle = (article) =>
  String(article?.title || article?.headline || article?.article_title || article?.name || "Untitled").trim();

const getBannerDescription = (article) =>
  String(
    article?.subtitle ||
    article?.description ||
    article?.excerpt ||
    article?.summary ||
    ""
  )
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getBannerImage = (article) => {
  const candidates = [
    article?.image_url,
    article?.image,
    article?.image?.url,
    article?.featured_image,
    article?.featured_image_url,
    article?.thumbnail,
    article?.thumbnail_url,
  ];

  for (const value of candidates) {
    const normalized =
      typeof value === "string"
        ? value.trim()
        : typeof value === "object" && value
          ? String(value?.url || "").trim()
          : "";
    if (normalized) return normalized;
  }
  return "";
};

const getRelativeIndex = (index, current, total) => {
  let diff = index - current;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
};

const getCardPositionClass = (relative, total) => {
  if (total <= 1) return "cb-pos-center";
  if (total === 2) return relative === 0 ? "cb-pos-center" : "cb-pos-right-1";
  if (total === 3) {
    if (relative === 0) return "cb-pos-center";
    if (relative === 1) return "cb-pos-right-1";
    if (relative === -1) return "cb-pos-left-1";
    return "cb-pos-hidden";
  }
  if (relative === 0) return "cb-pos-center";
  if (relative === 1) return "cb-pos-right-1";
  if (relative === 2) return "cb-pos-right-2";
  if (relative === -1) return "cb-pos-left-1";
  if (relative === -2) return "cb-pos-left-2";
  return "cb-pos-hidden";
};

// CardImage: no crop, anchored at bottom
const CardImage = ({ src, alt, isCenter, onLoad, onError }) => (
  <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[#f3f4f6]">
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-contain object-center [backface-visibility:hidden]"
      style={{ transform: "translateZ(0)" }}
      loading={isCenter ? "eager" : "lazy"}
      fetchPriority={isCenter ? "high" : "auto"}
      onLoad={onLoad}
      onError={onError}
    />
  </div>
);
// ────────────────────────────────────────────────────────────────────────────

const CARD_BASE_CLASSNAME = "absolute cursor-pointer overflow-hidden shadow-[0_22px_44px_rgba(0,0,0,0.8)] will-change-[transform,opacity] transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] w-[clamp(212px,23vw,344px)] aspect-[3/4] max-[1440px]:w-[clamp(200px,22vw,320px)] max-[1024px]:w-[clamp(218px,33vw,316px)] max-[768px]:w-[clamp(246px,84vw,344px)] max-[425px]:w-[clamp(214px,90vw,292px)] max-[375px]:w-[clamp(224px,94vw,304px)] max-[375px]:aspect-[3/3.95] max-[320px]:w-[clamp(206px,88vw,278px)] max-[320px]:aspect-[3/3.9]";
const CARD_IMAGE_WRAP_CLASSNAME = "relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#f3f4f6]";
const CARD_BODY_BASE_CLASSNAME = "relative min-h-0 flex-1 overflow-hidden bg-white text-[#111827]";

const CARD_POSITION_CLASSNAMES = {
  "cb-pos-center":
    "z-[5] opacity-100 [transform:translateX(0)_scale(1.08)_rotateY(0deg)] max-[1024px]:[transform:translateX(0)_scale(1.04)_rotateY(0deg)] max-[768px]:[transform:translateX(0)_scale(1)_rotateY(0deg)]",
  "cb-pos-left-1":
    "z-[4] opacity-95 [filter:brightness(0.92)] [transform:translateX(-226px)_scale(0.92)_rotateY(14deg)] max-[1440px]:[transform:translateX(-210px)_scale(0.92)_rotateY(14deg)] max-[1024px]:[transform:translateX(-190px)_scale(0.9)_rotateY(12deg)] max-[768px]:pointer-events-none max-[768px]:opacity-0 max-[768px]:[transform:scale(0.85)]",
  "cb-pos-right-1":
    "z-[4] opacity-95 [filter:brightness(0.92)] [transform:translateX(226px)_scale(0.92)_rotateY(-14deg)] max-[1440px]:[transform:translateX(210px)_scale(0.92)_rotateY(-14deg)] max-[1024px]:[transform:translateX(190px)_scale(0.9)_rotateY(-12deg)] max-[768px]:pointer-events-none max-[768px]:opacity-0 max-[768px]:[transform:scale(0.85)]",
  "cb-pos-left-2":
    "z-[3] opacity-90 [filter:brightness(0.9)] pointer-events-none [transform:translateX(-340px)_scale(0.86)_rotateY(16deg)] max-[1440px]:[transform:translateX(-312px)_scale(0.86)_rotateY(14deg)] max-[1024px]:pointer-events-none max-[1024px]:opacity-0",
  "cb-pos-right-2":
    "z-[3] opacity-90 [filter:brightness(0.9)] pointer-events-none [transform:translateX(340px)_scale(0.86)_rotateY(-16deg)] max-[1440px]:[transform:translateX(312px)_scale(0.86)_rotateY(-14deg)] max-[1024px]:pointer-events-none max-[1024px]:opacity-0",
  "cb-pos-hidden":
    "z-[1] opacity-0 pointer-events-none [transform:scale(0.7)_translateX(0)]",
};

export default function NewsBanner({ articles = [], loading = false }) {
  const navigate = useNavigate();
  const hasDispatchedReadyRef = useRef(false);
  const touchStartX = useRef(null);

  const [current, setCurrent] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  const slides = useMemo(() => {
    const all = Array.isArray(articles) ? articles : articles?.results || [];
    const items = [];

    for (const article of all) {
      const image = getBannerImage(article);
      if (!image) continue;

      items.push({
        _cardKey: `${article.id || article.slug || getBannerTitle(article)}-${items.length}`,
        id: article.id,
        slug: article.slug,
        title: getBannerTitle(article),
        description: getBannerDescription(article),
        category: getCategoryLabel(article),
        image,
        image_alt: article.image_alt,
        time: formatArticleDateTimeIST(article) || "",
        public_url: article.public_url,
        published_at: article.published_at,
        published_date: article.published_date,
        created_at: article.created_at,
        primary_category: article.primary_category,
        category_details: article.category_details,
        categories: article.categories,
        canonical_url: article.canonical_url,
      });
    }

    return items;
  }, [articles]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length);
  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  const navigateToArticle = (article) => {
    const path = getArticlePath(article);
    if (path) navigate(path);
  };

  const emitBannerReady = () => {
    if (hasDispatchedReadyRef.current) return;
    hasDispatchedReadyRef.current = true;
    document.dispatchEvent(new Event("news-banner-ready"));
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current == null) return;

    const endX = event.changedTouches?.[0]?.clientX ?? null;
    if (endX == null) return;

    const diff = touchStartX.current - endX;
    touchStartX.current = null;

    if (Math.abs(diff) < 40) return;
    if (diff > 0) goNext();
    else goPrev();
  };

  if (loading || slides.length === 0) return null;
  const activeIndex = current % slides.length;
  const isTwoCard425Layout = viewportWidth > 375 && viewportWidth <= 425;
  const isFourCard1024Layout = viewportWidth >= 768 && viewportWidth <= 1024;
  const isLaptop1440Layout = viewportWidth > 1024 && viewportWidth <= 1440;
  const is2KLayout = viewportWidth > 1440;
  const isExpanded2KLayout = viewportWidth >= 1920;
  const CARD_SIZE_2K_CLASSNAME = is2KLayout ? "!w-[clamp(280px,22vw,420px)]" : "";
  const is320Layout = viewportWidth <= 320;
  const is375Layout = viewportWidth > 320 && viewportWidth <= 375;
  const isFourCard768Layout = viewportWidth > 425 && viewportWidth < 768;
  const isMobileViewport = viewportWidth < 768;
  const FOUR_CARD_1024_CARD_SIZE_CLASSNAME = "!w-[clamp(196px,26vw,260px)]";
  const FOUR_CARD_1024_POSITION_CLASSNAMES = {
    center: "z-[5] opacity-100 [transform:translateX(0)_scale(1.02)_rotateY(0deg)]",
    left1: "z-[4] opacity-95 [filter:brightness(0.9)] [transform:translateX(-166px)_scale(0.88)_rotateY(12deg)]",
    left2: "z-[3] opacity-84 [filter:brightness(0.78)] [transform:translateX(-304px)_scale(0.78)_rotateY(20deg)]",
    right1: "z-[4] opacity-95 [filter:brightness(0.9)] [transform:translateX(166px)_scale(0.88)_rotateY(-12deg)]",
    right2: "z-[3] opacity-84 [filter:brightness(0.78)] [transform:translateX(304px)_scale(0.78)_rotateY(-20deg)]",
    hidden: "z-[1] opacity-0 pointer-events-none [transform:scale(0.75)_translateX(0)]",
  };
  const FOUR_CARD_768_CARD_SIZE_CLASSNAME = "!w-[clamp(210px,38vw,276px)]";
  const FOUR_CARD_768_POSITION_CLASSNAMES = {
    center: "z-[5] opacity-100 [transform:translateX(0)_scale(1.08)_rotateY(0deg)]",
    left1: "z-[4] opacity-95 [filter:brightness(0.9)] [transform:translateX(-165px)_scale(0.9)_rotateY(14deg)]",
    left2: "z-[3] opacity-88 [filter:brightness(0.86)] [transform:translateX(-290px)_scale(0.82)_rotateY(18deg)]",
    right1: "z-[4] opacity-95 [filter:brightness(0.9)] [transform:translateX(165px)_scale(0.9)_rotateY(-14deg)]",
    right2: "z-[3] opacity-88 [filter:brightness(0.86)] [transform:translateX(290px)_scale(0.82)_rotateY(-18deg)]",
    hidden: "z-[1] opacity-0 pointer-events-none [transform:scale(0.75)_translateX(0)]",
  };
  const rootClassName = `cb-root relative isolate w-full max-w-none rounded-none bg-[#18254a] px-0 pt-6 pb-6 max-[1440px]:pt-5 max-[1440px]:pb-[22px] max-[1024px]:pt-4 max-[1024px]:pb-[18px] max-[768px]:rounded-none max-[768px]:pt-3 max-[768px]:pb-12 max-[425px]:pt-1 max-[425px]:pb-10 max-[375px]:pt-2 max-[375px]:pb-8 max-[320px]:pt-1 max-[320px]:pb-6${isMobileViewport ? " overflow-x-hidden overflow-y-visible" : " overflow-visible"}${isFourCard1024Layout ? " !pt-6 !pb-8" : ""}${isTwoCard425Layout ? " pb-5 max-[425px]:pb-5" : ""}`;
  const stageClassName = "cb-stage relative z-[1] flex h-[420px] items-center justify-center overflow-visible [perspective:1200px] max-[2048px]:h-[430px] max-[1440px]:h-[392px] max-[1024px]:h-[340px] max-[768px]:h-[374px] max-[425px]:h-[386px] max-[375px]:h-[386px] max-[320px]:h-[344px] max-[425px]:items-start";
  const sectionInlineStyle =
    isLaptop1440Layout
      ? { paddingTop: "42px", paddingBottom: "30px", boxShadow: "0 -1px 0 #18254a" }
      : is2KLayout
        ? { paddingTop: "56px", paddingBottom: "72px" }
        : undefined;
  const stageInlineStyle = isLaptop1440Layout
    ? { marginTop: "0px", height: "470px", alignItems: "center", paddingTop: "0px" }
    : is2KLayout
      ? { marginTop: "28px", height: "620px", alignItems: "flex-start", paddingTop: "40px" }
    : isFourCard768Layout
      ? { paddingTop: "14px", alignItems: "flex-start" }
      : undefined;
  const controlsInlineStyle = isLaptop1440Layout
    ? { marginTop: "28px" }
    : is2KLayout
      ? { marginTop: "128px" }
      : undefined;
  const controlsClassName = isTwoCard425Layout
    ? "relative z-[20] mx-auto mt-4 flex items-center justify-center gap-2"
    : isFourCard1024Layout
      ? "relative z-[20] mx-auto mt-7 flex items-center justify-center gap-3"
    : isFourCard768Layout
      ? "relative z-[20] mx-auto mt-10 flex items-center justify-center gap-2"
    : is320Layout
      ? "relative z-[20] mx-auto mt-7 flex items-center justify-center gap-2"
    : is375Layout
      ? "relative z-[20] mx-auto mt-7 flex items-center justify-center gap-2"
    : `relative z-[12] mx-auto mt-[-18px] flex items-center justify-center gap-3 max-[768px]:absolute max-[768px]:-bottom-2 max-[768px]:left-1/2 max-[768px]:z-[30] max-[768px]:mt-0 max-[768px]:-translate-x-1/2 max-[768px]:gap-2 max-[375px]:bottom-2 max-[320px]:bottom-2 max-[320px]:gap-1.5${isLaptop1440Layout ? " mt-20" : ""}${is2KLayout ? " mt-[96px]" : ""}`;
  const expanded2KVisibleCount = Math.min(7, Math.max(5, slides.length - 2));
  const expanded2KLeftCount = Math.floor((expanded2KVisibleCount - 1) / 2);
  const expanded2KRightCount = expanded2KVisibleCount - 1 - expanded2KLeftCount;
  const getExpanded2KCardStyle = (relative) => {
    const isVisible =
      relative >= -expanded2KLeftCount && relative <= expanded2KRightCount;

    if (!isVisible) {
      return {
        opacity: 0,
        pointerEvents: "none",
        transform: "translateX(0) scale(0.7)",
      };
    }

    const absoluteRelative = Math.abs(relative);
    const spreadWidth = Math.min(viewportWidth * 0.46, 1220);
    const step = expanded2KVisibleCount > 1 ? spreadWidth / Math.max(expanded2KVisibleCount - 1, 1) : 0;
    const width = Math.max(180, Math.min(300, step * 1.22));
    const scale = relative === 0 ? 1.1 : Math.max(0.72, 0.93 - absoluteRelative * 0.045);
    const opacity = relative === 0 ? 1 : Math.max(0.42, 0.88 - absoluteRelative * 0.1);
    const brightness = Math.max(0.58, 0.88 - absoluteRelative * 0.055);
    const rotateY = relative === 0 ? 0 : relative > 0 ? -12 : 12;

    return {
      width: `${width}px`,
      aspectRatio: "3 / 4.15",
      zIndex: 100 - absoluteRelative,
      opacity,
      filter: `brightness(${brightness})`,
      transform: `translateX(${relative * step}px) scale(${scale}) rotateY(${rotateY}deg)`,
    };
  };

  return (
    <section
      className={rootClassName}
      style={sectionInlineStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-transparent" />

      {isTwoCard425Layout ? (
        <div className="relative z-[1] mx-auto grid w-[min(392px,96vw)] grid-cols-2 gap-2">
          {[0, 1].map((offset) => {
            const index = (activeIndex + offset) % slides.length;
            const slide = slides[index];
            const isCenter = offset === 0;

            return (
              <article
                key={`${slide._cardKey || slide.id || slide.slug || index}-pair-${offset}`}
                className="relative flex w-full cursor-pointer flex-col overflow-hidden rounded-none bg-white shadow-[0_16px_28px_rgba(0,0,0,0.45)] aspect-[3/5]"
                onClick={() => navigateToArticle(slide)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigateToArticle(slide);
                  }
                }}
              >
                <div className={CARD_IMAGE_WRAP_CLASSNAME}>
                  <CardImage
                    src={slide.image}
                    alt={slide.image_alt || slide.title}
                    isCenter={isCenter}
                    onLoad={() => { if (isCenter) emitBannerReady(); }}
                    onError={(event) => { event.target.style.display = "none"; }}
                  />
                </div>
                <div className={`${CARD_BODY_BASE_CLASSNAME} p-[10px_10px]`}>
                  <span className="mb-1 inline-block text-[0.68rem] font-semibold uppercase tracking-[0.03em] text-[#1d4ed8]">
                    {slide.category}
                  </span>
                  <h2 className="m-0 break-words text-[0.64rem] font-semibold leading-[1.2]">
                    {slide.title}
                  </h2>
                  {slide.description ? (
                    <p
                      className="mt-1 overflow-hidden text-[0.64rem] leading-[1.3] text-gray-600"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                    >
                      {slide.description}
                    </p>
                  ) : null}
                  {slide.time ? <p className="mt-1 text-[0.6rem] text-gray-500">{slide.time}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : isFourCard1024Layout ? (
        <div className="cb-stage relative z-[1] flex h-[372px] items-center justify-center overflow-visible [perspective:1200px]">
          {slides.map((slide, index) => {
            const relative = getRelativeIndex(index, activeIndex, slides.length);
            let activePositionClass = FOUR_CARD_1024_POSITION_CLASSNAMES.hidden;
            if (relative === 0) activePositionClass = FOUR_CARD_1024_POSITION_CLASSNAMES.center;
            else if (relative === -1) activePositionClass = FOUR_CARD_1024_POSITION_CLASSNAMES.left1;
            else if (relative === -2) activePositionClass = FOUR_CARD_1024_POSITION_CLASSNAMES.left2;
            else if (relative === 1) activePositionClass = FOUR_CARD_1024_POSITION_CLASSNAMES.right1;
            else if (relative === 2) activePositionClass = FOUR_CARD_1024_POSITION_CLASSNAMES.right2;
            const isCenter = relative === 0;

            return (
              <article
                key={`${slide._cardKey || slide.id || slide.slug || index}-tab4-${index}`}
                className={`${CARD_BASE_CLASSNAME} ${FOUR_CARD_1024_CARD_SIZE_CLASSNAME} ${CARD_SIZE_2K_CLASSNAME} ${activePositionClass} flex flex-col bg-white`}
                onClick={() => navigateToArticle(slide)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigateToArticle(slide);
                  }
                }}
              >
                <div className={CARD_IMAGE_WRAP_CLASSNAME}>
                  <CardImage
                    src={slide.image}
                    alt={slide.image_alt || slide.title}
                    isCenter={isCenter}
                    onLoad={() => { if (isCenter) emitBannerReady(); }}
                    onError={(event) => { event.target.style.display = "none"; }}
                  />
                </div>
                <div className={`${CARD_BODY_BASE_CLASSNAME} p-[12px_10px]`}>
                  <span className="mb-1 inline-block text-[0.68rem] font-semibold uppercase tracking-[0.03em] text-[#1d4ed8]">
                    {slide.category}
                  </span>
                  <h2 className="m-0 break-words text-[0.68rem] font-semibold leading-[1.2]">
                    {slide.title}
                  </h2>
                  {slide.description ? (
                    <p
                      className="mt-1 overflow-hidden text-[0.62rem] leading-[1.3] text-gray-600"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                    >
                      {slide.description}
                    </p>
                  ) : null}
                  {slide.time ? <p className="mt-1 text-[0.56rem] text-gray-500">{slide.time}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : isFourCard768Layout ? (
        <div className={stageClassName} style={stageInlineStyle}>
          {slides.map((slide, index) => {
            const relative = getRelativeIndex(index, activeIndex, slides.length);
            let activePositionClass = FOUR_CARD_768_POSITION_CLASSNAMES.hidden;
            if (relative === 0) activePositionClass = FOUR_CARD_768_POSITION_CLASSNAMES.center;
            else if (relative === -1) activePositionClass = FOUR_CARD_768_POSITION_CLASSNAMES.left1;
            else if (relative === -2) activePositionClass = FOUR_CARD_768_POSITION_CLASSNAMES.left2;
            else if (relative === 1) activePositionClass = FOUR_CARD_768_POSITION_CLASSNAMES.right1;
            else if (relative === 2) activePositionClass = FOUR_CARD_768_POSITION_CLASSNAMES.right2;
            const isCenter = relative === 0;

            return (
              <article
                key={`${slide._cardKey || slide.id || slide.slug || index}-quad-${index}`}
                className={`${CARD_BASE_CLASSNAME} ${FOUR_CARD_768_CARD_SIZE_CLASSNAME} ${CARD_SIZE_2K_CLASSNAME} ${activePositionClass} flex flex-col bg-white`}
                onClick={() => navigateToArticle(slide)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigateToArticle(slide);
                  }
                }}
              >
                <div className={CARD_IMAGE_WRAP_CLASSNAME}>
                  <CardImage
                    src={slide.image}
                    alt={slide.image_alt || slide.title}
                    isCenter={isCenter}
                    onLoad={() => { if (isCenter) emitBannerReady(); }}
                    onError={(event) => { event.target.style.display = "none"; }}
                  />
                </div>
                <div className={`${CARD_BODY_BASE_CLASSNAME} p-[12px_10px]`}>
                  <span className="mb-1 inline-block text-[0.68rem] font-semibold uppercase tracking-[0.03em] text-[#1d4ed8]">
                    {slide.category}
                  </span>
                  <h2 className="m-0 break-words text-[0.76rem] font-semibold leading-[1.22]">
                    {slide.title}
                  </h2>
                  {slide.description ? (
                    <p
                      className="mt-1 overflow-hidden text-[0.66rem] leading-[1.32] text-gray-600"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                    >
                      {slide.description}
                    </p>
                  ) : null}
                  {slide.time ? <p className="mt-1 text-[0.62rem] text-gray-500">{slide.time}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={stageClassName} style={stageInlineStyle}>
          {slides.map((slide, index) => {
            const relative = getRelativeIndex(index, activeIndex, slides.length);
            const positionClass = getCardPositionClass(relative, slides.length);
            const activePositionClass = isExpanded2KLayout
              ? ""
              : CARD_POSITION_CLASSNAMES[positionClass] || CARD_POSITION_CLASSNAMES["cb-pos-hidden"];
            const isCenter = relative === 0;

            return (
              <article
                key={slide._cardKey || slide.id || slide.slug || index}
                className={`${CARD_BASE_CLASSNAME} ${CARD_SIZE_2K_CLASSNAME} ${activePositionClass} flex flex-col bg-white`}
                style={isExpanded2KLayout ? getExpanded2KCardStyle(relative) : undefined}
                onClick={() => navigateToArticle(slide)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigateToArticle(slide);
                  }
                }}
              >
                <div className={CARD_IMAGE_WRAP_CLASSNAME}>
                  <CardImage
                    src={slide.image}
                    alt={slide.image_alt || slide.title}
                    isCenter={isCenter}
                    onLoad={() => { if (isCenter) emitBannerReady(); }}
                    onError={(event) => { event.target.style.display = "none"; }}
                  />
                </div>
                <div className={`${CARD_BODY_BASE_CLASSNAME} p-[14px_12px]`}>
                  <span className="mb-1.5 inline-block text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-[#1d4ed8]">
                    {slide.category}
                  </span>
                  <h2 className="m-0 break-words text-[clamp(0.72rem,1.2vw,1.12rem)] font-semibold leading-[1.22] max-[768px]:text-[0.9rem] max-[425px]:text-[0.88rem] max-[320px]:text-[0.82rem] max-[320px]:leading-[1.22]">
                    {slide.title}
                  </h2>
                  {slide.description ? (
                    <p
                      className="mt-1 overflow-hidden text-[0.72rem] leading-[1.34] text-gray-600 max-[768px]:text-[0.66rem] max-[320px]:text-[0.6rem]"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                    >
                      {slide.description}
                    </p>
                  ) : null}
                  {slide.time ? <p className="mt-2 text-[0.68rem] text-gray-500 max-[768px]:text-[0.68rem] max-[320px]:text-[0.64rem]">{slide.time}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className={controlsClassName} style={controlsInlineStyle}>
        <button type="button" className="relative z-[1] inline-flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border-none bg-[#002765db] text-[1.5rem] leading-none text-white hover:bg-[#002765] max-[375px]:h-8 max-[375px]:w-8 max-[375px]:text-[1.35rem]" aria-label="Previous news" onClick={goPrev}>
          &#8249;
        </button>

        <div className="relative z-[1] flex items-center justify-center gap-[9px] bg-transparent p-0 max-[768px]:gap-2" aria-label="Banner slide dots">
          {slides.map((slide, index) => (
            <button
              key={`dot-${slide._cardKey || slide.id || slide.slug || index}`}
              type="button"
              className={`h-[10px] w-[10px] cursor-pointer rounded-full border border-white bg-white transition-all duration-200 max-[320px]:h-2 max-[320px]:w-2 ${index === activeIndex ? "scale-[1.22] border-white bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.28)]" : "opacity-90"}`}
              onClick={() => setCurrent(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <button type="button" className="relative z-[1] inline-flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border-none bg-[#002765db] text-[1.5rem] leading-none text-white hover:bg-[#002765] max-[375px]:h-8 max-[375px]:w-8 max-[375px]:text-[1.35rem]" aria-label="Next news" onClick={goNext}>
          &#8250;
        </button>
      </div>
    </section>
  );
}
