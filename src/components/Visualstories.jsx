import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaChevronLeft,
    FaChevronRight,
    FaCirclePlay,
    FaCircle,
} from "react-icons/fa6";

const API_BASE = "https://api.news4bharat.com/api";
const CATEGORY_SLUG = "bharat-economy"; // Bharat Economy & Business

const tabs = ["Live", "Upcoming", "Recent"];

// ── Responsive config ─────────────────────────────────────────
const useBreakpoint = () => {
    const [bp, setBp] = useState(() => {
        if (typeof window === "undefined") return "laptop";
        const w = window.innerWidth;
        if (w < 768) return "mobile";
        if (w < 1024) return "tablet";
        if (w < 1440) return "laptop";
        return "large";
    });

    useEffect(() => {
        const handler = () => {
            const w = window.innerWidth;
            if (w < 768) setBp("mobile");
            else if (w < 1024) setBp("tablet");
            else if (w < 1440) setBp("laptop");
            else setBp("large");
        };
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    return bp;
};

const VISIBLE_MAP = {
    mobile: 2,
    tablet: 4,
    laptop: 6,
    large: 6,
};

// ── Helper ────────────────────────────────────────────────────
const getScore = (scoreArr, teamName) => {
    if (!scoreArr || scoreArr.length === 0) return null;
    const innings = scoreArr.filter(s =>
        s.inning.toLowerCase().includes(teamName.toLowerCase())
    );
    return innings.length > 0 ? innings[innings.length - 1] : scoreArr[scoreArr.length - 1];
};

// ── Match Card ────────────────────────────────────────────────
const MatchCard = ({ match, type }) => {
    const team1 = match.teamInfo?.[0];
    const team2 = match.teamInfo?.[1];
    const score1 = getScore(match.score, team1?.name || match.teams[0]);
    const score2 = getScore(match.score, team2?.name || match.teams[1]);
    const isLive = type === "live";

    return (
        <>
            <div className="px-2.5 py-2 border-b border-gray-200 bg-gray-50">
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

            <div className="px-2.5 py-2.5">
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex-1">
                        {team1?.img && (
                            <img
                                src={team1.img} alt={team1.shortname}
                                className="w-13 h-13 rounded-sm border border-gray-200 object-contain mb-1 bg-white"
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

// ── Multi Match Pagination ────────────────────────────────────
const MultiMatch = ({ matches, type }) => {
    const [idx, setIdx] = useState(0);

    if (!matches || matches.length === 0) {
        return <div className="px-2.5 py-4 text-center text-[11px] text-gray-400">No matches</div>;
    }

    return (
        <>
            <MatchCard match={matches[idx]} type={type} />
            {matches.length > 1 && (
                <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-gray-100">
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

// ── Skeleton Card ─────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────
export default function VisualStoriesWithScore() {
    const bp = useBreakpoint();
    const VISIBLE = VISIBLE_MAP[bp];
    const navigate = useNavigate();

    const [offset, setOffset] = useState(0);
    const [activeTab, setActiveTab] = useState(0);
    const [cricketData, setCricketData] = useState({ live: [], upcoming: [], recent: [] });
    const [cricketLoading, setCricketLoading] = useState(true);

    // ── API: Bharat Economy & Business articles ───────────────
    const [stories, setStories] = useState([]);
    const [storiesLoading, setStoriesLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/articles/`)
            .then((r) => r.json())
            .then((data) => {
                const all = Array.isArray(data) ? data : (data.results || []);

                // Filter by bharat-economy category slug
                const filtered = all.filter((a) =>
                    Array.isArray(a.category_details) &&
                    a.category_details.some((c) => c.slug === CATEGORY_SLUG)
                );

                // Newest first
                const sorted = filtered.sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );

                setStories(sorted);
                setStoriesLoading(false);
            })
            .catch(() => setStoriesLoading(false));
    }, []);

    const isMobile = bp === "mobile";

    // Reset offset on resize or new data
    useEffect(() => { setOffset(0); }, [VISIBLE, stories.length]);

    const canPrev = offset > 0;
    const canNext = offset < stories.length - VISIBLE;

    // Cricket scores
    useEffect(() => {
        const fetchScores = async () => {
            try {
                const res = await fetch("https://api.news4bharat.com/api/live-cricket/");
                const json = await res.json();
                setCricketData(json);
                if (json.live?.length > 0) setActiveTab(0);
                else if (json.upcoming?.length > 0) setActiveTab(1);
                else setActiveTab(2);
            } catch (e) {
                console.error("Cricket API error:", e);
            } finally {
                setCricketLoading(false);
            }
        };
        fetchScores();
        const interval = setInterval(fetchScores, 30000);
        return () => clearInterval(interval);
    }, []);

    const tabData  = [cricketData.live, cricketData.upcoming, cricketData.recent];
    const tabTypes = ["live", "upcoming", "recent"];

    const scoreCardWidth = {
        mobile: "100%",
        tablet: "220px",
        laptop: "220px",
        large: "220px",
    }[bp];

    // Visible stories slice
    const visibleStories = stories.slice(offset, offset + VISIBLE);

    return (
        <div className="font-sans" style={{ margin: "0 3% 22px" }}>
            <div className={`flex gap-3 ${isMobile ? "flex-col" : "flex-row items-start"}`}>

                {/* ── Left: Visual Stories ── */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-5 bg-red-600 rounded-sm" />
                        <span
                            className="font-bold text-[#111] uppercase"
                            style={{ fontSize: isMobile ? "14px" : "18px" }}
                        >
                            Bharat Economy & Business
                        </span>
                    </div>

                    {/* Carousel */}
                    <div className="relative">

                        {/* Prev */}
                        <button
                            onClick={() => canPrev && setOffset((o) => o - 1)}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-white shadow-md ${
                                !canPrev ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                            }`}
                            style={{ border: "1px solid #999999" }}
                        >
                            <FaChevronLeft size={12} />
                        </button>

                        {/* Cards wrapper */}
                        <div
                            className="flex gap-2 overflow-hidden border border-gray-300"
                            style={{ padding: "8px", borderRadius: "10px" }}
                        >
                            {storiesLoading ? (
                                <SkeletonCard visible={VISIBLE} />
                            ) : stories.length === 0 ? (
                                // No articles yet — empty state
                                <div className="flex-1 flex items-center justify-center py-10 text-[12px] text-gray-400">
                                    No articles in this category yet.
                                </div>
                            ) : (
                                visibleStories.map((article) => (
                                    <div
                                        key={article.id}
                                        className="group flex-shrink-0 cursor-pointer border border-gray-300 transition-colors rounded-lg bg-white"
                                        style={{
                                            width: `calc((100% - ${(VISIBLE - 1) * 8}px) / ${VISIBLE})`,
                                        }}
                                        onClick={() => navigate(`/article/${article.slug}`)}
                                    >
                                        <div
                                            className="w-full rounded-md overflow-hidden border border-gray-200"
                                            style={{ aspectRatio: "3/4", position: "relative" }}
                                        >
                                            {article.image_url ? (
                                                <img
                                                    src={article.image_url}
                                                    alt={article.title}
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                                                    onError={(e) => { e.target.style.display = "none"; }}
                                                />
                                            ) : (
                                                // No image fallback
                                                <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                                                    <span className="text-[10px] text-gray-400 text-center px-1">No Image</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-black transition-opacity duration-500 ease-in-out" />
                                        </div>
                                        <p className="text-[9px] text-gray-500 group-hover:text-[#D80100] mt-1 leading-snug line-clamp-3 p-[5px] transition-colors duration-300">
                                            {article.subtitle ? article.subtitle.slice(0, 100) : article.title}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Next */}
                        <button
                            onClick={() => canNext && setOffset((o) => o + 1)}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-white shadow-md ${
                                !canNext ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                            }`}
                            style={{ border: "1px solid #999999" }}
                        >
                            <FaChevronRight size={12} />
                        </button>

                    </div>
                </div>

                {/* ── Right: Live Score Card ── */}
                <div
                    className="flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden"
                    style={{
                        width: scoreCardWidth,
                        marginTop: isMobile ? "12px" : "3%",
                        height: "278px",
                        alignSelf: isMobile ? "stretch" : "flex-start",
                    }}
                >
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        {tabs.map((tab, i) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(i)}
                                className={`flex-1 py-1.5 border-none cursor-pointer transition text-center ${
                                    activeTab === i
                                        ? "bg-red-600 text-white"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                                style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
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