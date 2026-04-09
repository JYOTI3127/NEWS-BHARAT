import { Link } from "react-router-dom";

export default function ArticleCard({ article }) {
  const {
    title,
    subtitle,
    category_details,
    published_at,
    created_at,
    image_url,
    image,
    slug,
    display_author_name,   // ✅ API mein yahi field hai
    author_display_name,   // ✅ backup field
  } = article;

  const imageUrl = image_url || image || null;

  const date = published_at || created_at;

  // ✅ AM/PM ke saath time
  const formattedDate = date
    ? new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const articlePath = `/article/${slug}`;
  const breakingCategory = Array.isArray(category_details)
    ? category_details.find((category) => {
        const slug = String(category?.slug || "").trim().toLowerCase();
        const name = String(category?.name || "").trim().toLowerCase();
        return slug === "breaking-news" || name === "breaking news";
      })
    : null;

  const primaryCategory = breakingCategory || category_details?.[0];

  // ✅ Author: API se aaye toh wahi, warna News4Bharat
  const authorName = display_author_name || author_display_name || "News4Bharat";

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

          {subtitle && (
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">
              {subtitle}
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-3 text-xs text-slate-400">
            {/* ✅ Author name — API se aata hai "News4Bharat" */}
            <span className="font-medium text-red-600">{authorName}</span>
            {/* ✅ Date with AM/PM */}
            {formattedDate && <span>{formattedDate}</span>}
          </div>
        </div>

      </div>
    </Link>
  );
}
