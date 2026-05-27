import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaCirclePlay, FaCircle } from "react-icons/fa6";
import { API_BASE } from "../lib/api";
import { getArticlePath } from "../lib/articleUrl";
const CATEGORY_SLUG = "bharat-opinions";
const CATEGORY_FETCH_SLUGS = ["bharat-opinions"];
const SIXTY_SECONDS_SLUG = "60-second-read";
const SIXTY_SECONDS_FETCH_SLUGS = ["60-second-read"];
const PRERENDER_UA_PATTERN = /HeadlessChrome|prerender/i;

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

const STORY_COLUMNS_MAP = {
    s: 2,
    m: 2,
    l: 2,
    mobile: 2,
    tablet: 4,
    laptop: 5,
    "laptop-l": 5,
    "4k": 5,
};

const getArticleTimeValue = (article) => {
    const raw =
        article?.published_at ||
        article?.published_date ||
        article?.created_at ||
        article?.updated_at ||
        article?.date ||
        "";
    const time = new Date(raw).getTime();
    return Number.isNaN(time) ? 0 : time;
};

const getCategorySlugsFromArticle = (article) => {
    const details = Array.isArray(article?.category_details) ? article.category_details : [];
    const detailSlugs = details
        .map((item) => String(item?.slug || "").trim().toLowerCase())
        .filter(Boolean);
    const slugs = [
        ...detailSlugs,
        article?.category,
        article?.category_slug,
        article?.primary_category_slug,
        article?.primary_category?.slug,
        article?.primary_category?.name,
    ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
    return [...new Set(slugs)];
};

const isPrerenderUserAgent = () => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator?.userAgent || "";
    return PRERENDER_UA_PATTERN.test(userAgent);
};

const getScore = (scoreArr, teamName) => {
    if (!scoreArr || scoreArr.length === 0) return null;
    if (!teamName || String(teamName).toUpperCase() === "TBD") return null;
    const normalizedTeamName = String(teamName).toLowerCase();
    const innings = scoreArr.filter(s =>
        String(s?.inning || "").toLowerCase().includes(normalizedTeamName)
    );
    return innings.length > 0 ? innings[innings.length - 1] : null;
};

const getTeamLabel = (team) =>
    String(team?.shortname || team?.name || team || "").trim();

const isUsefulTeamName = (value) => {
    const normalized = String(value || "").trim().toUpperCase();
    return normalized && normalized !== "TBD" && normalized !== "NA";
};

const getTeamsFromMatchName = (name) => {
    const cleaned = String(name || "").replace(/\s+/g, " ").trim();
    const match = cleaned.match(/^(.+?)\s+(?:vs|v)\s+(.+?)(?:,|\s+\d|\s+T20|\s+ODI|\s+Test|$)/i);
    if (!match) return [];
    return [match[1], match[2]].map((team) => team.trim()).filter(isUsefulTeamName);
};

const getTeamsFromScore = (scoreArr) => {
    if (!Array.isArray(scoreArr)) return [];

    return scoreArr
        .map((score) =>
            String(score?.inning || "")
                .replace(/\s+Inning.*$/i, "")
                .replace(/\s+innings?.*$/i, "")
                .trim()
        )
        .filter(isUsefulTeamName)
        .filter((team, index, teams) => teams.findIndex((item) => item.toLowerCase() === team.toLowerCase()) === index)
        .slice(0, 2);
};

const getMatchTeams = (match) => {
    const teamInfoNames = Array.isArray(match.teamInfo)
        ? match.teamInfo.map(getTeamLabel).filter(isUsefulTeamName)
        : [];
    if (teamInfoNames.length >= 2) return teamInfoNames.slice(0, 2);

    const teams = Array.isArray(match.teams)
        ? match.teams.map(getTeamLabel).filter(isUsefulTeamName)
        : [];
    if (teams.length >= 2) return teams.slice(0, 2);

    const nameTeams = getTeamsFromMatchName(match.name);
    if (nameTeams.length >= 2) return nameTeams.slice(0, 2);

    const scoreTeams = getTeamsFromScore(match.score);
    if (scoreTeams.length >= 2) return scoreTeams.slice(0, 2);

    return ["TBD", "TBD"];
};

