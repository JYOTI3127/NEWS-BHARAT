import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Linkedin, Instagram, Facebook, Youtube, User } from "lucide-react";
import ArticleCard from "../components/Articlecard";
import { fetchArticles, fetchJson } from "../lib/api";
import { buildAuthorSlug, getArticleAuthorName, getArticleAuthorSlug } from "../lib/authors";

const parseArticlesResponse = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : data?.results || [];

export default function AuthorPage() {
  const { slug = "" } = useParams();
  const normalizedSlug = buildAuthorSlug(slug);

  const {
    data: articleData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["articles"],
    queryFn: fetchArticles,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const allArticles = useMemo(() => {
    const list = parseArticlesResponse(articleData);
    return list
      .filter((article) => article?.slug || article?.id)
      .sort(
        (a, b) =>
          new Date(b.published_at || b.created_at || 0) -
          new Date(a.published_at || a.created_at || 0)
      );
  }, [articleData]);

  const authorArticles = useMemo(
    () => allArticles.filter((article) => getArticleAuthorSlug(article) === normalizedSlug),
    [allArticles, normalizedSlug]
  );

  const latestArticle = authorArticles[0] || null;
  const authorName = latestArticle ? getArticleAuthorName(latestArticle) : "Author";

  const { data: authorDetail } = useQuery({
    queryKey: ["author-profile", normalizedSlug, latestArticle?.slug],
    enabled: Boolean(latestArticle?.slug),
    queryFn: () => fetchJson(`/articles/slug/${encodeURIComponent(latestArticle.slug)}/`),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const authorProfile = Array.isArray(authorDetail) ? authorDetail[0] : authorDetail;
  const authorBio = String(authorProfile?.author_display_bio || "").trim();
  const authorPosition = String(authorProfile?.author_display_position || "").trim();
  const authorLinks = [
    { href: String(authorProfile?.author_display_linkedin || "").trim(), icon: <Linkedin size={15} />, label: "LinkedIn" },
    { href: String(authorProfile?.author_display_instagram || "").trim(), icon: <Instagram size={15} />, label: "Instagram" },
    { href: String(authorProfile?.author_display_facebook || "").trim(), icon: <Facebook size={15} />, label: "Facebook" },
    { href: String(authorProfile?.author_display_youtube || "").trim(), icon: <Youtube size={15} />, label: "YouTube" },
  ].filter((item) => item.href);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-9 h-9 border-[3px] border-[#f0ece8] border-t-[#D80100] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || authorArticles.length === 0) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10">
        <Helmet>
          <title>Author Not Found | News4Bharat</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 mb-5 transition-colors"
        >
          <ArrowLeft size={13} /> Back to Home
        </Link>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Author page not found</h1>
          <p className="mt-3 text-gray-500">Iss author ke liye abhi article data available nahi hai.</p>
        </div>
      </div>
    );
  }

  const metaDescription =
    authorBio ||
    `${authorName} ke latest articles, explainers aur updates News4Bharat par padhiye.`;

  return (
    <div className="min-h-screen bg-[#f7f4f0]">
      <Helmet>
        <title>{authorName} | Author Page | News4Bharat</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://news4bharat.com/author/${normalizedSlug}`} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${authorName} | Author Page | News4Bharat`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={`https://news4bharat.com/author/${normalizedSlug}`} />
      </Helmet>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 mb-5 transition-colors"
        >
          <ArrowLeft size={13} /> Back to Home
        </Link>

        <section className="rounded-[28px] bg-white border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="h-16 w-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <User size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">Author</p>
              <h1 className="mt-2 text-[clamp(28px,5vw,42px)] font-extrabold tracking-tight text-gray-900">
                {authorName}
              </h1>
              {authorPosition && (
                <p className="mt-1 text-sm font-medium text-red-600">{authorPosition}</p>
              )}
              {authorBio && (
                <p className="mt-4 max-w-[820px] text-[15px] leading-[1.8] text-gray-600">
                  {authorBio}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-red-700 font-semibold">
                  <FileText size={14} /> {authorArticles.length} Articles
                </span>
              </div>

              {authorLinks.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {authorLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label={item.label}
                      title={item.label}
                    >
                      {item.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Articles by {authorName}</h2>
            <p className="text-sm text-gray-500">{authorArticles.length} total posts</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {authorArticles.map((article) => (
              <ArticleCard key={article.id || article.slug} article={article} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

