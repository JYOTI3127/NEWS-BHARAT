import { Link } from "react-router-dom";

export default function ArticleCard({ article }) {
  const {
    id,
    title,
    slug,
    description,
    category_details,
    author,
    published_at,
    created_at,
    image_url,
  } = article;

  // Full image URL banate hain
  const baseURL = "http://127.0.0.1:8000"; // Django server ka base URL
  const imageUrl = image_url ? `${baseURL}${image_url}` : null;

  const date = published_at || created_at;
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <>
      <Link
        to={`/article/${slug || id}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className="article-card">
          {/* Image */}
          <div className="article-card-img-wrap">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="article-card-img" />
            ) : (
              <div className="article-card-img-placeholder">
                <span>News4Bharat</span>
              </div>
            )}
            {category_details?.name && (
              <span className="article-card-badge">{category_details.name}</span>
            )}
          </div>

          {/* Content */}
          <div className="article-card-body">
            <h3 className="article-card-title">{title}</h3>

            {description && (
              <p className="article-card-desc">
                {description.slice(0, 100)}...
              </p>
            )}

            <div className="article-card-meta">
              {author?.username && <span>{author.username}</span>}
              {formattedDate && <span>{formattedDate}</span>}
            </div>
          </div>
        </div>
      </Link>

      {/* CSS */}
      <style>{`
        .article-card{
          background:#fff;
          border-radius:8px;
          overflow:hidden;
          box-shadow:0 2px 8px rgba(0,0,0,0.08);
          display:flex;
          flex-direction:column;
          height:100%;
          transition:0.3s;
        }

        .article-card:hover{
          transform:translateY(-4px);
        }

        .article-card-img-wrap{
          width:100%;
          height:200px;
          overflow:hidden;
          position:relative;
        }

        .article-card-img{
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }

        .article-card-body{
          padding:14px;
        }

        .article-card-title{
          font-size:18px;
          font-weight:600;
          margin-bottom:6px;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }

        .article-card-desc{
          font-size:14px;
          color:#555;
          margin-bottom:8px;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }

        .article-card-meta{
          font-size:13px;
          color:#777;
          display:flex;
          justify-content:space-between;
        }

        .article-card-badge{
          position:absolute;
          top:10px;
          left:10px;
          background:#e11d48;
          color:#fff;
          font-size:12px;
          padding:4px 8px;
          border-radius:4px;
        }
      `}</style>
    </>
  );
}