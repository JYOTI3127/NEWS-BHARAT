import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ArticleDetails() {
  const { id } = useParams();
  console.log("Article ID:", id);
  const [article, setArticle] = useState(null);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/articles/${id}/`)
      .then((res) => res.json())
      .then((data) => setArticle(data))
      .catch((err) => console.log(err));
  }, [id]);

  if (!article) {
    return (
      <p className="text-center py-16 text-lg text-gray-500">
        Loading article...
      </p>
    );
  }

  const date = article.published_at || article.created_at;
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const BASE = "http://127.0.0.1:8000";
  const rawImage = article.image_url || article.image || null;
  const imageUrl = rawImage
    ? rawImage.startsWith("http") ? rawImage : `${BASE}${rawImage}`
    : null;

  return (
    <div className="w-full px-4 py-10 bg-white">
      <div className="max-w-[900px] mx-auto">

        {/* Title */}
        <h1 className="text-[28px] sm:text-[34px] font-bold leading-[1.3] mb-4 text-gray-900">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-5">
          {article.author && (
            <span className="font-medium text-gray-600">
              By {article.author.username}
            </span>
          )}
          <span className="text-gray-400">{formattedDate}</span>
        </div>

        {/* Image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={article.title}
            loading="lazy"
            className="w-full rounded-lg mb-6 object-cover"
          />
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none text-gray-700 leading-[1.8]
                     [&_p]:mb-5
                     [&_img]:w-full [&_img]:rounded-md [&_img]:my-5
                     text-[16px] sm:text-[18px]"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

      </div>
    </div>
  );
}