const getTeamInfoForName = (match, teamName) =>
    Array.isArray(match.teamInfo)
        ? match.teamInfo.find((team) => {
            const name = String(team?.name || "").toLowerCase();
            const shortname = String(team?.shortname || "").toLowerCase();
            const lookup = String(teamName || "").toLowerCase();
            if (!lookup) return false;
            return (
                (name && (name === lookup || name.includes(lookup) || lookup.includes(name))) ||
                (shortname && shortname === lookup)
            );
        })
        : null;

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
    const raw = article?.published_date || article?.published_at || article?.created_at || article?.updated_at || "";
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

const getArticleTitle = (article) =>
    String(article?.title || article?.headline || "News4Bharat story").trim();

const getArticleSummary = (article, limit = 92) => {
    const text = String(
        article?.short_description ||
        article?.summary ||
        article?.excerpt ||
        article?.description ||
        ""
    )
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!text) return "Sharp context and reporting from the News4Bharat editorial desk.";
    return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
};

const normalizeCricketPayload = (payload) => {
    const source = payload?.data || payload;

    if (Array.isArray(source)) {
        return {
            live: normalizeMatches(source),
            upcoming: [],
            recent: [],
        };
    }

    return {
        live: normalizeMatches(source?.live || source?.live_matches || source?.liveMatches || source?.matches?.live),
        upcoming: normalizeMatches(source?.upcoming || source?.upcoming_matches || source?.upcomingMatches || source?.matches?.upcoming),
        recent: normalizeMatches(source?.recent || source?.recent_matches || source?.recentMatches || source?.matches?.recent),
    };
};

const TeamLogo = ({ team, fallback }) => {
    const label = team?.shortname || fallback || "TBD";
    return (
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-red-50 text-[11px] font-bold text-red-700 shadow-sm">
            {String(label).slice(0, 3).toUpperCase()}
        </div>
    );
};

const getScoreText = (score, type) => {
    if (score) return `${score.r}/${score.w}`;
    if (type === "upcoming") return "TBD";
    return "-";
};

const getOversText = (score, type) => {
    if (score?.o) return `${score.o} ov`;
    if (type === "upcoming") return "Soon";
    return "-";
};

