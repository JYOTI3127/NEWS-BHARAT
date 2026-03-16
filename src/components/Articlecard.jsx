import { Link } from "react-router-dom";

export default function ArticleCard({ article }) {
  const {
    id,
    title,
    description,
    category_details,
    author,
    published_at,
    created_at,
    image_url,
  } = article;

  const imageUrl = image_url
    ? image_url.startsWith("http")
      ? image_url
      : `http://127.0.0.1:8000${image_url}`
    : null;

  const date = published_at || created_at;
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <Link
      to={`/article/${id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col h-full transition-transform duration-300 hover:-translate-y-1">

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <span className="text-slate-400 text-sm font-medium">News4Bharat</span>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover block" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <span>News4Bharat</span>
            </div>
          )}
          {category_details?.name && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-semibold uppercase px-2 py-1 rounded">
              {category_details.name}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-lg font-semibold mb-2 line-clamp-2">{title}</h3>
          {description && (
            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
              {description.slice(0, 100)}...
            </p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {author?.username && <span>{author.username}</span>}
            {formattedDate && <span>{formattedDate}</span>}
          </div>
        </div>

      </div>
    </Link>
  );
}