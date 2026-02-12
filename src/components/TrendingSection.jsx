import React from 'react';
import '../App.css';

function TrendingSection() {
  const trendingTopics = [
    { id: 1, title: "Climate Summit 2026", count: "15.2K" },
    { id: 2, title: "AI Innovation", count: "12.8K" },
    { id: 3, title: "Economic Recovery", count: "10.5K" },
    { id: 4, title: "Space Exploration", count: "9.3K" },
    { id: 5, title: "Healthcare Reform", count: "8.7K" }
  ];

  const editorsPicks = [
    {
      id: 1,
      title: "The Future of Work: How AI is Reshaping Industries",
      author: "Alexandra Pierce",
      readTime: "8 min read",
      views: "24.5K"
    },
    {
      id: 2,
      title: "Inside the Global Supply Chain Crisis",
      author: "Marcus Johnson",
      readTime: "6 min read",
      views: "18.2K"
    },
    {
      id: 3,
      title: "Renewable Energy: A Practical Guide for Cities",
      author: "Sofia Rodriguez",
      readTime: "10 min read",
      views: "16.8K"
    },
    {
      id: 4,
      title: "The Rise of Digital Currencies Explained",
      author: "Kevin Zhang",
      readTime: "7 min read",
      views: "14.3K"
    }
  ];

  return (
    <section className="trending-section">
      <div className="trending-container">
        <div className="trending-topics">
          <h2>🔥 Trending Now</h2>
          <div className="topics-list">
            {trendingTopics.map((topic, index) => (
              <div key={topic.id} className="topic-item">
                <span className="topic-rank">{index + 1}</span>
                <div className="topic-info">
                  <h4>{topic.title}</h4>
                  <span className="topic-count">{topic.count} readers</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editors-picks">
          <h2>✍️ Editor's Picks</h2>
          <div className="picks-list">
            {editorsPicks.map((pick) => (
              <div key={pick.id} className="pick-item">
                <h4>{pick.title}</h4>
                <div className="pick-meta">
                  <span className="pick-author">{pick.author}</span>
                  <span className="separator">•</span>
                  <span className="pick-time">{pick.readTime}</span>
                  <span className="separator">•</span>
                  <span className="pick-views">{pick.views} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TrendingSection;