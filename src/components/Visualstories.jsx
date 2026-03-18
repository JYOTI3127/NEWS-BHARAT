import { useState, useEffect } from "react";
import {
    FaChevronLeft,
    FaChevronRight,
    FaCirclePlay,
    FaCircle,
} from "react-icons/fa6";

const stories = [
  {
    id: 1,
    img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=280&fit=crop",
    text: "In the 1500s, a lion introduced a new kind of call, bringing a fresh change to the land...",
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=280&fit=crop",
    text: "In the 1500s, a lion introduced a new kind of call, bringing a fresh change to the land...",
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=280&fit=crop",
    text: "In the 1500s, a lion introduced a new kind of call, bringing a fresh change to the land...",
  },
  {
    id: 4,
    img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=280&fit=crop",
    text: "In the 1500s, a lion introduced a new kind of call, bringing a fresh change to the land...",
  },
  {
    id: 5,
    img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=280&fit=crop",
    text: "In the 1500s, a lion introduced a new kind of call, bringing a fresh change to the land...",
  },
  {
    id: 6,
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=280&fit=crop",
    text: "In the 1500s, a lion introduced a new kind of call, bringing a fresh change to the land...",
  },
  {
    id: 7,
    img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=280&fit=crop",
    text: "In the 1500s, a lion introduced a new kind of call, bringing a fresh change to the land...",
  },
  {
    id: 8,
    img: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=280&fit=crop",
    text: "In the 1500s, a lion introduced a new kind of call, bringing a fresh change to the land...",
  },
];

const tabs = ["Live", "Upcoming", "Recent"];

// ── Responsive config ─────────────────────────────────────────
// S(320) M(375) L(425) → mobile: 2 cards, stacked layout
// Tablet(768)          → 4 cards, side by side
// Laptop(1024)         → 5 cards, side by side
// Laptop L(1440) + 4K  → 6 cards, side by side

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
    laptop: 5,
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
                <p className="text-[10px] text-gray-600 leading-snug line-clamp-2">{match.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{match.venue}</p>
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
                                className="w-8 h-8 rounded-sm border border-gray-200 object-contain mb-1 bg-white"
                                onError={e => { e.target.style.display = "none"; }}
                            />
                        )}
                        <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide">
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
                                    className="w-8 h-8 rounded-sm border border-gray-200 object-contain bg-white"
                                    onError={e => { e.target.style.display = "none"; }}
                                />
                            </div>
                        )}
                        <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide">
                            {team2?.shortname || match.teams[1]}
                        </p>
                        {score2 ? (
                            <>
                                <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{score2.r}/{score2.w}</p>
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

// ── Main Component ────────────────────────────────────────────
export default function VisualStoriesWithScore() {
    const bp = useBreakpoint();
    const VISIBLE = VISIBLE_MAP[bp];

    const [offset, setOffset] = useState(0);
    const [activeTab, setActiveTab] = useState(0);
    const [cricketData, setCricketData] = useState({ live: [], upcoming: [], recent: [] });
    const [loading, setLoading] = useState(true);

    const isMobile = bp === "mobile";

    // Reset offset when VISIBLE changes (screen resize)
    useEffect(() => {
        setOffset(0);
    }, [VISIBLE]);

    const canPrev = offset > 0;
    const canNext = offset < stories.length - VISIBLE;

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
                setLoading(false);
            }
        };
        fetchScores();
        const interval = setInterval(fetchScores, 30000);
        return () => clearInterval(interval);
    }, []);

    const tabData = [cricketData.live, cricketData.upcoming, cricketData.recent];
    const tabTypes = ["live", "upcoming", "recent"];

    // ── Score card width per breakpoint
    const scoreCardWidth = {
        mobile: "100%",
        tablet: "220px",
        laptop: "220px",
        large: "220px",
    }[bp];

    return (
        <div
            className="font-sans"
            style={{ margin: "0 3% 22px" }}
        >
            {/* Mobile(320-425): stacked — stories on top, score below */}
            {/* Tablet+(768+): side by side */}
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
                            Visual Stories
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
                            {stories.slice(offset, offset + VISIBLE).map((story) => (
                                <div
                                    key={story.id}
                                    className="group flex-shrink-0 cursor-pointer border border-gray-300 transition-colors rounded-lg bg-white"
                                    style={{
                                        width: `calc((100% - ${(VISIBLE - 1) * 8}px) / ${VISIBLE})`,
                                    }}
                                >
                                    <div
                                        className="w-full rounded-md overflow-hidden border border-gray-200"
                                        style={{ aspectRatio: "3/4", position: "relative" }}
                                    >
                                        <img
                                            src={story.img}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                                            style={{ border: "none", outline: "none" }}
                                        />
                                        <div
                                            className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 ease-in-out"
                                      
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 group-hover:text-[#D80100] mt-1 leading-snug line-clamp-3 p-[5px] transition-colors duration-300">
                                        {story.text}
                                    </p>
                                </div>
                            ))}
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
                        // Mobile: no top margin (stacked layout)
                        // Tablet+: align with carousel (not header)
                        marginTop: isMobile ? "12px" : "3%",
                        // Mobile: full width already handled by width:100%
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
                    {loading ? (
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