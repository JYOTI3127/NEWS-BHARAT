import { useState } from "react";
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

const VISIBLE = 6;

const tabs = ["Live", "Upcoming", "Recent"];

export default function VisualStoriesWithScore() {
    const [offset, setOffset] = useState(0);
    const [activeTab, setActiveTab] = useState(0);

    const canPrev = offset > 0;
    const canNext = offset < stories.length - VISIBLE;

    return (
        <div
            className="flex gap-3 font-sans"
            style={{ margin: "0 3% 22px" }}
        >
            {/* Left: Visual Stories */}
            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-red-600 rounded-sm" />
                    <span className="text-[18px] font-bold text-[#111] uppercase">
                        Visual Stories
                    </span>
                </div>

                {/* Carousel */}
                <div className="flex items-center gap-1">
                    {/* Prev */}
                    <button
                        onClick={() => canPrev && setOffset((o) => o - 1)}
                        className={`w-9 h-9 rounded-full border-2 border-red-500 flex items-center justify-center bg-white shadow-md ${
                            !canPrev ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        style={{ border: "1px solid #999999" }}
                    >
                        <FaChevronLeft size={12} />
                    </button>

                    {/* Cards wrapper */}
                    <div
                        className="flex gap-2 flex-1 min-w-0 overflow-hidden border border-gray-300"
                        style={{ padding: "8px", borderRadius: "10px" }}
                    >
                        {stories.slice(offset, offset + VISIBLE).map((story) => (
                            <div
                                key={story.id}
                                className="group flex-shrink-0 cursor-pointer border border-gray-300 transition-colors rounded-lg p-1.5 bg-white"
                                style={{
                                    width: `calc((100% - ${(VISIBLE - 1) * 8}px) / ${VISIBLE})`,
                                }}
                            >
                                {/* Inner image border */}
                                <div
                                    className="w-full rounded-md overflow-hidden border border-gray-200"
                                    style={{ aspectRatio: "3/4", position: "relative" }}
                                >
                                    <img
                                        src={story.img}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover"
                                        style={{ border: "none", outline: "none" }}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 group-hover:text-[#D80100] mt-1 leading-snug line-clamp-3">
                                    {story.text}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Next */}
                    <button
                        onClick={() => canNext && setOffset((o) => o + 1)}
                        className={`w-9 h-9 rounded-full border-2 border-[#999999] flex items-center justify-center bg-white ${
                            !canNext ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        style={{ border: "1px solid #999999" }}
                    >
                        <FaChevronRight size={12} />
                    </button>
                </div>
            </div>

            {/* Right: Live Score Card */}
            <div
                className="flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden"
                style={{ width: "200px", minWidth: "200px" }}
            >
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    {tabs.map((tab, i) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(i)}
                            className={`flex-1 text-center py-1.5 text-[10px] font-semibold uppercase tracking-wide border-none cursor-pointer transition ${
                                activeTab === i
                                    ? "bg-red-600 text-white"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Meta */}
                <div className="px-2.5 py-2 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <FaCircle size={7} className="text-red-600 animate-pulse" />
                        <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                            Live
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                        May 29, ICC Men's T20 World Cup, 2026
                    </p>
                    <p className="text-[11px] text-gray-600">Feb 16, 15:00 (IST)</p>
                    <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                        <FaCirclePlay size={10} />  Match is ongoing
                    </p>
                </div>

                {/* Teams */}
                <div className="px-2.5 py-2.5">
                    <div className="flex items-center justify-between gap-1.5">
                        {/* Italy */}
                        <div className="flex-1">
                            <div
                                className="w-8 h-5 rounded-sm border border-gray-200 mb-1 overflow-hidden"
                                style={{
                                    background:
                                        "linear-gradient(to right, #009246 33%, #fff 33%, #fff 66%, #ce2b37 66%)",
                                }}
                            />
                            <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide">
                                Italy
                            </p>
                            <p className="text-base font-semibold text-gray-900">43/3</p>
                            <p className="text-[10px] text-gray-400">(5.5 OV)</p>
                        </div>

                        {/* VS */}
                        <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0">
                            VS
                        </div>

                        {/* England */}
                        <div className="flex-1 text-right">
                            <div
                                className="w-8 h-5 rounded-sm border border-gray-200 mb-1 overflow-hidden ml-auto"
                                style={{ background: "#fff", position: "relative" }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background:
                                            "repeating-linear-gradient(0deg,transparent,transparent 6px,#cc000044 6px,#cc000044 9px),repeating-linear-gradient(90deg,transparent,transparent 10px,#cc000044 10px,#cc000044 13px)",
                                    }}
                                />
                            </div>
                            <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide">
                                England
                            </p>
                            <p className="text-base font-semibold text-gray-900">202/7</p>
                            <p className="text-[10px] text-gray-400">(20 OV)</p>
                        </div>
                    </div>

                    {/* Footer note */}
                    <div className="mt-2 pt-1.5 border-t border-gray-200 text-[10px] text-gray-500 leading-snug">
                        Italy 43/3 (5.5 ov) |{" "}
                        <span className="text-red-600 font-medium">
                           Italy need 160 runs off 25 balls (RRR: 11.25)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}