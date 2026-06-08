import { useEffect, useState } from "react";
import "./Video.css";
import { YOUTUBE_CHANNEL_URL } from "../lib/socialLinks";

const videos = [
  {
    id: 1,
    title: "Latest News Video: Ground Report and Key Updates",
    category: "Featured",
    duration: "Watch",
    url: "https://www.youtube.com/watch?v=bOmqeFgGqrI",
    embedUrl: "https://www.youtube.com/embed/bOmqeFgGqrI",
    preview: true,
  },
  {
    id: 2,
    title: "News4Bharat Special: Big Story in Focus",
    category: "Featured",
    duration: "Watch",
    url: "https://www.youtube.com/watch?v=ldpGBR-HXic",
    embedUrl: "https://www.youtube.com/embed/ldpGBR-HXic",
    preview: true,
  },
  {
    id: 3,
    title: "CJP Founders Face Questions at Jantar Mantar",
    category: "Short",
    duration: "N4B Shorts",
    url: "https://www.youtube.com/shorts/_0ArfiXAYyY",
    embedUrl: "https://www.youtube.com/embed/_0ArfiXAYyY",
    autoplay: true,
  },
  {
    id: 4,
    title: "Another Major Fire Reported in Ghaziabad",
    category: "Short",
    duration: "N4B Shorts",
    url: "https://www.youtube.com/shorts/iJ93jGvOp_Q",
    embedUrl: "https://www.youtube.com/embed/iJ93jGvOp_Q",
  },
  {
    id: 5,
    title: "Breaking Visuals: Fire Incident Caught on Camera",
    category: "Short",
    duration: "N4B Shorts",
    url: "https://www.youtube.com/shorts/ObXnnO-AtZ0",
    embedUrl: "https://www.youtube.com/embed/ObXnnO-AtZ0",
  },
  {
    id: 6,
    title: "Massive Fire Video Goes Viral Online",
    category: "Short",
    duration: "N4B Shorts",
    url: "https://www.youtube.com/shorts/57Jrjlw8SPw",
    embedUrl: "https://www.youtube.com/embed/57Jrjlw8SPw",
  },
  {
    id: 7,
    title: "Cockroach Janta Party Meme Takes Over Internet",
    category: "Short",
    duration: "N4B Shorts",
    url: "https://www.youtube.com/shorts/gVV4OL8wMSM",
    embedUrl: "https://www.youtube.com/embed/gVV4OL8wMSM",
  },
];

const getRealTitleUrl = (video) =>
  `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(video.url)}`;

const applyRealTitles = async (videoList, signal) => {
  const updatedVideos = await Promise.all(
    videoList.map(async (video) => {
      try {
        const response = await fetch(getRealTitleUrl(video), { signal });
        if (!response.ok) return video;
        const data = await response.json();
        return data?.title ? { ...video, title: data.title } : video;
      } catch {
        return video;
      }
    })
  );

  return updatedVideos;
};

const getEmbedSrc = (video) => {
  const shouldAutoplay = video.autoplay || video.category === "Short";
  if (!shouldAutoplay) return video.embedUrl;
  const videoId = video.embedUrl.split("/").pop();
  return `${video.embedUrl}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${videoId}`;
};

function PreviewCard({ video }) {
  return (
    <article className="vs-news-preview">
      <div className="vs-news-video-frame">
        <iframe
          src={getEmbedSrc(video)}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <div className="vs-news-preview-caption">
        <span className="vs-news-title-mark" aria-hidden="true" />
        <h3>{video.title}</h3>
      </div>
    </article>
  );
}

function ShotCard({ video, index }) {
  return (
    <article className="vs-news-shot">
      <span className="vs-news-shot-thumb">
        <iframe
          src={getEmbedSrc(video)}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
        <span className="vs-news-shot-count">{String(index + 1).padStart(2, "0")}</span>
      </span>
      <div className="vs-news-shot-caption">
        <span className="vs-news-title-mark" aria-hidden="true" />
        <strong>{video.title}</strong>
      </div>
    </article>
  );
}

export default function VideoSection() {
  const [videoItems, setVideoItems] = useState(videos);

  useEffect(() => {
    const controller = new AbortController();

    applyRealTitles(videos, controller.signal).then((updatedVideos) => {
      if (!controller.signal.aborted) setVideoItems(updatedVideos);
    });

    return () => controller.abort();
  }, []);

  const previewItems = videoItems.filter((video) => video.preview).slice(0, 2);
  const shotItems = videoItems.filter((video) => !video.preview).slice(0, 5);

  return (
    <section className="vs-news-desk" aria-labelledby="video-desk-heading">
      <div className="vs-news-head">
        <div>
          <h2 id="video-desk-heading">Video Desk</h2>
        </div>
        <div className="vs-news-actions">
          <a className="vs-news-subscribe" href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
            <span className="vs-news-subscribe-pulse" aria-hidden="true" />
            Subscribe Now
          </a>
        </div>
      </div>

      <div className="vs-news-preview-grid" aria-label="Featured video previews">
        {previewItems.map((video) => (
          <PreviewCard key={video.id} video={video} />
        ))}
      </div>

      <div className="vs-news-shots-head">
        <span>Short Shots</span>
        <strong>{shotItems.length} videos</strong>
      </div>

      <div className="vs-news-shots-grid" aria-label="Short video shots">
        {shotItems.map((video, index) => (
          <ShotCard key={video.id} video={video} index={index} />
        ))}
      </div>
    </section>
  );
}
