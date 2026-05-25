import { Link } from "react-router-dom";
import { getArticlePath } from "../lib/articleUrl";
import {
  getArticleAuthorName,
  getArticleDateLabel,
  getArticleReadTime,
  getArticleSummary,
} from "../lib/articlePresentation";

export default function ArticleCard({ article }) {
  const {
    title,
    subtitle,
    category_details,
    image_url,
    image,
  } = article;

  const imageUrl = image_url || image || null;
  const formattedDate = getArticleDateLabel(article);

  const articlePath = getArticlePath(article);
  const breakingCategory = Array.isArray(category_details)
    ? category_details.find((category) => {
        const slug = String(category?.slug || "").trim().toLowerCase();
        const name = String(category?.name || "").trim().toLowerCase();
        return slug === "breaking-news" || name === "breaking news";
      })
    : null;

  const primaryCategory = breakingCategory || category_details?.[0];

  const authorName = getArticleAuthorName(article);
  const summary = getArticleSummary(article);
  const readTime = getArticleReadTime(article);

  return (
    <Link
      to={articlePath}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col h-full transition-transform duration-300 hover:-translate-y-1">

        {/* Image */}
        <div className="relative w-full aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover block"
            />
          ) : (
            <span className="text-slate-400 text-sm font-medium">News4Bharat</span>
          )}

          {/* Category Badge */}
          {primaryCategory?.name && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-semibold uppercase px-2 py-1 rounded z-10">
              {primaryCategory.name}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-base font-semibold mb-1 line-clamp-2 leading-snug">
            {title}
          </h3>

          {(summary || subtitle) && (
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">
              {summary || subtitle}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span className="font-medium text-red-600">{authorName}</span>
            {readTime && <span>{readTime}</span>}
            {formattedDate && <span>Updated {formattedDate}</span>}
          </div>
        </div>

      </div>
    </Link>
  );
}
