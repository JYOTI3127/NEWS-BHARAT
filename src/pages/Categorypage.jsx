import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Clock, User, TrendingUp, ChevronRight, Flame,
  Globe, BarChart2, Cpu, Trophy, FileText, PenLine,
  Zap, Newspaper, RefreshCw, BookOpen, Eye,
} from "lucide-react";

const API_BASE = "https://api.news4bharat.com/api";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const formatViews = (v) => {
  if (!v) return "";
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
};

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      setLoading(true);
      setVisibleCount(6);

      try {
        const res = await fetch(`${API_BASE}/categories/`);
        const data = await res.json();
        const found = Array.isArray(data) ? data.find((c) => c.slug === slug) : null;
        setCategory(found || { name: slug });
      } catch {
        setCategory({ name: slug });
      }

      try {
        const res = await fetch(`${API_BASE}/articles/`);
        const data = await res.json();

        const all = Array.isArray(data) ? data : (data.results || []);
        const filtered = all.filter((article) =>
          Array.isArray(article.category_details) &&
          article.category_details.some(
            (c) => c.slug?.toLowerCase() === slug.toLowerCase()
          )
        );

        const normalized = filtered.map((a) => ({
          ...a,
          // API already returns full URLs (https://api.news4bharat.com/media/...)
          image: a.image_url || a.image || null,
          author: (typeof a.author === "object" ? a.author?.username : a.author) || "News4Bharat",
          description: a.subtitle || (a.content ? a.content.slice(0, 150) : ""),
        }));
        setArticles(normalized);
      } catch (err) {
        console.error("Articles fetch error:", err);
        setArticles([]);
      }

      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const heroArticle = articles[0] || null;
  const gridArticles = articles.slice(1, visibleCount + 1);
  const trendingTop5 = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const hasMore = visibleCount + 1 < articles.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-9 h-9 border-[3px] border-[#f0ece8] border-t-[#D80100] rounded-full mb-3 animate-spin" />
        <p className="text-[#888] text-[13px] font-[Poppins,_sans-serif]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4f0] font-[Poppins,_sans-serif]">

      {/* Category Header */}
      <div className="bg-white border-b-4 border-[#D80100] py-5 sm:py-[28px]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <h1 className="text-[clamp(18px,3.5vw,34px)] font-extrabold text-[#111] mb-1 tracking-[-0.4px]">
            {category?.name || slug}
          </h1>
          {category?.description && (
            <p className="text-[13px] text-[#666] mb-2 leading-[1.6]">{category.description}</p>
          )}
          <span className="inline-flex items-center text-[12px] text-[#D80100] font-semibold">
            <BookOpen size={13} className="mr-1.5 align-middle" />
            {articles.length} Articles
          </span>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-[28px] grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-7 items-start">

        {/* LEFT MAIN CONTENT */}
        <div className="min-w-0">

          {/* Hero Article */}
          {heroArticle && (
            <Link to={`/article/${heroArticle.slug || heroArticle.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div className="bg-white rounded-[12px] overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.08)] mb-7 hover:shadow-[0_8px_28px_rgba(0,0,0,0.13)] transition-shadow duration-200">
                <div className="relative w-full h-[220px] sm:h-[280px] lg:h-[320px] overflow-hidden">
                  {heroArticle.image
                    ? <img src={heroArticle.image} alt={heroArticle.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-[#f0ece8]"><Newspaper size={40} color="#ccc" /></div>
                  }
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[rgba(0,0,0,0.3)] to-transparent" />
                  <span className="absolute top-3 left-3 bg-[#D80100] text-white text-[10px] font-bold px-[10px] py-[4px] rounded-[4px] uppercase tracking-[1px]">
                    Featured
                  </span>
                </div>
                <div className="p-4 sm:p-[20px_24px_24px]">
                  <h2 className="text-[clamp(16px,2.5vw,22px)] font-extrabold text-[#111] mb-2 leading-[1.4] tracking-[-0.3px]">
                    {heroArticle.title}
                  </h2>
                  <p className="text-[13.5px] text-[#555] mb-[14px] leading-[1.7]">{heroArticle.description}</p>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    <span className="inline-flex items-center text-[11.5px] text-[#888] font-medium">
                      <User size={12} className="mr-1" />{heroArticle.author}
                    </span>
                    <span className="inline-flex items-center text-[11.5px] text-[#888] font-medium">
                      <Clock size={12} className="mr-1" />{formatDate(heroArticle.published_at || heroArticle.created_at)}
                    </span>
                    {heroArticle.views && (
                      <span className="inline-flex items-center text-[11.5px] text-[#888] font-medium">
                        <Eye size={12} className="mr-1" />{formatViews(heroArticle.views)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Section Divider */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[13px] font-bold text-[#D80100] uppercase tracking-[0.8px] whitespace-nowrap">Latest Articles</span>
            <div className="flex-1 h-px bg-[#e8e4df]" />
          </div>

          {/* Articles Grid */}
          {articles.length === 0 ? (
            <div className="text-center py-14 flex flex-col items-center">
              <Newspaper size={48} color="#ccc" />
              <p className="text-[16px] font-bold text-[#333] mt-4 mb-2">No articles yet</p>
              <p className="text-[13px] text-[#888]">Articles will be available soon!</p>
            </div>
          ) : gridArticles.length === 0 ? null : (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {gridArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/article/${article.slug || article.id}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <div className="group bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.07)] hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(0,0,0,0.11)] transition-transform duration-200 ease-out overflow-hidden h-full">
                    <div className="relative h-[180px] sm:h-40 w-full overflow-hidden">
                      {article.image ? (
                        <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100">
                          <Newspaper size={28} color="#ccc" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                      <h3 className="text-[15px] sm:text-lg font-semibold leading-snug line-clamp-2">{article.title}</h3>
                      {article.description && (
                        <p className="text-sm text-slate-600 line-clamp-3">
                          {article.description.slice(0, 90)}...
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><User size={11} />{article.author}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{formatDate(article.published_at || article.created_at)}</span>
                      </div>
                      {article.views && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600">
                          <Eye size={11} /><span>{formatViews(article.views)} views</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-7 py-3 text-sm font-semibold transition-colors duration-200"
                onClick={() => setVisibleCount((p) => p + 6)}
              >
                <RefreshCw size={14} />
                Load More Articles
              </button>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="flex flex-col gap-5 order-first lg:order-last">

          {/* Trending */}
          <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-red-600 text-xs font-bold uppercase tracking-wider text-slate-900">
              <TrendingUp size={15} color="#D80100" className="mr-1" />
              <span>Trending Now</span>
            </div>
            <div className="divide-y divide-slate-100 lg:block flex overflow-x-auto lg:overflow-visible scrollbar-hide">
              {trendingTop5.map((article, idx) => (
                <Link
                  key={article.id}
                  to={`/article/${article.slug || article.id}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 min-w-[260px] lg:min-w-0">
                    <span className="text-[15px] text-[#D80100] font-semibold min-w-[24px]">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">{article.title}</p>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Eye size={10} />{formatViews(article.views)} views
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Latest */}
          <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-red-600 text-xs font-bold uppercase tracking-wider text-slate-900">
              <Clock size={15} color="#D80100" className="mr-1" />
              <span>Latest</span>
            </div>
            <div className="divide-y divide-slate-100">
              {articles.slice(0, 4).map((article) => (
                <Link
                  key={article.id}
                  to={`/article/${article.slug || article.id}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <div className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-slate-100">
                      {article.image ? (
                        <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100">
                          <Newspaper size={16} color="#ccc" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">{article.title}</p>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={10} />{formatDate(article.published_at || article.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter CTA */}
          <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-5 sm:p-6 text-center">
            <div className="mx-auto mb-3 w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
              <Newspaper size={22} color="#fff" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Stay Updated</h4>
            <p className="text-xs text-white/80 mb-4">
              Get the latest {category?.name || "news"} delivered to your inbox daily.
            </p>
            <button className="inline-flex items-center justify-center gap-2 border border-white/70 text-white px-5 py-2 rounded-lg font-semibold text-xs transition-colors duration-200 hover:bg-white hover:text-red-600">
              Subscribe Now
              <ChevronRight size={14} className="ml-1" />
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}