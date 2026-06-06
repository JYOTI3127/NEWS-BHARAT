import "./Video.css";

const videos = [
  {
    id: 1,
    title: "Featured Video 01",
    category: "Featured 01",
    duration: "YouTube",
    url: "https://www.youtube.com/watch?v=bOmqeFgGqrI",
    embedUrl: "https://www.youtube.com/embed/bOmqeFgGqrI",
    preview: true,
  },
  {
    id: 2,
    title: "Featured Video 02",
    category: "Featured 02",
    duration: "YouTube",
    url: "https://www.youtube.com/watch?v=ldpGBR-HXic",
    embedUrl: "https://www.youtube.com/embed/ldpGBR-HXic",
    preview: true,
  },
  {
    id: 3,
    title: "Short Video 01",
    category: "Short 01",
    duration: "YouTube Shorts",
    url: "https://www.youtube.com/shorts/_0ArfiXAYyY",
    embedUrl: "https://www.youtube.com/embed/_0ArfiXAYyY",
  },
  {
    id: 4,
    title: "Short Video 02",
    category: "Short 02",
    duration: "YouTube Shorts",
    url: "https://www.youtube.com/shorts/iJ93jGvOp_Q",
    embedUrl: "https://www.youtube.com/embed/iJ93jGvOp_Q",
  },
  {
    id: 5,
    title: "Short Video 03",
    category: "Short 03",
    duration: "YouTube Shorts",
    url: "https://www.youtube.com/shorts/ObXnnO-AtZ0",
    embedUrl: "https://www.youtube.com/embed/ObXnnO-AtZ0",
  },
  {
    id: 6,
    title: "Short Video 04",
    category: "Short 04",
    duration: "YouTube Shorts",
    url: "https://www.youtube.com/shorts/57Jrjlw8SPw",
    embedUrl: "https://www.youtube.com/embed/57Jrjlw8SPw",
  },
  {
    id: 7,
    title: "Short Video 05",
    category: "Short 05",
    duration: "YouTube Shorts",
    url: "https://www.youtube.com/shorts/gVV4OL8wMSM",
    embedUrl: "https://www.youtube.com/embed/gVV4OL8wMSM",
  },
];

const previewVideos = videos.filter((video) => video.preview).slice(0, 2);
const shotVideos = videos.filter((video) => !video.preview).slice(0, 5);

function VideoMeta({ video, className = "" }) {
  return (
    <span className={`vs-news-meta${className ? ` ${className}` : ""}`}>
      <strong>{video.category}</strong>
      <span>{video.duration}</span>
    </span>
  );
}

function PreviewCard({ video }) {
  return (
    <article className="vs-news-preview">
      <div className="vs-news-video-frame">
        <iframe
          src={video.embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <div className="vs-news-preview-copy">
        <VideoMeta video={video} />
      </div>
    </article>
  );
}

function ShotCard({ video, index }) {
  return (
    <article className="vs-news-shot">
      <span className="vs-news-shot-thumb">
        <iframe
          src={video.embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
        <span className="vs-news-shot-count">{String(index + 1).padStart(2, "0")}</span>
      </span>
      <span className="vs-news-shot-copy">
        <VideoMeta video={video} className="vs-news-shot-meta" />
      </span>
    </article>
  );
}

export default function VideoSection() {
  return (
    <section className="vs-news-desk" aria-labelledby="video-desk-heading">
      <div className="vs-news-head">
        <div>
          <p className="vs-news-kicker">Watch</p>
          <h2 id="video-desk-heading">Video Desk</h2>
        </div>
        <a className="vs-news-more" href="/category/videos">
          View all
        </a>
      </div>

      <div className="vs-news-preview-grid" aria-label="Featured video previews">
        {previewVideos.map((video) => (
          <PreviewCard key={video.id} video={video} />
        ))}
      </div>

      <div className="vs-news-shots-head">
        <span>Short Shots</span>
        <strong>{shotVideos.length} videos</strong>
      </div>

      <div className="vs-news-shots-grid" aria-label="Short video shots">
        {shotVideos.map((video, index) => (
          <ShotCard key={video.id} video={video} index={index} />
        ))}
      </div>
    </section>
  );
}
