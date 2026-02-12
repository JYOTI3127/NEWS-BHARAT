import React from 'react';
import '../App.css';

function BreakingNews() {
  const breakingNews = [
    "Breaking: Major policy announcement expected today",
    "Markets surge to record highs amid economic optimism",
    "International summit begins with key leaders in attendance",
    "Technology sector unveils revolutionary innovations"
  ];

  return (
    <div className="breaking-news">
      <span className="breaking-label">BREAKING NEWS</span>
      <div className="news-ticker">
        <div className="ticker-content">
          {breakingNews.map((news, index) => (
            <span key={index} className="ticker-item">
              {news} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
            </span>
          ))}
          {breakingNews.map((news, index) => (
            <span key={`repeat-${index}`} className="ticker-item">
              {news} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BreakingNews;