const ScoreTable = ({ rows, type }) => {
    const isUpcoming = type === "upcoming";

    return (
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
            <table className="w-full table-fixed border-collapse">
                <thead>
                    <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-[0.08em] text-gray-400">
                        <th className="w-[46%] px-2 py-1.5 text-left">Team</th>
                        <th className="w-[28%] px-1 py-1.5 text-right">{isUpcoming ? "Match" : "Score"}</th>
                        <th className="w-[26%] px-2 py-1.5 text-right">{isUpcoming ? "Info" : "Overs"}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={row.name} className={index === 0 ? "border-b border-gray-100" : undefined}>
                            <td className="px-2 py-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <TeamLogo team={row.team} fallback={row.name} />
                                    <span className="truncate text-[11px] font-black uppercase tracking-[0.03em] text-gray-800">
                                        {row.name}
                                    </span>
                                </div>
                            </td>
                            <td className="px-1 py-2 text-right text-[12px] font-black text-[#111]">
                                {isUpcoming ? (index === 0 ? "VS" : "-") : getScoreText(row.score, type)}
                            </td>
                            <td className="px-2 py-2 text-right text-[10px] font-bold text-gray-400">
                                {isUpcoming ? "Scheduled" : getOversText(row.score, type)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const MatchCard = ({ match, type }) => {
    const [team1Name, team2Name] = getMatchTeams(match);
    const team1 = getTeamInfoForName(match, team1Name);
    const team2 = getTeamInfoForName(match, team2Name);
    const score1 = getScore(match.score, team1?.name || team1Name);
    const score2 = getScore(match.score, team2?.name || team2Name);
    const isLive = type === "live";
    const scoreRows = [
        { team: team1, name: team1Name, score: score1 },
        { team: team2, name: team2Name, score: score2 },
    ];
    const tableLabel = type === "upcoming" ? "Fixture" : type === "recent" ? "Result" : "Scorecard";

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-white">
            <div className="border-b border-red-50 bg-[linear-gradient(135deg,#fff5f5_0%,#ffffff_58%,#f7f8fb_100%)] px-3 py-2">
                <div className="mb-1.5 flex items-center justify-end gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-gray-400 shadow-sm">
                        Cricket
                    </span>
                </div>
                <p className="line-clamp-2 text-[11px] font-bold leading-snug text-[#151515]">{match.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-gray-400">{match.venue}</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                        {tableLabel}
                    </span>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-red-700">
                        {team1Name} vs {team2Name}
                    </span>
                </div>

                <ScoreTable rows={scoreRows} type={type} />

                <div className={`mt-2 flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-bold leading-snug ${isLive ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"}`}>
                    {isLive ? <FaCirclePlay size={11} className="shrink-0" /> : null}
                    <span className="line-clamp-2">{isLive ? "Match is ongoing" : match.status || "Updates coming soon"}</span>
                </div>
            </div>
        </div>
    );
};

const MultiMatch = ({ matches, type }) => {
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        setIdx(0);
    }, [matches, type]);

    if (!matches || matches.length === 0) {
        return (
            <div className="flex h-full min-h-[220px] items-center justify-center px-4 py-8 text-center">
                <div>
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                        <FaCirclePlay size={14} />
                    </div>
                    <p className="text-[11px] font-bold text-gray-400">No matches right now</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <MatchCard match={matches[idx]} type={type} />
            {matches.length > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-2.5 py-1.5">
                    <button
                        onClick={() => setIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                        className={`${idx === 0 ? "cursor-not-allowed opacity-30" : "cursor-pointer hover:border-red-200 hover:text-red-600"} flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition`}
                    >
                        <FaChevronLeft size={10} />
                    </button>
                    <span className="text-[10px] font-bold text-gray-400">{idx + 1} / {matches.length}</span>
                    <button
                        onClick={() => setIdx(i => Math.min(matches.length - 1, i + 1))}
                        disabled={idx === matches.length - 1}
                        className={`${idx === matches.length - 1 ? "cursor-not-allowed opacity-30" : "cursor-pointer hover:border-red-200 hover:text-red-600"} flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition`}
                    >
                        <FaChevronRight size={10} />
                    </button>
                </div>
            )}
        </div>
    );
};

const SkeletonCard = ({ visible, columns, isMobile }) => (
    <>
        {Array.from({ length: visible }).map((_, i) => (
            <div
                key={i}
                className="flex-shrink-0 border border-gray-200 rounded-lg bg-white"
                style={{
                    width: `calc((100% - ${(columns - 1) * 8}px) / ${columns})`,
                    flex: `0 0 calc((100% - ${(columns - 1) * 8}px) / ${columns})`,
                    scrollSnapAlign: isMobile ? "start" : undefined,
                }}
            >
                <div
                    className="w-full rounded-md overflow-hidden bg-gray-200 animate-pulse"
                    style={{ aspectRatio: isMobile ? "4/3" : "16/10" }}
                />
                <div className="p-1.5 space-y-1">
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-full" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-3/4" />
                </div>
            </div>
        ))}
    </>
);

export default function VisualStoriesWithScore({ articles: passedArticles = [] }) {
    const bp = useBreakpoint();
    const navigate = useNavigate();
    const is4K = bp === "4k";
    const is2K = bp === "laptop-l";
    const isLaptop = bp === "laptop";
    const isMobile = ["s", "m", "l", "mobile"].includes(bp);
    const storyColumns = STORY_COLUMNS_MAP[bp] || 6;
    const storyRows = isMobile ? 1 : 2;
    const VISIBLE = storyColumns * storyRows;

    const [offset, setOffset] = useState(0);
    const [stories, setStories] = useState([]);
    const [sixtySecondArticles, setSixtySecondArticles] = useState([]);
    const [sixtySecondLoading, setSixtySecondLoading] = useState(true);
    const [storiesLoading, setStoriesLoading] = useState(true);
    const [sixtySecondPanelHeight, setSixtySecondPanelHeight] = useState(null);
    const storiesRailRef = useRef(null);

    const seededStories = useMemo(() => {
        if (!Array.isArray(passedArticles) || passedArticles.length === 0) return [];
        const slugSet = new Set(CATEGORY_FETCH_SLUGS.map((value) => value.toLowerCase()));
        const filtered = passedArticles.filter((article) =>
            getCategorySlugsFromArticle(article).some((slug) => slugSet.has(slug))
        );
        return [...filtered].sort((a, b) => getArticleTimeValue(b) - getArticleTimeValue(a));
    }, [passedArticles]);

    const seededSixtySecondArticles = useMemo(() => {
        if (!Array.isArray(passedArticles) || passedArticles.length === 0) return [];
        const slugSet = new Set(SIXTY_SECONDS_FETCH_SLUGS.map((value) => value.toLowerCase()));
        const filtered = passedArticles.filter((article) =>
            getCategorySlugsFromArticle(article).some((slug) => slugSet.has(slug))
        );
        return [...filtered].sort((a, b) => getArticleTimeValue(b) - getArticleTimeValue(a));
    }, [passedArticles]);

    // ✅ Fix 2 — Category filter se fetch, saare articles nahi
    useEffect(() => {
        let ignore = false;

        if (seededStories.length > 0) {
            setStories(seededStories);
            setStoriesLoading(false);
            if (isPrerenderUserAgent()) return () => { ignore = true; };
        }

        Promise.all(
            CATEGORY_FETCH_SLUGS.map((slug) =>
                fetch(`${API_BASE}/articles/?category=${encodeURIComponent(slug)}&page=1&limit=50`)
                    .then((r) => (r.ok ? r.json() : null))
                    .catch(() => null)
            )
        )
            .then((responses) => {
                if (ignore) return;
                const seen = new Set();
                const all = responses.flatMap((data) =>
                    Array.isArray(data)
                        ? data
                        : Array.isArray(data?.value)
                            ? data.value
                            : (data?.results || [])
                );
                const unique = all.filter((article) => {
                    const key = article?.id || article?.slug || article?.url || article?.title;
                    if (!key) return true;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                const sorted = [...unique].sort((a, b) => getArticleTimeValue(b) - getArticleTimeValue(a));
                setStories(sorted);
                setStoriesLoading(false);
            })
            .catch(() => {
                if (ignore) return;
                setStoriesLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [seededStories]);

    useEffect(() => {
        let ignore = false;

        if (seededSixtySecondArticles.length > 0) {
            setSixtySecondArticles(seededSixtySecondArticles);
            setSixtySecondLoading(false);
            if (isPrerenderUserAgent()) return () => { ignore = true; };
        }

        Promise.all(
            SIXTY_SECONDS_FETCH_SLUGS.map((slug) =>
                fetch(`${API_BASE}/articles/?category=${encodeURIComponent(slug)}&page=1&limit=20`)
                    .then((r) => (r.ok ? r.json() : null))
                    .catch(() => null)
            )
        )
            .then((responses) => {
                if (ignore) return;
                const seen = new Set();
                const all = responses.flatMap((data) =>
                    Array.isArray(data)
                        ? data
                        : Array.isArray(data?.value)
                            ? data.value
                            : (data?.results || [])
                );
                const unique = all.filter((article) => {
                    const key = article?.id || article?.slug || article?.url || article?.title;
                    if (!key) return true;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                const sorted = [...unique].sort((a, b) => getArticleTimeValue(b) - getArticleTimeValue(a));
                setSixtySecondArticles(sorted);
                setSixtySecondLoading(false);
            })
            .catch(() => {
                if (ignore) return;
                setSixtySecondLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [seededSixtySecondArticles]);

    useEffect(() => { setOffset(0); }, [VISIBLE, stories.length]);

    useEffect(() => {
        const rail = storiesRailRef.current;
        if (!rail) return undefined;

        let rafId = 0;
        const updateHeight = () => {
            window.cancelAnimationFrame(rafId);
            rafId = window.requestAnimationFrame(() => {
                setSixtySecondPanelHeight(Math.ceil(rail.getBoundingClientRect().height));
            });
        };

        updateHeight();
        const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateHeight) : null;
        resizeObserver?.observe(rail);
        window.addEventListener("resize", updateHeight);

        return () => {
            window.cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, [VISIBLE, bp, offset, stories.length, storiesLoading]);

    const canPrev = offset > 0;
    const maxOffset = Math.max(0, stories.length - VISIBLE);
    const canNext = offset < maxOffset;

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
    const fallbackRailHeight = isMobile
        ? "300px"
        : is4K
            ? "430px"
            : is2K
                ? "430px"
                : "398px";
    const matchedRailHeight = sixtySecondPanelHeight ? `${sixtySecondPanelHeight}px` : fallbackRailHeight;
    const visibleStories = stories.slice(offset, offset + VISIBLE);
    const renderedStories = isMobile ? stories : visibleStories;
    const sixtySecondSideArticles = sixtySecondArticles.slice(0, 8);

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
            if (canPrev) setOffset((o) => Math.max(0, o - VISIBLE));
            return;
        }

        if (canNext) setOffset((o) => Math.min(maxOffset, o + VISIBLE));
    };
    const sectionStyle = is2K
        ? { width: "min(1660px, calc(100% - 180px))", margin: "0 auto 24px" }
        : isLaptop
            ? { width: "min(1180px, calc(100% - 72px))", margin: "0 auto 22px" }
            : { margin: "0 3% 22px" };
    const desktopLayoutStyle = isMobile
        ? undefined
        : is2K
            ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: "18px", alignItems: "start" }
            : { display: "flex", alignItems: "flex-start", gap: "16px" };
    const storiesWrapStyle = is2K
        ? { padding: "12px", borderRadius: "18px", flexWrap: "wrap", alignContent: "flex-start" }
        : { padding: "10px", borderRadius: "18px", flexWrap: "wrap", alignContent: "flex-start" };
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
            flexWrap: "nowrap",
            alignContent: "normal",
        }
        : storiesWrapStyle;

    return (
        <div className="font-sans" style={{ ...sectionStyle, fontFamily: "Poppins, sans-serif" }}>
            <div className={isMobile ? "flex flex-col gap-3" : ""} style={desktopLayoutStyle}>

                {/* Left: Visual Stories */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                        <div
                            className="bg-red-600 rounded-sm"
                            style={{ width: is4K ? "6px" : "4px", height: is4K ? "28px" : "20px" }}
                        />
                        <span
                            className="font-bold text-[#111] uppercase"
                            style={{ fontSize: is4K ? "30px" : isMobile ? "16px" : "21px", fontFamily: "Poppins, sans-serif" }}
                        >
                            Bharat Opinion
                        </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(`/category/${CATEGORY_SLUG}`)}
                            className="business-brief-readmore"
                        >
                            Read More
                        </button>
                    </div>

                    <div className="relative">
                        <button
                            aria-label="Previous Bharat Opinion stories"
                            onClick={() => scrollStories(-1)}
                            disabled={!isMobile && !canPrev}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center transition-all duration-200 ${!isMobile && !canPrev ? "opacity-35 cursor-not-allowed" : "cursor-pointer hover:shadow-lg hover:-translate-x-0.5"
                                }`}
                            style={{
                                left: 0,
                                border: "1px solid rgba(216, 1, 0, 0.32)",
                                width: isMobile ? "30px" : "36px",
                                height: isMobile ? "30px" : "36px",
                                background: "#ffffff",
                                color: "#D80100",
                                boxShadow: "0 8px 18px rgba(17, 17, 17, 0.14)",
                                transform: isMobile ? "translate(0, -50%)" : "translate(-18%, -50%)",
                            }}
                        >
                            <FaChevronLeft size={isMobile ? 12 : 14} />
                        </button>

                        <div
                            className="flex gap-3 overflow-hidden border border-gray-200 bg-[#f8fafc] shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                            ref={storiesRailRef}
                            style={mobileStoriesWrapStyle}
                        >
                            {storiesLoading ? (
                                <SkeletonCard visible={VISIBLE} columns={storyColumns} isMobile={isMobile} />
                            ) : stories.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center py-10 text-[12px] text-gray-400">
                                    No articles in this category yet.
                                </div>
                            ) : (
                                renderedStories.map((article) => (
                                    <div
                                        key={article.id}
                                        data-story-card="true"
                                        className="group flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-red-100 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
                                        style={{
                                            width: `calc((100% - ${(storyColumns - 1) * 12}px) / ${storyColumns})`,
                                            flex: `0 0 calc((100% - ${(storyColumns - 1) * 12}px) / ${storyColumns})`,
                                            maxWidth: isMobile ? "calc((100% - 12px) / 2)" : undefined,
                                            scrollSnapAlign: isMobile ? "start" : undefined,
                                            fontFamily: "Poppins, sans-serif",
                                        }}
                                        onClick={() => {
                                            const articlePath = getArticlePath(article);
                                            if (articlePath) navigate(articlePath);
                                        }}
                                    >
                                        {/* Image — fixed aspect ratio */}
                                        <div
                                            className="w-full overflow-hidden"
                                            style={{
                                                aspectRatio: isMobile ? "4/3" : "16/9",
                                                position: "relative",
                                                borderRadius: "12px 12px 0 0",
                                                background: "linear-gradient(135deg, #f3f4f6 0%, #ffffff 52%, #fee2e2 100%)"
                                            }}
                                        >
                                            {article.image_url ? (
                                                <>
                                                    <img
                                                        src={article.image_url}
                                                        alt=""
                                                        aria-hidden="true"
                                                        className="absolute inset-0 w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-110"
                                                        style={{
                                                            objectFit: "cover",
                                                            objectPosition: "center",
                                                            filter: "blur(18px)",
                                                            transform: "scale(1.14)",
                                                            opacity: 0.2,
                                                        }}
                                                        loading="lazy"
                                                        decoding="async"
                                                        onError={(e) => { e.target.style.display = "none"; }}
                                                    />
                                                    <img
                                                        src={article.image_url}
                                                        alt={article.title}
                                                        className="absolute inset-0 w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                                                        style={{
                                                            objectFit: "contain",
                                                            objectPosition: "center",
                                                            padding: "3px",
                                                        }}
                                                        loading="lazy"
                                                        decoding="async"
                                                        width={200}
                                                        height={300}
                                                        onError={(e) => { e.target.style.display = "none"; }}
                                                    />
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                                                    <span className="text-[10px] text-gray-400 text-center px-1">No Image</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Title — fixed height neeche */}
                                        <div
                                            style={{
                                                height: is4K ? 116 : is2K ? 98 : 84,
                                                overflow: "hidden",
                                                padding: is4K ? "12px 12px 0" : is2K ? "10px 10px 0" : "8px 8px 0",
                                            }}
                                        >
                                            <p className="text-[#334155] group-hover:text-[#D80100] leading-snug transition-colors duration-300"
                                                style={{
                                                    fontSize: "10px",
                                                    fontWeight: 600,
                                                    fontFamily: "Poppins, sans-serif",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}>
                                                {article.title}
                                            </p>
                                            {formatArticleDateTime(article) ? (
                                                <p
                                                    className="text-[#64748b] leading-snug"
                                                    style={{
                                                        marginTop: is4K ? "8px" : "6px",
                                                        fontSize: is4K ? "12px" : is2K ? "11px" : "9px",
                                                        fontWeight: 500,
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
                            aria-label="Next Bharat Opinion stories"
                            onClick={() => scrollStories(1)}
                            disabled={!isMobile && !canNext}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center transition-all duration-200 ${!isMobile && !canNext ? "opacity-35 cursor-not-allowed" : "cursor-pointer hover:shadow-lg hover:translate-x-0.5"
                                }`}
                            style={{
                                right: 0,
                                border: "1px solid rgba(216, 1, 0, 0.32)",
                                width: isMobile ? "30px" : "36px",
                                height: isMobile ? "30px" : "36px",
                                background: "#ffffff",
                                color: "#D80100",
                                boxShadow: "0 8px 18px rgba(17, 17, 17, 0.14)",
                                transform: isMobile ? "translate(10px, -50%)" : "translate(50%, -50%)",
                            }}
                        >
                            <FaChevronRight size={isMobile ? 12 : 14} />
                        </button>
                    </div>
                </div>

                {/* Right: 60 Second Read */}
                <div
                    className="business-brief-wrap relative flex flex-shrink-0 flex-col"
                    style={{
                        width: is2K ? "320px" : scoreCardWidth,
                        marginTop: isMobile ? "12px" : 0,
                        alignSelf: isMobile ? "stretch" : "flex-start",
                    }}
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <div
                                className="bg-red-600 rounded-sm"
                                style={{ width: is4K ? "6px" : "4px", height: is4K ? "28px" : "20px" }}
                            />
                            <span
                                className="font-bold text-[#111] uppercase"
                                style={{ fontSize: is4K ? "22px" : "14px", fontFamily: "Poppins, sans-serif" }}
                            >
                                60 Second Read
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(`/category/${SIXTY_SECONDS_SLUG}`)}
                            className="business-brief-readmore"
                        >
                            Read More
                        </button>
                    </div>
                    <div
                        className="business-brief-panel flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
                        style={{ height: matchedRailHeight, flex: "0 0 auto" }}
                    >
                        {sixtySecondLoading ? (
                            <div className="flex flex-1 items-center justify-center px-3 py-4 text-center text-[11px] font-semibold text-gray-400">
                                Loading 60 Second Read...
                            </div>
                        ) : sixtySecondSideArticles.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center px-3 py-4 text-center text-[11px] font-semibold text-gray-400">
                                60 Second Read updates coming soon.
                            </div>
                        ) : (
                            <div className="business-brief-viewport min-h-0 flex-1 overflow-hidden bg-[#f8fafc]">
                                <div className="business-brief-track flex flex-col">
                                    {sixtySecondSideArticles.map((article, index) => {
                                        const articlePath = getArticlePath(article);
                                        return (
                                            <button
                                                key={article?.id || article?.slug || index}
                                                type="button"
                                                onClick={() => articlePath && navigate(articlePath)}
                                                className="business-brief-card w-full px-3 py-2.5 text-left transition"
                                                style={{ fontFamily: "Poppins, sans-serif" }}
                                            >
                                                <div className="flex gap-2.5">
                                                    <span className="business-brief-bullet" aria-hidden="true" />
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="m-0 line-clamp-2 text-[12px] font-black leading-snug text-[#111827]">
                                                            {getArticleTitle(article)}
                                                        </h3>
                                                        <p className="m-0 mt-1.5 line-clamp-2 text-[10px] font-semibold leading-[1.45] text-gray-500">
                                                            {getArticleSummary(article, 115)}
                                                        </p>
                                                        {formatArticleDateTime(article) ? (
                                                            <p className="business-brief-date">
                                                                {formatArticleDateTime(article)}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
