import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaCirclePlay, FaCircle } from "react-icons/fa6";
import { API_BASE, apiUrl } from "../lib/api";
const CATEGORY_SLUG = "bharat-economy";
const LIVE_CRICKET_API = apiUrl("/live-cricket/");

const tabs = ["Live", "Upcoming", "Recent"];

const useBreakpoint = () => {
    const getBreakpoint = (w) => {
        if (w <= 320) return "s";
        if (w <= 375) return "m";
        if (w <= 425) return "l";
        if (w <= 768) return "mobile";
        if (w <= 1024) return "tablet";
        if (w <= 1440) return "laptop";
        if (w <= 2560) return "laptop-l";
        return "4k";
    };

    const [bp, setBp] = useState(() => {
        if (typeof window === "undefined") return "laptop";
        return getBreakpoint(window.innerWidth);
    });

    useEffect(() => {
        const handler = () => {
            setBp(getBreakpoint(window.innerWidth));
        };
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    return bp;
};

const VISIBLE_MAP = {
    s: 2,
    m: 2,
    l: 2,
    mobile: 2,
    tablet: 4,
    laptop: 6,
    "laptop-l": 6,
    "4k": 6,
};

const getScore = (scoreArr, teamName) => {
    if (!scoreArr || scoreArr.length === 0) return null;
    const innings = scoreArr.filter(s =>
        s.inning.toLowerCase().includes(teamName.toLowerCase())
    );
    return innings.length > 0 ? innings[innings.length - 1] : scoreArr[scoreArr.length - 1];
};

const ensureMatchShape = (match = {}) => ({
    ...match,
    teams: Array.isArray(match.teams)
        ? match.teams
        : (Array.isArray(match.teamInfo) ? match.teamInfo.map((team) => team?.name || team?.shortname || "TBD") : ["TBD", "TBD"]),
    teamInfo: Array.isArray(match.teamInfo) ? match.teamInfo : [],
    score: Array.isArray(match.score) ? match.score : [],
    name: match.name || match.series || match.matchName || "Cricket Match",
    venue: match.venue || match.location || "Venue to be announced",
    status: match.status || match.matchStatus || "Updates coming soon",
});

const normalizeMatches = (matches) =>
    Array.isArray(matches) ? matches.map(ensureMatchShape) : [];

const formatArticleDateTime = (article) => {
    const raw = article?.published_at || article?.created_at || article?.updated_at || "";
    if (!raw) return "";

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";

    const datePart = date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const timePart = date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    return `${datePart} | ${timePart}`.replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());
};

const normalizeCricketPayload = (payload) => {
    if (Array.isArray(payload)) {
        return {
            live: normalizeMatches(payload),
            upcoming: [],
            recent: [],
        };
    }

    return {
        live: normalizeMatches(payload?.live || payload?.live_matches || payload?.liveMatches || payload?.matches?.live),
        upcoming: normalizeMatches(payload?.upcoming || payload?.upcoming_matches || payload?.upcomingMatches || payload?.matches?.upcoming),
        recent: normalizeMatches(payload?.recent || payload?.recent_matches || payload?.recentMatches || payload?.matches?.recent),
    };
};

const MatchCard = ({ match, type }) => {
    const team1 = match.teamInfo?.[0];
    const team2 = match.teamInfo?.[1];
    const score1 = getScore(match.score, team1?.name || match.teams[0]);
    const score2 = getScore(match.score, team2?.name || match.teams[1]);
    const isLive = type === "live";

    return (
        <>
            <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-1.5 mb-0.5">
                    {isLive ? (
                        <>
                            <FaCircle size={7} className="text-red-600 animate-pulse" />
                            <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">Live</span>
                        </>
                    ) : (
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            {type === "upcoming" ? "Upcoming" : "Recent"}
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">{match.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{match.venue}</p>
                {isLive ? (
                    <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                        <FaCirclePlay size={10} /> Match is ongoing
                    </p>
                ) : (
                    <p className="text-[10px] text-red-600 font-medium mt-0.5 line-clamp-2">{match.status}</p>
                )}
            </div>

            <div className="px-2 py-2">
                <div className="flex items-center justify-between gap-1">
                    <div className="flex-1">
                        {team1?.img && (
                            <img
                                src={team1.img} alt={team1.shortname}
                                className="w-13 h-13 rounded-sm border border-gray-200 object-contain mb-1 bg-white"
                                loading="lazy"
                                decoding="async"
                                width={52}
                                height={52}
                                onError={e => { e.target.style.display = "none"; }}
                            />
                        )}
                        <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide pl-2">
                            {team1?.shortname || match.teams[0]}
                        </p>
                        {score1 ? (
                            <>
                                <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{score1.r}/{score1.w}</p>
                                <p className="text-[10px] text-gray-400">({score1.o} OV)</p>
                            </>
                        ) : (
                            <p className="text-[10px] text-gray-400">Yet to bat</p>
                        )}
                    </div>

                    <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0">
                        VS
                    </div>

                    <div className="flex-1 text-right">
                        {team2?.img && (
                            <div className="flex justify-end mb-1">
                                <img
                                    src={team2.img} alt={team2.shortname}
                                    className="w-13 h-13 rounded-sm border border-gray-200 object-contain bg-white"
                                    loading="lazy"
                                    decoding="async"
                                    width={52}
                                    height={52}
                                    onError={e => { e.target.style.display = "none"; }}
                                />
                            </div>
                        )}
                        <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide pr-3">
                            {team2?.shortname || match.teams[1]}
                        </p>
                        {score2 ? (
                            <>
                                <p className="text-sm font-semibold text-gray-900 whitespace-nowrap pr-2">{score2.r}/{score2.w}</p>
                                <p className="text-[10px] text-gray-400">({score2.o} OV)</p>
                            </>
                        ) : (
                            <p className="text-[10px] text-gray-400">Yet to bat</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

const MultiMatch = ({ matches, type }) => {
    const [idx, setIdx] = useState(0);

    if (!matches || matches.length === 0) {
        return <div className="px-2.5 py-4 text-center text-[11px] text-gray-400">No matches</div>;
    }

    return (
        <>
            <MatchCard match={matches[idx]} type={type} />
            {matches.length > 1 && (
                <div className="flex items-center justify-between px-2 py-1 border-t border-gray-100">
                    <button
                        onClick={() => setIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                        className={`${idx === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:text-red-600"} text-gray-400`}
                    >
                        <FaChevronLeft size={10} />
                    </button>
                    <span className="text-[10px] text-gray-400">{idx + 1} / {matches.length}</span>
                    <button
                        onClick={() => setIdx(i => Math.min(matches.length - 1, i + 1))}
                        disabled={idx === matches.length - 1}
                        className={`${idx === matches.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:text-red-600"} text-gray-400`}
                    >
                        <FaChevronRight size={10} />
                    </button>
                </div>
            )}
        </>
    );
};

const SkeletonCard = ({ visible }) => (
    <>
        {Array.from({ length: visible }).map((_, i) => (
            <div
                key={i}
                className="flex-shrink-0 border border-gray-200 rounded-lg bg-white"
                style={{ width: `calc((100% - ${(visible - 1) * 8}px) / ${visible})` }}
            >
                <div
                    className="w-full rounded-md overflow-hidden bg-gray-200 animate-pulse"
                    style={{ aspectRatio: "3/4" }}
                />
                <div className="p-1.5 space-y-1">
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-full" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-3/4" />
                </div>
            </div>
        ))}
    </>
);

export default function VisualStoriesWithScore() {
    const bp = useBreakpoint();
    const VISIBLE = VISIBLE_MAP[bp];
    const navigate = useNavigate();
    const is4K = bp === "4k";
    const is2K = bp === "laptop-l";

    const [offset, setOffset] = useState(0);
    const [activeTab, setActiveTab] = useState(0);

    // ✅ Fix 3 — Cricket loading false kiya, commented API hata di
    const [cricketData, setCricketData] = useState({ live: [], upcoming: [], recent: [] });
    const [cricketLoading, setCricketLoading] = useState(true);

    const [stories, setStories] = useState([]);
    const [storiesLoading, setStoriesLoading] = useState(true);
    const storiesRailRef = useRef(null);

    // ✅ Fix 2 — Category filter se fetch, saare articles nahi
    useEffect(() => {
        fetch(`${API_BASE}/articles/?category=${CATEGORY_SLUG}&limit=20`)
            .then((r) => r.json())
            .then((data) => {
                const all = Array.isArray(data) ? data : (data.results || []);
                const sorted = all.sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );
                setStories(sorted);
                setStoriesLoading(false);
            })
            .catch(() => setStoriesLoading(false));
    }, []);

    useEffect(() => {
        let ignore = false;

        fetch(LIVE_CRICKET_API)
            .then((r) => {
                if (!r.ok) throw new Error("Failed to fetch live cricket");
                return r.json();
            })
            .then((data) => {
                if (ignore) return;
                setCricketData(normalizeCricketPayload(data));
                setCricketLoading(false);
            })
            .catch(() => {
                if (ignore) return;
                setCricketData({ live: [], upcoming: [], recent: [] });
                setCricketLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, []);

    const isMobile = ["s", "m", "l", "mobile"].includes(bp);

    useEffect(() => { setOffset(0); }, [VISIBLE, stories.length]);

    const canPrev = offset > 0;
    const canNext = offset < stories.length - VISIBLE;

    const tabData = [cricketData.live, cricketData.upcoming, cricketData.recent];
    const tabTypes = ["live", "upcoming", "recent"];

    const scoreCardWidth = {
        s: "100%",
        m: "100%",
        l: "100%",
        mobile: "100%",
        tablet: "220px",
        laptop: "220px",
        "laptop-l": "220px",
        "4k": "220px",
    }[bp] || "220px";

    const visibleStories = stories.slice(offset, offset + VISIBLE);
    const renderedStories = isMobile ? stories : visibleStories;
    const scrollStories = (direction) => {
        if (isMobile && storiesRailRef.current) {
            const firstCard = storiesRailRef.current.querySelector('[data-story-card="true"]');
            const scrollAmount = firstCard
                ? firstCard.getBoundingClientRect().width + 10
                : storiesRailRef.current.clientWidth / 2;

            storiesRailRef.current.scrollBy({
                left: direction * scrollAmount,
                behavior: "smooth",
            });
            return;
        }

        if (direction < 0) {
            if (canPrev) setOffset((o) => o - 1);
            return;
        }

        if (canNext) setOffset((o) => o + 1);
    };
    const sectionStyle = is2K
        ? { width: "min(1820px, calc(100% - 96px))", margin: "0 auto 24px" }
        : { margin: "0 3% 22px" };
    const desktopLayoutStyle = isMobile
        ? undefined
        : is2K
            ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: "16px", alignItems: "stretch" }
            : { display: "flex", alignItems: "flex-start", gap: "12px" };
    const storiesWrapStyle = is2K
        ? { padding: "10px", borderRadius: "12px", minHeight: "430px" }
        : { padding: "8px", borderRadius: "10px" };
    const mobileStoriesWrapStyle = isMobile
        ? {
            ...storiesWrapStyle,
            overflowX: "auto",
            overflowY: "hidden",
            scrollSnapType: "x mandatory",
            scrollPaddingInline: "8px",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            gap: "8px",
            padding: "8px",
        }
        : storiesWrapStyle;

    return (
        <div className="font-sans" style={sectionStyle}>
            <div className={isMobile ? "flex flex-col gap-3" : ""} style={desktopLayoutStyle}>

                {/* Left: Visual Stories */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div
                            className="bg-red-600 rounded-sm"
                            style={{ width: is4K ? "6px" : "4px", height: is4K ? "28px" : "20px" }}
                        />
                        <span
                            className="font-bold text-[#111] uppercase"
                            style={{ fontSize: is4K ? "26px" : isMobile ? "14px" : "18px" }}
                        >
                            Bharat Economy & Business
                        </span>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => scrollStories(-1)}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center bg-white shadow-md ${!isMobile && !canPrev ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                                }`}
                            style={{
                                border: "1px solid #999999",
                                width: isMobile ? "28px" : "28px",
                                height: isMobile ? "28px" : "28px",
                                transform: isMobile ? "translate(-10px, -50%)" : "translate(-50%, -50%)",
                            }}
                        >
                            <FaChevronLeft size={12} />
                        </button>

                        <div
                            className="flex gap-2 overflow-hidden border border-gray-300"
                            ref={storiesRailRef}
                            style={mobileStoriesWrapStyle}
                        >
                            {storiesLoading ? (
                                <SkeletonCard visible={VISIBLE} />
                            ) : stories.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center py-10 text-[12px] text-gray-400">
                                    No articles in this category yet.
                                </div>
                            ) : (
                                renderedStories.map((article) => (
                                    <div
                                        key={article.id}
                                        data-story-card="true"
                                        className="group flex-shrink-0 cursor-pointer border border-gray-300 transition-colors rounded-lg bg-white overflow-hidden"
                                        style={{
                                            width: isMobile ? "calc((100% - 8px) / 2)" : `calc((100% - ${(VISIBLE - 1) * 8}px) / ${VISIBLE})`,
                                            flex: isMobile ? "0 0 calc((100% - 8px) / 2)" : undefined,
                                            maxWidth: isMobile ? "calc((100% - 8px) / 2)" : undefined,
                                            scrollSnapAlign: isMobile ? "start" : undefined,
                                        }}
                                        onClick={() => navigate(`/article/${article.slug || article.id}`)}
                                    >
                                        {/* Image — fixed aspect ratio */}
                                        <div
                                            className="w-full overflow-hidden"
                                            style={{
                                                 aspectRatio: "2/3",
                                                position: "relative",
                                                borderRadius: "8px 8px 0 0",
                                                background: "#f9f9f9"   // ← add karo
                                            }}
                                        >
                                            {article.image_url ? (
                                                // ✅ Fix 1 — lazy loading add kiya
                                                <img
                                                    src={article.image_url}
                                                    alt={article.title}
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                                                    style={{
                                                        objectFit: "cover",         
                                                         objectPosition: "center 50%"
                                                    }}
                                                    loading="lazy"
                                                    decoding="async"
                                                    width={200}
                                                    height={300}
                                                    onError={(e) => { e.target.style.display = "none"; }}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                                                    <span className="text-[10px] text-gray-400 text-center px-1">No Image</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Title — fixed height neeche */}
                                        <div
                                            style={{
                                                height: is4K ? 108 : is2K ? 92 : 78,
                                                overflow: "hidden",
                                                padding: is4K ? "10px 10px 0" : is2K ? "8px 8px 0" : "6px 6px 0",
                                            }}
                                        >
                                            <p className="text-gray-500 group-hover:text-[#D80100] leading-snug transition-colors duration-300"
                                                style={{
                                                    fontSize: is4K ? "18px" : is2K ? "14px" : "13px",
                                                    fontWeight: 500,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}>
                                                {article.title}
                                            </p>
                                            {formatArticleDateTime(article) ? (
                                                <p
                                                    className="text-[#6b7280] leading-snug"
                                                    style={{
                                                        marginTop: is4K ? "8px" : "6px",
                                                        fontSize: is4K ? "13px" : is2K ? "12px" : "11px",
                                                        fontWeight: 600,
                                                        fontFamily: "Poppins, sans-serif",
                                                    }}
                                                >
                                                    {formatArticleDateTime(article)}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => scrollStories(1)}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center bg-white shadow-md ${!isMobile && !canNext ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                                }`}
                            style={{
                                border: "1px solid #999999",
                                width: isMobile ? "28px" : "28px",
                                height: isMobile ? "28px" : "28px",
                                transform: isMobile ? "translate(10px, -50%)" : "translate(50%, -50%)",
                            }}
                        >
                            <FaChevronRight size={12} />
                        </button>
                    </div>
                </div>

                {/* Right: Live Score Card */}
                <div
                    className="flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden"
                    style={{
                        width: is2K ? "280px" : scoreCardWidth,
                        marginTop: isMobile ? "12px" : is2K ? "30px" : "35px",
                        height: is2K ? "450px" : "295px",
                        alignSelf: isMobile ? "stretch" : "flex-start",
                    }}
                >
                    <div className="flex border-b border-gray-200">
                        {tabs.map((tab, i) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(i)}
                                className={`flex-1 py-1 border-none cursor-pointer transition text-center ${activeTab === i
                                    ? "bg-red-600 text-white"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    }`}
                                style={{
                                    fontSize: is4K ? "13px" : "9px",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {cricketLoading ? (
                        <div className="px-2.5 py-4 text-center text-[11px] text-gray-400 animate-pulse">
                            Loading scores...
                        </div>
                    ) : (
                        <MultiMatch matches={tabData[activeTab]} type={tabTypes[activeTab]} />
                    )}
                </div>

            </div>
        </div>
    );
}
