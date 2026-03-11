import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ArticleDetails() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/articles/${slug}`)
      .then((res) => res.json())
      .then((data) => setArticle(data))
      .catch((err) => console.log(err));
  }, [slug]);

  if (!article) {
    return <p className="article-loading">Loading article...</p>;
  }

  const date = article.published_at || article.created_at;

  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <div className="article-details">
        <div className="article-container">
          
          <h1 className="article-title">{article.title}</h1>

          <div className="article-meta">
            {article.author && (
              <span className="article-author">By {article.author}</span>
            )}
            <span className="article-date">{formattedDate}</span>
          </div>

          {article.image && (
            <img
              src={article.image}
              alt={article.title}
              loading="lazy"
              className="article-image"
            />
          )}

          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>

      {/* CSS inside JSX */}
      <style>{`
        .article-details{
          width:100%;
          padding:40px 15px;
          background:#fff;
        }

        .article-container{
          max-width:900px;
          margin:auto;
        }

        .article-title{
          font-size:34px;
          font-weight:700;
          line-height:1.3;
          margin-bottom:15px;
        }

        .article-meta{
          display:flex;
          gap:15px;
          font-size:14px;
          color:#777;
          margin-bottom:20px;
          flex-wrap:wrap;
        }

        .article-author{
          font-weight:500;
        }

        .article-date{
          color:#999;
        }

        .article-image{
          width:100%;
          border-radius:8px;
          margin-bottom:25px;
        }

        .article-content{
          font-size:18px;
          line-height:1.8;
          color:#333;
        }

        .article-content p{
          margin-bottom:18px;
        }

        .article-content img{
          width:100%;
          margin:20px 0;
          border-radius:6px;
        }

        .article-loading{
          text-align:center;
          padding:60px;
          font-size:18px;
        }

        /* responsive */

        @media (max-width:768px){

          .article-title{
            font-size:26px;
          }

          .article-content{
            font-size:16px;
          }

        }
      `}</style>
    </>
  );
}